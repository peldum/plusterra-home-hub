import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR, ROBOTO_BOLD } from './robotoFont';

const FONT_NAME = 'Roboto';

/**
 * Registers Roboto (Regular + Bold) in a jsPDF instance so that
 * Spanish accented characters render correctly.
 * Call once right after creating the jsPDF doc.
 */
export function registerPdfFont(pdf: jsPDF) {
  pdf.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
  pdf.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');

  pdf.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
  pdf.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');

  // Set as default
  pdf.setFont(FONT_NAME, 'normal');
}

export const PDF_FONT = FONT_NAME;
