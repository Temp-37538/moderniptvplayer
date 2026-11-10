import assert from "node:assert/strict";
import { test } from "node:test";
import { LIVE_RETRY_DELAYS_MS, liveRetryDelay } from "./player/live-retry.ts";
import {
	isActivationTarget,
	isTypingTarget,
	playerShortcut,
} from "./player/shortcuts.ts";

const press = (
	key: string,
	modifiers: Partial<Record<string, boolean>> = {},
) => ({
	key,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	...modifiers,
});

const element = (tagName: string, attributes: Record<string, string> = {}) => ({
	tagName,
	isContentEditable: false,
	getAttribute: (name: string) => attributes[name] ?? null,
});

test("space and k toggle playback", () => {
	assert.deepEqual(playerShortcut(press(" "), false), { type: "toggle-play" });
	assert.deepEqual(playerShortcut(press("k"), true), { type: "toggle-play" });
});

test("arrows seek a video but not a live stream", () => {
	assert.deepEqual(playerShortcut(press("ArrowRight"), false), {
		type: "seek",
		seconds: 10,
	});
	assert.deepEqual(playerShortcut(press("ArrowLeft"), false), {
		type: "seek",
		seconds: -10,
	});
	assert.equal(playerShortcut(press("ArrowRight"), true), null);
});

test("volume, mute and full screen keys", () => {
	assert.deepEqual(playerShortcut(press("ArrowUp"), true), {
		type: "volume",
		delta: 0.1,
	});
	assert.deepEqual(playerShortcut(press("M"), false), { type: "toggle-mute" });
	assert.deepEqual(playerShortcut(press("f"), false), {
		type: "toggle-fullscreen",
	});
});

test("modified keys and unknown keys are left to the browser", () => {
	assert.equal(playerShortcut(press("f", { ctrlKey: true }), false), null);
	assert.equal(playerShortcut(press("k", { metaKey: true }), false), null);
	assert.equal(playerShortcut(press(" ", { altKey: true }), false), null);
	assert.equal(playerShortcut(press("x"), false), null);
});

test("typing in a field never triggers a shortcut", () => {
	assert.equal(isTypingTarget(element("INPUT")), true);
	assert.equal(isTypingTarget(element("textarea")), true);
	assert.equal(isTypingTarget(element("SELECT")), true);
	assert.equal(isTypingTarget(element("DIV", { role: "combobox" })), true);
	assert.equal(
		isTypingTarget({ ...element("DIV"), isContentEditable: true }),
		true,
	);
	assert.equal(isTypingTarget(element("VIDEO")), false);
	assert.equal(isTypingTarget(null), false);
});

test("space and enter still press a focused button or link", () => {
	assert.equal(isActivationTarget(element("BUTTON"), " "), true);
	assert.equal(isActivationTarget(element("A"), "Enter"), true);
	assert.equal(
		isActivationTarget(element("DIV", { role: "switch" }), " "),
		true,
	);
	assert.equal(isActivationTarget(element("BUTTON"), "m"), false);
	assert.equal(isActivationTarget(element("VIDEO"), " "), false);
});

test("live reconnections wait longer each time, then give up", () => {
	assert.deepEqual(
		LIVE_RETRY_DELAYS_MS.map((_, attempt) => liveRetryDelay(attempt)),
		[2_000, 4_000, 8_000],
	);
	assert.equal(liveRetryDelay(LIVE_RETRY_DELAYS_MS.length), null);
});
