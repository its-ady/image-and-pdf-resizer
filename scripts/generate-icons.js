import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = join(process.cwd(), 'public', 'logo.jpg');
const outputDir = join(process.cwd(), 'public', 'icons');

mkdirSync(outputDir, { recursive: true });

for (const size of sizes) {
  const outputPath = join(outputDir, `icon-${size}x${size}.png`);
  await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outputPath);
  console.log(`Generated: icon-${size}x${size}.png`);
}

console.log('All icons generated successfully!');
