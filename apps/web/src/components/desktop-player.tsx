"use client";

import type { DesktopBridge } from "@/lib/desktop/bridge";
import {
	carryFullscreen,
	clearCarriedFullscreen,
	requestWindowFullscreen,
	setFullscreenActive,
	startsInFullscreen,
} from "@/lib/desktop/fullscreen";
import { MpvEngine } from "@/lib/desktop/mpv-engine";
import { startSeeThrough } from "@/lib/desktop/see-through";
import type { PlayerSnapshot } from "@/lib/player/engine";
import { ProgressSaver } from "@/lib/player/progress";
import type { ProgressDetails } from "@/lib/player/types";
import { cn } from "@/lib/utils";
import {
	AlertCircleIcon,
	MaximizeIcon,
	MinimizeIcon,
	PauseIcon,
	PlayIcon,
	RotateCcwIcon,
	Volume2Icon,
	XIcon,
} from "lucide-react";
import Image from "next/image";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

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

// Controls disappear after this long without a mouse move while playing.
const HIDE_CONTROLS_MS = 3000;

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
	"h-8 max-w-40 rounded-md border border-white/20 bg-neutral-900 px-2 text-sm text-white [color-scheme:dark]";

type DesktopPlayerProps = {
	bridge: DesktopBridge;
	/** The provider's own address: mpv plays it from the user's connection. */
	url: string;
	title?: string;
	poster?: string;
	/** Resume position, in seconds. */
	startAt?: number;
	live?: boolean;
	/** Starts playing straight away instead of waiting for a click. */
	autoPlay?: boolean;
	progress?: ProgressDetails;
	/** Called once the media has played to its end (after progress is saved). */
	onEnded?: () => void;
	className?: string;
	/** Called when the player is closed (the close button, Esc). */
	onClose?: () => void;
	/** Shown in the title bar, before the close button. */
	topBarExtra?: ReactNode;
};

/**
 * The player of the desktop app. It is a card on the page: a play button, then
 * the picture drawn by mpv in the card itself, with the site's own controls on
 * top of it. The full screen button makes it fill the whole window (and the
 * screen, when the app can).
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
	onClose,
	topBarExtra,
}: DesktopPlayerProps) {
	const [open, setOpen] = useState(autoPlay);
	// The next episode keeps the full screen the previous one was left in.
	const [expanded, setExpanded] = useState(
		() => autoPlay && startsInFullscreen(),
	);
	const frameRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	const closedOnPurpose = useRef(false);
	const expandedRef = useRef(expanded);
	useEffect(() => {
		onCloseRef.current = onClose;
		expandedRef.current = expanded;
	});
	const close = useCallback(() => {
		closedOnPurpose.current = true;
		setOpen(false);
		setExpanded(false);
		onCloseRef.current?.();
	}, []);
	const resumeAt = !live && startAt > 5 ? startAt : 0;

	useEffect(() => {
		clearCarriedFullscreen();
		return () => {
			if (!closedOnPurpose.current && expandedRef.current) {
				carryFullscreen();
			}
		};
	}, []);

	// The window itself goes full screen with the player (a no-op in an app
	// that has no such command: the player then just fills the window).
	useEffect(() => {
		if (!open || !expanded) {
			return;
		}
		setFullscreenActive(true);
		requestWindowFullscreen(bridge, true);
		return () => {
			setFullscreenActive(false);
			requestWindowFullscreen(bridge, false);
		};
	}, [bridge, open, expanded]);

	// Opened from a long page (an episode further down): bring the card in view.
	useEffect(() => {
		if (autoPlay && !expandedRef.current) {
			frameRef.current?.scrollIntoView({ block: "nearest" });
		}
	}, [autoPlay]);

	return (
		<div
			ref={frameRef}
			className={cn(
				"relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-black",
				className,
			)}
		>
			{open ? (
				<DesktopSession
					bridge={bridge}
					url={url}
					title={title ?? progress?.itemName ?? "Now playing"}
					startAt={startAt}
					live={live}
					progress={progress}
					onEnded={onEnded}
					onClose={close}
					topBarExtra={topBarExtra}
					expanded={expanded}
					setExpanded={setExpanded}
				/>
			) : (
				<>
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
				</>
			)}
		</div>
	);
}

type DesktopSessionProps = {
	bridge: DesktopBridge;
	url: string;
	title: string;
	startAt: number;
	live: boolean;
	progress?: ProgressDetails;
	onEnded?: () => void;
	onClose: () => void;
	topBarExtra?: ReactNode;
	expanded: boolean;
	setExpanded: (expanded: boolean) => void;
};

/** One playback: the mpv session, the progress saving and the keyboard. */
function DesktopSession({
	bridge,
	url,
	title,
	startAt,
	live,
	progress,
	onEnded,
	onClose,
	topBarExtra,
	expanded,
	setExpanded,
}: DesktopSessionProps) {
	const [engine, setEngine] = useState<MpvEngine | null>(null);
	// Bumped to start over with a new player: "try again" and "watch again" do
	// not reuse the one that failed or reached the end.
	const [attempt, setAttempt] = useState(0);

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
	const ended = snapshot.status === "ended";

	// One engine per playback attempt; it is released when it ends or closes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt only restarts the engine
	useEffect(() => {
		const created = new MpvEngine(bridge);
		setEngine(created);
		return () => created.dispose();
	}, [bridge, attempt]);

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

	const restart = useCallback((from: number) => {
		startRef.current = from;
		setEngine(null);
		setAttempt((count) => count + 1);
	}, []);

	// After the end mpv has nothing open: going back in the film means opening
	// it again at that point, not seeking.
	const seekTo = (seconds: number) => {
		if (ended) {
			restart(seconds);
		} else {
			engine?.seekTo(seconds);
		}
	};
	const seekBy = (delta: number) => {
		if (!ended) {
			engine?.seekBy(delta);
		} else if (delta < 0) {
			restart(Math.max(0, snapshot.duration + delta));
		}
	};
	const togglePlay = () => {
		if (ended) {
			restart(0);
		} else if (engine?.getSnapshot().paused) {
			engine.play();
		} else {
			engine?.pause();
		}
	};
	const toggleExpanded = () => setExpanded(!expanded);

	const handlers = useRef({ seekBy, togglePlay, toggleExpanded });
	useEffect(() => {
		handlers.current = { seekBy, togglePlay, toggleExpanded };
	});

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			const tag = target instanceof HTMLElement ? target.tagName : "";
			if (event.key === "Escape") {
				// Escape closes a drop-down list first, not the player; in full
				// screen it only leaves the full screen.
				if (tag !== "SELECT") {
					event.preventDefault();
					if (expanded) {
						setExpanded(false);
					} else {
						onClose();
					}
				}
				return;
			}
			if (!engine || ["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(tag)) {
				return;
			}
			if (event.key === " ") {
				event.preventDefault();
				handlers.current.togglePlay();
			} else if (event.key === "f" || event.key === "F") {
				handlers.current.toggleExpanded();
			} else if (!live && event.key === "ArrowLeft") {
				handlers.current.seekBy(-10);
			} else if (!live && event.key === "ArrowRight") {
				handlers.current.seekBy(10);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [engine, live, expanded, setExpanded, onClose]);

	const stage = (
		<Stage
			engine={engine}
			snapshot={snapshot}
			title={title}
			live={live}
			expanded={expanded}
			topBarExtra={topBarExtra}
			onClose={onClose}
			onToggleExpanded={toggleExpanded}
			onTogglePlay={togglePlay}
			onSeekTo={seekTo}
			onSeekBy={seekBy}
			onRetry={() => restart(startRef.current)}
			onRestart={() => restart(0)}
		/>
	);
	// In full screen the stage leaves the card for the whole window; the
	// playback (this component) stays where it is.
	return expanded ? createPortal(stage, document.body) : stage;
}

/** Shows the controls while the mouse moves, hides them while it is still. */
function useAutoHide(enabled: boolean) {
	const [visible, setVisible] = useState(true);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const held = useRef(false);

	const stop = useCallback(() => {
		if (timer.current !== null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	}, []);
	const arm = useCallback(() => {
		stop();
		if (enabled && !held.current) {
			timer.current = setTimeout(() => setVisible(false), HIDE_CONTROLS_MS);
		}
	}, [enabled, stop]);
	const wake = useCallback(() => {
		setVisible(true);
		arm();
	}, [arm]);
	// While the mouse is on the controls, or a drop-down list is open.
	const hold = useCallback(
		(value: boolean) => {
			held.current = value;
			if (value) {
				stop();
				setVisible(true);
			} else {
				arm();
			}
		},
		[arm, stop],
	);

	useEffect(() => {
		if (enabled) {
			arm();
		} else {
			stop();
			setVisible(true);
		}
		return stop;
	}, [enabled, arm, stop]);

	return { visible: !enabled || visible, wake, hold };
}

type StageProps = {
	engine: MpvEngine | null;
	snapshot: PlayerSnapshot;
	title: string;
	live: boolean;
	expanded: boolean;
	topBarExtra?: ReactNode;
	onClose: () => void;
	onToggleExpanded: () => void;
	onTogglePlay: () => void;
	onSeekTo: (seconds: number) => void;
	onSeekBy: (delta: number) => void;
	onRetry: () => void;
	onRestart: () => void;
};

/**
 * What the person sees: a transparent area where mpv's picture shows, and the
 * controls over it. In the card it fills the card; in full screen it fills
 * the window.
 */
function Stage({
	engine,
	snapshot,
	title,
	live,
	expanded,
	topBarExtra,
	onClose,
	onToggleExpanded,
	onTogglePlay,
	onSeekTo,
	onSeekBy,
	onRetry,
	onRestart,
}: StageProps) {
	const holeRef = useRef<HTMLDivElement>(null);
	const { status } = snapshot;
	const ended = status === "ended";
	const { visible, wake, hold } = useAutoHide(
		status === "playing" && !snapshot.paused,
	);

	// Tells mpv where the picture goes (the hole) and makes the page see
	// through there. It follows the hole when the page scrolls or resizes.
	useEffect(() => {
		const hole = holeRef.current;
		if (!engine || !hole) {
			return;
		}
		const seeThrough = startSeeThrough(hole, expanded);
		let frame = 0;
		const apply = () => {
			const rect = hole.getBoundingClientRect();
			seeThrough.update(rect);
			engine.setVideoRect(rect, window.innerWidth, window.innerHeight);
		};
		const sync = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(apply);
		};
		const observer = new ResizeObserver(sync);
		observer.observe(hole);
		window.addEventListener("resize", sync);
		// Any scrolling container, not only the window.
		document.addEventListener("scroll", sync, { capture: true, passive: true });
		// Measured right away, so mpv has its margins before it opens the media.
		apply();
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener("resize", sync);
			document.removeEventListener("scroll", sync, { capture: true });
			seeThrough.stop();
		};
	}, [engine, expanded]);

	const showBars = visible;
	return (
		<div
			data-desktop-player={expanded ? "" : undefined}
			className={cn(
				"text-white",
				expanded ? "pointer-events-auto fixed inset-0" : "absolute inset-0",
				!showBars && "cursor-none",
			)}
			style={expanded ? { zIndex: 2147483000 } : undefined}
			onPointerMove={wake}
			onPointerDown={wake}
		>
			{/* Black until mpv's window shows something: nothing is behind the
			    page before that. */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard has Space and F */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: the picture area is a mouse shortcut, the buttons below are the accessible controls */}
			<div
				ref={holeRef}
				className={cn(
					"absolute inset-0",
					status === "playing" ? "bg-transparent" : "bg-black",
				)}
				// A click on the picture after the end must not start the film over.
				onClick={ended ? undefined : onTogglePlay}
				onDoubleClick={onToggleExpanded}
			/>

			{status === "starting" || status === "loading" ? (
				<p className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-md bg-black/60 px-3 py-1.5 text-sm text-white/90">
					Loading…
				</p>
			) : null}

			{status === "error" ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black p-6 text-center text-sm">
					<AlertCircleIcon className="size-6" />
					<p>This stream can't be played.</p>
					{snapshot.error ? (
						<p className="max-w-prose break-words text-white/70">
							{snapshot.error}
						</p>
					) : null}
					<div className="flex gap-2">
						<button type="button" onClick={onRetry} className={barButton}>
							Try again
						</button>
						<button type="button" onClick={onClose} className={barButton}>
							Close
						</button>
					</div>
				</div>
			) : null}

			{ended ? (
				<div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-xl bg-black/70 px-6 py-4 text-center text-sm">
					<p>{live ? "The stream has ended." : "Finished."}</p>
					<div className="flex gap-2">
						<button type="button" onClick={onRestart} className={barButton}>
							{live ? "Reconnect" : "Watch again"}
						</button>
						<button type="button" onClick={onClose} className={barButton}>
							Close
						</button>
					</div>
				</div>
			) : null}

			<div
				className={cn(
					"absolute inset-x-0 top-0 flex items-center gap-3 bg-linear-to-b from-black/80 to-transparent px-4 pb-6 pt-3 transition-opacity duration-200",
					showBars ? "opacity-100" : "pointer-events-none opacity-0",
				)}
				onPointerEnter={() => hold(true)}
				onPointerLeave={() => hold(false)}
			>
				<p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
				{topBarExtra}
				<button
					type="button"
					onClick={onClose}
					aria-label="Close the player"
					className={cn(barButton, "w-8 px-0")}
				>
					<XIcon className="size-4" />
				</button>
			</div>

			{status === "error" ? null : (
				<Controls
					engine={engine}
					snapshot={snapshot}
					live={live}
					expanded={expanded}
					visible={showBars}
					hold={hold}
					onTogglePlay={onTogglePlay}
					onSeekTo={onSeekTo}
					onSeekBy={onSeekBy}
					onToggleExpanded={onToggleExpanded}
				/>
			)}
		</div>
	);
}

type ControlsProps = {
	engine: MpvEngine | null;
	snapshot: PlayerSnapshot;
	live: boolean;
	expanded: boolean;
	visible: boolean;
	hold: (value: boolean) => void;
	onTogglePlay: () => void;
	onSeekTo: (seconds: number) => void;
	onSeekBy: (delta: number) => void;
	onToggleExpanded: () => void;
};

function Controls({
	engine,
	snapshot,
	live,
	expanded,
	visible,
	hold,
	onTogglePlay,
	onSeekTo,
	onSeekBy,
	onToggleExpanded,
}: ControlsProps) {
	const [scrub, setScrub] = useState<number | null>(null);
	const duration = snapshot.duration;
	const ended = snapshot.status === "ended";
	const shown = Math.min(scrub ?? snapshot.position, Math.max(duration, 1));
	const audio = snapshot.audioTracks.find((track) => track.selected);
	const subtitles = snapshot.subtitleTracks.find((track) => track.selected);

	const commitScrub = () => {
		if (scrub !== null) {
			onSeekTo(scrub);
		}
		setScrub(null);
	};

	return (
		<div
			className={cn(
				"absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-3 gap-y-2 bg-linear-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity duration-200",
				visible ? "opacity-100" : "pointer-events-none opacity-0",
			)}
			onPointerEnter={() => hold(true)}
			onPointerLeave={() => hold(false)}
			// A drop-down list that is open keeps the controls; a button that was
			// just clicked must not.
			onFocusCapture={(event) => {
				if (event.target instanceof HTMLSelectElement) {
					hold(true);
				}
			}}
			onBlurCapture={(event) => {
				if (event.target instanceof HTMLSelectElement) {
					hold(false);
				}
			}}
		>
			<button
				type="button"
				disabled={!engine}
				onClick={onTogglePlay}
				aria-label={ended ? "Watch again" : snapshot.paused ? "Play" : "Pause"}
				className={cn(barButton, "w-9 px-0")}
			>
				{ended ? (
					<RotateCcwIcon className="size-4" />
				) : snapshot.paused ? (
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
						onClick={() => onSeekBy(-10)}
						className={barButton}
					>
						-10 s
					</button>
					<button
						type="button"
						disabled={!engine || ended}
						onClick={() => onSeekBy(10)}
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
						className="h-8 min-w-32 flex-1 accent-white"
					/>
					<span className="text-sm tabular-nums text-white/80">
						{formatClock(shown)} / {formatClock(duration)}
					</span>
				</>
			)}
			<label className="flex items-center gap-2 text-sm text-white/80">
				<Volume2Icon className="size-4" aria-hidden />
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
			<button
				type="button"
				onClick={onToggleExpanded}
				aria-label={expanded ? "Exit full screen" : "Full screen"}
				className={cn(barButton, "ml-auto w-9 px-0")}
			>
				{expanded ? (
					<MinimizeIcon className="size-4" />
				) : (
					<MaximizeIcon className="size-4" />
				)}
			</button>
		</div>
	);
}
