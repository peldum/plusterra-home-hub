import jsPDF from 'jspdf';
import { numberToWordsGuaranies } from './numberToWords';
import { ROBOTO_REGULAR } from './robotoFont';

export interface ContractData {
  city: string;
  contractDay: string;
  contractMonth: string;
  contractYear: string;
  locadorName: string;
  locatarioName: string;
  locatarioDocType: string;
  locatarioDocNumber: string;
  locatarioNationality: string;
  propertyType: string;
  propertyTypeOther: string;
  propertyDescription: string;
  propertyAddress: string;
  propertyAmenities: string;
  parkingNumber: string;
  nisAnde: string;
  rentAmount: number;
  includesIVA: boolean;
  paymentDay: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankRUC: string;
  expensesAmount: number;
  expensesBankName: string;
  expensesBankAccount: string;
  expensesBankHolder: string;
  expensesBankCI: string;
  depositAmount: number;
  depositRefundable: boolean;
  startDate: string;
  endDate: string;
  moraDaily: number;
  moraFromDay: number;
  adminName: string;
  adminPhone: string;
  acceptsPets: boolean;
  propertyForSale: boolean;
  additionalNotes: string;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '___________';
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} del ${d.getFullYear()}`;
}

function fmt(n: number): string {
  return n.toLocaleString('es-PY');
}

export function generateContractText(data: ContractData): string {
  const totalMonthly = data.rentAmount + data.expensesAmount;
  const rentWords = numberToWordsGuaranies(data.rentAmount);
  const depositWords = numberToWordsGuaranies(data.depositAmount);
  const totalWords = numberToWordsGuaranies(totalMonthly);
  const moraWords = numberToWordsGuaranies(data.moraDaily);
  const ivaText = data.includesIVA ? 'con IVA incluido' : 'sin IVA';

  let text = `CONTRATO DE ALQUILER\n\n`;
  text += `En la ciudad de ${data.city}, República del Paraguay, a los ${data.contractDay} días del mes de ${data.contractMonth} del ${data.contractYear}, comparecen, por una parte, como LOCADOR, el/la Sr/a. ${data.locadorName || '___________'}, PROPIETARIO/A y el/la Sr/a. ${data.locatarioName || '___________'} con ${data.locatarioDocType} N° ${data.locatarioDocNumber || '___________'} de nacionalidad ${data.locatarioNationality || '___________'} en su carácter de LOCATARIO/A quienes convienen en celebrar el presente contrato de locación de inmueble, de acuerdo con las siguientes cláusulas:\n\n`;

  text += `PRIMERA: Objeto del contrato. El locador da en locación al locatario el siguiente inmueble de su propiedad: ${data.propertyDescription || '___________'}, ubicado en ${data.propertyAddress || '___________'} de la ciudad de ${data.city}, Paraguay. El departamento con todas sus instalaciones se entrega en perfecto estado de conservación, instalación y funcionamiento. Al reintegrarse, deberá devolver el locatario todo en el mismo estado recibido, salvo deterioros causados por el buen uso y el transcurso del tiempo. Caso contrario, responderá por los daños y perjuicios, que involucran reparar lo averiado, reponer lo faltante, más los alquileres perdidos, por el lapso insumido en reparaciones.\n\n`;

  text += `SEGUNDA: Precio y forma de pago. El precio del alquiler se fija en la suma de Gs. ${fmt(data.rentAmount)} (${rentWords}) mensuales ${ivaText}, pagaderos por adelantado el día ${data.paymentDay} del mes en curso directamente a la cuenta de:\n`;
  text += `${data.bankName} Cta. N° ${data.bankAccount}.\nNombre de: ${data.bankHolder}\nRUC N° ${data.bankRUC}.\n`;

  if (data.expensesAmount > 0) {
    text += `\nExpensas Gs. ${fmt(data.expensesAmount)} directamente a la cuenta de\n`;
    text += `${data.expensesBankName} Cta. N° ${data.expensesBankAccount}.\nNombre de ${data.expensesBankHolder}. C.I N° ${data.expensesBankCI}.\n`;
    text += `\nTOTALIZANDO el monto de Gs. ${fmt(totalMonthly)} (${totalWords}).\n`;
  }

  text += `\nEl locatario debe presentar la boleta de depósito del pago del alquiler en su totalidad a ${data.adminName || 'la administración'} (${data.adminPhone || '___________'}) dentro de los primeros cinco (5) días para la obtención del recibo de alquiler. El retraso de la entrega de boletas de pago en el banco será considerado pago tardío y tendrá costo adicional (ver cláusula décima). La falta de pago de dos mensualidades consecutivas así como también el servicio de la ANDE y/o alternadas de los alquileres en los plazos y modos convenidos, así como el incumplimiento y/o violación de cualquiera de las cláusulas del presente contrato da derecho al locador a pedir el desalojo y rescisión del inmueble. El monto de alquiler incluye agua. Los demás servicios como ser energía eléctrica, línea baja de telefonía, internet, televisión por cable o cualquier otro que el locatario decida contratar sean por su cuenta exclusiva.\n\n`;

  text += `TERCERA: Depósito. El locatario abona el pago de Gs. ${fmt(data.depositAmount)} (${depositWords}) en concepto de llave ${data.depositRefundable ? 'reembolsable' : 'no reembolsable'}.\n\n`;

  if (data.parkingNumber) {
    text += `CUARTA: Estacionamiento. El departamento cuenta con estacionamiento. Número de Cochera ${data.parkingNumber}.\n\n`;
  } else {
    text += `CUARTA: Estacionamiento. No aplica.\n\n`;
  }

  text += `QUINTA: Plazo del contrato. El presente contrato tendrá vigencia comenzando el ${formatDate(data.startDate)} y finalizando el ${formatDate(data.endDate)} a las 17 horas. Después de la caducación del contrato, ambas partes deberán estar de acuerdo firmado por escrito para continuar por otro periodo convenido. En caso contrario, el locatario deberá restituir y desocupar el inmueble, sin interpelación alguna, al locador en las mismas condiciones en que la recibió, libre de ocupantes, objetos, con los respectivos libres de deudas de alquileres y expensas y/o servicios que deba abonar.\n\n`;

  text += `SEXTA: Descripción, estado y mantención del inmueble. El inmueble consta de ${data.propertyAmenities || '___________'}. ${data.nisAnde ? `NIS ANDE: ${data.nisAnde}. ` : ''}El locatario recibe el departamento en estado de uso y conservación incluyendo limpieza y buena conservación de los muebles. El locatario tiene la obligación de mantener el buen estado de todas las instalaciones y entregarlas en buen estado de funcionamiento una vez terminado el contrato. Esto incluye: a) Reparación profesional de deterioros que se produzcan por culpa de la negligencia. b) Reponer o abonar el importe de muebles o efectos con deterioro irreparables, perdidos o extraviados. c) Mantenimiento periódico de los artefactos eléctricos, acondicionadores de aire, termocalefones y otros.\n\n`;

  text += `SÉPTIMA: Reglamento interno. El locatario recibe una copia por escrito del Reglamento Interno del edificio al firmar este contrato y esa firma establece conformidad en cumplir todas sus cláusulas.\n\n`;

  text += `OCTAVA: Destino y uso del inmueble. El inmueble se destina exclusivamente para vivienda familiar del locatario. Todas las personas viviendo en la unidad por más de 15 días deberán ser registradas dentro de este contrato y son responsables a seguir las normas establecidas. Queda prohibido el subarrendamiento, la cesión a terceros, y la realización de modificaciones sin autorización expresa por escrito con la firma del locador. ${data.acceptsPets ? 'Se aceptan mascotas con consentimiento previo por escrito del locador.' : 'El departamento a alquilar no acepta mascotas sin consentimiento por escrito del locador.'}\n\n`;

  text += `NOVENA: Renovación del contrato. El presente contrato podrá renovarse por un periodo acordado por ambas partes. Dicha renovación deberá ser notificada por escrito al locador por el locatario con al menos 30 días de anticipación a la fecha de vencimiento. En caso contrario, el contrato se renovará automáticamente, pudiendo ajustarse las condiciones, incluido el precio del alquiler. La permanencia del locatario dentro del departamento por cualquiera de los días adicionales, será cobrado por mes entero una vez terminado el contrato.\n\n`;

  text += `DÉCIMA: Rescisión del contrato. Cualquiera de las partes podrá rescindir el presente contrato antes del vencimiento del plazo, notificando a la otra parte con 30 (treinta) días de anticipación. En caso de rescisión anticipada por parte del locatario tendrá que abonar un mes de alquiler en concepto de multa.`;

  if (data.propertyForSale) {
    text += ` El locatario declara estar en conocimiento de que el departamento se encuentra a la venta. Por lo tanto, se compromete a permitir el acceso al inmueble para su exhibición a potenciales compradores, debiendo coordinar previamente con el locador o la administración los días y horarios de visita con una anticipación razonable. En caso de concretarse la venta del inmueble, el locatario dispondrá de un plazo de 60 (sesenta) días corridos para el desalojo y la restitución del departamento, contados a partir de la notificación fehaciente de la enajenación del mismo.`;
  }
  text += `\n\n`;

  text += `DÉCIMA PRIMERA: Mora en el pago. El pago del alquiler se realizará por adelantado el primer día del mes hábil en un solo pago al inicio del contrato, según lo establecido en la cláusula segunda. En caso de mora en el pago de algún servicio que esté a cargo del locatario, se aplicará un interés diario de Gs. ${fmt(data.moraDaily)} (${moraWords}) por cada día de atraso, a partir del día ${data.moraFromDay} de cada mes. Así también el locatario correrá con cualquier otro gasto que ocasione al locador por esta demora de pago.\n\n`;

  text += `DÉCIMA SEGUNDA: De las mejoras o arreglos del inmueble. Queda prohibida toda modificación y/o mejoras voluntarias de carácter permanente. En caso de que el locador esté de acuerdo con modificaciones o mejoras, el locatario solamente lo podrá hacer con consentimiento por escrito detallado y firmado. El locatario libera al locador del pago de cualesquiera mejoras.\n\n`;

  text += `DÉCIMA TERCERA: Jurisdicción. Ambas partes se someten expresamente a la jurisdicción y competencia del fuero de la ciudad de ${data.city}, para todos los efectos judiciales y extra judiciales emergentes del presente contrato.\n\n`;

  if (data.additionalNotes) {
    text += `CLÁUSULA ADICIONAL: ${data.additionalNotes}\n\n`;
  }

  text += `En conformidad con todo lo que precede, se firman DOS ejemplares del mismo tenor, uno para cada parte, en la ciudad de ${data.city}, a los ${data.contractDay} días del mes de ${data.contractMonth} del ${data.contractYear}.\n\n\n`;

  // Signature block handled separately in PDF generator
  text += `__SIGNATURE_BLOCK__`;

  return text;
}

export function generateContractPDF(data: ContractData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Add Roboto font for proper Spanish character support
  try {
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
  } catch {
    doc.setFont('helvetica', 'normal');
  }

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  const addText = (text: string, fontSize: number, isBold = false, align: 'left' | 'center' = 'left') => {
    doc.setFontSize(fontSize);
    if (isBold) {
      try { doc.setFont('Roboto', 'bold'); } catch { doc.setFont('helvetica', 'bold'); }
    } else {
      try { doc.setFont('Roboto', 'normal'); } catch { doc.setFont('helvetica', 'normal'); }
    }

    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      if (align === 'center') {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
      } else {
        doc.text(line, margin, y);
      }
      y += fontSize * 0.45;
    }
    y += 2;
  };

  const contractText = generateContractText(data);
  // Split signature block out
  const parts = contractText.split('__SIGNATURE_BLOCK__');
  const bodyText = parts[0];
  const hasSignature = parts.length > 1;
  const paragraphs = bodyText.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      y += 3;
      continue;
    }
    if (para.startsWith('CONTRATO DE ALQUILER')) {
      addText(para, 14, true, 'center');
      y += 4;
    } else if (/^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|CLÁUSULA)/.test(para)) {
      const colonIdx = para.indexOf('.');
      if (colonIdx > 0 && colonIdx < 40) {
        addText(para.substring(0, colonIdx + 1), 10, true);
        y -= 2;
        addText(para.substring(colonIdx + 1).trim(), 10);
      } else {
        addText(para, 10, true);
      }
    } else {
      addText(para, 10);
    }
  }

  // ── Signature block ──
  if (hasSignature) {
    // Ensure enough space for signatures (at least 60mm)
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    y += 20; // Space before signature lines

    const leftCenter = margin + contentWidth * 0.25;
    const rightCenter = margin + contentWidth * 0.75;
    const lineWidth = 55;

    try { doc.setFont('Roboto', 'normal'); } catch { doc.setFont('helvetica', 'normal'); }
    doc.setFontSize(10);

    // Signature lines
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(leftCenter - lineWidth / 2, y, leftCenter + lineWidth / 2, y);
    doc.line(rightCenter - lineWidth / 2, y, rightCenter + lineWidth / 2, y);

    y += 5;

    // LOCADOR / LOCATARIO labels
    try { doc.setFont('Roboto', 'bold'); } catch { doc.setFont('helvetica', 'bold'); }
    doc.text('LOCADOR', leftCenter, y, { align: 'center' });
    doc.text('LOCATARIO', rightCenter, y, { align: 'center' });

    y += 5;

    // Names below labels
    try { doc.setFont('Roboto', 'normal'); } catch { doc.setFont('helvetica', 'normal'); }
    doc.setFontSize(9);
    doc.text(data.locadorName || '___________', leftCenter, y, { align: 'center' });
    doc.text(data.locatarioName || '___________', rightCenter, y, { align: 'center' });
  }

  doc.save(`Contrato_Alquiler_${data.locatarioName?.replace(/\s+/g, '_') || 'borrador'}.pdf`);
}
