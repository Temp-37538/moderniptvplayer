/**
 * What the player controls need from an engine, whatever plays the media.
 * The desktop app's engine is mpv (see lib/desktop/mpv-engine.ts); the web
 * player still drives a video element directly.
 */
export type PlayerStatus =
	| "starting"
	| "loading"
	| "playing"
	| "ended"
	| "error";

export type PlayerTrack = {
	id: number;
	label: string;
	selected: boolean;
};

export type PlayerSnapshot = {
	status: PlayerStatus;
	error: string | null;
	paused: boolean;
	/** Seconds. Refreshed a few times per second, not on every frame. */
	position: number;
	duration: number;
	/** 0 to 100. */
	volume: number;
	audioTracks: PlayerTrack[];
	subtitleTracks: PlayerTrack[];
};

export interface PlayerEngine {
	subscribe(listener: () => void): () => void;
	getSnapshot(): PlayerSnapshot;
	/** Exact values, for saving progress. */
	getPosition(): number;
	getDuration(): number;
	load(url: string, startAt: number): Promise<void>;
	play(): void;
	pause(): void;
	seekTo(seconds: number): void;
	seekBy(seconds: number): void;
	setVolume(percent: number): void;
	selectAudio(id: number | null): void;
	selectSubtitle(id: number | null): void;
	/** Called once the media has played to its end. */
	onEnded(listener: () => void): () => void;
	dispose(): void;
}
