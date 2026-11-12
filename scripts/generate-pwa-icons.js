import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Standard EduTask Logo SVG (with rounded square neo-brutalist container)
const baseSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#FAFAFA" />
  <!-- Shadow offset -->
  <rect x="76" y="96" width="360" height="360" rx="64" fill="#0A0A0A" />
  <!-- Main tile -->
  <rect x="52" y="72" width="360" height="360" rx="64" fill="#38BDF8" stroke="#0A0A0A" stroke-width="20" />
  <!-- Book pages (E shape) -->
  <rect x="120" y="140" width="180" height="44" rx="16" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="16" />
  <rect x="120" y="230" width="140" height="44" rx="16" fill="#FBBF24" stroke="#0A0A0A" stroke-width="16" />
  <rect x="120" y="320" width="180" height="44" rx="16" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="16" />
  <!-- Green Checkmark with black outline -->
  <path d="M300 320 L350 370 L430 250" stroke="#0A0A0A" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path d="M300 320 L350 370 L430 250" stroke="#10B981" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>
`;

// Maskable SVG with 15% safe padding and full-bleed background
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Full bleed background for any crop shape (circle, squircle, etc) -->
  <rect width="512" height="512" fill="#38BDF8" />
  <!-- Inner Safe Zone Content (Scaled down into center 70%) -->
  <g transform="translate(76, 76) scale(0.70)">
    <!-- Shadow offset -->
    <rect x="76" y="96" width="360" height="360" rx="64" fill="#0A0A0A" />
    <!-- Main tile -->
    <rect x="52" y="72" width="360" height="360" rx="64" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="20" />
    <!-- Book pages (E shape) -->
    <rect x="120" y="140" width="180" height="44" rx="16" fill="#38BDF8" stroke="#0A0A0A" stroke-width="16" />
    <rect x="120" y="230" width="140" height="44" rx="16" fill="#FBBF24" stroke="#0A0A0A" stroke-width="16" />
    <rect x="120" y="320" width="180" height="44" rx="16" fill="#38BDF8" stroke="#0A0A0A" stroke-width="16" />
    <!-- Green Checkmark with black outline -->
    <path d="M300 320 L350 370 L430 250" stroke="#0A0A0A" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M300 320 L350 370 L430 250" stroke="#10B981" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
</svg>
`;

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write base SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), baseSvg.trim());

  // Generate 512x512 standard icon
  await sharp(Buffer.from(baseSvg))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Generate 192x192 standard icon
  await sharp(Buffer.from(baseSvg))
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate 180x180 Apple Touch Icon (specifically for iOS Safari)
  await sharp(Buffer.from(baseSvg))
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate 512x512 Maskable Icon (safe margins, full bleed)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate favicon.png
  await sharp(Buffer.from(baseSvg))
    .resize(64, 64)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('PWA icons successfully generated in /public!');
}

generate().catch(err => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
