"use client";

import type { DesktopBridge } from "@/lib/desktop/bridge";
import { MpvEngine } from "@/lib/desktop/mpv-engine";
import type { PlayerSnapshot } from "@/lib/player/engine";
import { ProgressSaver } from "@/lib/player/progress";
import type { ProgressDetails } from "@/lib/player/types";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, PauseIcon, PlayIcon, XIcon } from "lucide-react";
import Image from "next/image";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

// mpv draws behind the page, so the page has to let it through: the document
// is made see-through and everything but the player is hidden. This <style>
// only exists while the player is open.
const SEE_THROUGH_CSS = `
html, body { background: transparent !important; }
html { color-scheme: normal !important; }
body > *:not([data-desktop-player]) { visibility: hidden !important; }
`;

const IDLE: PlayerSnapshot = {
	status: "starting",
	error: null,
	paused: false,
	position: 0,
	duration: 0,
	volume: 100,
	audioTracks: [],
	subtitleTracks: [],
};

const noSubscribe = () => () => {};

function formatClock(totalSeconds: number) {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (value: number) => String(value).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const barButton =
	"inline-flex h-8 items-center justify-center rounded-md bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white/70";

const barSelect =
	"h-8 max-w-48 rounded-md border border-white/20 bg-neutral-900 px-2 text-sm text-white [color-scheme:dark]";

type DesktopPlayerProps = {
	bridge: DesktopBridge;
	/** The provider's own address: mpv plays it from the user's connection. */
	url: string;
	title?: string;
	poster?: string;
	/** Resume position, in seconds. */
	startAt?: number;
	live?: boolean;
	/** Opens the player straight away instead of waiting for a click. */
	autoPlay?: boolean;
	progress?: ProgressDetails;
	/** Called once the media has played to its end (after progress is saved). */
	onEnded?: () => void;
	className?: string;
};

/**
 * The player of the desktop app. On the page it is a card with a play button;
 * playing opens a full-window player drawn by mpv, with the site's own
 * controls around it.
 */
export function DesktopPlayer({
	bridge,
	url,
	title,
	poster,
	startAt = 0,
	live = false,
	autoPlay = false,
	progress,
	onEnded,
	className,
}: DesktopPlayerProps) {
	const [open, setOpen] = useState(autoPlay);
	const close = useCallback(() => setOpen(false), []);
	const resumeAt = !live && startAt > 5 ? startAt : 0;

	return (
		<>
			<div
				className={cn(
					"relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-black",
					className,
				)}
			>
				{poster ? (
					<Image
						src={poster}
						alt=""
						fill
						unoptimized
						sizes="100vw"
						className="object-cover opacity-60"
					/>
				) : null}
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
					<button
						type="button"
						onClick={() => setOpen(true)}
						aria-label={live ? "Watch live" : "Play"}
						className="flex size-16 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white/70"
					>
						<PlayIcon className="size-8" />
					</button>
					<p className="text-sm text-white/80">
						{live
							? "Watch live"
							: resumeAt > 0
								? `Resume from ${formatClock(resumeAt)}`
								: "Play"}
					</p>
				</div>
			</div>
			{open ? (
				<DesktopOverlay
					bridge={bridge}
					url={url}
					title={title ?? progress?.itemName ?? "Now playing"}
					startAt={startAt}
					live={live}
					progress={progress}
					onEnded={onEnded}
					onClose={close}
				/>
			) : null}
		</>
	);
}

type DesktopOverlayProps = {
	bridge: DesktopBridge;
	url: string;
	title: string;
	startAt: number;
	live: boolean;
	progress?: ProgressDetails;
	onEnded?: () => void;
	onClose: () => void;
};

function DesktopOverlay({
	bridge,
	url,
	title,
	startAt,
	live,
	progress,
	onEnded,
	onClose,
}: DesktopOverlayProps) {
	const [engine, setEngine] = useState<MpvEngine | null>(null);
	// Bumped to start over with a new player: "try again" and "watch again" do
	// not reuse the one that failed or reached the end.
	const [attempt, setAttempt] = useState(0);
	const holeRef = useRef<HTMLDivElement>(null);

	// Where playback resumes is decided when the player opens: it must not
	// restart the media when the stored position changes while it plays.
	const startRef = useRef(startAt);
	const progressRef = useRef(progress);
	const onEndedRef = useRef(onEnded);
	useEffect(() => {
		progressRef.current = progress;
		onEndedRef.current = onEnded;
	});
	const progressKey = progress
		? `${progress.playlistId}|${progress.itemType}|${progress.itemId}`
		: "";

	const snapshot = useSyncExternalStore(
		engine ? engine.subscribe : noSubscribe,
		engine ? engine.getSnapshot : () => IDLE,
		() => IDLE,
	);

	// One engine per playback attempt; it is released when it ends or closes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt only restarts the engine
	useEffect(() => {
		const created = new MpvEngine(bridge);
		setEngine(created);
		return () => created.dispose();
	}, [bridge, attempt]);

	// Tells mpv where the picture goes: the transparent area of the page.
	useEffect(() => {
		const hole = holeRef.current;
		if (!engine || !hole) {
			return;
		}
		let frame = 0;
		const apply = () =>
			engine.setVideoRect(
				hole.getBoundingClientRect(),
				window.innerWidth,
				window.innerHeight,
			);
		const sync = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(apply);
		};
		const observer = new ResizeObserver(sync);
		observer.observe(hole);
		window.addEventListener("resize", sync);
		// Measured right away, so mpv has its margins before it opens the media.
		apply();
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener("resize", sync);
		};
	}, [engine]);

	useEffect(() => {
		if (engine) {
			void engine.load(url, live ? 0 : startRef.current);
		}
	}, [engine, url, live]);

	// Declared before the callback below: the final save must come first.
	useEffect(() => {
		if (!engine || !progressKey || live) {
			return;
		}
		const saver = new ProgressSaver(() => progressRef.current);
		const save = (force: boolean, ended = false) => {
			const duration = engine.getDuration();
			saver.save(
				{
					position: ended ? duration : engine.getPosition(),
					duration,
					ended,
				},
				force,
			);
		};
		let wasPaused = false;
		const unsubscribe = engine.subscribe(() => {
			const { paused } = engine.getSnapshot();
			save(paused && !wasPaused);
			wasPaused = paused;
		});
		const offEnded = engine.onEnded(() => save(true, true));
		const onHidden = () => {
			if (document.visibilityState === "hidden") {
				save(true);
			}
		};
		const onPageHide = () => save(true);
		document.addEventListener("visibilitychange", onHidden);
		window.addEventListener("pagehide", onPageHide);
		return () => {
			save(true);
			unsubscribe();
			offEnded();
			document.removeEventListener("visibilitychange", onHidden);
			window.removeEventListener("pagehide", onPageHide);
		};
	}, [engine, progressKey, live]);

	useEffect(() => {
		if (!engine || live) {
			return;
		}
		return engine.onEnded(() => onEndedRef.current?.());
	}, [engine, live]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			const tag = target instanceof HTMLElement ? target.tagName : "";
			if (event.key === "Escape") {
				// Escape closes a drop-down list first, not the player.
				if (tag !== "SELECT") {
					event.preventDefault();
					onClose();
				}
				return;
			}
			if (!engine || ["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(tag)) {
				return;
			}
			if (event.key === " ") {
				event.preventDefault();
				if (engine.getSnapshot().paused) {
					engine.play();
				} else {
					engine.pause();
				}
			} else if (!live && event.key === "ArrowLeft") {
				engine.seekBy(-10);
			} else if (!live && event.key === "ArrowRight") {
				engine.seekBy(10);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [engine, live, onClose]);

	const restart = (from: number) => {
		startRef.current = from;
		setEngine(null);
		setAttempt((count) => count + 1);
	};

	return createPortal(
		<div
			data-desktop-player
			className={cn(
				"pointer-events-auto fixed inset-0 flex flex-col text-white",
				// Until mpv's window exists there is nothing behind the page.
				snapshot.status === "starting" ? "bg-black" : "bg-transparent",
			)}
			style={{ zIndex: 2147483000 }}
		>
			<style>{SEE_THROUGH_CSS}</style>
			<div className="flex h-12 shrink-0 items-center gap-3 bg-black px-4">
				<p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close the player"
					className={cn(barButton, "w-8 px-0")}
				>
					<XIcon className="size-4" />
				</button>
			</div>

			<div ref={holeRef} className="relative min-h-0 flex-1 bg-transparent">
				{snapshot.status === "starting" || snapshot.status === "loading" ? (
					<p className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-md bg-black/60 px-3 py-1.5 text-sm text-white/90">
						Loading…
					</p>
				) : null}
				{snapshot.status === "error" ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black p-6 text-center text-sm">
						<AlertCircleIcon className="size-6" />
						<p>This stream can't be played.</p>
						{snapshot.error ? (
							<p className="max-w-prose break-words text-white/70">
								{snapshot.error}
							</p>
						) : null}
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => restart(startRef.current)}
								className={barButton}
							>
								Try again
							</button>
							<button type="button" onClick={onClose} className={barButton}>
								Close
							</button>
						</div>
					</div>
				) : null}
				{snapshot.status === "ended" ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-sm">
						<p>{live ? "The stream has ended." : "Finished."}</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => restart(0)}
								className={barButton}
							>
								{live ? "Reconnect" : "Watch again"}
							</button>
							<button type="button" onClick={onClose} className={barButton}>
								Close
							</button>
						</div>
					</div>
				) : null}
			</div>

			<Controls engine={engine} snapshot={snapshot} live={live} />
		</div>,
		document.body,
	);
}

function Controls({
	engine,
	snapshot,
	live,
}: {
	engine: MpvEngine | null;
	snapshot: PlayerSnapshot;
	live: boolean;
}) {
	const [scrub, setScrub] = useState<number | null>(null);
	const duration = snapshot.duration;
	const shown = Math.min(scrub ?? snapshot.position, Math.max(duration, 1));
	const audio = snapshot.audioTracks.find((track) => track.selected);
	const subtitles = snapshot.subtitleTracks.find((track) => track.selected);

	const commitScrub = () => {
		if (engine && scrub !== null) {
			engine.seekTo(scrub);
		}
		setScrub(null);
	};

	return (
		<div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 bg-black px-4 py-3">
			<button
				type="button"
				disabled={!engine}
				onClick={() => (snapshot.paused ? engine?.play() : engine?.pause())}
				aria-label={snapshot.paused ? "Play" : "Pause"}
				className={cn(barButton, "w-9 px-0")}
			>
				{snapshot.paused ? (
					<PlayIcon className="size-4" />
				) : (
					<PauseIcon className="size-4" />
				)}
			</button>
			{live ? (
				<span className="text-sm font-medium text-white/80">Live</span>
			) : (
				<>
					<button
						type="button"
						disabled={!engine}
						onClick={() => engine?.seekBy(-10)}
						className={barButton}
					>
						-10 s
					</button>
					<button
						type="button"
						disabled={!engine}
						onClick={() => engine?.seekBy(10)}
						className={barButton}
					>
						+10 s
					</button>
					<input
						type="range"
						aria-label="Position"
						min={0}
						max={Math.max(duration, 1)}
						step={1}
						value={shown}
						disabled={!engine || duration <= 0}
						onChange={(event) => setScrub(Number(event.target.value))}
						onPointerUp={commitScrub}
						onKeyUp={commitScrub}
						onBlur={commitScrub}
						className="h-8 min-w-40 flex-1 accent-white"
					/>
					<span className="text-sm tabular-nums text-white/80">
						{formatClock(shown)} / {formatClock(duration)}
					</span>
				</>
			)}
			<label className="flex items-center gap-2 text-sm text-white/80">
				Volume
				<input
					type="range"
					aria-label="Volume"
					min={0}
					max={100}
					step={1}
					value={snapshot.volume}
					disabled={!engine}
					onChange={(event) => engine?.setVolume(Number(event.target.value))}
					className="h-8 w-24 accent-white"
				/>
			</label>
			{snapshot.audioTracks.length > 1 ? (
				<label className="flex items-center gap-2 text-sm text-white/80">
					Audio
					<select
						value={audio?.id ?? ""}
						onChange={(event) =>
							engine?.selectAudio(Number(event.target.value))
						}
						className={barSelect}
					>
						{snapshot.audioTracks.map((track) => (
							<option key={track.id} value={track.id}>
								{track.label}
							</option>
						))}
					</select>
				</label>
			) : null}
			{snapshot.subtitleTracks.length > 0 ? (
				<label className="flex items-center gap-2 text-sm text-white/80">
					Subtitles
					<select
						value={subtitles?.id ?? ""}
						onChange={(event) =>
							engine?.selectSubtitle(
								event.target.value === "" ? null : Number(event.target.value),
							)
						}
						className={barSelect}
					>
						<option value="">Off</option>
						{snapshot.subtitleTracks.map((track) => (
							<option key={track.id} value={track.id}>
								{track.label}
							</option>
						))}
					</select>
				</label>
			) : null}
		</div>
	);
}
