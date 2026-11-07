import assert from "node:assert/strict";
import test from "node:test";
import { xtreamIdentityKey } from "./playlist-identity.ts";
import {
	decideM3uImport,
	M3uPlaylistError,
	parseM3uPlaylist,
	type XtreamPlaylistTarget,
	xtreamTargetFromGetPhp,
} from "./m3u.ts";

const USER = "demo-user";
const PASS = "demo-pass";
const GET_PHP = `http://playlist.example:8080/get.php?username=${USER}&password=${PASS}&type=m3u_plus`;
const PLAYLIST = `#EXTM3U
#EXTINF:-1 group-title="News",World News
http://cdn.example/live/news.ts
`;

function loginSpy(result: { ok: boolean; error?: "network" } = { ok: true }) {
	const calls: XtreamPlaylistTarget[] = [];
	return {
		calls,
		validate: async (target: XtreamPlaylistTarget) => {
			calls.push(target);
			return result;
		},
	};
}

function assertNoCredentialLeak(message: string) {
	assert.equal(message.includes(PASS), false);
	assert.equal(message.includes(USER), false);
	assert.equal(message.includes("get.php?"), false);
	assert.equal(
		message.toLowerCase().includes("invalid playlist credentials"),
		false,
	);
	assert.equal(message.toLowerCase().includes("bad password"), false);
	assert.equal(message.toLowerCase().includes("incorrect password"), false);
}

test("get.php base URL keeps protocol, port, and installation path", () => {
	assert.deepEqual(xtreamTargetFromGetPhp(GET_PHP), {
		username: USER,
		password: PASS,
		serverUrl: "http://playlist.example:8080",
	});
	assert.deepEqual(
		xtreamTargetFromGetPhp(
			`https://playlist.example/xtream/portal/get.php?password=${PASS}&username=${USER}`,
		),
		{
			username: USER,
			password: PASS,
			serverUrl: "https://playlist.example/xtream/portal",
		},
	);
	assert.deepEqual(
		xtreamTargetFromGetPhp(
			`https://playlist.example:8443/app/get.php?username=${USER}&password=${PASS}`,
		),
		{
			username: USER,
			password: PASS,
			serverUrl: "https://playlist.example:8443/app",
		},
	);
	assert.equal(
		xtreamTargetFromGetPhp(
			`http://playlist.example:80/get.php?username=${USER}&password=${PASS}`,
		)?.serverUrl,
		"http://playlist.example",
	);
	assert.equal(
		xtreamTargetFromGetPhp(
			`http://other:secret@playlist.example:8080/panel/get.php?username=${USER}&password=${PASS}`,
		)?.serverUrl,
		"http://playlist.example:8080/panel",
	);
	const nested = xtreamTargetFromGetPhp(
		`https://playlist.example:8443/app/get.php?username=${USER}&password=${PASS}`,
	);
	assert.ok(nested);
	assert.equal(
		xtreamIdentityKey(nested.serverUrl, nested.username),
		`https://playlist.example:8443/app\n${USER}`,
	);
});

test("get.php without username or password is not an Xtream target", () => {
	assert.equal(
		xtreamTargetFromGetPhp(
			"http://playlist.example/get.php?username=demo-user",
		),
		null,
	);
	assert.equal(
		xtreamTargetFromGetPhp(
			"http://playlist.example/get.php?password=demo-pass",
		),
		null,
	);
	assert.equal(
		xtreamTargetFromGetPhp(
			"http://playlist.example/playlist.m3u?username=demo-user&password=demo-pass",
		),
		null,
	);
	assert.equal(
		xtreamTargetFromGetPhp(
			"http://playlist.example/get.php/extra?username=demo-user&password=demo-pass",
		),
		null,
	);
});

test("HTTP 884 with or without a body uses an accepted Xtream login", async () => {
	for (const body of ["", "not a playlist", PLAYLIST]) {
		const login = loginSpy();
		const decision = await decideM3uImport({
			storedUrl: GET_PHP,
			status: 884,
			body,
			validateXtream: login.validate,
		});
		assert.equal(decision.mode, "xtream");
		if (decision.mode === "xtream") {
			assert.deepEqual(decision.target, {
				username: USER,
				password: PASS,
				serverUrl: "http://playlist.example:8080",
			});
		}
		assert.equal(login.calls.length, 1);
	}
});

test("rejected or unreachable Xtream login stays a server error", async () => {
	const rejected = loginSpy({ ok: false });
	await assert.rejects(
		() =>
			decideM3uImport({
				storedUrl: GET_PHP,
				status: 884,
				body: "",
				validateXtream: rejected.validate,
			}),
		(error: unknown) => {
			assert.ok(error instanceof M3uPlaylistError);
			assert.equal(error.code, "server_refused");
			assert.equal(error.message, "The server rejected the Xtream login.");
			assertNoCredentialLeak(error.message);
			return true;
		},
	);

	const offline = loginSpy({ ok: false, error: "network" });
	await assert.rejects(
		() =>
			decideM3uImport({
				storedUrl: GET_PHP,
				status: 884,
				body: PLAYLIST,
				validateXtream: offline.validate,
			}),
		(error: unknown) => {
			assert.ok(error instanceof M3uPlaylistError);
			assert.equal(error.code, "network");
			assert.match(error.message, /could not be reached/);
			assert.match(
				error.message,
				/does not mean the credentials are incorrect/,
			);
			assertNoCredentialLeak(error.message);
			return true;
		},
	);
});

test("HTTP 884 without a supported get.php URL does not call Xtream", async () => {
	const login = loginSpy();
	await assert.rejects(
		() =>
			decideM3uImport({
				storedUrl: "http://playlist.example/playlist.m3u",
				status: 884,
				body: "",
				validateXtream: login.validate,
			}),
		(error: unknown) => {
			assert.ok(error instanceof M3uPlaylistError);
			assert.equal(error.code, "unsupported_url");
			assert.match(error.message, /not attempted/);
			assert.match(error.message, /not necessarily incorrect/);
			assertNoCredentialLeak(error.message);
			return true;
		},
	);
	assert.equal(login.calls.length, 0);

	const missing = loginSpy();
	await assert.rejects(
		() =>
			decideM3uImport({
				storedUrl: "http://playlist.example/get.php?username=demo-user",
				status: 884,
				body: "blocked",
				validateXtream: missing.validate,
			}),
		(error: unknown) => {
			assert.ok(error instanceof M3uPlaylistError);
			assert.equal(error.code, "unsupported_url");
			return true;
		},
	);
	assert.equal(missing.calls.length, 0);
});

test("non-884 responses do not fall back to Xtream", async () => {
	for (const status of [401, 403, 404, 500]) {
		const login = loginSpy();
		await assert.rejects(
			() =>
				decideM3uImport({
					storedUrl: GET_PHP,
					status,
					body: PLAYLIST,
					validateXtream: login.validate,
				}),
			(error: unknown) => {
				assert.ok(error instanceof M3uPlaylistError);
				assert.equal(error.code, "invalid");
				assert.equal(
					error.message,
					"This URL did not return a usable M3U playlist.",
				);
				return true;
			},
		);
		assert.equal(login.calls.length, 0);
	}
});

test("a normal M3U response stays an M3U playlist", async () => {
	const login = loginSpy();
	const decision = await decideM3uImport({
		storedUrl: "https://cdn.example/lists/channels.m3u",
		status: 200,
		body: PLAYLIST,
		validateXtream: login.validate,
	});
	assert.equal(decision.mode, "m3u");
	if (decision.mode === "m3u") {
		assert.deepEqual(decision.parsed, parseM3uPlaylist(PLAYLIST));
		assert.equal(decision.parsed.live.length, 1);
	}
	assert.equal(login.calls.length, 0);

	const getPhpPlaylist = loginSpy();
	const served = await decideM3uImport({
		storedUrl: GET_PHP,
		status: 200,
		body: PLAYLIST,
		validateXtream: getPhpPlaylist.validate,
	});
	assert.equal(served.mode, "m3u");
	assert.equal(getPhpPlaylist.calls.length, 0);
});
