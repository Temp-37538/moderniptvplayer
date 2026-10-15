const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
	"youtube.com",
	"m.youtube.com",
	"youtube-nocookie.com",
]);

/**
 * Playlist providers send either a bare video id or a full YouTube URL, and
 * the value is untrusted. Returns a valid 11-character video id, or null.
 */
export function parseYoutubeId(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	if (YOUTUBE_ID.test(trimmed)) {
		return trimmed;
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		return null;
	}

	const host = url.hostname.toLowerCase().replace(/^www\./, "");
	let candidate: string | undefined;
	if (host === "youtu.be") {
		candidate = url.pathname.split("/")[1];
	} else if (YOUTUBE_HOSTS.has(host)) {
		candidate =
			url.searchParams.get("v") ??
			url.pathname.match(/^\/(?:embed|shorts|v)\/([^/]+)/)?.[1];
	}

	return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

export function toYoutubeEmbedUrl(value: unknown): string | null {
	const id = parseYoutubeId(value);
	return id ? `https://www.youtube.com/embed/${id}` : null;
}
