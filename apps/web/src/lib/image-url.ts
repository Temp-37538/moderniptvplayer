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

	if (trimmed.startsWith("//")) {
		const protocolRelative = parseUrl(`https:${trimmed}`);
		return protocolRelative?.toString();
	}

	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	const parsed = parseUrl(trimmed);
	if (!parsed) {
		return undefined;
	}

	if (parsed.protocol === "https:") {
		return parsed.toString();
	}

	if (parsed.protocol === "http:") {
		return `${IMAGE_PROXY_PATH}${encodeURIComponent(parsed.toString())}`;
	}

	return undefined;
}
