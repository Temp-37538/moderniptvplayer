export function isSafePathSegment(value: string): boolean {
	if (value.length < 1 || value.length > 128) {
		return false;
	}
	if (
		value.includes("/") ||
		value.includes("\\") ||
		value.includes("..") ||
		value.includes("#") ||
		value.includes("?") ||
		value.includes("%")
	) {
		return false;
	}
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code < 32 || code === 127) {
			return false;
		}
	}
	return true;
}

export function httpPoster(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	if (!/^https?:\/\//i.test(trimmed) || trimmed.length > 2048) {
		return null;
	}
	return trimmed;
}
