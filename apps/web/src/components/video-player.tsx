"use client";

import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type PlayerSource = {
	/** "native": mp4 and friends. "hls": .m3u8. "mpegts": raw live MPEG-TS. */
	kind: "native" | "hls" | "mpegts";
	src: string;
};

/** What is stored to resume a film or an episode later. */
export type ProgressDetails = {
	playlistId: string;
	itemId: string;
	itemType: "movie" | "episode";
	itemName: string;
	/** In-app page to come back to. */
	itemUrl: string;
	/** The provider's poster URL (it is proxied when displayed). */
	itemImage?: string | null;
	showId?: string | null;
};

type VideoPlayerProps = {
	/** Tried in order: the next one is used when one cannot be played. */
	sources: PlayerSource[];
	poster?: string;
	/** Resume position, in seconds. */
	startAt?: number;
	live?: boolean;
	autoPlay?: boolean;
	progress?: ProgressDetails;
	/** Called once the media has played to its end (after progress is saved). */
	onEnded?: () => void;
	className?: string;
};

const SAVE_INTERVAL_MS = 15_000;
// Opening a title for a few seconds must not clutter "continue watching".
const MIN_SAVED_POSITION = 10;
const MAX_HLS_MEDIA_RECOVERIES = 2;

export function VideoPlayer({
	sources,
	poster,
	startAt = 0,
	live = false,
	autoPlay = false,
	progress,
	onEnded,
	className,
}: VideoPlayerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [attempt, setAttempt] = useState({ key: "", index: 0 });
	const [failedKey, setFailedKey] = useState("");

	const sourcesKey = sources
		.map((source) => `${source.kind}:${source.src}`)
		.join("|");
	// A new set of sources starts over from the first one.
	const sourceIndex = attempt.key === sourcesKey ? attempt.index : 0;
	const failed = failedKey === sourcesKey;

	const progressKey = progress
		? `${progress.playlistId}|${progress.itemType}|${progress.itemId}`
		: "";
	const progressRef = useRef(progress);
	useEffect(() => {
		progressRef.current = progress;
	});

	const onEndedRef = useRef(onEnded);
	useEffect(() => {
		onEndedRef.current = onEnded;
	});

	// Declared before the playback effect on purpose: on unmount, cleanups run
	// in declaration order, and the last save needs the video still loaded.
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !progressKey || live) {
			return;
		}

		let lastSentAt = 0;
		let lastSentPosition = -1;

		const save = (force: boolean) => {
			const details = progressRef.current;
			const duration = video.duration;
			const position = video.currentTime;
			if (
				!details ||
				!Number.isFinite(duration) ||
				duration <= 0 ||
				position < MIN_SAVED_POSITION
			) {
				return;
			}
			// Reaching the end must always be recorded, however close the previous
			// save was: it is what marks the title as watched.
			const finished = video.ended || position >= duration - 1;
			if (finished) {
				if (lastSentPosition >= duration - 1) {
					return;
				}
			} else if (
				(!force && Date.now() - lastSentAt < SAVE_INTERVAL_MS) ||
				Math.abs(position - lastSentPosition) < 3
			) {
				return;
			}
			lastSentAt = Date.now();
			lastSentPosition = finished ? duration : position;

			const image = details.itemImage;
			// keepalive lets the request outlive the page (tab closed).
			fetch("/api/watch-progress", {
				method: "POST",
				keepalive: true,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					playlistId: details.playlistId,
					itemId: details.itemId,
					itemType: details.itemType,
					itemName: details.itemName,
					itemUrl: details.itemUrl,
					itemImage:
						image && /^https?:\/\//i.test(image) && image.length <= 2048
							? image
							: null,
					showId: details.showId ?? null,
					positionSec: finished ? duration : position,
					durationSec: duration,
				}),
			}).catch(() => {});
		};

		const onTimeUpdate = () => save(false);
		const onSettled = () => save(true);
		const onHidden = () => {
			if (document.visibilityState === "hidden") {
				save(true);
			}
		};

		video.addEventListener("timeupdate", onTimeUpdate);
		video.addEventListener("pause", onSettled);
		video.addEventListener("ended", onSettled);
		document.addEventListener("visibilitychange", onHidden);
		window.addEventListener("pagehide", onSettled);
		return () => {
			save(true);
			video.removeEventListener("timeupdate", onTimeUpdate);
			video.removeEventListener("pause", onSettled);
			video.removeEventListener("ended", onSettled);
			document.removeEventListener("visibilitychange", onHidden);
			window.removeEventListener("pagehide", onSettled);
		};
	}, [progressKey, live]);

	// After the progress effect: its "ended" listener (the final save) is
	// registered first, so the position is stored before the callback moves on.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const handleEnded = () => onEndedRef.current?.();
		video.addEventListener("ended", handleEnded);
		return () => video.removeEventListener("ended", handleEnded);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: sourcesKey stands for the sources array
	useEffect(() => {
		const video = videoRef.current;
		const source = sources[sourceIndex];
		if (!video || !source) {
			return;
		}

		let disposed = false;
		let teardown = () => {};

		const fail = () => {
			if (disposed) {
				return;
			}
			if (sourceIndex + 1 < sources.length) {
				setAttempt({ key: sourcesKey, index: sourceIndex + 1 });
			} else {
				setFailedKey(sourcesKey);
			}
		};

		const onLoadedMetadata = () => {
			if (!live && startAt > 5 && startAt < video.duration - 10) {
				video.currentTime = startAt;
			}
		};
		video.addEventListener("loadedmetadata", onLoadedMetadata);

		const attachNative = () => {
			video.src = source.src;
			video.addEventListener("error", fail);
			teardown = () => video.removeEventListener("error", fail);
		};

		const attach = async () => {
			if (
				source.kind === "native" ||
				(source.kind === "hls" &&
					video.canPlayType("application/vnd.apple.mpegurl"))
			) {
				attachNative();
			} else if (source.kind === "hls") {
				const { default: Hls } = await import("hls.js");
				if (disposed) {
					return;
				}
				if (!Hls.isSupported()) {
					fail();
					return;
				}
				const hls = new Hls();
				let recoveries = 0;
				hls.on(Hls.Events.ERROR, (_event, data) => {
					if (!data.fatal) {
						return;
					}
					if (
						data.type === Hls.ErrorTypes.MEDIA_ERROR &&
						recoveries < MAX_HLS_MEDIA_RECOVERIES
					) {
						recoveries += 1;
						hls.recoverMediaError();
						return;
					}
					fail();
				});
				hls.loadSource(source.src);
				hls.attachMedia(video);
				teardown = () => hls.destroy();
			} else {
				const { default: mpegts } = await import("mpegts.js");
				if (disposed) {
					return;
				}
				if (!mpegts.isSupported()) {
					fail();
					return;
				}
				const player = mpegts.createPlayer({
					type: "mpegts",
					isLive: true,
					url: source.src,
				});
				player.on(mpegts.Events.ERROR, fail);
				player.attachMediaElement(video);
				player.load();
				teardown = () => {
					player.unload();
					player.detachMediaElement();
					player.destroy();
				};
			}

			if (autoPlay || live) {
				// Browsers may refuse autoplay: the controls are there for that.
				video.play().catch(() => {});
			}
		};

		attach().catch(fail);

		return () => {
			disposed = true;
			video.removeEventListener("loadedmetadata", onLoadedMetadata);
			teardown();
			// Drops the connection to the proxy, hence to the provider: accounts
			// only allow a few simultaneous streams.
			video.removeAttribute("src");
			video.load();
		};
	}, [sourcesKey, sourceIndex, live, autoPlay, startAt]);

	return (
		<div
			className={cn(
				"relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-black",
				className,
			)}
		>
			{/* biome-ignore lint/a11y/useMediaCaption: provider streams carry no caption track */}
			<video
				ref={videoRef}
				controls
				playsInline
				preload="none"
				poster={poster}
				className="size-full"
			/>
			{failed && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center text-sm text-white">
					<AlertCircleIcon className="size-6" />
					<p>This stream can't be played in the browser.</p>
					<p className="text-white/70">
						Use "Open in another player" instead (some formats, like mkv or
						HEVC, are not supported by browsers).
					</p>
				</div>
			)}
		</div>
	);
}
