import { useCallback, useEffect, useRef, useState } from "react";

/**
 * SpeechRecognition (es-MX) con los tres apagados del micrófono:
 * visibilitychange (aquí), cierre del FAB (el caller llama stopMic) y abort() en lugar de stop().
 */
export function useVoice({
  onResult,
  onFinal,
  onStop,
}: {
  /** Texto interim o final — el monolito hacía setLive + setTxInput con esto. */
  onResult: (text: string) => void;
  /** Transcripción final — el monolito cerraba el FAB y mandaba sendTx. */
  onFinal: (text: string) => void;
  /** Al apagar el mic — el monolito hacía setLive(""). */
  onStop: () => void;
}) {
  const [mic, setMic] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef({ onResult, onFinal, onStop });
  cbRef.current = { onResult, onFinal, onStop };

  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const voiceOK = !!SR;

  const stopMic = useCallback(() => {
    if (recRef.current) {
      recRef.current.abort();
      recRef.current = null;
    }
    setMic(false);
    cbRef.current.onStop();
  }, []);

  useEffect(() => {
    const f = () => { if (document.hidden) stopMic(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [stopMic]);

  const startMic = useCallback(() => {
    if (!voiceOK || mic) return;
    const rec = new SR();
    rec.lang = "es-MX";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => setMic(true);
    rec.onend = () => { setMic(false); recRef.current = null; };
    rec.onerror = () => { setMic(false); recRef.current = null; };
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      cbRef.current.onResult(final || interim);
      if (final) cbRef.current.onFinal(final);
    };
    rec.start();
    recRef.current = rec;
  }, [voiceOK, mic, SR]);

  return { mic, voiceOK, startMic, stopMic };
}
