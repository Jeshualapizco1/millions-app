import { useCallback, useEffect, useRef, useState } from "react";
import { esNativo, plataforma } from "../lib/native";
import { avisoDeFalloDeVoz } from "../lib/voz";

/**
 * Captura por voz con dos motores y una sola API para el resto de la app.
 *
 * - Navegador y PWA: SpeechRecognition (es-MX), como siempre.
 * - iOS y Android: el WebView NO trae SpeechRecognition, así que se usa el
 *   reconocedor del sistema por plugin (SFSpeechRecognizer / SpeechRecognizer).
 *   El plugin no avisa "final": entrega parciales mientras escucha y devuelve
 *   el resultado al detenerse. Para que se sienta igual que en la web, se
 *   detiene solo tras un silencio corto.
 *
 * Los tres apagados del micrófono se conservan: visibilitychange (aquí),
 * cierre del FAB (el caller llama stopMic) y abort() en lugar de stop().
 *
 * Los dos motores avisan cuando fallan (`onError`). Antes el permiso negado
 * moría en un `console.warn` y la persona veía exactamente lo mismo que si no
 * hubiera tocado nada: el micrófono se apagaba sin decir por qué.
 */
export function useVoice({
  onResult,
  onFinal,
  onStop,
  onError,
}: {
  /** Texto interim o final — el monolito hacía setLive + setTxInput con esto. */
  onResult: (text: string) => void;
  /** Transcripción final — el monolito cerraba el FAB y mandaba sendTx. */
  onFinal: (text: string) => void;
  /** Al apagar el mic — el monolito hacía setLive(""). */
  onStop: () => void;
  /** Falló el dictado y hay algo que decir; el caller lo muestra como toast. */
  onError: (mensaje: string) => void;
}) {
  const [mic, setMic] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef({ onResult, onFinal, onStop, onError });
  cbRef.current = { onResult, onFinal, onStop, onError };

  /** Un solo lugar traduce el código del motor y decide si vale la pena hablar. */
  const avisar = useCallback((codigo: string | null | undefined) => {
    const msg = avisoDeFalloDeVoz(codigo, plataforma());
    if (msg) cbRef.current.onError(msg);
  }, []);

  const nativo = esNativo();
  const SR = nativo ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  // En nativo se da por disponible y se confirma al primer uso: preguntar al
  // plugin al montar sería una llamada al puente por cada render de App.
  const voiceOK = nativo || !!SR;

  // Estado del reconocedor nativo: el silencio que detiene, y si ya terminó.
  const silencio = useRef<number | null>(null);
  const activoNativo = useRef(false);

  const stopMic = useCallback(() => {
    if (recRef.current) {
      recRef.current.abort();
      recRef.current = null;
    }
    if (activoNativo.current) {
      activoNativo.current = false;
      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      import("@capacitor-community/speech-recognition").then(({ SpeechRecognition }) => {
        SpeechRecognition.stop().catch(() => {});
        SpeechRecognition.removeAllListeners().catch(() => {});
      });
    }
    setMic(false);
    cbRef.current.onStop();
  }, []);

  useEffect(() => {
    const f = () => { if (document.hidden) stopMic(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [stopMic]);

  const startNativo = useCallback(async () => {
    if (activoNativo.current) return;
    activoNativo.current = true;
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const { available } = await SpeechRecognition.available();
      // El mensaje de estos errores es un código de `lib/voz`, no una frase:
      // así el catch trata igual lo que lanzamos aquí y lo que lanza el plugin.
      if (!available) throw new Error("sin-motor");
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== "granted") throw new Error("sin-permiso");

      let ultimo = "";
      // Tras 1.6 s sin palabras nuevas se detiene solo: es el equivalente del
      // `continuous: false` de la web, que corta al primer silencio.
      const reiniciarSilencio = () => {
        if (silencio.current) clearTimeout(silencio.current);
        silencio.current = window.setTimeout(() => { SpeechRecognition.stop().catch(() => {}); }, 1600);
      };
      await SpeechRecognition.addListener("partialResults", ({ matches }) => {
        const t = matches?.[0] ?? "";
        if (!t || t === ultimo) return;
        ultimo = t;
        cbRef.current.onResult(t);
        reiniciarSilencio();
      });
      await SpeechRecognition.addListener("listeningState", ({ status }) => {
        if (status === "started") setMic(true);
      });

      const { matches } = await SpeechRecognition.start({ language: "es-MX", maxResults: 1, partialResults: true, popup: false });
      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      const final = (matches?.[0] ?? ultimo).trim();
      if (activoNativo.current && final) cbRef.current.onFinal(final);
    } catch (e) {
      // Un permiso negado o un motor ausente no debe dejar el botón "escuchando"
      cbRef.current.onResult("");
      console.warn("voz nativa:", e);
      // Si el micrófono se cerró desde el FAB, `stopMic` ya puso el flag en
      // false: lo que falle después es consecuencia de cerrarlo, no un fallo
      // que la persona deba leer.
      if (activoNativo.current) avisar(e instanceof Error ? e.message : null);
    } finally {
      activoNativo.current = false;
      import("@capacitor-community/speech-recognition").then(({ SpeechRecognition }) => SpeechRecognition.removeAllListeners().catch(() => {}));
      setMic(false);
      cbRef.current.onStop();
    }
  }, [avisar]);

  const startMic = useCallback(() => {
    if (nativo) { void startNativo(); return; }
    // `mic` solo se enciende en `onstart`, que llega un instante después: dos
    // toques rápidos creaban dos reconocedores y el segundo dejaba el
    // micrófono abierto sin que nada lo apagara. El ref sí es inmediato.
    if (!voiceOK || mic || recRef.current) return;
    const rec = new SR();
    rec.lang = "es-MX";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => setMic(true);
    rec.onend = () => { setMic(false); recRef.current = null; };
    // `aborted` (lo cerramos nosotros) y `no-speech` (nadie habló) salen por
    // aquí y `avisar` los descarta; el resto sí se cuenta.
    rec.onerror = (e: any) => { setMic(false); recRef.current = null; avisar(e?.error); };
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
    // Antes de arrancar: si `start()` tarda, un segundo toque ya lo encuentra.
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null; // el navegador lo rechazó (ya había uno vivo)
    }
  }, [voiceOK, mic, SR, nativo, startNativo, avisar]);

  return { mic, voiceOK, startMic, stopMic };
}
