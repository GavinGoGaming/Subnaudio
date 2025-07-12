import fetch from 'node-fetch';
import fs from 'fs/promises';
import { PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

const API = 'https://api.streamelements.com/kappa/v2/speech';

async function fetchSE_TTS(text, voice = 'Amy') {
    const url = new URL(API);
    url.searchParams.set('voice', voice);
    url.searchParams.set('text', text);

    const res = await fetch(url.href);
    if (res.status === 405) throw new Error('405 err, not allowed');
    if (!res.ok) throw new Error(`fetch tts failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
}

async function addEff(inputBuffer, outputPath) {
    const inputStream = new PassThrough();
    inputStream.end(inputBuffer);

    return new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .audioFilters([
                'asplit=2[orig][delayed]',
                '[delayed]adelay=5[delayed_5ms]',
                '[delayed_5ms]aeval=val(0)*-1:c=same[inverted]',
                '[orig][inverted]amix=inputs=2:duration=longest:dropout_transition=0:weights=1.0 0.3[mixed]',
                '[mixed]asetrate=44100*0.51,aresample=44100[deeper]',
                '[deeper]highpass=f=250[filtered]',
                '[filtered]aecho=0.8:1:40:0.25[echo]',
                '[echo]volume=4[final]'
            ])
            .outputOptions('-ac', '2')
            .audioCodec('pcm_s16le')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

export async function generatePDA(text, voice, outPath) {
    const ttsBuf = await fetchSE_TTS(text, voice);
    await addEff(ttsBuf, outPath);
}

const [, , text = 'Warning! Entering EcoLogical dead-zone. Adding report to Data-bank.', voice = 'Amy', out = 'out.wav'] = process.argv;
generatePDA(text, voice, out).catch(err => {
    console.error('err', err.message);
    process.exit(1);
});