"use client";
export class SubnauticaAudio {
    private audioContext: AudioContext | null = null;

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext || null)();
    }

    private async fetchTTS(text: string, voice: string = 'Amy'): Promise<ArrayBuffer> {
        const url = new URL('https://api.streamelements.com/kappa/v2/speech');
        url.searchParams.set('voice', voice);
        url.searchParams.set('text', text);

        const response = await fetch(url.href);
        if (!response.ok) {
            throw new Error(`TTS fetch failed: ${response.status}`);
        }

        return await response.arrayBuffer();
    }

    private async applyPDAEffects(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        if (!this.audioContext) throw new Error('Audio context not initialized');

        const context = this.audioContext;

        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            Math.floor(audioBuffer.length / 0.51) + context.sampleRate * 0.1,
            context.sampleRate
        );

        // Source node
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        // Delay (5ms)
        const delayNode = offlineContext.createDelay();
        delayNode.delayTime.value = 0.005;

        // Gain invert (multiply by -1)
        const invertGain = offlineContext.createGain();
        invertGain.gain.value = -1;

        // Mix original and inverted delayed signal
        const originalGain = offlineContext.createGain();
        originalGain.gain.value = 1.0;

        const delayedGain = offlineContext.createGain();
        delayedGain.gain.value = 0.3;

        const merger = offlineContext.createChannelMerger(2);
        const mixGain = offlineContext.createGain();

        // High-pass filter (250 Hz)
        const highpass = offlineContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 250;

        // Echo using DelayNode chain
        const echoDelay = offlineContext.createDelay();
        echoDelay.delayTime.value = 0.04;

        const echoGain = offlineContext.createGain();
        echoGain.gain.value = 0.25;

        // Output volume boost
        const outputGain = offlineContext.createGain();
        outputGain.gain.value = 4.0;

        // Pitch drop by resampling trick
        const pitchDropBuffer = await (async () => {
            // Simulate asetrate=44100*0.51
            const stretched = offlineContext.createBuffer(
                audioBuffer.numberOfChannels,
                Math.floor(audioBuffer.length / 1),
                context.sampleRate
            );

            for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
                const src = audioBuffer.getChannelData(ch);
                const dst = stretched.getChannelData(ch);
                for (let i = 0; i < dst.length; i++) {
                    dst[i] = src[Math.floor(i * 1)] || 0;
                }
            }

            return stretched;
        })();

        const resampledSource = offlineContext.createBufferSource();
        resampledSource.buffer = pitchDropBuffer;

        // Routing
        const dry = offlineContext.createGain();

        resampledSource.connect(dry).connect(highpass);
        dry.connect(outputGain);

        // Echo path
        highpass.connect(echoDelay);
        echoDelay.connect(echoGain);
        echoGain.connect(outputGain);

        // Connect output
        outputGain.connect(offlineContext.destination);

        // Start processing
        resampledSource.start();
        return await offlineContext.startRendering();
    }


    private makeWAV(buffer: AudioBuffer): Blob {
        const numberOfChannels = buffer.numberOfChannels;
        const length = buffer.length;
        const sampleRate = buffer.sampleRate;
        const wavData = new Float32Array(length * numberOfChannels);
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                wavData[i * numberOfChannels + channel] = channelData[i];
            }
        }

        const wavBytes = new ArrayBuffer(44 + wavData.length * 4);
        const view = new DataView(wavBytes);
        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + wavData.length * 4, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 3, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 4 * numberOfChannels, true);
        view.setUint16(32, numberOfChannels * 4, true);
        view.setUint16(34, 32, true);
        writeString(view, 36, 'data');
        view.setUint32(40, wavData.length * 4, true);
        const wavDataView = new Float32Array(wavBytes, 44);
        wavDataView.set(wavData);

        return new Blob([wavBytes], { type: 'audio/wav' });
    }

    async amy(text: string): Promise<Blob> {
        return this.make(text, 'Amy');
    }

    async make(text: string, voice: string = 'Amy'): Promise<Blob> {
        const audioData = await this.fetchTTS(text, voice);
        const audioBuffer = await this.audioContext!.decodeAudioData(audioData);
        const processedBuffer = await this.applyPDAEffects(audioBuffer);
        return this.makeWAV(processedBuffer);
    }
}