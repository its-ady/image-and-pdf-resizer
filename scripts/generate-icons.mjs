import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const logoPath = join(publicDir, "logo.jpg");

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(logoPath)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  console.log("All icons generated successfully!");
}

generateIcons().catch(console.error);
