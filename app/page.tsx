"use client";
import { Button, CssVarsProvider, Input, Sheet } from "@mui/joy";
import Image from "next/image";
import { SubnauticaAudio } from "./Subnaudio";
import { useEffect, useState } from "react";
import {toBlob} from "html-to-image";

type IconTypes = 'data' | 'log' | 'person' | 'question' | 'radio' | 'sunbeam';

function NextIconType(type: IconTypes): IconTypes {
  const icons = ['data', 'log', 'person', 'question', 'radio', 'sunbeam'];
  const index = icons.indexOf(type);
  const nextIndex = (index + 1) % icons.length;
  return icons[nextIndex] as IconTypes;
}

export default function Home() {
  const [text, setText] = useState("");
  const [pdaMessages, setPdaMessages] = useState<{
    audioBlob: Blob;
    audioText: string;
    realText: string;
    icon: IconTypes;
    uuid: string;
    editing: boolean;
  }[]>([]);
  const [Subnaudio, setSubnaudio] = useState<SubnauticaAudio | null>(null);
  useEffect(() => {
    const audio = new SubnauticaAudio();
    setSubnaudio(audio);
  }, []);
  return (
    <CssVarsProvider defaultMode="dark">
      <div style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        height: "100vh",
        boxSizing: "border-box",
      }} className="pda">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          endDecorator={
            <Button
              variant="solid"
              color="primary"
              size="lg"
              onClick={() => {
                if (!Subnaudio) {
                  console.error("SubnauticaAudio not initialized");
                  return;
                }
                Subnaudio.amy(text || "No text inputted.").then((blob) => {
                  setPdaMessages((prev) => [
                    ...prev,
                    {
                      audioBlob: blob,
                      audioText: text,
                      realText: text,
                      icon: 'data',
                      uuid: crypto.randomUUID(),
                      editing: false,
                    },
                  ]);
                }).catch((error) => {
                  console.error("Error generating audio:", error);
                });
              }}
            >Generate</Button>
          }
          placeholder="Enter text to generate Alterra PDA audio"
          size={'md'}
          sx={{ width: "100%" }}
        />
        <Sheet
          variant="outlined"
          sx={{
            width: "100%",
            padding: "10px 20px",
            margin: "0px 40px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxSizing: "border-box",
            borderRadius: "6px",
          }}
        >
          <span>Examples:</span>
          <Button
            variant="outlined"
            color="danger"
            onClick={() => {
              setText("Warning! Entering EcoLogical dead-zone. Adding report to Data-bank.");
            }}
          >Craters Edge</Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setText('This "P.D.A." has now rebooted in Emergency mode with one directive; to keep you (alive), on an A-lee-in world.');
            }}
          >PDA Reboot</Button>
        </Sheet>

        {pdaMessages.map((message) => (
          <div style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'}} className="out-pda" key={message.uuid}>
            <div className="pda-message" id={message.uuid}>
              <img src={`./pda_${message.icon}.png`} />
              {message.editing ? <Input
                value={message.realText}
                sx={{ flexGrow: 1 }}
                placeholder="Edit message visible text"
                size="sm"
                variant="soft"
                color="primary"
                onChange={(e) => {
                  setPdaMessages((prev) => prev.map(m => m.uuid === message.uuid ? { ...m, realText: e.target.value } : m));
                }}
              /> : <span>{message.realText}</span>}
            </div>
            <div className="message-control">
              <Button
                onClick={() => {
                  const audio = new Audio(URL.createObjectURL(message.audioBlob));
                  audio.play();
                }}
              ><i className="fa-solid fa-volume"></i></Button>
              <Button
                onClick={() => {
                  setPdaMessages((prev) => prev.map(m => m.uuid === message.uuid ? { ...m, editing: !m.editing } : m));
                }}
              ><i className={"fa-solid fa-"+(message.editing ? 'text-slash' : 'text')}></i></Button>
              <Button
                onClick={() => {
                  setPdaMessages((prev) => prev.map(m => m.uuid === message.uuid ? { ...m, icon: NextIconType(m.icon) } : m));
                }}
              ><img src={`./pda_${NextIconType(message.icon)}.png`} /></Button>
              <Button
                onClick={() => {
                  setPdaMessages((prev) => prev.filter(m => m.uuid !== message.uuid));
                }}
              ><i className="fa-solid fa-trash"></i></Button>
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(message.audioBlob);
                  link.download = `${message.realText.replace(/\s+/g, '_')}.ogg`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                }}
              ><i className="fa-solid fa-file-music"></i></Button>
              <Button
                onClick={() => {
                  const pdaElement = document.querySelector('#' + message.uuid);
                  if (pdaElement) {
                    toBlob(pdaElement as HTMLElement).then((blob) => {
                      if(!blob) return;
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `${message.realText.replace(/\s+/g, '_')}.png`;
                      link.click();
                      URL.revokeObjectURL(link.href);
                    });
                  }
                }}
              ><i className="fa-solid fa-file-image"></i></Button>
            </div>
          </div>
        ))}
      </div>
    </CssVarsProvider>
  );
}
