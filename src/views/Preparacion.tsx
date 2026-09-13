import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "../components/Icon";
import StoryViewer from "../components/StoryViewer";
import { buildJourney } from "../lib/journey";
import { reducedMotion } from "../lib/appearance";
import { S } from "../lib/constants";
import ErrorBox from "../components/ErrorBox";
const iconMap: Record<string, IconName> = { chart: "grafico", wallet: "cuentas", mic: "microfono", target: "metas", card: "creditos", activity: "historial", repeat: "repetir", person: "perfil" };
export default function Preparacion({ goal, onContinue, onExplore }: { goal?: string | null; onContinue: () => void; onExplore: () => Promise<void> }) {
  const route = buildJourney(goal);
  const [step, setStep] = useState(() => reducedMotion() ? 3 : 0);
  const [stories, setStories] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const ready = step >= 3;
  const button = useRef<HTMLButtonElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (motion.matches) setStep(3); };
    document.addEventListener("visibilitychange", change); motion.addEventListener("change", reduce);
    return () => { document.removeEventListener("visibilitychange", change); motion.removeEventListener("change", reduce); };
  }, []);
  useEffect(() => {
    if (ready || !visible) return;
    const timer = setTimeout(() => { const focused = document.activeElement === skip.current; setStep((v) => v + 1); if (focused && step === 2) requestAnimationFrame(() => button.current?.focus()); }, 550);
    return () => clearTimeout(timer);
  }, [step, visible, ready]);
  const explore = async () => { if (busy) return; setBusy(true); setError(""); try { await onExplore(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo continuar"); setBusy(false); } };
  return <div className="journey-shell"><div className="journey-content">
    <p className="hint">{route.personalized ? route.label : "Empezar con lo esencial"}</p>
    <h1>{ready ? route.title : "Preparando tu comienzo."}</h1>
    <div className={`journey-orbit ${ready ? "ready" : ""}`}>
      <svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="103" className="journey-track"/><circle cx="120" cy="120" r="103" className="journey-progress" pathLength="3" strokeDasharray="3" strokeDashoffset={3-step}/></svg>
      <div className="journey-center"><Icon name={ready ? "check" : iconMap[route.icon] || "cuentas"} size={34}/><span role="status" aria-live="polite">{ready ? "Tus primeros pasos están listos" : ["Tu prioridad", "Ordenando tus primeros pasos", "Preparando la bienvenida"][step]}</span></div>
      {route.steps.map((s,i) => <span key={s.number} className={`journey-node node-${i}`} data-active={step > i}><Icon name={iconMap[s.icon] || "cuentas"}/></span>)}
    </div>
    {ready ? <div className="fadeUp"><ol className="journey-steps">{route.steps.map((s) => <li key={s.number}><span className="journey-number">{s.number}</span><div><h3>{s.title}</h3><p className="hint">{s.description}</p></div></li>)}</ol><p className="hint" style={{ marginBottom: 20 }}>{route.personalized ? "Una guía para empezar según lo que elegiste." : "Puedes adaptar estos pasos a tu ritmo."}</p><button ref={button} onClick={() => setStories(true)} style={{ ...S.btn(), width: "100%" }}>Ver mis primeros pasos <Icon name="flecha" size={18}/></button><button className="text-link" style={{ width: "100%", justifyContent: "center" }} onClick={onContinue}>Configurar mi cuenta</button><button className="text-link" disabled={busy} onClick={() => void explore()} style={{ width: "100%", justifyContent: "center" }}>Prefiero explorar</button>{error && <ErrorBox>{error}</ErrorBox>}</div> : <button ref={skip} className="text-link" onClick={() => { setStep(3); requestAnimationFrame(() => button.current?.focus()); }}>Omitir animación</button>}
    {stories && <StoryViewer onClose={() => { setStories(false); onContinue(); }}/>}
  </div></div>;
}
