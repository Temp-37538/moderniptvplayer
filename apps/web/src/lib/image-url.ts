const IMAGE_PROXY_PATH = "/api/image-proxy?url=";

function parseUrl(raw: string) {
	try {
		return new URL(raw);
	} catch {
		console.log("parseUrl: invalid URL:", raw);
		return undefined;
	}
}

export function toSafeImageSrc(raw: string | undefined): string | undefined {
	const trimmed = raw?.trim();
	if (!trimmed) {
		console.log("toSafeImageSrc: input empty or whitespace:", raw);
		return undefined;
	}

	const candidate = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

	if (candidate.startsWith("/")) {
		return candidate;
	}

	const parsed = parseUrl(candidate);
	if (!parsed) {
		console.log("toSafeImageSrc: parseUrl failed for:", trimmed);
		return undefined;
	}

	if (parsed.protocol === "http:" || parsed.protocol === "https:") {
		return `${IMAGE_PROXY_PATH}${encodeURIComponent(parsed.toString())}`;
	}

	console.log(
		"toSafeImageSrc: unsupported protocol:",
		parsed.protocol,
		parsed.toString(),
	);
	return undefined;
}
