"use client";

import { DesktopPlayer } from "@/components/desktop-player";
import { Button } from "@/components/ui/button";
import { useDesktopBridge } from "@/lib/desktop/bridge";
import {
	LIVE_RETRY_DELAYS_MS,
	LIVE_RETRY_RESET_AFTER_MS,
	liveRetryDelay,
} from "@/lib/player/live-retry";
import { ProgressSaver } from "@/lib/player/progress";
import {
	isActivationTarget,
	isTypingTarget,
	type PlayerAction,
	playerShortcut,
} from "@/lib/player/shortcuts";
import type { PlayerSource, ProgressDetails } from "@/lib/player/types";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type { PlayerSource, ProgressDetails } from "@/lib/player/types";

export type VideoPlayerProps = {
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
	/**
	 * Desktop app only: the provider's own address, played by mpv. Defaults to
	 * the "direct" source; live channels have no such source, so they pass it.
	 */
	desktopUrl?: string;
	/** Desktop app only: shown above the player. */
	title?: string;
};

type WebVideoPlayerProps = Omit<VideoPlayerProps, "desktopUrl" | "title">;

type NoticeKind = "no-video" | "no-audio";

const NOTICES: Record<NoticeKind, string> = {
	"no-video":
		"No picture: this stream's video codec (often HEVC/H.265) isn't supported by your browser. Open it in another player (VLC) to see it.",
	"no-audio":
		"No sound: this stream's audio codec (often AC3, E-AC3 or DTS) isn't supported by your browser. Open it in another player (VLC) to hear it.",
};

type FailureDetail = {
	reason: string;
	technical?: string;
	/** The provider refuses the server and the browser refused the direct URL. */
	directBlocked?: boolean;
};

const DIRECT_PREF_PREFIX = "iptv-direct:";

function directPrefKey(src: string) {
	try {
		return `${DIRECT_PREF_PREFIX}${new URL(src).host}`;
	} catch {
		return null;
	}
}

function readDirectPref(src: string) {
	try {
		const key = directPrefKey(src);
		return key !== null && window.localStorage.getItem(key) === "1";
	} catch {
		return false;
	}
}

function writeDirectPref(src: string, on: boolean) {
	try {
		const key = directPrefKey(src);
		if (key === null) {
			return;
		}
		if (on) {
			window.localStorage.setItem(key, "1");
		} else {
			window.localStorage.removeItem(key);
		}
	} catch {
		// Storage can be unavailable (private mode): the preference is optional.
	}
}

/** Direct playback goes first once it has worked for this provider. */
function orderSources(sources: PlayerSource[]) {
	const direct = sources.find((source) => source.kind === "direct");
	if (!direct || !readDirectPref(direct.src)) {
		return sources;
	}
	return [direct, ...sources.filter((source) => source !== direct)];
}

// The browser understood the stream and cannot decode it: another route to
// the same bytes will not help.
const isCodecFailure = (technical?: string) =>
	Boolean(technical && /NO_SUPPORTED_STREAMS|DECODE/.test(technical));

// Seconds of real playback before judging what the browser decoded.
const DECODE_CHECK_AFTER_S = 3;

function describeMediaError(video: HTMLVideoElement) {
	const message = video.error?.message;
	return message ? `browser: ${message}` : undefined;
}

/**
 * Why a stream that cannot play does not play. A refusal by the playlist
 * server (blocked IP, account limit...) and an undecodable codec look the same
 * to the video element, but only the first one answers with an HTTP error: ask
 * the proxy again, now that the player has let go of the connection.
 */
async function probe(src: string): Promise<string | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetch(src, {
			headers: { range: "bytes=0-0" },
			signal: controller.signal,
		});
		if (response.ok) {
			void response.body?.cancel();
			return null;
		}
		const body = (await response.json().catch(() => null)) as {
			error?: string;
			upstreamStatus?: number;
			code?: string;
		} | null;
		const extra = [
			`HTTP ${response.status}`,
			body?.upstreamStatus ? `provider answered ${body.upstreamStatus}` : "",
			body?.code ?? "",
		].filter(Boolean);
		return `${body?.error ?? "The server refused the stream."} (${extra.join(", ")})`;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		controller.abort();
	}
}

async function diagnose(
	sources: PlayerSource[],
	technical: string | undefined,
	directFailed: boolean,
): Promise<FailureDetail> {
	for (const source of sources) {
		// A direct URL cannot be probed from the page: the browser decides.
		if (source.kind === "direct") {
			continue;
		}
		const problem = await probe(source.src);
		if (problem) {
			return { reason: problem, technical, directBlocked: directFailed };
		}
	}
	return {
		reason: technical?.includes("NO_SUPPORTED_STREAMS")
			? "None of the streams in this file uses a codec your browser can decode (typically HEVC video with E-AC3 or DTS audio)."
			: "The server answered, but the browser could not decode the stream.",
		technical,
	};
}

const MAX_HLS_MEDIA_RECOVERIES = 2;

function applyShortcut(
	action: PlayerAction,
	video: HTMLVideoElement,
	container: HTMLElement,
) {
	switch (action.type) {
		case "toggle-play":
			if (video.paused) {
				video.play().catch(() => {});
			} else {
				video.pause();
			}
			return;
		case "seek":
			if (Number.isFinite(video.duration)) {
				video.currentTime = Math.min(
					video.duration,
					Math.max(0, video.currentTime + action.seconds),
				);
			}
			return;
		case "volume":
			video.volume = Math.min(1, Math.max(0, video.volume + action.delta));
			if (action.delta > 0) {
				video.muted = false;
			}
			return;
		case "toggle-mute":
			video.muted = !video.muted;
			return;
		case "toggle-fullscreen": {
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(() => {});
				return;
			}
			if (container.requestFullscreen) {
				container.requestFullscreen().catch(() => {});
				return;
			}
			// iOS Safari only puts the video element itself in full screen.
			(
				video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
			).webkitEnterFullscreen?.();
			return;
		}
	}
}

function WebVideoPlayer({
	sources,
	poster,
	startAt = 0,
	live = false,
	autoPlay = false,
	progress,
	onEnded,
	className,
}: WebVideoPlayerProps) {
	const inDesktop = useDesktopBridge() !== null;
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [attempt, setAttempt] = useState({ key: "", index: 0 });
	// Bumped by a retry: plays the same sources again from the first one.
	const [run, setRun] = useState(0);
	const [reconnect, setReconnect] = useState<{
		key: string;
		attempt: number;
		delay: number;
	} | null>(null);
	const [buffering, setBuffering] = useState(false);
	// Automatic reconnections used since the stream last played.
	const autoRetriesRef = useRef({ key: "", count: 0 });
	const [failedKey, setFailedKey] = useState("");
	const [failureDetail, setFailureDetail] = useState<
		(FailureDetail & { key: string }) | null
	>(null);
	const [notice, setNotice] = useState<{
		key: string;
		kind: NoticeKind;
	} | null>(null);

	const sourcesKey = sources
		.map((source) => `${source.kind}:${source.src}`)
		.join("|");
	// A new set of sources starts over from the first one.
	const sourceIndex = attempt.key === sourcesKey ? attempt.index : 0;
	const failed = failedKey === sourcesKey;
	const detail = failureDetail?.key === sourcesKey ? failureDetail : null;
	const activeNotice = notice?.key === sourcesKey ? notice.kind : null;
	const activeReconnect = reconnect?.key === sourcesKey ? reconnect : null;

	const retryNow = () => {
		autoRetriesRef.current = { key: sourcesKey, count: 0 };
		// The order is decided again: a direct URL that failed is no longer
		// preferred.
		orderRef.current = null;
		setAttempt({ key: sourcesKey, index: 0 });
		setFailedKey("");
		setFailureDetail(null);
		setReconnect(null);
		setRun((value) => value + 1);
	};

	const progressKey = progress
		? `${progress.playlistId}|${progress.itemType}|${progress.itemId}`
		: "";
	const progressRef = useRef(progress);
	useEffect(() => {
		progressRef.current = progress;
	});

	// The order is decided once per set of sources: it depends on a stored
	// preference that playback itself can change, and the index of the source
	// being tried must keep pointing at the same one.
	const orderRef = useRef<{ key: string; list: PlayerSource[] } | null>(null);

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

		const saver = new ProgressSaver(() => progressRef.current);
		const save = (force: boolean) =>
			saver.save(
				{
					position: video.currentTime,
					duration: video.duration,
					ended: video.ended,
				},
				force,
			);

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

	// A container can be fine while one of its tracks is not (H.264 with AC3
	// audio plays silently, HEVC with AAC audio plays without picture): the
	// browser reports nothing, so look at what it actually decoded.
	// biome-ignore lint/correctness/useExhaustiveDependencies: sourcesKey stands for the sources array
	useEffect(() => {
		const video = videoRef.current as
			| (HTMLVideoElement & { webkitAudioDecodedByteCount?: number })
			| null;
		if (!video) {
			return;
		}
		let playedFrom: number | null = null;
		let checked = false;
		const onPlaying = () => {
			playedFrom ??= video.currentTime;
		};
		const onTimeUpdate = () => {
			if (
				checked ||
				playedFrom === null ||
				video.paused ||
				video.currentTime - playedFrom < DECODE_CHECK_AFTER_S
			) {
				return;
			}
			checked = true;
			const audioBytes = video.webkitAudioDecodedByteCount;
			if (video.videoWidth === 0 && video.videoHeight === 0) {
				setNotice({ key: sourcesKey, kind: "no-video" });
			} else if (
				typeof audioBytes === "number" &&
				audioBytes === 0 &&
				!video.muted
			) {
				setNotice({ key: sourcesKey, kind: "no-audio" });
			}
		};
		video.addEventListener("playing", onPlaying);
		video.addEventListener("timeupdate", onTimeUpdate);
		return () => {
			video.removeEventListener("playing", onPlaying);
			video.removeEventListener("timeupdate", onTimeUpdate);
		};
	}, [sourcesKey, sourceIndex]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: sourcesKey stands for the sources array
	useEffect(() => {
		const video = videoRef.current;
		if (orderRef.current?.key !== sourcesKey) {
			orderRef.current = { key: sourcesKey, list: orderSources(sources) };
		}
		const ordered = orderRef.current.list;
		const source = ordered[sourceIndex];
		if (!video || !source) {
			return;
		}

		let disposed = false;
		let teardown = () => {};

		const fail = (technical?: string) => {
			if (disposed) {
				return;
			}
			const codec = isCodecFailure(technical);
			const directFailed = source.kind === "direct" && !codec;
			if (directFailed) {
				// It does not play from here: stop trying it first.
				writeDirectPref(source.src, false);
			}
			if (!codec && sourceIndex + 1 < ordered.length) {
				setAttempt({ key: sourcesKey, index: sourceIndex + 1 });
				return;
			}
			if (live && !codec) {
				const used =
					autoRetriesRef.current.key === sourcesKey
						? autoRetriesRef.current.count
						: 0;
				const delay = liveRetryDelay(used);
				if (delay !== null) {
					autoRetriesRef.current = { key: sourcesKey, count: used + 1 };
					setReconnect({ key: sourcesKey, attempt: used + 1, delay });
					return;
				}
			}
			setFailedKey(sourcesKey);
			diagnose(ordered, technical, directFailed).then((result) => {
				if (!disposed) {
					setFailureDetail({ key: sourcesKey, ...result });
				}
			});
		};
		const onMediaError = () => fail(describeMediaError(video));

		const onLoadedMetadata = () => {
			if (!live && startAt > 5 && startAt < video.duration - 10) {
				video.currentTime = startAt;
			}
		};
		video.addEventListener("loadedmetadata", onLoadedMetadata);
		// Once it has played for a while again, the next drop gets the full set
		// of reconnections. A stream that dies right after starting does not
		// reset them, so it cannot reconnect forever.
		let playedTimer: number | undefined;
		const onPlayingAgain = () => {
			window.clearTimeout(playedTimer);
			playedTimer = window.setTimeout(() => {
				autoRetriesRef.current = { key: sourcesKey, count: 0 };
			}, LIVE_RETRY_RESET_AFTER_MS);
		};
		video.addEventListener("playing", onPlayingAgain);

		const attachNative = () => {
			video.src = source.src;
			video.addEventListener("error", onMediaError);
			// Played from the user's connection: remember it for this provider.
			const onPlaying = () => writeDirectPref(source.src, true);
			if (source.kind === "direct") {
				video.addEventListener("playing", onPlaying, { once: true });
			}
			teardown = () => {
				video.removeEventListener("error", onMediaError);
				video.removeEventListener("playing", onPlaying);
			};
		};

		const attach = async () => {
			if (
				source.kind === "native" ||
				source.kind === "direct" ||
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
					fail(
						`hls.js: ${data.details}${data.response?.code ? ` (HTTP ${data.response.code})` : ""}`,
					);
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
				player.on(mpegts.Events.ERROR, (type: string, detail: string) =>
					fail(`mpegts.js: ${type} ${detail}`),
				);
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
			video.removeEventListener("playing", onPlayingAgain);
			window.clearTimeout(playedTimer);
			teardown();
			// Drops the connection to the proxy, hence to the provider: accounts
			// only allow a few simultaneous streams.
			video.removeAttribute("src");
			video.load();
		};
	}, [sourcesKey, sourceIndex, live, autoPlay, startAt, run]);

	// Waits, then plays the sources again. Only the setters are used, so the
	// timer is not reset by every render.
	useEffect(() => {
		if (!activeReconnect) {
			return;
		}
		const { key, delay } = activeReconnect;
		const timer = window.setTimeout(() => {
			orderRef.current = null;
			setAttempt({ key, index: 0 });
			setReconnect(null);
			setRun((value) => value + 1);
		}, delay);
		return () => window.clearTimeout(timer);
	}, [activeReconnect]);

	// The spinner follows what the element says about its data.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const on = () => setBuffering(true);
		const off = () => setBuffering(false);
		const onEvents = ["waiting", "seeking"] as const;
		const offEvents = [
			"playing",
			"pause",
			"seeked",
			"error",
			"emptied",
			"ended",
		] as const;
		for (const name of onEvents) {
			video.addEventListener(name, on);
		}
		for (const name of offEvents) {
			video.addEventListener(name, off);
		}
		return () => {
			for (const name of onEvents) {
				video.removeEventListener(name, on);
			}
			for (const name of offEvents) {
				video.removeEventListener(name, off);
			}
		};
	}, []);

	// Shortcuts work while the focus is in the player (the video, its
	// controls) or while the pointer is over it, but never while typing, and
	// Space or Enter still press a focused button.
	useEffect(() => {
		const container = containerRef.current;
		const video = videoRef.current;
		if (!container || !video) {
			return;
		}
		let hovered = false;
		const onEnter = () => {
			hovered = true;
		};
		const onLeave = () => {
			hovered = false;
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) {
				return;
			}
			const target = event.target instanceof Element ? event.target : null;
			if (isTypingTarget(target) || isActivationTarget(target, event.key)) {
				return;
			}
			const focusedInside = target !== null && container.contains(target);
			if (!focusedInside && !hovered) {
				return;
			}
			const action = playerShortcut(event, live);
			if (!action) {
				return;
			}
			// The native controls would otherwise handle the same key again.
			event.preventDefault();
			event.stopPropagation();
			applyShortcut(action, video, container);
		};
		container.addEventListener("pointerenter", onEnter);
		container.addEventListener("pointerleave", onLeave);
		window.addEventListener("keydown", onKeyDown, true);
		return () => {
			container.removeEventListener("pointerenter", onEnter);
			container.removeEventListener("pointerleave", onLeave);
			window.removeEventListener("keydown", onKeyDown, true);
		};
	}, [live]);

	return (
		<div
			ref={containerRef}
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
			{buffering && !failed && !activeReconnect && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<Loader2Icon
						aria-hidden
						className="size-10 animate-spin text-white/80 drop-shadow"
					/>
					<output className="sr-only">Loading</output>
				</div>
			)}
			{!failed && activeReconnect && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center text-sm text-white">
					<Loader2Icon aria-hidden className="size-6 animate-spin" />
					<output>
						Stream interrupted. Reconnecting (attempt {activeReconnect.attempt}{" "}
						of {LIVE_RETRY_DELAYS_MS.length})...
					</output>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={retryNow}
					>
						<RotateCcwIcon />
						Retry now
					</Button>
				</div>
			)}
			{!failed && activeNotice && (
				<p className="pointer-events-none absolute inset-x-0 top-0 bg-black/75 px-3 py-2 text-center text-xs text-white/90">
					{NOTICES[activeNotice]}
				</p>
			)}
			{failed && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center text-sm text-white">
					<AlertCircleIcon className="size-6" />
					<p>This stream can't be played in the browser.</p>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={retryNow}
					>
						<RotateCcwIcon />
						Try again
					</Button>
					{detail && (
						<p className="max-w-prose text-white/85">{detail.reason}</p>
					)}
					{detail?.directBlocked && !inDesktop && (
						<p className="max-w-prose text-white/85">
							Your provider refuses this server, so the stream has to be played
							from your own connection. Your browser blocks that on a secure
							page: allow "Insecure content" for this site (padlock icon, Site
							settings), then reload.
						</p>
					)}
					<p className="max-w-prose text-white/70">
						Open it in another player (VLC) instead: browsers can't decode every
						codec, even inside formats they support.
					</p>
					{detail?.technical && (
						<p className="max-w-prose break-words font-mono text-[11px] text-white/50">
							{detail.technical}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * The desktop app plays with mpv whenever it has the provider's own address:
 * mpv reads http, decodes every codec and reaches providers that refuse the
 * server's IP, so neither the proxy nor the browser's "Insecure content"
 * setting is involved. A browser, and the app for anything without such an
 * address, use the web player.
 */
export function VideoPlayer({ desktopUrl, title, ...props }: VideoPlayerProps) {
	const bridge = useDesktopBridge();
	const url =
		desktopUrl ?? props.sources.find((source) => source.kind === "direct")?.src;
	if (bridge && url && /^https?:\/\//i.test(url)) {
		return (
			<DesktopPlayer
				bridge={bridge}
				url={url}
				title={title}
				poster={props.poster}
				startAt={props.startAt}
				live={props.live}
				autoPlay={props.autoPlay}
				progress={props.progress}
				onEnded={props.onEnded}
				className={props.className}
			/>
		);
	}
	return <WebVideoPlayer {...props} />;
}
