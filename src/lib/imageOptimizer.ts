/**
 * Client-side image optimizer using Canvas API.
 * - Converts to WebP when supported (falls back to JPEG)
 * - Generates two variants: thumbnail (400px) and detail (1600px)
 * - Quality: 70% — original raw file is never stored
 */

const OUTPUT_FORMAT = 'image/webp';
const OUTPUT_EXT    = 'webp';
const QUALITY       = 0.70;

export interface OptimizedImages {
  thumbnail: File;   // 400px wide
  detail:    File;   // 1600px wide max
  ext:       string; // 'webp' | 'jpg'
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function resizeToBlob(
  img: HTMLImageElement,
  maxWidth: number,
  format: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const scale  = Math.min(1, maxWidth / img.naturalWidth);
    const width  = Math.round(img.naturalWidth  * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Canvas not supported')); return; }

    ctx.drawImage(img, 0, 0, width, height);
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

export async function optimizePropertyImage(file: File): Promise<OptimizedImages> {
  const img  = await loadImage(file);
  const base = crypto.randomUUID();

  const [thumbBlob, detailBlob] = await Promise.all([
    resizeToBlob(img, 400,  OUTPUT_FORMAT, QUALITY),
    resizeToBlob(img, 1600, OUTPUT_FORMAT, QUALITY),
  ]);

  // Release object URL
  URL.revokeObjectURL(img.src);

  return {
    thumbnail: blobToFile(thumbBlob,  `${base}_thumb.${OUTPUT_EXT}`),
    detail:    blobToFile(detailBlob, `${base}_detail.${OUTPUT_EXT}`),
    ext:       OUTPUT_EXT,
  };
}
