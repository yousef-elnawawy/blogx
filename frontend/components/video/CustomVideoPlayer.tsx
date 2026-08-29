"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  MouseEvent,
} from "react";
import { getMediaUrl } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatTime(s: number): string {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────
   Tiny inline SVG helper
───────────────────────────────────────────── */
function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

const D = {
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  volFull:
    "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  volMute:
    "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z",
  fsEnter:
    "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
  fsExit:
    "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
};

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

/* ─────────────────────────────────────────────
   Inline CSS — self-contained, no Tailwind
───────────────────────────────────────────── */
const CSS = `
  .bxv {
    --red: #dc2626;
    --red-glow: rgba(220,38,38,0.3);
    --tr: 0.2s cubic-bezier(.4,0,.2,1);
    position: relative;
    width: 100%;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* wrapper */
  .bxv-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06);
    cursor: pointer;
  }

  .bxv-wrap video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  /* bottom gradient */
  .bxv-grad {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 110px;
    background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--tr);
  }
  .bxv-wrap.ui .bxv-grad { opacity: 1; }

  /* center play button */
  .bxv-center {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%,-50%) scale(0.8);
    width: 64px; height: 64px;
    background: rgba(220,38,38,0.85);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 0.25s, transform 0.25s, box-shadow 0.25s;
    backdrop-filter: blur(4px);
    box-shadow: 0 0 24px var(--red-glow);
    pointer-events: none;
    color: white;
  }
  .bxv-wrap.ui .bxv-center,
  .bxv-wrap.paused .bxv-center {
    opacity: 1;
    transform: translate(-50%,-50%) scale(1);
    pointer-events: auto;
  }

  /* seek flash */
  .bxv-flash {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    background: rgba(0,0,0,0.62);
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 7px 16px;
    border-radius: 40px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.22s;
    z-index: 10;
    white-space: nowrap;
    letter-spacing: 0.03em;
    border: 1px solid rgba(255,255,255,0.12);
  }
  .bxv-flash.on { opacity: 1; }

  /* spinner */
  .bxv-spin {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    width: 38px; height: 38px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top: 3px solid var(--red);
    border-radius: 50%;
    animation: bxvSpin 0.7s linear infinite;
    z-index: 6;
  }
  @keyframes bxvSpin { to { transform: translate(-50%,-50%) rotate(360deg); } }

  /* controls bar */
  .bxv-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 0 10px 8px;
    z-index: 8;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.25s, transform 0.25s;
    pointer-events: none;
  }
  .bxv-wrap.ui .bxv-bar,
  .bxv-wrap.paused .bxv-bar {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* progress */
  .bxv-prog {
    position: relative;
    height: 18px;
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-bottom: 2px;
  }
  .bxv-track {
    width: 100%;
    height: 3px;
    background: rgba(255,255,255,0.2);
    border-radius: 3px;
    position: relative;
    overflow: hidden;
    transition: height 0.12s;
  }
  .bxv-prog:hover .bxv-track { height: 5px; }
  .bxv-buf {
    position: absolute; top: 0; left: 0;
    height: 100%;
    background: rgba(255,255,255,0.28);
    border-radius: 3px;
  }
  .bxv-fill {
    position: absolute; top: 0; left: 0;
    height: 100%;
    background: linear-gradient(90deg, #dc2626, #ef4444);
    border-radius: 3px;
  }
  .bxv-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%,-50%) scale(0);
    width: 12px; height: 12px;
    background: #dc2626;
    border-radius: 50%;
    box-shadow: 0 0 6px var(--red-glow);
    transition: transform 0.12s;
    pointer-events: none;
  }
  .bxv-prog:hover .bxv-thumb { transform: translate(-50%,-50%) scale(1); }

  /* time tooltip */
  .bxv-tip {
    position: absolute;
    bottom: 20px;
    background: rgba(0,0,0,0.85);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transform: translateX(-50%);
    white-space: nowrap;
    transition: opacity 0.12s;
    border: 1px solid rgba(255,255,255,0.1);
    letter-spacing: 0.03em;
  }
  .bxv-prog:hover .bxv-tip { opacity: 1; }

  /* bottom row */
  .bxv-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  /* icon buttons */
  .bxv-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.9);
    cursor: pointer;
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: background var(--tr), transform 0.12s;
    flex-shrink: 0;
    padding: 0;
  }
  .bxv-btn:hover { background: rgba(255,255,255,0.14); transform: scale(1.1); }

  /* volume */
  .bxv-vol {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .bxv-vol-box {
    width: 0;
    overflow: hidden;
    transition: width 0.22s;
  }
  .bxv-vol:hover .bxv-vol-box { width: 72px; }
  .bxv-vol-in {
    -webkit-appearance: none;
    appearance: none;
    width: 72px; height: 3px;
    background: rgba(255,255,255,0.22);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    accent-color: #dc2626;
  }
  .bxv-vol-in::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px; height: 11px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
  }

  /* time */
  .bxv-time {
    font-size: 0.72rem;
    font-weight: 500;
    color: rgba(255,255,255,0.82);
    margin: 0 3px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .bxv-spacer { flex: 1; }

  /* speed */
  .bxv-speed {
    position: relative;
  }
  .bxv-speed-btn {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.14);
    color: white;
    border-radius: 6px;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 3px 7px;
    cursor: pointer;
    transition: background var(--tr);
    font-family: inherit;
    letter-spacing: 0.02em;
  }
  .bxv-speed-btn:hover { background: rgba(220,38,38,0.3); border-color: var(--red); }

  /* speed popup */
  .bxv-menu {
    position: absolute;
    bottom: 38px;
    right: 0;
    background: rgba(16,16,16,0.97);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 5px 0;
    min-width: 140px;
    z-index: 20;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    animation: bxvPop 0.15s ease;
  }
  @keyframes bxvPop {
    from { opacity: 0; transform: translateY(5px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .bxv-menu-title {
    font-size: 0.63rem;
    color: rgba(255,255,255,0.45);
    padding: 3px 12px 5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .bxv-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: background 0.12s;
    color: rgba(255,255,255,0.85);
  }
  .bxv-menu-item:hover { background: rgba(220,38,38,0.15); }
  .bxv-menu-item.sel { color: var(--red); font-weight: 700; }
  .bxv-check { width: 14px; font-size: 0.65rem; text-align: center; color: var(--red); }
`;

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
interface CustomVideoPlayerProps {
  src: string;
  poster?: string | null;
  duration?: number | null;
  postId?: number | string;
}

/* ═══════════════════════════════════════════════
   Component
═══════════════════════════════════════════════ */
export default function CustomVideoPlayer({
  src,
  poster,
  postId,
}: CustomVideoPlayerProps) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [paused, setPaused] = useState(true);
  const [showUI, setShowUI] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufPct, setBufPct] = useState(0);
  const [isFS, setIsFS] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [flashText, setFlashText] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tipPct, setTipPct] = useState(0);
  const [tipTime, setTipTime] = useState("0:00");
  const lastVol = useRef(1);

  const resolvedSrc = getMediaUrl(src);
  const resolvedPoster = poster ? getMediaUrl(poster) : undefined;

  /* ── flash seek message ── */
  const flash = useCallback((msg: string) => {
    setFlashText(msg);
    setShowFlash(true);
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setShowFlash(false), 850);
  }, []);

  /* ── show / hide UI ── */
  const revealUI = useCallback(() => {
    setShowUI(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    const v = vidRef.current;
    if (v && !v.paused) {
      hideRef.current = setTimeout(() => setShowUI(false), 2800);
    }
  }, []);

  /* ── play/pause ── */
  const togglePlay = useCallback(() => {
    const v = vidRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }, []);

  /* ── seek by N seconds ── */
  const seekBy = useCallback((secs: number) => {
    const v = vidRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + secs));
    flash(secs > 0 ? `+${secs}s` : `${secs}s`);
  }, [flash]);

  /* ── fullscreen ── */
  const toggleFS = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    !document.fullscreenElement
      ? el.requestFullscreen().catch(() => {})
      : document.exitFullscreen().catch(() => {});
  }, []);

  /* ── mute toggle ── */
  const toggleMute = useCallback(() => {
    const v = vidRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      const r = lastVol.current || 1;
      v.muted = false;
      v.volume = r;
      setMuted(false);
      setVolume(r);
    } else {
      lastVol.current = v.volume;
      v.muted = true;
      setMuted(true);
      setVolume(0);
    }
  }, []);

  /* ── seek from mouse event ── */
  const seekFromEvt = useCallback((
    e: MouseEvent | globalThis.MouseEvent,
    el?: HTMLElement | null
  ) => {
    const container = el ?? progRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = vidRef.current;
    if (v) v.currentTime = ratio * (v.duration || 0);
    setCurrentTime(ratio * (vidRef.current?.duration || 0));
  }, []);

  /* ── blogx-video-seek event ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev.detail?.postId !== undefined && String(ev.detail.postId) !== String(postId)) return;
      const t = Number(ev.detail?.time);
      if (!isNaN(t) && t >= 0) {
        const v = vidRef.current;
        if (v) { v.currentTime = t; v.play().catch(() => {}); }
      }
    };
    window.addEventListener("blogx-video-seek", handler);
    return () => window.removeEventListener("blogx-video-seek", handler);
  }, [postId]);

  /* ── video events ── */
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;

    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    const onWait = () => setSpinning(true);
    const onCan = () => setSpinning(false);
    const onPlaying = () => setSpinning(false);
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length)
        setBufPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    };
    const onMeta = () => setDuration(v.duration);

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  /* ── fullscreen change ── */
  useEffect(() => {
    const h = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  /* ── drag seek ── */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: globalThis.MouseEvent) => seekFromEvt(e, progRef.current);
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, seekFromEvt]);

  /* ── keyboard shortcuts (only when player is focused / hovered) ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const handler = (e: KeyboardEvent) => {
      if (!wrap.matches(":hover") && !document.fullscreenElement) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const v = vidRef.current;
      if (!v) return;
      switch (e.code) {
        case "Space": case "KeyK": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); seekBy(5); break;
        case "ArrowLeft":  e.preventDefault(); seekBy(-5); break;
        case "KeyL": seekBy(10); break;
        case "KeyJ": seekBy(-10); break;
        case "KeyF": toggleFS(); break;
        case "KeyM": toggleMute(); break;
        case "ArrowUp":
          e.preventDefault();
          { const nv = Math.min(1, v.volume + 0.05); v.volume = nv; setVolume(nv); }
          break;
        case "ArrowDown":
          e.preventDefault();
          { const nv = Math.max(0, v.volume - 0.05); v.volume = nv; setVolume(nv); }
          break;
        case "Home": v.currentTime = 0; break;
        case "End":  v.currentTime = v.duration || 0; break;
      }
      if (e.code.startsWith("Digit")) {
        const n = parseInt(e.key);
        if (!isNaN(n)) v.currentTime = (n / 10) * (v.duration || 0);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay, seekBy, toggleFS, toggleMute]);

  /* ── close speed menu on outside click ── */
  useEffect(() => {
    const h = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  /* ── derived ── */
  const progPct = duration ? (currentTime / duration) * 100 : 0;
  const volIcon = (muted || volume === 0) ? D.volMute : D.volFull;
  const fsIcon  = isFS ? D.fsExit : D.fsEnter;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bxv">
        <div
          ref={wrapRef}
          className={`bxv-wrap${paused ? " paused" : ""}${showUI ? " ui" : ""}`}
          onMouseMove={revealUI}
          onMouseLeave={() => { if (!paused) setShowUI(false); }}
        >
          {/* video */}
          <video
            ref={vidRef}
            src={resolvedSrc}
            poster={resolvedPoster}
            preload="metadata"
            playsInline
            onClick={togglePlay}
            onDoubleClick={(e) => { e.stopPropagation(); toggleFS(); }}
          />

          {/* bottom gradient */}
          <div className="bxv-grad" />

          {/* spinner */}
          {spinning && <div className="bxv-spin" />}

          {/* seek flash */}
          <div className={`bxv-flash${showFlash ? " on" : ""}`}>{flashText}</div>

          {/* center play/pause */}
          <div className="bxv-center" onClick={togglePlay}>
            <Icon d={paused ? D.play : D.pause} size={28} />
          </div>

          {/* controls bar */}
          <div className="bxv-bar">
            {/* progress */}
            <div
              ref={progRef}
              className="bxv-prog"
              onMouseMove={(e) => {
                const rect = progRef.current!.getBoundingClientRect();
                const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setTipPct(r * 100);
                setTipTime(formatTime(r * (duration || 0)));
              }}
              onClick={(e) => seekFromEvt(e as unknown as MouseEvent)}
              onMouseDown={(e) => {
                setDragging(true);
                seekFromEvt(e as unknown as MouseEvent);
              }}
            >
              <div className="bxv-track">
                <div className="bxv-buf" style={{ width: `${bufPct}%` }} />
                <div className="bxv-fill" style={{ width: `${progPct}%` }} />
                <div className="bxv-thumb" style={{ left: `${progPct}%` }} />
              </div>
              <div className="bxv-tip" style={{ left: `${tipPct}%` }}>{tipTime}</div>
            </div>

            {/* row */}
            <div className="bxv-row">
              {/* play */}
              <button className="bxv-btn" onClick={togglePlay} aria-label="Play / Pause">
                <Icon d={paused ? D.play : D.pause} size={18} />
              </button>

              {/* rewind 10 */}
              <button className="bxv-btn" onClick={() => seekBy(-10)} aria-label="Rewind 10s">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                  <text x="9.5" y="13.8" fontSize="5" fill="currentColor" fontFamily="Inter,sans-serif" fontWeight="700">10</text>
                </svg>
              </button>

              {/* forward 10 */}
              <button className="bxv-btn" onClick={() => seekBy(10)} aria-label="Forward 10s">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                  <text x="9.5" y="13.8" fontSize="5" fill="currentColor" fontFamily="Inter,sans-serif" fontWeight="700">10</text>
                </svg>
              </button>

              {/* volume */}
              <div className="bxv-vol">
                <button className="bxv-btn" onClick={toggleMute} aria-label="Mute">
                  <Icon d={volIcon} size={18} />
                </button>
                <div className="bxv-vol-box">
                  <input
                    type="range"
                    className="bxv-vol-in"
                    min={0} max={1} step={0.02}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const v = vidRef.current;
                      if (v) { v.volume = val; v.muted = val === 0; }
                      setVolume(val);
                      setMuted(val === 0);
                    }}
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* time */}
              <span className="bxv-time">{formatTime(currentTime)} / {formatTime(duration)}</span>

              <div className="bxv-spacer" />

              {/* speed */}
              <div className="bxv-speed">
                <button
                  className="bxv-speed-btn"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
                  aria-label="Playback speed"
                >
                  {speed === 1 ? "1x" : `${speed}x`}
                </button>
                {showMenu && (
                  <div ref={menuRef} className="bxv-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="bxv-menu-title">Speed</div>
                    {SPEEDS.map((s) => (
                      <div
                        key={s}
                        className={`bxv-menu-item${speed === s ? " sel" : ""}`}
                        onClick={() => {
                          const v = vidRef.current;
                          if (v) v.playbackRate = s;
                          setSpeed(s);
                          setShowMenu(false);
                        }}
                      >
                        <span className="bxv-check">{speed === s ? "✓" : ""}</span>
                        {s === 1 ? "Normal" : `${s}x`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* fullscreen */}
              <button className="bxv-btn" onClick={toggleFS} aria-label="Fullscreen">
                <Icon d={fsIcon} size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
