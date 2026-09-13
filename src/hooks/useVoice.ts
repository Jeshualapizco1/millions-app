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
  const [starting, setStarting] = useState(false);
  const [mic, setMic] = useState(false);
  const recRef = useRef<any>(null);
  const generation = useRef(0);
  const nativeRun = useRef<Promise<void> | null>(null);
  const queuedStart = useRef(false);
  const finishNative = useRef<(() => void) | null>(null);
  const deadline = useRef<number | null>(null);
  const mounted = useRef(true);
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
    const engine = await import("@capacitor-community/speech-recognition").catch(() => null);
    if (!engine) return;
    const { SpeechRecognition } = engine;
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
    generation.current++;
    queuedStart.current = false;
    finishNative.current?.();
    if (deadline.current) { clearTimeout(deadline.current); deadline.current = null; }
    if (recRef.current) {
      const rec = recRef.current;
      recRef.current = null;
      rec.onstart = rec.onresult = rec.onend = rec.onerror = null;
      try { rec.abort(); } catch { /* Puede seguir esperando el permiso. */ }
    }
    if (activoNativo.current) {
      activoNativo.current = false;
      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      // Se guarda la promesa: el siguiente `startNativo` la espera en vez de
      // encontrarse el micrófono a medio cerrar.
      limpiezaEnCurso.current = apagarNativo();
    }
    if (mounted.current) { setStarting(false); setMic(false); cbRef.current.onStop(); }
  }, [apagarNativo]);

  useEffect(() => {
    mounted.current = true;
    const f = () => { if (document.hidden) stopMic(); };
    document.addEventListener("visibilitychange", f);
    return () => { mounted.current = false; document.removeEventListener("visibilitychange", f); stopMic(); };
  }, [stopMic]);

  const startNativo = useCallback(async (session: number) => {
    const current = () => mounted.current && session === generation.current && activoNativo.current;
    if (activoNativo.current) return;
    activoNativo.current = true;
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      if (!current()) return;

      // Lo primero: que no quede nada de la vez anterior. Si el micrófono se
      // cerró hace un instante, esa limpieza puede seguir corriendo, y
      // arrancar encima es lo que produce "Ongoing speech recognition".
      if (limpiezaEnCurso.current) {
        await limpiezaEnCurso.current;
        limpiezaEnCurso.current = null;
      }

      if (!current()) return;
      const { available } = await SpeechRecognition.available();
      if (!current()) return;
      // El mensaje de estos errores es un código de `lib/voz`, no una frase:
      // así el catch trata igual lo que lanzamos aquí y lo que lanza el plugin.
      if (!available) throw new Error("sin-motor");
      const perm = await SpeechRecognition.requestPermissions();
      if (!current()) return;
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
      if (!current()) return;
      await SpeechRecognition.removeAllListeners();
      if (!current()) return;

      let ultimo = "";

      // El plugin no promete la forma del evento: en iOS manda
      // `{ matches: [...] }` y en otros casos puede llegar el arreglo pelado o
      // nada. Se acepta lo que venga en vez de destructurar a ciegas.
      const textoDelEvento = (ev: unknown): string => {
        const m = Array.isArray(ev) ? ev : (ev as { matches?: unknown })?.matches;
        const text = Array.isArray(m) ? m[0] : undefined;
        return typeof text === "string" ? text : "";
      };

      // En iOS `start()` NO espera al final: resuelve en cuanto el motor
      // arranca (Plugin.swift, `if partialResults { call.resolve() }`). El
      // final llega por `listeningState: "stopped"`, así que se espera aquí.
      let terminar: (t: string) => void = () => {};
      const finDelDictado = new Promise<string>((res) => { terminar = res; });
      finishNative.current = () => terminar("");

      // Tras 1.6 s sin palabras nuevas se detiene solo: es el equivalente del
      // `continuous: false` de la web, que corta al primer silencio. La
      // primera espera es más larga: entre tocar el botón y hablar pasa un
      // momento, y cortar ahí dejaría a la persona con la palabra en la boca.
      const armarSilencio = (ms: number) => {
        if (silencio.current) clearTimeout(silencio.current);
        silencio.current = window.setTimeout(() => { SpeechRecognition.stop().catch(() => {}); }, ms);
      };

      await SpeechRecognition.addListener("partialResults", (ev: unknown) => {
        if (!current()) return;
        const t = textoDelEvento(ev);
        if (!t || t === ultimo) return;
        ultimo = t;
        cbRef.current.onResult(t);
        armarSilencio(1600);
      });
      await SpeechRecognition.addListener("listeningState", (ev: unknown) => {
        if (!current()) return;
        const status = (ev as { status?: string })?.status;
        if (status === "started") {
          setStarting(false); setMic(true);
          // Sin esto, quien toca el micrófono y no habla lo deja abierto para
          // siempre: el temporizador de silencio solo vivía en los parciales.
          armarSilencio(6000);
        }
        if (status === "stopped") terminar(ultimo);
      });

      // Android sí resuelve al terminar y con los resultados; iOS resuelve
      // vacío al arrancar. Se aceptan las dos formas.
      if (!current()) return;
      // El plazo y la cancelación cubren también start(): Android puede no
      // resolverlo hasta parar. Cerrar no debe dejar la siguiente sesión esperando.
      const porTiempo = new Promise<string>((res) => { deadline.current = window.setTimeout(() => res(ultimo), 20000); });
      const iniciado = SpeechRecognition.start({ language: "es-MX", maxResults: 1, partialResults: true, popup: false })
        .then((result: unknown) => textoDelEvento(result) || finDelDictado);
      const final = (await Promise.race([iniciado, finDelDictado, porTiempo])).trim();

      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      if (current() && final) cbRef.current.onFinal(final);
    } catch (e) {
      // Un permiso negado o un motor ausente no debe dejar el botón "escuchando"
      if (current()) cbRef.current.onResult("");
      console.warn("voz nativa:", e);
      // Si el micrófono se cerró desde el FAB, `stopMic` ya puso el flag en
      // false: lo que falle después es consecuencia de cerrarlo, no un fallo
      // que la persona deba leer.
      if (current()) avisar(e instanceof Error ? e.message : null);
    } finally {
      finishNative.current = null;
      if (deadline.current) { clearTimeout(deadline.current); deadline.current = null; }
      activoNativo.current = false;
      if (silencio.current) { clearTimeout(silencio.current); silencio.current = null; }
      // La limpieza se guarda y se espera aquí mismo: así, cuando este
      // `startNativo` termina, el micrófono ya está libre para el siguiente.
      if (limpiezaEnCurso.current) await limpiezaEnCurso.current;
      limpiezaEnCurso.current = apagarNativo();
      await limpiezaEnCurso.current;
      limpiezaEnCurso.current = null;
      if (mounted.current && session === generation.current) { setStarting(false); setMic(false); cbRef.current.onStop(); }
    }
  }, [avisar, apagarNativo]);

  const startMic = useCallback(() => {
    if (nativo) {
      if (queuedStart.current || activoNativo.current) return;
      queuedStart.current = true;
      setStarting(true);
      const session = ++generation.current;
      const previous = nativeRun.current;
      nativeRun.current = (async () => {
        if (previous) await previous;
        if (!mounted.current || session !== generation.current) return;
        await startNativo(session);
      })().finally(() => { if (session === generation.current) queuedStart.current = false; });
      return;
    }
    // `mic` solo se enciende en `onstart`, que llega un instante después: dos
    // toques rápidos creaban dos reconocedores y el segundo dejaba el
    // micrófono abierto sin que nada lo apagara. El ref sí es inmediato.
    if (!voiceOK || mic || recRef.current) return;
    setStarting(true);
    const rec = new SR();
    rec.lang = "es-MX";
    rec.interimResults = true;
    rec.continuous = false;
    let delivered = false;
    rec.onstart = () => { if (mounted.current && recRef.current === rec) { setStarting(false); setMic(true); } };
    rec.onend = () => { if (mounted.current && recRef.current === rec) { setStarting(false); setMic(false); recRef.current = null; } };
    // `aborted` (lo cerramos nosotros) y `no-speech` (nadie habló) salen por
    // aquí y `avisar` los descarta; el resto sí se cuenta.
    rec.onerror = (e: any) => { if (mounted.current && recRef.current === rec) { setStarting(false); setMic(false); recRef.current = null; avisar(e?.error); } };
    rec.onresult = (e: any) => {
      if (!mounted.current || recRef.current !== rec || delivered) return;
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      cbRef.current.onResult(final || interim);
      if (final) { delivered = true; cbRef.current.onFinal(final); }
    };
    // Antes de arrancar: si `start()` tarda, un segundo toque ya lo encuentra.
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setStarting(false);
      recRef.current = null; // el navegador lo rechazó (ya había uno vivo)
    }
  }, [voiceOK, mic, SR, nativo, startNativo, avisar]);

  return { mic, starting, voiceOK, startMic, stopMic };
}
