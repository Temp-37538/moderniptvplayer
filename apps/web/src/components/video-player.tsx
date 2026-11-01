"use client";

import { DesktopPlayer } from "@/components/desktop-player";
import { useDesktopBridge } from "@/lib/desktop/bridge";
import { ProgressSaver } from "@/lib/player/progress";
import type { PlayerSource, ProgressDetails } from "@/lib/player/types";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type { PlayerSource, ProgressDetails } from "@/lib/player/types";

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
	const videoRef = useRef<HTMLVideoElement>(null);
	const [attempt, setAttempt] = useState({ key: "", index: 0 });
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
			{!failed && activeNotice && (
				<p className="pointer-events-none absolute inset-x-0 top-0 bg-black/75 px-3 py-2 text-center text-xs text-white/90">
					{NOTICES[activeNotice]}
				</p>
			)}
			{failed && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center text-sm text-white">
					<AlertCircleIcon className="size-6" />
					<p>This stream can't be played in the browser.</p>
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
