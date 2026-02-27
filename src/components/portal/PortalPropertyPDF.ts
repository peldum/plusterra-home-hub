import jsPDF from 'jspdf';
import type { PublicListing } from '@/hooks/usePublicListings';

const formatPrice = (amount: number) =>
  'Gs. ' + Math.round(amount).toLocaleString('es-PY');

/** Convert an image URL to a base64 data URL via canvas */
async function imageUrlToBase64(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return {
      data: canvas.toDataURL('image/jpeg', 0.85),
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch {
    return null;
  }
}

export const PortalPropertyPDF = async (property: PublicListing) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Header bar
  doc.setFillColor(0, 68, 124); // #00447C
  doc.rect(0, 0, pageW, 35, 'F');
  doc.setFillColor(252, 81, 0); // #FC5100
  doc.rect(0, 35, pageW, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PLUSTERRA', pageW / 2, 16, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Propiedades', pageW / 2, 24, { align: 'center' });

  y = 48;

  // ── Main photo (try full, fallback to thumbnail) ──
  const firstPhoto = property.photos?.[0];
  if (firstPhoto) {
    const photoUrl = firstPhoto.photo_url;
    const thumbUrl = firstPhoto.thumbnail_url;
    let imgData = await imageUrlToBase64(photoUrl);
    if (!imgData && thumbUrl) {
      imgData = await imageUrlToBase64(thumbUrl);
    }
    if (imgData) {
      const maxW = contentW;
      const maxH = 80; // mm
      const imgAspect = imgData.height / imgData.width;
      const imgW = maxW;
      const imgH = Math.min(imgW * imgAspect, maxH);

      // White background behind image area
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentW, imgH, 'F');

      const imgX = margin + (contentW - imgW) / 2;
      doc.addImage(imgData.data, 'JPEG', imgX, y, imgW, imgH);
      y += imgH + 6;
    }
  }

  // Title
  doc.setTextColor(0, 68, 124);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(property.title, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 4;

  // Code
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${property.property_code}`, margin, y);
  y += 8;

  // Location
  const location = [property.address, property.neighborhood, property.city].filter(Boolean).join(', ');
  if (location) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.text(location, margin, y);
    y += 6;
  }

  // ── Google Maps link ──
  if (property.public_lat && property.public_lng) {
    const mapsUrl = `https://www.google.com/maps?q=${property.public_lat},${property.public_lng}`;
    doc.setTextColor(0, 68, 124);
    doc.setFontSize(9);
    doc.textWithLink('Ver ubicación en Google Maps', margin, y, { url: mapsUrl });
    y += 7;
  }

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Prices
  const hasRent = Number(property.rental_price) > 0;
  const hasSale = Number(property.sale_price) > 0;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 68, 124);

  if (hasRent) {
    const periodLabel = property.rental_period === 'daily' ? 'Temporal' : 'Alquiler';
    doc.text(`${periodLabel}: ${formatPrice(Number(property.rental_price))}/${property.rental_period === 'daily' ? 'día' : 'mes'}`, margin, y);
    y += 7;
  }
  if (hasSale) {
    doc.text(`Venta: ${formatPrice(Number(property.sale_price))}`, margin, y);
    y += 7;
  }
  y += 4;

  // Specs table
  const specs: string[] = [];
  if (property.bedrooms != null) specs.push(`Dormitorios: ${property.bedrooms}`);
  if (property.bathrooms != null) specs.push(`Baños: ${property.bathrooms}`);
  if (property.area_m2 != null) specs.push(`Superficie: ${property.area_m2} m²`);
  if (property.has_garage) specs.push('Cochera: Sí');

  if (specs.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Características', margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    specs.forEach(s => {
      doc.text(`• ${s}`, margin + 2, y);
      y += 6;
    });
    y += 4;
  }

  // Amenities
  if (property.amenities && property.amenities.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Amenities', margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const amenitiesText = property.amenities.join(' · ');
    const amenLines = doc.splitTextToSize(amenitiesText, contentW);
    doc.text(amenLines, margin, y);
    y += amenLines.length * 5 + 4;
  }

  // Description
  const desc = property.public_description || property.description;
  if (desc) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Descripción', margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(desc, contentW);
    descLines.forEach((line: string) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  }

  // Agent
  if (property.captor_name) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Agente responsable', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(property.captor_name, margin, y);
    if (property.captor_phone) {
      y += 5;
      doc.text(`Tel: ${property.captor_phone}`, margin, y);
    }
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageH - 15, pageW, 15, 'F');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Plusterra Propiedades · Encarnación, Paraguay', pageW / 2, pageH - 7, { align: 'center' });
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, pageH - 3, { align: 'center' });

  doc.save(`${property.property_code || 'propiedad'}.pdf`);
};
