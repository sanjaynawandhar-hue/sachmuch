/**
 * Generates the app icons from one SVG source.
 *
 * Android needs real PNGs at specific sizes for a home-screen install, and a
 * MASKABLE variant with generous padding — Android crops icons to whatever
 * shape the launcher uses (circle, squircle, teardrop), and an icon drawn edge
 * to edge gets its corners sliced off. The maskable version keeps the mark
 * inside the safe zone: the middle 80% of the canvas.
 *
 * Run: node apps/web/scripts/make-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const GRADIENT = `
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FF8A3D"/>
    <stop offset="38%" stop-color="#FF4D8D"/>
    <stop offset="70%" stop-color="#B14BF4"/>
    <stop offset="100%" stop-color="#6C7BFF"/>
  </linearGradient>`;

/** `inset` is the share of the canvas left empty around the mark. */
function icon(size, inset) {
  const pad = Math.round(size * inset);
  const box = size - pad * 2;
  const radius = Math.round(box * 0.22);
  const fontSize = Math.round(box * 0.62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${GRADIENT}</defs>
  <rect width="${size}" height="${size}" fill="#08070C"/>
  <rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${radius}" fill="url(#g)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Helvetica, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#08070C">S</text>
</svg>`;
}

const targets = [
  // Standard icons sit close to the edge; the launcher shows them as drawn.
  { file: 'icon-192.png', size: 192, inset: 0.06 },
  { file: 'icon-512.png', size: 512, inset: 0.06 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.06 },
  // Maskable icons must survive an aggressive crop, so the mark sits well in.
  { file: 'icon-maskable-192.png', size: 192, inset: 0.18 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.18 },
];

for (const t of targets) {
  const png = await sharp(Buffer.from(icon(t.size, t.inset))).png().toBuffer();
  writeFileSync(new URL(`../public/${t.file}`, import.meta.url), png);
  console.log(`${t.file}  ${t.size}x${t.size}  ${(png.length / 1024).toFixed(1)} kB`);
}

// A monochrome favicon for the browser tab.
const fav = await sharp(Buffer.from(icon(64, 0.04))).png().toBuffer();
writeFileSync(new URL('../public/favicon.png', import.meta.url), fav);
console.log('favicon.png');
