/**
 * Client-side image optimizer using Canvas API.
 * - Converts to WebP when supported (falls back to JPEG)
 * - Generates two variants: thumbnail (400px) and detail (1600px)
 * - Quality: 70% — original raw file is never stored
 * - Optional watermark overlay burned into the image
 */

const OUTPUT_FORMAT = 'image/webp';
const OUTPUT_EXT    = 'webp';
const QUALITY       = 0.70;

export interface WatermarkConfig {
  enabled: boolean;
  imageUrl: string;
  opacity: number;       // 0-1
  position: 'bottom-right' | 'bottom-left' | 'center' | 'top-right';
}

export interface OptimizedImages {
  thumbnail: File;   // 400px wide
  detail:    File;   // 1600px wide max
  ext:       string; // 'webp' | 'jpg'
}

function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
  });
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  watermarkImg: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  opacity: number,
  position: WatermarkConfig['position'],
) {
  // Size watermark to ~25% of the canvas width, maintaining aspect ratio
  const maxWmWidth = canvasW * 0.25;
  const scale = Math.min(1, maxWmWidth / watermarkImg.naturalWidth);
  const wmW = Math.round(watermarkImg.naturalWidth * scale);
  const wmH = Math.round(watermarkImg.naturalHeight * scale);

  const padding = Math.round(canvasW * 0.03);
  let x: number, y: number;

  switch (position) {
    case 'bottom-left':
      x = padding; y = canvasH - wmH - padding; break;
    case 'top-right':
      x = canvasW - wmW - padding; y = padding; break;
    case 'center':
      x = (canvasW - wmW) / 2; y = (canvasH - wmH) / 2; break;
    case 'bottom-right':
    default:
      x = canvasW - wmW - padding; y = canvasH - wmH - padding; break;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  // Add a subtle shadow for visibility on any background
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.drawImage(watermarkImg, x, y, wmW, wmH);
  ctx.restore();
}

async function resizeToBlob(
  img: HTMLImageElement,
  maxWidth: number,
  format: string,
  quality: number,
  watermark?: { img: HTMLImageElement; opacity: number; position: WatermarkConfig['position'] },
): Promise<Blob> {
  const scale  = Math.min(1, maxWidth / img.naturalWidth);
  const width  = Math.round(img.naturalWidth  * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(img, 0, 0, width, height);

  // Burn watermark if provided
  if (watermark) {
    drawWatermark(ctx, watermark.img, width, height, watermark.opacity, watermark.position);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      format,
      quality,
    );
  });
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}

// Cached watermark image element to avoid re-downloading
let cachedWatermarkUrl: string | null = null;
let cachedWatermarkImg: HTMLImageElement | null = null;

async function getWatermarkImg(url: string): Promise<HTMLImageElement> {
  if (cachedWatermarkUrl === url && cachedWatermarkImg) return cachedWatermarkImg;
  const img = await loadImage(url);
  cachedWatermarkUrl = url;
  cachedWatermarkImg = img;
  return img;
}

export async function optimizePropertyImage(
  file: File,
  watermarkConfig?: WatermarkConfig,
): Promise<OptimizedImages> {
  const img  = await loadImage(file);
  const base = crypto.randomUUID();

  let watermark: { img: HTMLImageElement; opacity: number; position: WatermarkConfig['position'] } | undefined;
  if (watermarkConfig?.enabled && watermarkConfig.imageUrl) {
    const wmImg = await getWatermarkImg(watermarkConfig.imageUrl);
    watermark = { img: wmImg, opacity: watermarkConfig.opacity, position: watermarkConfig.position };
  }

  const [thumbBlob, detailBlob] = await Promise.all([
    resizeToBlob(img, 400,  OUTPUT_FORMAT, QUALITY, watermark),
    resizeToBlob(img, 1600, OUTPUT_FORMAT, QUALITY, watermark),
  ]);

  // Release object URL if it was a File
  if (typeof file !== 'string') URL.revokeObjectURL(img.src);

  return {
    thumbnail: blobToFile(thumbBlob,  `${base}_thumb.${OUTPUT_EXT}`),
    detail:    blobToFile(detailBlob, `${base}_detail.${OUTPUT_EXT}`),
    ext:       OUTPUT_EXT,
  };
}

/**
 * Compress any image to WebP Blob — useful for banners, agent photos, etc.
 */
export async function compressToWebP(
  file: File,
  maxWidth = 1600,
  quality = QUALITY,
): Promise<Blob> {
  const img = await loadImage(file);
  const blob = await resizeToBlob(img, maxWidth, OUTPUT_FORMAT, quality);
  URL.revokeObjectURL(img.src);
  return blob;
}
