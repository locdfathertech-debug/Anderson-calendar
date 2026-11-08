import { Component, Suspense, useEffect, useRef, useState } from "react";
import { motion, useDragControls, useMotionValue, useIsPresent } from "framer-motion";
import ReactPlayer from "react-player/lazy";
import { GripHorizontal, RotateCcw, X } from "lucide-react";

class PlayerBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">The player could not load. Use Retry below.</p> : this.props.children;
  }
}

export default function KioskVideo({ video, onClose, hidden = false }) {
  const present = useIsPresent();
  const bounds = useRef(null);
  const panel = useRef(null);
  const grip = useRef(null);
  const drag = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  function reset() { x.set(0); y.set(0); }
  function move(e) {
    const steps = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
    if (e.key === "Home") { e.preventDefault(); reset(); return; }
    if (!steps[e.key]) return;
    e.preventDefault();
    const rect = panel.current.getBoundingClientRect();
    const area = bounds.current.getBoundingClientRect();
    const [dx, dy] = steps[e.key];
    x.set(x.get() + Math.min(area.right - rect.right, Math.max(area.left - rect.left, dx)));
    y.set(y.get() + Math.min(area.bottom - rect.bottom, Math.max(area.top - rect.top, dy)));
  }
  useEffect(() => {
    const previous = document.activeElement;
    grip.current?.focus();
    window.addEventListener("resize", reset);
    window.visualViewport?.addEventListener("resize", reset);
    return () => {
      window.removeEventListener("resize", reset);
      window.visualViewport?.removeEventListener("resize", reset);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    if (ready || error) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [ready, error, attempt]);
  function retry() {
    setReady(false); setError(""); setSlow(false); setPlaying(true); setAttempt(n => n + 1);
  }
  return <div className="kiosk-video-layer" ref={bounds} inert={hidden || !present ? "" : undefined} style={hidden ? { visibility: "hidden" } : undefined}>
    <motion.section ref={panel} className="kiosk-video" role="region" aria-label={`Video: ${video.title}`}
      drag dragControls={drag} dragListener={false} dragConstraints={bounds} dragElastic={0} dragMomentum={false}
      style={{ x, y }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <header>
        <button ref={grip} className="kiosk-icon kiosk-video-grip" aria-label="Move video; use arrow keys or drag" title="Drag to move. Arrow keys move; Home resets." onPointerDown={e => drag.start(e)} onKeyDown={move}><GripHorizontal size={22} /></button>
        <div className="kiosk-video-title"><strong>{video.title}</strong><small>{video.provider} · floating player</small></div>
        <button className="kiosk-icon" aria-label="Reset video position" title="Reset position" onClick={reset}><RotateCcw size={18} /></button>
        <button className="kiosk-icon" aria-label="Close video" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="kiosk-video-canvas">
        {error ? <p role="alert">{error}</p> : <PlayerBoundary key={attempt}><Suspense fallback={<p>Loading player…</p>}>
          <ReactPlayer key={`${video.url}-${attempt}`} url={video.url} width="100%" height="100%" playing={playing && !hidden && present} controls playsinline pip={false}
            config={{ youtube: { playerVars: { playsinline: 1 } }, file: { attributes: { playsInline: true, disablePictureInPicture: true } } }}
            onReady={() => { setReady(true); setSlow(false); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onError={() => { setError("Video unavailable. Check the link, connection, and provider’s embed permissions."); setPlaying(false); }} />
        </Suspense></PlayerBoundary>}
      </div>
      <footer><span role="status">{error ? "Could not play video." : slow ? "Still loading. Check your connection or retry." : ready ? "Use video controls to play or pause." : "Loading… Autoplay may require tapping Play."}</span><button className="kiosk-control" onClick={retry}>Retry</button></footer>
    </motion.section>
  </div>;
}
