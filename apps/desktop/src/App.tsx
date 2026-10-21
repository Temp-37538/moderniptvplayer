import { useState } from "react";
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
      setMessage("Commande exécutée.");
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
        <div className="player-stage">
          <div className="stage-symbol">M</div>
          <h1>Lecteur natif</h1>
          <p>La surface vidéo libmpv intégrée doit être initialisée par le backend natif.</p>
          <div className="status-line"><span className="status-dot" />{message}</div>
        </div>
        <aside className="control-panel">
          <div className="section-eyebrow">LECTURE</div>
          <h2>Source du flux</h2>
          <label htmlFor="stream-url">URL HTTP(S)</label>
          <input
            id="stream-url"
            type="url"
            placeholder="https://serveur/stream.m3u8"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            autoComplete="off"
          />
          <button className="primary-button" disabled={busy} onClick={load}>Charger le flux</button>
          <div className="control-divider" />
          <div className="button-row">
            <button disabled={busy} onClick={() => void run("player_set_paused", { paused: false })}>Lecture</button>
            <button disabled={busy} onClick={() => void run("player_set_paused", { paused: true })}>Pause</button>
            <button disabled={busy} onClick={() => void run("player_stop")}>Arrêter</button>
          </div>
          <label htmlFor="volume">Volume <span>{volume}%</span></label>
          <input id="volume" type="range" min="0" max="100" value={volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              void run("player_set_volume", { volume: next });
            }} />
          <div className="timeline">
            <span>{formatTime(status?.positionSeconds ?? null)}</span>
            <span>{formatTime(status?.durationSeconds ?? null)}</span>
          </div>
          <button className="secondary-button" disabled={busy} onClick={() => void run("player_status")}>Actualiser l’état</button>
          <p className="hint">Cette étape fournit le shell et le pont de commandes. La vidéo ne sera réellement visible qu’après intégration et validation du moteur de rendu natif.</p>
        </aside>
      </section>
    </main>
  );
}
