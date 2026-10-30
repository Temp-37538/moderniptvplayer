import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./style.css";

type Track = {
	id: number;
	kind: "video" | "audio" | "sub";
	codec: string | null;
	lang: string | null;
	title: string | null;
	default: boolean;
	selected: boolean;
	channels: number | null;
	width: number | null;
	height: number | null;
};

type MpvEvent =
	| { type: "property"; name: string; value: number | boolean | string | null }
	| { type: "file-loaded"; tracks: Track[] }
	| { type: "end-file"; reason: string; error: string | null; httpStatus: number | null }
	| { type: "log"; level: string; text: string }
	| { type: "start-file" | "seek" | "playback-restart" | "shutdown" };

type InitInfo = { version: string; api: string; embedded: boolean; decoders: [string, boolean][] };
type Info = {
	mode: string;
	video_format: string | null;
	video_codec: string | null;
	audio_codec: string | null;
	hwdec: string | null;
	size: string | null;
	fps: string | null;
	vo: string | null;
	ao: string | null;
};

function el<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) {
		throw new Error(`missing #${id}`);
	}
	return node as T;
}

const ui = {
	status: el<HTMLSpanElement>("status"),
	hole: el<HTMLDivElement>("video-hole"),
	hint: el<HTMLParagraphElement>("hole-hint"),
	play: el<HTMLButtonElement>("play"),
	seek: el<HTMLInputElement>("seek"),
	time: el<HTMLSpanElement>("time"),
	volume: el<HTMLInputElement>("volume"),
	audio: el<HTMLSelectElement>("audio"),
	subs: el<HTMLSelectElement>("subs"),
	url: el<HTMLInputElement>("url"),
	start: el<HTMLInputElement>("start"),
	info: el<HTMLPreElement>("info"),
	log: el<HTMLPreElement>("log"),
};

const state = { started: false, embedded: false, paused: false, position: 0, duration: 0, dragging: false };

function setStatus(text: string, tone: "" | "ok" | "bad" = "") {
	ui.status.textContent = text;
	ui.status.className = `status ${tone}`.trim();
}

function formatTime(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function log(line: string) {
	const lines = ui.log.textContent ? ui.log.textContent.split("\n") : [];
	lines.push(line);
	ui.log.textContent = lines.slice(-400).join("\n");
	ui.log.scrollTop = ui.log.scrollHeight;
}

async function call<T = void>(command: string, args?: Record<string, unknown>): Promise<T | undefined> {
	try {
		return await invoke<T>(command, args);
	} catch (error) {
		setStatus(String(error), "bad");
		log(`! ${command}: ${String(error)}`);
		return undefined;
	}
}

// ---- where the video goes: the transparent area, as margins of the window ----

let marginFrame = 0;
function syncMargins() {
	if (!state.started || !state.embedded) {
		return;
	}
	cancelAnimationFrame(marginFrame);
	marginFrame = requestAnimationFrame(() => {
		const r = ui.hole.getBoundingClientRect();
		const w = window.innerWidth;
		const h = window.innerHeight;
		void call("mpv_video_margins", {
			left: r.left / w,
			right: (w - r.right) / w,
			top: r.top / h,
			bottom: (h - r.bottom) / h,
		});
	});
}
new ResizeObserver(syncMargins).observe(ui.hole);
window.addEventListener("resize", syncMargins);

// ---- start ----

async function start(embed: boolean) {
	const info = await call<InitInfo>("mpv_init", { embed });
	if (!info) {
		return;
	}
	state.started = true;
	state.embedded = info.embedded;
	const decoders = info.decoders.map(([codec, ok]) => `${codec} ${ok ? "yes" : "NO"}`).join(", ");
	setStatus(`libmpv ${info.version}, ${info.embedded ? "embedded" : "separate window"}`, "ok");
	log(`libmpv ${info.version} (API ${info.api}); decoders: ${decoders}`);
	ui.hint.textContent = info.embedded
		? "Paste a stream URL, then Load. The video should appear in this area."
		: "Paste a stream URL, then Load. The video opens in its own window.";
	syncMargins();
}

el("init-embed").addEventListener("click", () => void start(true));
el("init-window").addEventListener("click", () => void start(false));

// ---- controls ----

el("load").addEventListener("click", async () => {
	const url = ui.url.value.trim();
	if (!url) {
		setStatus("paste a stream URL first", "bad");
		return;
	}
	const startAt = Number.parseFloat(ui.start.value);
	setStatus("loading...");
	ui.audio.replaceChildren();
	ui.subs.replaceChildren();
	await call("mpv_load", { url, start: Number.isFinite(startAt) && startAt > 0 ? startAt : null });
});
el("stop").addEventListener("click", () => void call("mpv_stop"));
ui.play.addEventListener("click", () => void call("mpv_pause", { paused: !state.paused }));
el("back").addEventListener("click", () => void call("mpv_seek", { seconds: -10, relative: true }));
el("fwd").addEventListener("click", () => void call("mpv_seek", { seconds: 10, relative: true }));
ui.volume.addEventListener("input", () => void call("mpv_volume", { percent: Number(ui.volume.value) }));
ui.seek.addEventListener("input", () => {
	state.dragging = true;
});
ui.seek.addEventListener("change", () => {
	state.dragging = false;
	if (state.duration > 0) {
		void call("mpv_seek", { seconds: (Number(ui.seek.value) / 1000) * state.duration, relative: false });
	}
});
ui.audio.addEventListener("change", () => {
	void call("mpv_audio_track", { id: ui.audio.value === "" ? null : Number(ui.audio.value) });
});
ui.subs.addEventListener("change", () => {
	void call("mpv_sub_track", { id: ui.subs.value === "" ? null : Number(ui.subs.value) });
});

el("report").addEventListener("click", async () => {
	const report = await call<string>("mpv_report");
	if (!report) {
		return;
	}
	try {
		await navigator.clipboard.writeText(report);
		setStatus("report copied: paste it in the conversation", "ok");
	} catch {
		ui.log.textContent = report;
		setStatus("could not use the clipboard: the report is in the log box", "bad");
	}
});

// ---- events from mpv ----

function fillTracks(tracks: Track[]) {
	const label = (t: Track) => {
		const parts = [`#${t.id}`, t.lang ?? "", t.codec ?? "", t.channels ? `${t.channels} ch` : "", t.title ?? ""];
		return parts.filter(Boolean).join(" ");
	};
	const fill = (select: HTMLSelectElement, kind: Track["kind"]) => {
		select.replaceChildren(new Option("off", ""));
		for (const t of tracks.filter((track) => track.kind === kind)) {
			select.add(new Option(label(t), String(t.id), false, t.selected));
		}
	};
	fill(ui.audio, "audio");
	fill(ui.subs, "sub");
}

async function refreshInfo() {
	const info = await call<Info>("mpv_info");
	if (!info) {
		return;
	}
	ui.info.textContent = [
		`mode:      ${info.mode}`,
		`video:     ${info.video_format ?? "-"} (${info.video_codec ?? "-"})`,
		`audio:     ${info.audio_codec ?? "-"}`,
		`size/fps:  ${info.size ?? "-"} @ ${info.fps ?? "-"}`,
		`hwdec:     ${info.hwdec ?? "-"}`,
		`output:    vo=${info.vo ?? "-"} ao=${info.ao ?? "-"}`,
	].join("\n");
}

function onEvent(event: MpvEvent) {
	switch (event.type) {
		case "property": {
			if (event.name === "time-pos" && typeof event.value === "number") {
				state.position = event.value;
			} else if (event.name === "duration" && typeof event.value === "number") {
				state.duration = event.value;
			} else if (event.name === "pause" && typeof event.value === "boolean") {
				state.paused = event.value;
				ui.play.textContent = event.value ? "Play" : "Pause";
			}
			ui.time.textContent = `${formatTime(state.position)} / ${formatTime(state.duration)}`;
			if (!state.dragging && state.duration > 0) {
				ui.seek.value = String(Math.round((state.position / state.duration) * 1000));
			}
			break;
		}
		case "file-loaded":
			fillTracks(event.tracks);
			setStatus("playing", "ok");
			log(`loaded: ${event.tracks.map((t) => `${t.kind}:${t.codec ?? "?"}`).join(" ")}`);
			void refreshInfo();
			setTimeout(() => void refreshInfo(), 1500);
			break;
		case "end-file":
			if (event.reason === "error") {
				const http = event.httpStatus ? ` (the server answered HTTP ${event.httpStatus})` : "";
				setStatus(`could not play: ${event.error ?? "error"}${http}`, "bad");
			} else if (event.reason === "eof") {
				setStatus("finished");
			}
			log(`end-file: ${event.reason}${event.error ? ` ${event.error}` : ""}`);
			break;
		case "log":
			if (event.level !== "v" && event.level !== "debug" && event.level !== "trace") {
				log(event.text);
			}
			break;
		case "start-file":
			setStatus("opening...");
			break;
		default:
			break;
	}
}

void listen<MpvEvent>("mpv-event", (message) => onEvent(message.payload));
