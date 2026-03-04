import { usePortalSettings } from '@/hooks/usePortalSettings';

interface PortalWatermarkProps {
  className?: string;
}

/**
 * CSS-based watermark overlay — rendered on top of property images in the portal.
 * Reads watermark config (image, opacity, position) from portal_settings in real time.
 */
export const PortalWatermark = ({ className = '' }: PortalWatermarkProps) => {
  const { settings } = usePortalSettings();

  if (!settings?.watermark_enabled || !settings?.watermark_image_url) return null;

  const { watermark_image_url, watermark_opacity, watermark_position } = settings;

  const positionStyles: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    width: '25%',
    maxWidth: 200,
    opacity: watermark_opacity ?? 0.3,
    filter: 'drop-shadow(1px 1px 4px rgba(0,0,0,0.3))',
    zIndex: 5,
    ...(watermark_position === 'bottom-right' && { bottom: '3%', right: '3%' }),
    ...(watermark_position === 'bottom-left' && { bottom: '3%', left: '3%' }),
    ...(watermark_position === 'top-right' && { top: '3%', right: '3%' }),
    ...(watermark_position === 'center' && {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }),
  };

  return (
    <img
      src={watermark_image_url}
      alt=""
      aria-hidden="true"
      className={className}
      style={positionStyles}
      draggable={false}
    />
  );
};
