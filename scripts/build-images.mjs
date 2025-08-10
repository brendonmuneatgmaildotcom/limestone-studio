import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const srcDir = "public/images";
const outDir = "public/images/optimized";

// target widths suited to your layout; tweak as needed
const widths = [320, 480, 640, 768, 1024];

const quality = { avif: 55, webp: 70, jpeg: 70 }; // gentle compression, looks great on photos

// only process these (from your audit)
const files = [
  "pondfront.jpg","drive.jpg","out.jpg","pondrev.jpg","door.jpg","limestone.jpg",
  "bed.jpg","loo.jpg","dinner.jpg","hall.jpg","rev.jpg","shower.jpg","kitch.jpg",
  "sidebanner.jpg","rightbanner.jpg"
];

await fs.mkdir(outDir, { recursive: true });

for (const file of files) {
  const base = path.parse(file).name;
  const input = path.join(srcDir, file);

  const buf = await fs.readFile(input);
  const meta = await sharp(buf).metadata();

  for (const w of widths) {
    if (w > meta.width) continue;

    // AVIF
    await sharp(buf).resize({ width: w })
      .avif({ quality: quality.avif })
      .toFile(path.join(outDir, `${base}-${w}.avif`));

    // WebP
    await sharp(buf).resize({ width: w })
      .webp({ quality: quality.webp })
      .toFile(path.join(outDir, `${base}-${w}.webp`));
  }

  // Fallback JPEG at a sensible size (optional)
  await sharp(buf).resize({ width: Math.min(1024, meta.width || 1024) })
    .jpeg({ quality: quality.jpeg, mozjpeg: true })
    .toFile(path.join(outDir, `${base}-1024.jpg`));
}

console.log("✅ Image variants written to public/images/optimized");
