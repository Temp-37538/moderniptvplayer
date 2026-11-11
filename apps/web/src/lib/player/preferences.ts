/**
 * What the player remembers between two contents: the volume and the
 * subtitle language. In the desktop app every content starts a new mpv
 * session, which would otherwise go back to full volume and to mpv's own
 * choice of subtitles.
 */

const VOLUME_KEY = "iptv-player:volume";
const SUBTITLE_KEY = "iptv-player:subtitle";

export const DEFAULT_VOLUME = 100;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

/**
 * mpv's `volume` is not a linear gain: it applies the cube of the percentage
 * (50 plays at 12.5 % of the amplitude, 30 at 2.7 %). The slider is linear in
 * amplitude, like the web player's, so it is converted before it reaches mpv.
 * 0 to 100 on the slider, 0 to 100 for mpv.
 */
export function sliderToMpvVolume(slider: number) {
	return Math.cbrt(clamp(slider, 0, 100) / 100) * 100;
}

export function readVolume(): number {
	try {
		const stored = window.localStorage.getItem(VOLUME_KEY);
		if (stored === null) {
			return DEFAULT_VOLUME;
		}
		const value = Number(stored);
		return Number.isFinite(value) ? clamp(value, 0, 100) : DEFAULT_VOLUME;
	} catch {
		return DEFAULT_VOLUME;
	}
}

export function writeVolume(volume: number) {
	try {
		window.localStorage.setItem(VOLUME_KEY, String(clamp(volume, 0, 100)));
	} catch {
		// Storage can be unavailable: the volume is then simply not kept.
	}
}

// ISO 639-2 has two codes for some languages (fre / fra) and files use either
// of them, or the two-letter code. They all have to mean the same language.
const LANGUAGE_ALIASES: Record<string, string> = {
	en: "eng",
	fr: "fra",
	fre: "fra",
	es: "spa",
	de: "deu",
	ger: "deu",
	it: "ita",
	pt: "por",
	nl: "nld",
	dut: "nld",
	ar: "ara",
	tr: "tur",
	ru: "rus",
	pl: "pol",
	ja: "jpn",
	ko: "kor",
	zh: "zho",
	chi: "zho",
	hi: "hin",
	sv: "swe",
	da: "dan",
	no: "nor",
	fi: "fin",
	el: "ell",
	gre: "ell",
	he: "heb",
	cs: "ces",
	cze: "ces",
	ro: "ron",
	rum: "ron",
	hu: "hun",
	uk: "ukr",
	fa: "fas",
	per: "fas",
};

export function normalizeLanguage(lang: string | null | undefined) {
	const base = (lang ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
	return LANGUAGE_ALIASES[base] ?? base;
}

export type SubtitleTrackInfo = {
	id: number;
	lang: string | null;
	title: string | null;
};

/** What was chosen last. `null`: subtitles off. */
export type SubtitlePreference = { lang: string; title: string | null } | null;

export function readSubtitlePreference(): SubtitlePreference {
	try {
		const raw = window.localStorage.getItem(SUBTITLE_KEY);
		if (raw === null) {
			return null;
		}
		const parsed = JSON.parse(raw) as {
			lang?: unknown;
			title?: unknown;
		} | null;
		if (!parsed || typeof parsed.lang !== "string" || parsed.lang === "") {
			return null;
		}
		return {
			lang: parsed.lang,
			title: typeof parsed.title === "string" ? parsed.title : null,
		};
	} catch {
		return null;
	}
}

/** `null` records "subtitles off". A track without a language is not kept. */
export function writeSubtitlePreference(track: SubtitleTrackInfo | null) {
	try {
		const lang = normalizeLanguage(track?.lang);
		if (track && lang !== "") {
			window.localStorage.setItem(
				SUBTITLE_KEY,
				JSON.stringify({ lang, title: track.title ?? null }),
			);
		} else {
			window.localStorage.removeItem(SUBTITLE_KEY);
		}
	} catch {
		// Storage can be unavailable: the choice is then simply not kept.
	}
}

/**
 * The subtitle track to show for a new content: the one in the same language
 * as before (the one with the same title when there are several), or none.
 */
export function chooseSubtitle(
	tracks: SubtitleTrackInfo[],
	preference: SubtitlePreference,
): number | null {
	if (!preference) {
		return null;
	}
	const sameLanguage = tracks.filter(
		(track) => normalizeLanguage(track.lang) === preference.lang,
	);
	if (sameLanguage.length === 0) {
		return null;
	}
	const wanted = preference.title?.trim().toLowerCase() ?? "";
	const sameTitle = sameLanguage.find(
		(track) => (track.title?.trim().toLowerCase() ?? "") === wanted,
	);
	return (sameTitle ?? sameLanguage[0])?.id ?? null;
}

// Series: play the next episode when one ends. On by default. The key is the
// one the seasons list has always used.
const AUTO_NEXT_KEY = "iptv:auto-next";
const AUTO_NEXT_EVENT = "iptv:auto-next-change";

export function readAutoNext(): boolean {
	try {
		return window.localStorage.getItem(AUTO_NEXT_KEY) !== "false";
	} catch {
		return true;
	}
}

export function writeAutoNext(on: boolean) {
	try {
		window.localStorage.setItem(AUTO_NEXT_KEY, String(on));
	} catch {
		// Storage can be unavailable: the choice then lasts for this page.
	}
	window.dispatchEvent(new Event(AUTO_NEXT_EVENT));
}

/** For useSyncExternalStore: other tabs and this one both notify. */
export function subscribeAutoNext(onChange: () => void) {
	window.addEventListener("storage", onChange);
	window.addEventListener(AUTO_NEXT_EVENT, onChange);
	return () => {
		window.removeEventListener("storage", onChange);
		window.removeEventListener(AUTO_NEXT_EVENT, onChange);
	};
}
