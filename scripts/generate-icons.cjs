/**
 * Dependency-free PWA icon generator. Renders the forest/leaf mark used in
 * favicon.svg directly to raw pixels and hand-encodes real PNG files using
 * only Node's built-in zlib (deflate for IDAT, crc32 for chunk checksums) —
 * no canvas, no image libraries, nothing to npm install.
 *
 * Run with: node scripts/generate-icons.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'public', 'icons');

const BG = [0x8f, 0xd6, 0x7f]; // light green circle, matches favicon.svg
const LEAF = [0x3f, 0x8f, 0x4f]; // darker green leaf
const VEIN = [0x2f, 0x6d, 0x3d]; // vein line

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

/** Renders one RGBA icon. `maskable` fills edge-to-edge and shrinks the mark into the safe zone. */
function renderIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;

  // Background: full-bleed square for maskable (so OS masking never shows
  // transparent corners), an inscribed circle otherwise.
  const bgRadius = maskable ? size * 0.71 : size * 0.5;

  // Leaf: a vesica-piscis (intersection of two equal circles) swept
  // diagonally, scaled down and re-centered for the maskable safe zone.
  const scale = maskable ? 0.6 : 1;
  const r = size * 0.34 * scale;
  const d = size * 0.17 * scale;
  const leafA = { x: cx - d, y: cy - d, r };
  const leafB = { x: cx + d, y: cy + d, r };
  const veinStart = { x: cx - d * 1.6, y: cy - d * 0.2 };
  const veinEnd = { x: cx + d * 0.2, y: cy + d * 1.6 };
  const veinWidth = Math.max(1, size * 0.012);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const distFromCenter = Math.hypot(x - cx, y - cy);

      if (distFromCenter > bgRadius) {
        // transparent
        pixels[idx + 3] = 0;
        continue;
      }

      const inLeaf =
        Math.hypot(x - leafA.x, y - leafA.y) < leafA.r && Math.hypot(x - leafB.x, y - leafB.y) < leafB.r;
      const onVein = distToSegment(x, y, veinStart.x, veinStart.y, veinEnd.x, veinEnd.y) < veinWidth;

      const color = onVein && inLeaf ? VEIN : inLeaf ? LEAF : BG;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}

function crc32Chunk(typeAndData) {
  const crc = zlib.crc32(typeAndData);
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(crc >>> 0, 0);
  return buf;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  return Buffer.concat([length, typeBuf, data, crc32Chunk(Buffer.concat([typeBuf, data]))]);
}

/** Encodes an RGBA pixel buffer as a real PNG file (8-bit, color type 6). */
function encodePNG(size, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Raw scanlines: one filter-type byte (0 = none) per row, then RGBA bytes.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeIcon(fileName, size, options) {
  const png = encodePNG(size, renderIcon(size, options));
  fs.writeFileSync(path.join(OUT_DIR, fileName), png);
  console.log(`Wrote ${fileName} (${size}x${size}, ${png.length} bytes)`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
writeIcon('icon-192.png', 192, { maskable: false });
writeIcon('icon-512.png', 512, { maskable: false });
writeIcon('maskable-icon-512.png', 512, { maskable: true });
