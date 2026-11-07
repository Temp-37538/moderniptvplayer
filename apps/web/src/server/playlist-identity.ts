import { createHash } from "node:crypto";

/** Xtream uniqueness, matching the migration backfill. */
export function xtreamIdentityKey(serverUrl: string, username: string): string {
	return `${serverUrl}\n${username}`;
}

export function sha256Hex(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}
