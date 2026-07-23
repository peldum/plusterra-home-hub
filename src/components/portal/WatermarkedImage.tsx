import { useEffect, useRef, useState } from 'react';
import { usePortalSettings } from '@/hooks/usePortalSettings';
import { useAuth } from '@/contexts/AuthContext';

interface WatermarkedImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'eager' | 'lazy';
  draggable?: boolean;
  onClick?: () => void;
  /** Forced fallback: if compositing fails (CORS, etc.), still show the original src. */
  fallbackOnError?: boolean;
}

const loadImg = (src: string, anonymous = true): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (anonymous) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Renders a property image with the portal watermark BAKED INTO the bitmap
 * (via offscreen canvas → blob URL). This means right-click → Save Image
 * downloads the watermarked composite, not the bare original.
 *
 * Falls back to the original `src` if compositing fails (CORS, watermark
 * missing, etc.) so the UI is never broken.
 */
export const WatermarkedImage = ({
  src,
  alt = '',
  className,
  style,
  loading = 'lazy',
  draggable = false,
  onClick,
  fallbackOnError = true,
}: WatermarkedImageProps) => {
  const { settings } = usePortalSettings();
  const { user } = useAuth();
  const [composedUrl, setComposedUrl] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Cleanup previous blob URL
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setComposedUrl(null);

    if (!src) return;

    const enabled = !!settings?.watermark_enabled && !!settings?.watermark_image_url;
    if (!enabled) return; // no overlay → just show original

    (async () => {
      try {
        const [base, wm] = await Promise.all([
          loadImg(src),
          loadImg(settings!.watermark_image_url!),
        ]);
        if (cancelled) return;

        const canvas = document.createElement('canvas');
        canvas.width = base.naturalWidth || base.width;
        canvas.height = base.naturalHeight || base.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Base image
        ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

        // Watermark
        const wmW = canvas.width * 0.25;
        const wmH = (wm.height / wm.width) * wmW;
        const pad = canvas.width * 0.03;
        let wx = canvas.width - wmW - pad;
        let wy = canvas.height - wmH - pad;
        switch (settings!.watermark_position) {
          case 'bottom-left':
            wx = pad;
            wy = canvas.height - wmH - pad;
            break;
          case 'top-right':
            wx = canvas.width - wmW - pad;
            wy = pad;
            break;
          case 'center':
            wx = (canvas.width - wmW) / 2;
            wy = (canvas.height - wmH) / 2;
            break;
        }
        ctx.save();
        ctx.globalAlpha = settings!.watermark_opacity ?? 0.3;
        ctx.drawImage(wm, wx, wy, wmW, wmH);
        ctx.restore();

        const blob: Blob | null = await new Promise((res) =>
          canvas.toBlob((b) => res(b), 'image/jpeg', 0.9)
        );
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setComposedUrl(url);
      } catch {
        // CORS or load failure → keep original src
        if (!fallbackOnError) setComposedUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, settings?.watermark_enabled, settings?.watermark_image_url, settings?.watermark_opacity, settings?.watermark_position]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  const finalSrc = composedUrl || src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading={loading}
      draggable={draggable}
      onClick={onClick}
      onContextMenu={(e) => {
        // Internal users (logged in) can always right-click → save/copy.
        if (user) return;
        // Public visitors: allow save only of the watermarked composite.
        if (composedUrl) return;
        e.preventDefault();
      }}
      className={className}
      style={user ? style : { userSelect: 'none', WebkitUserSelect: 'none', ...style }}
    />
  );
};
