import sharp from "sharp";
const src = "public/images/limestone.jpg";

// target widths for responsive hero
const widths = [640, 1024, 1600];

for (const w of widths) {
  await sharp(src).resize({ width: w })
    .avif({ quality: 60 })
    .toFile(`public/images/limestone-${w}.avif`);

  await sharp(src).resize({ width: w })
    .webp({ quality: 75 })
    .toFile(`public/images/limestone-${w}.webp`);
}

// optional: a lean JPG fallback
await sharp(src).resize({ width: 1024 })
  .jpeg({ quality: 72, mozjpeg: true })
  .toFile("public/images/limestone-1024.jpg");

console.log("✅ limestone hero variants ready");
