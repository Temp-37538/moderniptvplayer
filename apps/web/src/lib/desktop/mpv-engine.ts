import type {
	DesktopBridge,
	DesktopCommands,
	MpvEvent,
	MpvTrack,
} from "@/lib/desktop/bridge";
import type {
	PlayerEngine,
	PlayerSnapshot,
	PlayerTrack,
} from "@/lib/player/engine";

// time-pos changes on every frame: React only needs it a few times a second.
const POSITION_NOTIFY_MS = 250;

const INITIAL: PlayerSnapshot = {
	status: "starting",
	error: null,
	paused: false,
	position: 0,
	duration: 0,
	volume: 100,
	audioTracks: [],
	subtitleTracks: [],
};

type Rect = { left: number; right: number; top: number; bottom: number };
type Margins = DesktopCommands["mpv_video_margins"];

function trackLabel(track: MpvTrack): string {
	const parts = [
		track.title,
		track.lang?.toUpperCase(),
		track.kind === "audio" ? track.codec : null,
		track.kind === "audio" && track.channels ? `${track.channels} ch` : null,
	].filter((part): part is string => Boolean(part));
	return parts.length > 0 ? parts.join(" · ") : `Track ${track.id}`;
}

function toTracks(tracks: MpvTrack[], kind: MpvTrack["kind"]): PlayerTrack[] {
	return tracks
		.filter((track) => track.kind === kind)
		.map((track) => ({
			id: track.id,
			label: trackLabel(track),
			selected: track.selected,
		}));
}

function describeFailure(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "The player failed.";
}

/**
 * Plays with mpv through the desktop app's bridge. The picture is drawn by mpv
 * behind the page, in the area given to setVideoRect.
 */
export class MpvEngine implements PlayerEngine {
	private readonly bridge: DesktopBridge;
	private snapshot: PlayerSnapshot = INITIAL;
	private readonly listeners = new Set<() => void>();
	private readonly endedListeners = new Set<() => void>();
	private unlisten: (() => void) | null = null;
	private ready: Promise<boolean> | null = null;
	private started = false;
	private disposed = false;
	private position = 0;
	private duration = 0;
	private lastNotifiedAt = 0;
	private margins: Margins | null = null;
	private appliedMargins = "";

	constructor(bridge: DesktopBridge) {
		this.bridge = bridge;
	}

	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	getSnapshot = () => this.snapshot;

	getPosition() {
		return this.position;
	}

	getDuration() {
		return this.duration;
	}

	onEnded(listener: () => void) {
		this.endedListeners.add(listener);
		return () => {
			this.endedListeners.delete(listener);
		};
	}

	async load(url: string, startAt: number) {
		if (!(await this.start())) {
			return;
		}
		this.position = 0;
		this.duration = 0;
		this.update({
			status: "loading",
			error: null,
			paused: false,
			audioTracks: [],
			subtitleTracks: [],
		});
		await this.applyMargins();
		await this.send(
			"mpv_load",
			{
				url,
				// Resuming a few seconds in is not worth the seek.
				start: startAt > 5 ? startAt : null,
			},
			true,
		);
	}

	play() {
		void this.send("mpv_pause", { paused: false });
	}

	pause() {
		void this.send("mpv_pause", { paused: true });
	}

	seekTo(seconds: number) {
		this.position = Math.max(0, seconds);
		this.update({});
		void this.send("mpv_seek", { seconds: this.position, relative: false });
	}

	seekBy(seconds: number) {
		this.position = Math.max(0, this.position + seconds);
		this.update({});
		void this.send("mpv_seek", { seconds, relative: true });
	}

	setVolume(percent: number) {
		const volume = Math.min(100, Math.max(0, percent));
		this.update({ volume });
		void this.send("mpv_volume", { percent: volume });
	}

	selectAudio(id: number | null) {
		this.update({
			audioTracks: this.snapshot.audioTracks.map((track) => ({
				...track,
				selected: track.id === id,
			})),
		});
		void this.send("mpv_audio_track", { id });
	}

	selectSubtitle(id: number | null) {
		this.update({
			subtitleTracks: this.snapshot.subtitleTracks.map((track) => ({
				...track,
				selected: track.id === id,
			})),
		});
		void this.send("mpv_sub_track", { id });
	}

	/**
	 * Tells mpv where to draw: the rectangle (in CSS pixels) that the page keeps
	 * transparent, within a viewport of the given size.
	 */
	setVideoRect(rect: Rect, viewportWidth: number, viewportHeight: number) {
		if (viewportWidth <= 0 || viewportHeight <= 0) {
			return;
		}
		const fraction = (value: number) => Math.min(0.9, Math.max(0, value));
		this.margins = {
			left: fraction(rect.left / viewportWidth),
			right: fraction((viewportWidth - rect.right) / viewportWidth),
			top: fraction(rect.top / viewportHeight),
			bottom: fraction((viewportHeight - rect.bottom) / viewportHeight),
		};
		void this.applyMargins();
	}

	dispose() {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.unlisten?.();
		this.unlisten = null;
		// Stops the playback and closes the connection to the provider: accounts
		// only allow a few simultaneous streams. Sent at once when the player is
		// up, so that it reaches mpv before the next player's init does.
		const stop = () => this.bridge.invoke("mpv_stop", {}).catch(() => {});
		if (this.started) {
			stop();
		} else {
			void this.ready?.then((ok) => {
				if (ok) {
					stop();
				}
			});
		}
		this.listeners.clear();
		this.endedListeners.clear();
	}

	private start(): Promise<boolean> {
		if (!this.ready) {
			this.ready = (async () => {
				this.unlisten = this.bridge.onMpvEvent((event) => this.handle(event));
				try {
					await this.bridge.invoke("mpv_init", { embed: true });
					this.started = true;
					return true;
				} catch (error) {
					this.fail(error);
					return false;
				}
			})();
		}
		return this.ready;
	}

	private async applyMargins() {
		if (!this.margins || !(await this.start())) {
			return;
		}
		const key = JSON.stringify(this.margins);
		if (key === this.appliedMargins) {
			return;
		}
		this.appliedMargins = key;
		await this.send("mpv_video_margins", this.margins);
	}

	/**
	 * Only a command that stops the media from playing at all (opening it) is
	 * fatal. The others can be refused while playback carries on: a seek on a
	 * live stream, a track that is not there any more.
	 */
	private async send<C extends keyof DesktopCommands>(
		command: C,
		args: DesktopCommands[C],
		fatal = false,
	) {
		if (this.disposed || !(await this.start()) || this.disposed) {
			return;
		}
		try {
			await this.bridge.invoke(command, args);
		} catch (error) {
			if (fatal) {
				this.fail(error);
			}
		}
	}

	private fail(error: unknown) {
		if (!this.disposed) {
			this.update({ status: "error", error: describeFailure(error) });
		}
	}

	private update(patch: Partial<PlayerSnapshot>) {
		this.snapshot = {
			...this.snapshot,
			position: this.position,
			duration: this.duration,
			...patch,
		};
		this.lastNotifiedAt = Date.now();
		for (const listener of this.listeners) {
			listener();
		}
	}

	private handle(event: MpvEvent) {
		if (this.disposed) {
			return;
		}
		if (event.type === "property") {
			this.handleProperty(event.name, event.value);
		} else if (event.type === "file-loaded") {
			this.update({
				status: "playing",
				error: null,
				audioTracks: toTracks(event.tracks, "audio"),
				subtitleTracks: toTracks(event.tracks, "sub"),
			});
		} else if (event.type === "end-file") {
			if (event.reason === "eof") {
				this.update({ status: "ended" });
				for (const listener of [...this.endedListeners]) {
					listener();
				}
			} else if (event.reason === "error") {
				this.update({
					status: "error",
					error: event.httpStatus
						? `The server refused the stream (HTTP ${event.httpStatus}).`
						: (event.error ?? "mpv could not play this stream."),
				});
			}
			// "stop", "quit" and "redirect" are ours or mpv's own housekeeping.
		}
	}

	private handleProperty(
		name: string,
		value: boolean | number | string | null,
	) {
		if (name === "time-pos" && typeof value === "number") {
			this.position = value;
			if (Date.now() - this.lastNotifiedAt >= POSITION_NOTIFY_MS) {
				this.update({});
			}
		} else if (name === "duration" && typeof value === "number") {
			this.duration = value;
			this.update({});
		} else if (name === "pause" && typeof value === "boolean") {
			this.update({ paused: value });
		}
	}
}
