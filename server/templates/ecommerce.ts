import { runFFmpeg } from '../services/ffmpeg.js';
import fs from 'fs';

interface ProductInfo {
  name: string;
  price: string;
  discountPrice?: string;
  description?: string;
  imagePath?: string;
}

// Generate e-commerce product showcase video
export async function generateProductShowcase(
  product: ProductInfo,
  backgroundVideoPath: string,
  outputPath: string,
  duration: number = 10
): Promise<string> {
  console.log(`[E-Commerce] Generating product showcase: ${product.name}`);
  const startTime = Date.now();

  // Price overlay with discount badge
  let priceFilter = `drawtext=text='${product.price}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-200:box=1:boxcolor=#7c3aed@0.8:boxborderw=15:enable='between(t,2,${duration - 2})'`;

  // Add discount price with strikethrough original
  if (product.discountPrice) {
    priceFilter += `,drawtext=text='${product.discountPrice}':fontsize=36:fontcolor=#cccccc:x=(w-text_w)/2:y=h-260:enable='between(t,2,${duration - 2})'`;
  }

  // Product name
  const nameFilter = `drawtext=text='${product.name}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=80:box=1:boxcolor=black@0.5:boxborderw=10:enable='between(t,1,${duration - 1})'`;

  // CTA
  const ctaFilter = `drawtext=text='הזמינו עכשיו':fontsize=32:fontcolor=white:box=1:boxcolor=#22C55E@0.9:boxborderw=15:x=(w-text_w)/2:y=h-120:enable='between(t,${duration - 4},${duration})'`;

  await runFFmpeg(
    `ffmpeg -i "${backgroundVideoPath}" -vf "${nameFilter},${priceFilter},${ctaFilter}" -c:a copy -y "${outputPath}"`
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[E-Commerce] Product showcase generated — ${elapsed}s`);

  return outputPath;
}

// Generate product comparison layout
export async function generateProductComparison(
  products: ProductInfo[],
  outputPath: string,
  duration: number = 15
): Promise<string> {
  console.log(`[E-Commerce] Generating product comparison: ${products.length} products`);
  const startTime = Date.now();

  // Create a simple comparison with text overlays
  // Each product gets screen time proportional to the count
  const perProductDuration = duration / products.length;

  const segments: string[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const segPath = outputPath.replace('.mp4', `_seg_${i}.mp4`);

    // Create colored background with product info
    const bgColor = i % 2 === 0 ? '#1a1a2e' : '#2a1a3e';
    await runFFmpeg(
      `ffmpeg -f lavfi -i "color=c=${bgColor}:s=1920x1080:d=${perProductDuration}" -vf "drawtext=text='${product.name}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='${product.price}':fontsize=64:fontcolor=#7c3aed:x=(w-text_w)/2:y=(h-text_h)/2+50" -c:v libx264 -y "${segPath}"`
    );
    segments.push(segPath);
  }

  // Concat segments
  const listPath = outputPath.replace('.mp4', '_list.txt');
  fs.writeFileSync(listPath, segments.map(s => `file '${s}'`).join('\n'));
  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${outputPath}"`);

  // Cleanup
  for (const seg of segments) {
    try { fs.unlinkSync(seg); } catch {}
  }
  try { fs.unlinkSync(listPath); } catch {}

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[E-Commerce] Product comparison generated — ${elapsed}s`);

  return outputPath;
}
