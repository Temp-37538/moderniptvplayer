const IMAGE_PROXY_PATH = "/api/image-proxy?url=";

function parseUrl(raw: string) {
	try {
		return new URL(raw);
	} catch {
		return undefined;
	}
}

export function toSafeImageSrc(raw: string | undefined): string | undefined {
	const trimmed = raw?.trim();
	if (!trimmed) {
		return undefined;
	}

	const candidate = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

	if (candidate.startsWith("/")) {
		return candidate;
	}

	const parsed = parseUrl(candidate);
	if (!parsed) {
		return undefined;
	}

	if (parsed.protocol === "http:" || parsed.protocol === "https:") {
		return `${IMAGE_PROXY_PATH}${encodeURIComponent(parsed.toString())}`;
	}

	return undefined;
}
