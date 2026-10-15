const PARSE_BASE = "https://app.invalid";

/**
 * Returns `value` only when it is an in-app path, otherwise `fallback`.
 *
 * `startsWith("/") && !startsWith("//")` is not enough: browsers treat a
 * backslash like a slash, so "/\evil.com" resolves to "https://evil.com".
 * Control characters (tab, newline) are also stripped by URL parsers, which
 * turns "/\t/evil.com" into "//evil.com".
 */
export function toSafeRedirectPath(
	value: string | null | undefined,
	fallback = "/dashboard",
): string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) {
		return fallback;
	}

	for (const character of value) {
		const code = character.charCodeAt(0);
		if (character === "\\" || code < 32 || code === 127) {
			return fallback;
		}
	}

	try {
		return new URL(value, PARSE_BASE).origin === PARSE_BASE ? value : fallback;
	} catch {
		return fallback;
	}
}
