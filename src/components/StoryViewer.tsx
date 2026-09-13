import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import Icon from "./Icon";
import { STORIES, STORY_MEDIA } from "../lib/journey";
import { reducedMotion } from "../lib/appearance";

/** Sin grabación publicada se ofrece la guía legible. Nunca se simula un video. */
export default function StoryViewer({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [status, setStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const epoch = useRef(0);
  const story = STORIES[index];
  const media = STORY_MEDIA.find((m) => m.id === story.id && m.src && m.captions);
  const final = index === STORIES.length - 1;
  const previous = () => setIndex((v) => Math.max(0,v-1));
  const next = () => { if (final) onClose(); else setIndex((v) => v+1); };
  const nav = useRef({ previous, next }); nav.current = { previous, next };
  useEffect(() => {
    setMediaError(false); setProgress(0); setPaused(false); setStatus("");
    const current = ++epoch.current;
    const video = videoRef.current;
    if (!video || !media) return;
    video.src = media.src;
    video.muted = muted;
    if (!reducedMotion() && !document.hidden) video.play().catch(() => { if (current === epoch.current) { setPaused(true); setStatus("Toca reproducir para continuar."); } });
    else setPaused(true);
    const visibility = () => { if (document.hidden) { video.pause(); setPaused(true); } };
    document.addEventListener("visibilitychange", visibility);
    return () => { epoch.current++; document.removeEventListener("visibilitychange", visibility); video.pause(); video.removeAttribute("src"); video.load(); };
  }, [index, media?.src]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "ArrowRight") { e.preventDefault(); nav.current.next(); } else if (e.key === "ArrowLeft") { e.preventDefault(); nav.current.previous(); } };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, []);
  const toggle = () => {
    const video = videoRef.current; if (!video) return;
    if (!video.paused) { video.pause(); setPaused(true); }
    else { const current = epoch.current; video.play().then(() => { if(current === epoch.current) setPaused(false); }).catch(() => { if(current === epoch.current) setStatus("No se pudo reproducir. Puedes leer la guía o continuar."); }); }
  };
  return <Modal label={`Bienvenida y primeros pasos: ${story.title}`} className="story-sheet" onClose={onClose}>
    <div className="story-stage">
      {media && <video ref={videoRef} playsInline muted={muted} poster={media.poster} preload="metadata" crossOrigin="anonymous" className={mediaError ? "story-video failed" : "story-video"} onTimeUpdate={(e) => { const v=e.currentTarget; setProgress(Number.isFinite(v.duration) && v.duration>0 ? Math.min(v.currentTime/v.duration,1) : 0); }} onWaiting={() => setStatus("Cargando video…")} onPlaying={() => { setStatus(""); setPaused(false); }} onPause={() => setPaused(true)} onError={() => { setMediaError(true); setPaused(true); setStatus("No se pudo cargar el video. Aquí puedes leer la guía."); }} onEnded={() => { setProgress(1); setPaused(true); if (!final && !reducedMotion() && !document.hidden) setIndex((v) => v+1); }}><track key={media.captions} kind="captions" src={media.captions} srcLang="es" label="Español" default/></video>}
      <div className="story-shade"/>
      <div className="story-top"><div className="story-segments">{STORIES.map((s,i) => <button key={s.id} onClick={() => setIndex(i)} aria-label={`Historia ${i+1}: ${s.title}`} aria-current={i===index ? "step" : undefined}><span style={{ width: `${i<index ? 100 : i===index ? media && !mediaError ? progress*100 : 100 : 0}%` }}/></button>)}</div><div className="section-head"><span>{index+1} de {STORIES.length} · {story.eyebrow}</span><div style={{ display: "flex" }}>{media && !mediaError && <><button className="icon-button" onClick={toggle} aria-label={paused ? "Reproducir" : "Pausar"}><Icon name={paused ? "reanudar" : "pausar"}/></button><button className="icon-button" aria-label={muted ? "Activar sonido" : "Silenciar"} onClick={() => setMuted((v)=>!v)}><Icon name={muted ? "silencio" : "sonido"}/></button></>}<button className="icon-button" onClick={onClose} aria-label="Cerrar historias"><Icon name="cerrar"/></button></div></div></div>
      <div className="story-copy"><span className="story-kicker">{media && !mediaError ? story.takeaway : "Tu guía para empezar"}</span><h2>{story.title}</h2>{(!media || mediaError) ? <p>{story.script}</p> : <details onToggle={(e) => { if(e.currentTarget.open){ videoRef.current?.pause(); setPaused(true); } }}><summary>Leer la guía</summary><p>{story.script}</p></details>}<p className="story-status" role="status">{status}</p><div className="story-actions"><button onClick={previous} disabled={index===0} aria-label="Historia anterior"><Icon name="atras"/></button><button onClick={next}>{final ? "Empezar" : "Siguiente"}<Icon name="flecha" size={18}/></button></div><button className="story-skip" onClick={onClose}>{final ? "Cerrar guía" : "Saltar historias"}</button></div>
    </div>
  </Modal>;
}
