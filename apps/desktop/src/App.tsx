import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

type PlayerStatus = {
  paused: boolean;
  positionSeconds: number | null;
  durationSeconds: number | null;
};

const formatTime = (seconds: number | null) => {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
};

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState("");
  const [volume, setVolume] = useState(80);
  const [status, setStatus] = useState<PlayerStatus | null>(null);
  const [message, setMessage] = useState("Connecte le lecteur natif pour commencer.");
  const [busy, setBusy] = useState(false);
  const desktop = isTauri();

  async function run(command: string, args?: Record<string, unknown>) {
    if (!desktop) {
      setMessage("L’interface de prévisualisation ne peut pas contrôler libmpv. Lance l’application via Tauri.");
      return;
    }
    setBusy(true);
    try {
      const result = await invoke(command, args);
      if (command === "player_status") setStatus(result as PlayerStatus);
      if (command !== "player_status") setMessage("Commande exécutée.");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "La commande du lecteur a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    if (!source.trim()) {
      setMessage("Saisis une URL HTTP(S) de flux.");
      return;
    }
    await run("player_load", { source: source.trim() });
  }

  useEffect(() => {
    if (!desktop) return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await invoke<PlayerStatus>("player_status");
        if (active) setStatus(next);
      } catch {
        // The player may not have a loaded source yet; the next refresh retries.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [desktop]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!desktop || !stage) return;
    const updateBounds = () => {
      const rect = stage.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      if (rect.width <= 0 || rect.height <= 0) return;
      void invoke("player_set_video_bounds", {
        x: Math.max(0, Math.round(rect.x * scale)),
        y: Math.max(0, Math.round(rect.y * scale)),
        width: Math.max(1, Math.round(rect.width * scale)),
        height: Math.max(1, Math.round(rect.height * scale)),
      }).catch(() => {
        // The native surface may not be ready during the first layout pass.
      });
    };
    const observer = new ResizeObserver(updateBounds);
    observer.observe(stage);
    window.addEventListener("resize", updateBounds);
    window.addEventListener("scroll", updateBounds, true);
    updateBounds();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("scroll", updateBounds, true);
    };
  }, [desktop]);

  const duration = status?.durationSeconds;
  const position = status?.positionSeconds;
  const canSeek = duration !== null && duration !== undefined && duration > 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-title">Modern IPTV Player</div>
          <div className="brand-subtitle">LECTEUR DESKTOP NATIF</div>
        </div>
        <span className={desktop ? "runtime-pill connected" : "runtime-pill"}>
          {desktop ? "Tauri connecté" : "Mode navigateur"}
        </span>
      </header>

      <section className="player-layout">
        <div ref={stageRef} className="player-stage" aria-label="Zone vidéo native">
          {!desktop && (
            <>
              <div className="stage-symbol">M</div>
              <h1>Lecteur natif</h1>
              <p>La prévisualisation navigateur ne dispose pas de la surface vidéo native de libmpv.</p>
            </>
          )}
        </div>
        <aside className="control-panel">
          <div className="section-eyebrow">LECTURE</div>
          <h2>Source du flux</h2>
          <label htmlFor="stream-url">URL HTTP(S)</label>
          <input id="stream-url" type="url" placeholder="https://serveur/stream.m3u8"
            value={source} onChange={(event) => setSource(event.target.value)} autoComplete="off" />
          <button className="primary-button" disabled={busy} onClick={load}>Charger le flux</button>
          <div className="control-divider" />
          <div className="button-row">
            <button disabled={busy} onClick={() => void run("player_set_paused", { paused: false })}>Lecture</button>
            <button disabled={busy} onClick={() => void run("player_set_paused", { paused: true })}>Pause</button>
            <button disabled={busy} onClick={() => void run("player_stop")}>Arrêter</button>
          </div>
          <div className="button-row seek-row">
            <button disabled={busy || !canSeek} onClick={() => void run("player_seek", { positionSeconds: Math.max(0, (position ?? 0) - 10) })}>−10 s</button>
            <button disabled={busy || !canSeek} onClick={() => void run("player_seek", { positionSeconds: Math.min(duration ?? 0, (position ?? 0) + 10) })}>+10 s</button>
          </div>
          <label htmlFor="volume">Volume <span>{volume}%</span></label>
          <input id="volume" type="range" min="0" max="100" value={volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              void run("player_set_volume", { volume: next });
            }} />
          <div className="timeline"><span>{formatTime(position ?? null)}</span><span>{formatTime(duration ?? null)}</span></div>
          <div className="status-line"><span className="status-dot" />{message}</div>
          <button className="secondary-button" disabled={busy} onClick={() => void run("player_status")}>Actualiser l’état</button>
          <p className="hint">Le rendu vidéo Windows utilise une surface native superposée à la zone de lecture. La résolution des flux authentifiés et la reprise des fonctionnalités IPTV restent à intégrer.</p>
        </aside>
      </section>
    </main>
  );
}
