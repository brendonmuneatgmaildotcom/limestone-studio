// scripts/fix-drive.js
import sharp from "sharp";
import path from "path";

const input = path.resolve("public/images/drive.jpg"); // original portrait image
const thumbWidth = 400;    // match your existing settings
const largeResize = { width: 1600 }; // or { width: 1200, height: 1600 } if you want fixed size
const avifQ = 60;
const webpQ = 75;
const jpgQ = 80;

async function fixDrive() {
  console.log("Fixing drive image with orientation baked in...");

  // Large versions
  await sharp(input)
    .rotate() // bake in correct EXIF orientation
    .resize(largeResize)
    .avif({ quality: avifQ })
    .toFile("public/images/drive-large.avif");

  await sharp(input)
    .rotate()
    .resize(largeResize)
    .webp({ quality: webpQ })
    .toFile("public/images/drive-large.webp");

  // Thumbnail versions
  await sharp(input)
    .rotate()
    .resize({ width: thumbWidth })
    .avif({ quality: avifQ })
    .toFile("public/images/drive-thumb.avif");

  await sharp(input)
    .rotate()
    .resize({ width: thumbWidth })
    .webp({ quality: webpQ })
    .toFile("public/images/drive-thumb.webp");

  await sharp(input)
    .rotate()
    .resize({ width: thumbWidth })
    .jpeg({ quality: jpgQ, mozjpeg: true })
    .toFile("public/images/drive-thumb.jpg");

  console.log("Done — drive images regenerated.");
}

fixDrive().catch(err => {
  console.error(err);
  process.exit(1);
});
