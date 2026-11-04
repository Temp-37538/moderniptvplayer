/**
 * mpv draws behind the web page, so while the player is open the page has to
 * let it through where the picture goes. The page is hidden (it could not
 * stay under the picture anyway: anything it painted there would cover mpv)
 * and the page's background is removed so mpv can show.
 *
 * Call it before the first paint of the player (a layout effect), and call the
 * function it returns to give the page back.
 */

const STYLE = `
html, body { background: transparent !important; }
html { color-scheme: normal !important; }
body > *:not([data-desktop-player]) { visibility: hidden !important; }
`;

export function hidePage(doc: Document = document): () => void {
	const style = doc.createElement("style");
	style.setAttribute("data-desktop-see-through", "");
	style.textContent = STYLE;
	doc.head.appendChild(style);
	return () => style.remove();
}
