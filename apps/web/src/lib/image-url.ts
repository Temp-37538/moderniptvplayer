const IMAGE_PROXY_PATH = "/api/image-proxy?url=";

function parseUrl(raw: string) {
	try {
		return new URL(raw);
	} catch (error) {
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

	if (trimmed.startsWith("//")) {
		const protocolRelative = parseUrl(`https:${trimmed}`);
		if (!protocolRelative) {
			console.log("toSafeImageSrc: protocol-relative URL invalid:", trimmed);
			return undefined;
		}
		return protocolRelative.toString();
	} 
	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	const parsed = parseUrl(trimmed);
	if (!parsed) {
		console.log("toSafeImageSrc: parseUrl failed for:", trimmed);
		return undefined;
	}

	if (parsed.protocol === "https:") {
		return parsed.toString();
	}

	if (parsed.protocol === "http:") {
		return `${IMAGE_PROXY_PATH}${encodeURIComponent(parsed.toString())}`;
	}

	console.log("toSafeImageSrc: unsupported protocol:", parsed.protocol, parsed.toString());
	return undefined;
}
