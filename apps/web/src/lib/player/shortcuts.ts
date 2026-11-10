/**
 * Keyboard shortcuts of the web player. They apply while the player has the
 * focus or the pointer, never while the user is typing somewhere.
 */

export type PlayerAction =
	| { type: "toggle-play" }
	| { type: "seek"; seconds: number }
	| { type: "volume"; delta: number }
	| { type: "toggle-mute" }
	| { type: "toggle-fullscreen" };

type KeyInput = {
	key: string;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
};

const SEEK_STEP_S = 10;
const VOLUME_STEP = 0.1;

export function playerShortcut(
	event: KeyInput,
	live: boolean,
): PlayerAction | null {
	// Browser and system shortcuts keep working.
	if (event.altKey || event.ctrlKey || event.metaKey) {
		return null;
	}
	switch (event.key) {
		case " ":
		case "k":
		case "K":
			return { type: "toggle-play" };
		case "ArrowLeft":
		case "j":
		case "J":
			return live ? null : { type: "seek", seconds: -SEEK_STEP_S };
		case "ArrowRight":
		case "l":
		case "L":
			return live ? null : { type: "seek", seconds: SEEK_STEP_S };
		case "ArrowUp":
			return { type: "volume", delta: VOLUME_STEP };
		case "ArrowDown":
			return { type: "volume", delta: -VOLUME_STEP };
		case "m":
		case "M":
			return { type: "toggle-mute" };
		case "f":
		case "F":
			return { type: "toggle-fullscreen" };
		default:
			return null;
	}
}

type TargetLike = {
	tagName?: string;
	isContentEditable?: boolean;
	getAttribute?: (name: string) => string | null;
} | null;

const TYPING_ROLES = new Set([
	"textbox",
	"searchbox",
	"combobox",
	"spinbutton",
]);

/** True when a key press belongs to a field the user is typing in. */
export function isTypingTarget(target: TargetLike): boolean {
	if (!target) {
		return false;
	}
	if (target.isContentEditable) {
		return true;
	}
	const tag = target.tagName?.toUpperCase();
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		return true;
	}
	const role = target.getAttribute?.("role");
	return role ? TYPING_ROLES.has(role) : false;
}

/**
 * True when Space or Enter would already do something on the focused
 * element (a button, a link): the player leaves those keys to it.
 */
export function isActivationTarget(target: TargetLike, key: string): boolean {
	if (!target || (key !== " " && key !== "Enter")) {
		return false;
	}
	const tag = target.tagName?.toUpperCase();
	if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") {
		return true;
	}
	const role = target.getAttribute?.("role");
	return role === "button" || role === "link" || role === "switch";
}
