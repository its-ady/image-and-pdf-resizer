import sharp from 'sharp';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = '/vercel/share/v0-project/public/logo.jpg';

for (const size of sizes) {
  const buffer = await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer();
  const base64 = buffer.toString('base64');
  console.log(`ICON_${size}:${base64}`);
}

console.log('DONE');
