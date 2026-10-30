// Writes app-icon.png (1024x1024, solid dark square with a play triangle) so
// that `tauri icon` can generate the icon set. No image tool needed.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const size = 1024;
const raw = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y += 1) {
	const row = y * (size * 4 + 1);
	raw[row] = 0;
	for (let x = 0; x < size; x += 1) {
		const inTriangle = x >= 380 && x <= 760 && Math.abs(y - 512) <= ((760 - x) * 212) / 380;
		const at = row + 1 + x * 4;
		const [r, g, b] = inTriangle ? [244, 162, 70] : [14, 14, 17];
		raw[at] = r;
		raw[at + 1] = g;
		raw[at + 2] = b;
		raw[at + 3] = 255;
	}
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc32 = (buf) => {
	let c = 0xffffffff;
	for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const body = Buffer.concat([Buffer.from(type), data]);
	const out = Buffer.alloc(8 + data.length + 4);
	out.writeUInt32BE(data.length, 0);
	body.copy(out, 4);
	out.writeUInt32BE(crc32(body), 8 + data.length);
	return out;
};
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8; // bit depth
header[9] = 6; // RGBA
writeFileSync(
	"app-icon.png",
	Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(raw)),
		chunk("IEND", Buffer.alloc(0)),
	]),
);
console.log("wrote app-icon.png");
