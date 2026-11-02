/**
 * mpv draws behind the web page, so the page has to let it through where the
 * picture goes and stay opaque everywhere else.
 *
 * Inline (the player sits in the page): the page background and the
 * backgrounds of the player's ancestors are removed, and a fixed layer of the
 * page's colour, with a hole cut at the player's rectangle, takes their place.
 * Full window: everything but the player is hidden.
 *
 * Everything done here is undone by `stop()`.
 */

const MARK = "data-see-through";

const SHARED_CSS = `
html, body { background: transparent !important; }
html { color-scheme: normal !important; }
`;
const INLINE_CSS = `${SHARED_CSS}[${MARK}] { background: transparent !important; }\n`;
const FULL_WINDOW_CSS = `${SHARED_CSS}body > *:not([data-desktop-player]) { visibility: hidden !important; }\n`;

type Rect = { left: number; top: number; right: number; bottom: number };

export type SeeThrough = {
	/** The rectangle (viewport coordinates) where the picture shows. */
	update(rect: Rect): void;
	stop(): void;
};

function isTransparent(color: string) {
	return (
		color === "transparent" ||
		/^rgba\(.*,\s*0\)$/.test(color) ||
		/\/\s*0(\.0+)?\)$/.test(color)
	);
}

function pageBackground(doc: Document) {
	for (const element of [doc.body, doc.documentElement]) {
		const color = getComputedStyle(element).backgroundColor;
		if (color && !isTransparent(color)) {
			return color;
		}
	}
	return "rgb(0, 0, 0)";
}

function roundedRectPath(rect: Rect, radius: number) {
	const n = (value: number) => value.toFixed(2);
	const r = Math.max(
		0,
		Math.min(
			radius,
			(rect.right - rect.left) / 2,
			(rect.bottom - rect.top) / 2,
		),
	);
	const { left: x, top: y, right: x2, bottom: y2 } = rect;
	return [
		`M${n(x + r)} ${n(y)}`,
		`H${n(x2 - r)}`,
		`A${n(r)} ${n(r)} 0 0 1 ${n(x2)} ${n(y + r)}`,
		`V${n(y2 - r)}`,
		`A${n(r)} ${n(r)} 0 0 1 ${n(x2 - r)} ${n(y2)}`,
		`H${n(x + r)}`,
		`A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y2 - r)}`,
		`V${n(y + r)}`,
		`A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`,
	].join("");
}

/** `anchor`: the element whose rectangle is the picture's. */
export function startSeeThrough(
	anchor: HTMLElement,
	fullWindow: boolean,
): SeeThrough {
	const doc = anchor.ownerDocument;
	const marked: HTMLElement[] = [];
	let backdrop: HTMLDivElement | null = null;
	let radius = 0;

	if (!fullWindow) {
		// Read before the page's own background is removed.
		const color = pageBackground(doc);
		for (
			let element = anchor.parentElement;
			element && element !== doc.body && element !== doc.documentElement;
			element = element.parentElement
		) {
			if (radius === 0) {
				radius =
					Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
			}
			element.setAttribute(MARK, "");
			marked.push(element);
		}
		backdrop = doc.createElement("div");
		backdrop.setAttribute("data-desktop-backdrop", "");
		backdrop.style.cssText = `position:fixed;inset:0;z-index:-1;pointer-events:none;background:${color};`;
		doc.body.appendChild(backdrop);
	}

	const style = doc.createElement("style");
	style.setAttribute("data-desktop-see-through", "");
	style.textContent = fullWindow ? FULL_WINDOW_CSS : INLINE_CSS;
	doc.head.appendChild(style);

	return {
		update(rect) {
			if (!backdrop) {
				return;
			}
			const width = doc.documentElement.clientWidth;
			const height = doc.documentElement.clientHeight;
			const outer = `M0 0H${width}V${height}H0Z`;
			backdrop.style.clipPath = `path(evenodd, "${outer}${roundedRectPath(rect, radius)}")`;
		},
		stop() {
			style.remove();
			backdrop?.remove();
			for (const element of marked) {
				element.removeAttribute(MARK);
			}
		},
	};
}
