const URI_ATTRIBUTE = /URI="([^"]*)"/g;

// Tags whose URI points to another playlist (the rest are keys, init maps...).
const PLAYLIST_ATTRIBUTE_TAGS = ["#EXT-X-MEDIA", "#EXT-X-I-FRAME-STREAM-INF"];

export type HlsReferenceKind = "playlist" | "resource";

/**
 * Rewrites every reference of an HLS manifest (variants, media playlists,
 * segments, and `URI="..."` attributes such as keys, init maps and alternate
 * renditions) through `toProxyUrl`.
 *
 * References are resolved against `base`, which must be the URL the manifest
 * was finally served from (after redirects): providers often redirect to
 * another node and then use relative paths.
 *
 * `toProxyUrl` is told whether the reference is itself a playlist, so the
 * proxy knows what to rewrite next without guessing from the response.
 */
export function rewriteHlsManifest(
	text: string,
	base: URL,
	toProxyUrl: (absoluteUrl: string, kind: HlsReferenceKind) => string,
): string {
	const rewrite = (reference: string, kind: HlsReferenceKind) => {
		try {
			const absolute = new URL(reference, base);
			if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
				return null;
			}
			absolute.hash = "";
			return toProxyUrl(absolute.toString(), kind);
		} catch {
			return null;
		}
	};

	// A variant URI sits on the line after #EXT-X-STREAM-INF.
	let nextLineIsPlaylist = false;

	return text
		.split(/\r?\n/)
		.map((line) => {
			const trimmed = line.trim();
			if (!trimmed) {
				return line;
			}
			if (trimmed.startsWith("#")) {
				if (trimmed.startsWith("#EXT-X-STREAM-INF")) {
					nextLineIsPlaylist = true;
				}
				const kind: HlsReferenceKind = PLAYLIST_ATTRIBUTE_TAGS.some((tag) =>
					trimmed.startsWith(tag),
				)
					? "playlist"
					: "resource";
				return line.replace(URI_ATTRIBUTE, (match, reference: string) => {
					const rewritten = rewrite(reference, kind);
					return rewritten ? `URI="${rewritten}"` : match;
				});
			}
			const kind: HlsReferenceKind = nextLineIsPlaylist
				? "playlist"
				: "resource";
			nextLineIsPlaylist = false;
			return rewrite(trimmed, kind) ?? line;
		})
		.join("\n");
}

export function looksLikeHlsManifest(
	contentType: string | undefined,
	url: URL,
): boolean {
	const type = (contentType ?? "").toLowerCase();
	return (
		type.includes("mpegurl") || url.pathname.toLowerCase().endsWith(".m3u8")
	);
}
