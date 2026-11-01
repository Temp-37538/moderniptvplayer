import { useSyncExternalStore } from "react";

/**
 * The contract with the desktop app (desktop/ in this repository).
 *
 * The app injects `window.iptvDesktop` before the page loads, and only on the
 * origins of its site.json. The site never talks to Tauri directly: it can
 * only call the commands below, and there is no raw mpv command channel.
 */
export type MpvTrack = {
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

export type MpvEvent =
	| {
			type: "property";
			name: string;
			value: boolean | number | string | null;
	  }
	| { type: "file-loaded"; tracks: MpvTrack[] }
	| {
			type: "end-file";
			reason: "eof" | "stop" | "quit" | "error" | "redirect" | "unknown";
			error: string | null;
			httpStatus: number | null;
	  }
	| { type: "start-file" | "seek" | "playback-restart" | "shutdown" }
	| { type: "log"; level: string; text: string };

/** The commands the website may call, with their arguments. */
export type DesktopCommands = {
	mpv_init: { embed: boolean };
	mpv_load: { url: string; start: number | null };
	mpv_pause: { paused: boolean };
	mpv_seek: { seconds: number; relative: boolean };
	mpv_stop: Record<string, never>;
	mpv_volume: { percent: number };
	mpv_audio_track: { id: number | null };
	mpv_sub_track: { id: number | null };
	mpv_video_margins: {
		left: number;
		right: number;
		top: number;
		bottom: number;
	};
};

export type DesktopBridge = {
	version: 1;
	invoke<C extends keyof DesktopCommands>(
		command: C,
		args: DesktopCommands[C],
	): Promise<unknown>;
	/** Returns the function that stops listening. */
	onMpvEvent(listener: (event: MpvEvent) => void): () => void;
};

declare global {
	interface Window {
		iptvDesktop?: DesktopBridge;
	}
}

export function getDesktopBridge(): DesktopBridge | null {
	if (typeof window === "undefined") {
		return null;
	}
	const bridge = window.iptvDesktop;
	return bridge?.version === 1 ? bridge : null;
}

const subscribe = () => () => {};

/**
 * The desktop bridge, or null in a normal browser. Null on the server and
 * during hydration, so the server markup stays the web player's.
 */
export function useDesktopBridge(): DesktopBridge | null {
	return useSyncExternalStore(subscribe, getDesktopBridge, () => null);
}
