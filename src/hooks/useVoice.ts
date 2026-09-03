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
 * **En iOS la limpieza tiene que terminar ANTES de volver a arrancar.** El
 * reconocedor del sistema admite una sola sesión: si queda una viva, `start()`
 * revienta con "Ongoing speech recognition" y el micrófono no vuelve a
 * funcionar en toda la sesión de la app. Pasaba porque `stop()` y
 * `removeAllListeners()` se lanzaban sin esperarlos —y encima en el `finally`,
 * o sea después del fallo—, así que el siguiente toque encontraba la sesión
 * anterior a medio cerrar. Ahora quien apaga deja su limpieza en
 * `limpiezaEnCurso`, y quien enciende la espera antes de tocar el plugin.
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
  /** La última limpieza lanzada. Arrancar espera a que termine. */
  const limpiezaEnCurso = useRef<Promise<void> | null>(null);

  /**
   * Apaga el reconocedor nativo del todo: detiene la sesión, espera a que iOS
   * confirme que ya no escucha, y solo entonces quita los listeners.
   *
   * El orden importa. Quitar los listeners primero deja la sesión viva pero
   * sorda, y es justo el estado que hacía fallar al siguiente `start()`.
   */
  const apagarNativo = useCallback(async (): Promise<void> => {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    try {
      const { listening } = await SpeechRecognition.isListening();
      if (listening) {
        await SpeechRecognition.stop();
        // `stop()` vuelve antes de que el motor haya soltado el micrófono, así
        // que se espera a que lo confirme. Medio segundo de tope: si para
        // entonces sigue diciendo que escucha, insistir no lo va a arreglar y
        // es mejor devolver el control que congelar el botón.
        for (let i = 0; i < 10; i++) {
          if (!(await SpeechRecognition.isListening()).listening) break;
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    } catch (e) {
      console.warn("voz nativa, al apagar:", e);
    }
    try {
      await SpeechRecognition.removeAllListeners();
    } catch (e) {
      console.warn("voz nativa, al quitar listeners:", e);
    }
  }, []);

  const stopMic = useCallback(() => {
    if (recRef.current) {
      recRef.current.abort();
      recRef.current = null;
    }
    if (activoNativo.current) {
      activoNativo.current = false;
      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      // Se guarda la promesa: el siguiente `startNativo` la espera en vez de
      // encontrarse el micrófono a medio cerrar.
      limpiezaEnCurso.current = apagarNativo();
    }
    setMic(false);
    cbRef.current.onStop();
  }, [apagarNativo]);

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

      // Lo primero: que no quede nada de la vez anterior. Si el micrófono se
      // cerró hace un instante, esa limpieza puede seguir corriendo, y
      // arrancar encima es lo que produce "Ongoing speech recognition".
      if (limpiezaEnCurso.current) {
        await limpiezaEnCurso.current;
        limpiezaEnCurso.current = null;
      }

      const { available } = await SpeechRecognition.available();
      // El mensaje de estos errores es un código de `lib/voz`, no una frase:
      // así el catch trata igual lo que lanzamos aquí y lo que lanza el plugin.
      if (!available) throw new Error("sin-motor");
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== "granted") throw new Error("sin-permiso");

      // Y aun así se pregunta al plugin, porque la sesión pudo quedar viva por
      // un camino que no pasó por `stopMic`: la app en segundo plano, una
      // llamada entrante, o un intento anterior que murió a medias. Preguntar
      // cuesta un salto al puente; no preguntar costaba el micrófono hasta
      // reiniciar la app.
      if ((await SpeechRecognition.isListening()).listening) {
        await apagarNativo();
        if ((await SpeechRecognition.isListening()).listening) throw new Error("Ongoing speech recognition");
      }

      // Los listeners se registran con la sesión ya limpia: si se registraran
      // antes del apagado, `removeAllListeners()` se llevaría los nuevos.
      await SpeechRecognition.removeAllListeners();

      let ultimo = "";

      // El plugin no promete la forma del evento: en iOS manda
      // `{ matches: [...] }` y en otros casos puede llegar el arreglo pelado o
      // nada. Se acepta lo que venga en vez de destructurar a ciegas.
      const textoDelEvento = (ev: unknown): string => {
        const m = Array.isArray(ev) ? ev : (ev as { matches?: unknown })?.matches;
        return (Array.isArray(m) ? m[0] : undefined) ?? "";
      };

      // En iOS `start()` NO espera al final: resuelve en cuanto el motor
      // arranca (Plugin.swift, `if partialResults { call.resolve() }`). El
      // final llega por `listeningState: "stopped"`, así que se espera aquí.
      let terminar: (t: string) => void = () => {};
      const finDelDictado = new Promise<string>((res) => { terminar = res; });

      // Tras 1.6 s sin palabras nuevas se detiene solo: es el equivalente del
      // `continuous: false` de la web, que corta al primer silencio. La
      // primera espera es más larga: entre tocar el botón y hablar pasa un
      // momento, y cortar ahí dejaría a la persona con la palabra en la boca.
      const armarSilencio = (ms: number) => {
        if (silencio.current) clearTimeout(silencio.current);
        silencio.current = window.setTimeout(() => { SpeechRecognition.stop().catch(() => {}); }, ms);
      };

      await SpeechRecognition.addListener("partialResults", (ev: unknown) => {
        const t = textoDelEvento(ev);
        if (!t || t === ultimo) return;
        ultimo = t;
        cbRef.current.onResult(t);
        armarSilencio(1600);
      });
      await SpeechRecognition.addListener("listeningState", (ev: unknown) => {
        const status = (ev as { status?: string })?.status;
        if (status === "started") {
          setMic(true);
          // Sin esto, quien toca el micrófono y no habla lo deja abierto para
          // siempre: el temporizador de silencio solo vivía en los parciales.
          armarSilencio(6000);
        }
        if (status === "stopped") terminar(ultimo);
      });

      // Android sí resuelve al terminar y con los resultados; iOS resuelve
      // vacío al arrancar. Se aceptan las dos formas.
      const r: unknown = await SpeechRecognition.start({ language: "es-MX", maxResults: 1, partialResults: true, popup: false });
      const deStart = textoDelEvento(r);

      // Red de seguridad: si el motor nunca avisa que paró, no dejar la
      // promesa colgada para siempre.
      const porTiempo = new Promise<string>((res) => window.setTimeout(() => res(ultimo), 20000));
      const final = (deStart || (await Promise.race([finDelDictado, porTiempo]))).trim();

      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
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
      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      // La limpieza se guarda y se espera aquí mismo: así, cuando este
      // `startNativo` termina, el micrófono ya está libre para el siguiente.
      limpiezaEnCurso.current = apagarNativo();
      await limpiezaEnCurso.current;
      limpiezaEnCurso.current = null;
      setMic(false);
      cbRef.current.onStop();
    }
  }, [avisar, apagarNativo]);

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
