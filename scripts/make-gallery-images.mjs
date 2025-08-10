// scripts/make-gallery-images.mjs
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const srcDir = "public/images";

// Exactly your gallery names:
const names = [
  "bed","pondrev","dinner","door","loo","hall","rev","kitch",
  "pondfront","out","shower","drive"
];

// Settings
const thumbWidth = 600;     // grid thumbnails
const largeLongEdge = 1600; // lightbox image
const avifQ = 60;
const webpQ = 75;
const jpgQ  = 70;

// Skip work if target is older than src (or missing)
async function needsBuild(src, out) {
  try {
    const [s, o] = await Promise.all([fs.stat(src), fs.stat(out)]);
    return o.mtimeMs < s.mtimeMs;
  } catch {
    return true;
  }
}

for (const name of names) {
  const input = path.join(srcDir, `${name}.jpg`);

  try {
    const base = sharp(input).rotate(); // ⟵ EXIF-safe rotation
    const meta = await base.metadata();
    if (!meta.width || !meta.height) {
      console.warn(`Skipping ${name}: could not read dimensions`);
      continue;
    }

    const isLandscape = meta.width >= meta.height;
    const largeResize = isLandscape
      ? { width: Math.min(meta.width, largeLongEdge) }
      : { height: Math.min(meta.height, largeLongEdge) };

    const outLargeAvif = path.join(srcDir, `${name}-large.avif`);
    const outLargeWebp = path.join(srcDir, `${name}-large.webp`);
    const outThumbAvif = path.join(srcDir, `${name}-thumb.avif`);
    const outThumbWebp = path.join(srcDir, `${name}-thumb.webp`);
    const outThumbJpg  = path.join(srcDir, `${name}-thumb.jpg`);

    // Large (lightbox)
    if (await needsBuild(input, outLargeAvif)) {
      await sharp(input).rotate().resize(largeResize).avif({ quality: avifQ }).toFile(outLargeAvif);
      console.log(`✓ ${name}-large.avif`);
    }
    if (await needsBuild(input, outLargeWebp)) {
      await sharp(input).rotate().resize(largeResize).webp({ quality: webpQ }).toFile(outLargeWebp);
      console.log(`✓ ${name}-large.webp`);
    }

    // Thumbs (grid)
    if (await needsBuild(input, outThumbAvif)) {
      await sharp(input).rotate().resize({ width: thumbWidth }).avif({ quality: avifQ }).toFile(outThumbAvif);
      console.log(`✓ ${name}-thumb.avif`);
    }
    if (await needsBuild(input, outThumbWebp)) {
      await sharp(input).rotate().resize({ width: thumbWidth }).webp({ quality: webpQ }).toFile(outThumbWebp);
      console.log(`✓ ${name}-thumb.webp`);
    }
    if (await needsBuild(input, outThumbJpg)) {
      await sharp(input).rotate().resize({ width: thumbWidth }).jpeg({ quality: jpgQ, mozjpeg: true }).toFile(outThumbJpg);
      console.log(`✓ ${name}-thumb.jpg`);
    }
  } catch (e) {
    console.error(`⚠️  Problem processing ${name}.jpg: ${e.message}`);
  }
}

console.log("✅ Gallery images ready (EXIF orientation normalized).");
