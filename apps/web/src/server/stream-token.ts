import "server-only";
import {
	createCipheriv,
	createDecipheriv,
	hkdfSync,
	randomBytes,
} from "node:crypto";
import { env } from "@moderniptvplayer/env/server";

/**
 * Opaque, tamper-proof token standing for one upstream URL.
 *
 * HLS manifests list segment URLs that contain the playlist credentials. The
 * browser must never see them, and the proxy must never fetch a URL a client
 * made up (that would be an open proxy). Manifests are rewritten so that every
 * URL becomes `?t=<token>`: AES-256-GCM, authenticated, bound to one user.
 *
 * Cryptr is deliberately not used here: it derives a key with scrypt on every
 * call, which is far too slow for dozens of segment URLs per manifest refresh.
 */

const key = Buffer.from(
	hkdfSync(
		"sha256",
		env.SECRET_KEY,
		"",
		"moderniptvplayer/stream-token/v1",
		32,
	),
);

const IV_BYTES = 12;
const TAG_BYTES = 16;
export const STREAM_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export type StreamTokenKind = "m" | "r";

export type StreamTokenPayload = {
	/** Absolute upstream URL. */
	u: string;
	/** Owner: the token is useless to any other account. */
	uid: string;
	/** "m": the target is an HLS playlist to rewrite; "r": any other resource. */
	k: StreamTokenKind;
	/** Expiry, epoch milliseconds. */
	exp: number;
};

export function sealStreamToken(
	url: string,
	userId: string,
	kind: StreamTokenKind,
	ttlMs = STREAM_TOKEN_TTL_MS,
): string {
	const payload: StreamTokenPayload = {
		u: url,
		uid: userId,
		k: kind,
		exp: Date.now() + ttlMs,
	};
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const data = Buffer.concat([
		cipher.update(JSON.stringify(payload), "utf8"),
		cipher.final(),
	]);
	return Buffer.concat([iv, data, cipher.getAuthTag()]).toString("base64url");
}

export function openStreamToken(token: string): StreamTokenPayload | null {
	try {
		const raw = Buffer.from(token, "base64url");
		if (raw.length <= IV_BYTES + TAG_BYTES) {
			return null;
		}
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key,
			raw.subarray(0, IV_BYTES),
		);
		decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
		const json = Buffer.concat([
			decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)),
			decipher.final(),
		]).toString("utf8");

		const payload = JSON.parse(json) as Partial<StreamTokenPayload>;
		if (
			typeof payload.u !== "string" ||
			typeof payload.uid !== "string" ||
			(payload.k !== "m" && payload.k !== "r") ||
			typeof payload.exp !== "number" ||
			payload.exp <= Date.now()
		) {
			return null;
		}
		return { u: payload.u, uid: payload.uid, k: payload.k, exp: payload.exp };
	} catch {
		return null;
	}
}
