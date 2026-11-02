import type { DesktopBridge } from "@/lib/desktop/bridge";

// Leaving one player and opening the next one (next episode) must not flash
// the window out of full screen and back: requests settle for a moment first.
const SETTLE_MS = 150;
// A player opened right after another one was left in full screen starts in
// full screen too.
const CARRY_MS = 1500;

let wanted = false;
// null: not known (a page that reloaded while the window was in full screen).
let applied: boolean | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let supported = true;
let active = false;
let carriedAt: number | null = null;

/**
 * Puts the app window in or out of real full screen. Does nothing when the app
 * is too old to have the command: the player then just fills the window.
 */
export function requestWindowFullscreen(bridge: DesktopBridge, on: boolean) {
	wanted = on;
	if (timer !== null) {
		clearTimeout(timer);
	}
	timer = setTimeout(() => {
		timer = null;
		if (!supported || applied === wanted) {
			return;
		}
		const target = wanted;
		bridge
			.invoke("window_fullscreen", { fullscreen: target })
			.then(() => {
				applied = target;
			})
			.catch((error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				if (/not available/i.test(message)) {
					supported = false;
				}
			});
	}, SETTLE_MS);
}

/** A player is in full screen right now (the next one replaces it). */
export function setFullscreenActive(on: boolean) {
	active = on;
}

/** A player in full screen went away without being closed on purpose. */
export function carryFullscreen() {
	carriedAt = Date.now();
}

export function clearCarriedFullscreen() {
	carriedAt = null;
}

/** True for a player that replaces one that was in full screen. */
export function startsInFullscreen() {
	return active || (carriedAt !== null && Date.now() - carriedAt < CARRY_MS);
}
