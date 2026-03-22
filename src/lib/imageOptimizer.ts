/**
 * Client-side image optimizer using Canvas API.
 * - Converts to WebP when supported (falls back to JPEG)
 * - Generates two variants: thumbnail (400px) and detail (1600px)
 * - Quality: 85% — original raw file is never stored
 * - Watermark is NOT burned into images; it's rendered as a CSS overlay in the portal
 */

const OUTPUT_FORMAT = "image/webp";
const OUTPUT_EXT = "webp";
const QUALITY = 0.92;

export interface OptimizedImages {
  thumbnail: File; // 600px wide
  detail: File; // 2400px wide max
  ext: string; // 'webp' | 'jpg'
}

function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}

async function resizeToBlob(img: HTMLImageElement, maxWidth: number, format: string, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), format, quality);
  });
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}

export async function optimizePropertyImage(file: File): Promise<OptimizedImages> {
  const img = await loadImage(file);
  const base = crypto.randomUUID();

  const [thumbBlob, detailBlob] = await Promise.all([
    resizeToBlob(img, 400, OUTPUT_FORMAT, QUALITY),
    resizeToBlob(img, 1600, OUTPUT_FORMAT, QUALITY),
  ]);

  // Release object URL if it was a File
  if (typeof file !== "string") URL.revokeObjectURL(img.src);

  return {
    thumbnail: blobToFile(thumbBlob, `${base}_thumb.${OUTPUT_EXT}`),
    detail: blobToFile(detailBlob, `${base}_detail.${OUTPUT_EXT}`),
    ext: OUTPUT_EXT,
  };
}

/**
 * Compress any image to WebP Blob — useful for banners, agent photos, etc.
 */
export async function compressToWebP(file: File, maxWidth = 1600, quality = QUALITY): Promise<Blob> {
  const img = await loadImage(file);
  const blob = await resizeToBlob(img, maxWidth, OUTPUT_FORMAT, quality);
  URL.revokeObjectURL(img.src);
  return blob;
}
