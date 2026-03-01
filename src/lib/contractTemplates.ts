// Rental contract template for Paraguay - based on real legal contract
// Placeholders are marked with {{placeholder_name}}

export interface RentalContractData {
  // General
  contract_date: string;
  city: string;
  // Locador
  landlord_name: string;
  landlord_document: string;
  // Locatario
  tenant_name: string;
  tenant_document: string;
  tenant_phone: string;
  tenant_email: string;
  // Property
  property_kind: 'apartment' | 'house';
  building_name: string;
  unit_identifier: string;
  floor: string;
  full_address: string;
  has_garage: boolean;
  garage_number: string;
  // Financial
  rent_amount: string;
  rent_amount_words: string;
  currency: string;
  payment_day: string;
  includes_water: boolean;
  // Deposit
  has_deposit: boolean;
  deposit_amount: string;
  deposit_amount_words: string;
  // Parking
  parking_option: 'included' | 'optional' | 'not_included';
  parking_monthly_cost: string;
  // Pets
  pets_option: 'not_allowed' | 'allowed_with_conditions';
  pet_deposit_amount: string;
  pet_penalty_amount: string;
  pet_notes: string;
  // Expenses
  expenses_amount: string;
  expenses_amount_words: string;
  expenses_pay_to: string;
  // Services
  ande_nis: string;
  additional_services: string;
  // Term
  start_date: string;
  end_date: string;
  end_time: string;
  // Penalties
  daily_late_fee: string;
  early_termination_penalty: string;
  // Administration
  agency_name: string;
  agency_phone: string;
}

export const defaultRentalContractData: RentalContractData = {
  contract_date: '',
  city: 'Encarnación',
  landlord_name: '',
  landlord_document: '',
  tenant_name: '',
  tenant_document: '',
  tenant_phone: '',
  tenant_email: '',
  property_kind: 'apartment',
  building_name: '',
  unit_identifier: '',
  floor: '',
  full_address: '',
  has_garage: false,
  garage_number: '',
  rent_amount: '',
  rent_amount_words: '',
  currency: 'Gs.',
  payment_day: '1',
  includes_water: true,
  has_deposit: false,
  deposit_amount: '',
  deposit_amount_words: '',
  parking_option: 'not_included',
  parking_monthly_cost: '',
  pets_option: 'not_allowed',
  pet_deposit_amount: '',
  pet_penalty_amount: '',
  pet_notes: '',
  expenses_amount: '',
  expenses_amount_words: '',
  expenses_pay_to: '',
  ande_nis: '',
  additional_services: '',
  start_date: '',
  end_date: '',
  end_time: '17:00',
  daily_late_fee: '20.000',
  early_termination_penalty: '1 mes de alquiler',
  agency_name: 'Plusterra Inmobiliaria',
  agency_phone: '0984511051',
};

const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '_______________';
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} día de ${month.charAt(0).toUpperCase() + month.slice(1)} del ${year}`;
};

export const generateRentalContractText = (data: RentalContractData): string => {
  const totalAmount = (Number(data.rent_amount.replace(/\./g, '') || 0) + Number(data.expenses_amount.replace(/\./g, '') || 0)).toLocaleString('es-PY');
  const garageText = data.has_garage
    ? `El departamento cuenta con estacionamiento dentro del edificio ${data.building_name}. Número de Cochera ${data.garage_number || '___'}.`
    : 'El departamento no cuenta con estacionamiento dentro del edificio.';
  const waterText = data.includes_water
    ? 'El monto de alquiler incluye agua.'
    : 'El servicio de agua no está incluido en el alquiler.';

  const depositText = data.has_deposit
    ? `\n\nDEPÓSITO DE GARANTÍA: El locatario abona en concepto de depósito de garantía la suma de ${data.currency} ${data.deposit_amount || '_______________'} (${data.deposit_amount_words || '_______________'}), que será reembolsado al finalizar el contrato, previa verificación del estado del inmueble y cumplimiento de todas las obligaciones contractuales. En caso de existir daños o deudas pendientes, el locador podrá deducir los montos correspondientes del depósito.`
    : '';

  const parkingText = data.parking_option === 'included'
    ? `${garageText}`
    : data.parking_option === 'optional'
    ? `El edificio ${data.building_name || '_______________'} ofrece estacionamiento opcional con un costo mensual adicional de ${data.currency} ${data.parking_monthly_cost || '_______________'}. El uso del estacionamiento queda a elección del locatario y deberá abonarse conjuntamente con el alquiler mensual.`
    : 'El departamento no cuenta con estacionamiento dentro del edificio.';

  const petsText = data.pets_option === 'not_allowed'
    ? 'El departamento a alquilar no acepta mascotas sin consentimiento por escrito del locador.'
    : `Se permite la tenencia de mascotas bajo las siguientes condiciones: El locatario deberá abonar un depósito de garantía por mascotas de ${data.currency} ${data.pet_deposit_amount || '_______________'}. En caso de daños causados por las mascotas, se aplicará una penalidad de ${data.currency} ${data.pet_penalty_amount || '_______________'} además de los costos de reparación. ${data.pet_notes ? data.pet_notes + '. ' : ''}El locatario es responsable de mantener la limpieza y el orden, cumpliendo con el reglamento interno del edificio.`;

  return `CONTRATO DE ALQUILER EDIFICIO

En la ciudad de ${data.city || '_______________'}, República del Paraguay, a los ${formatDateLong(data.contract_date)}, comparecen, por una parte, como LOCADOR, el/la Sr/a. ${data.landlord_name || '_______________'}, PROPIETARIO/A y el/la Sr/a. ${data.tenant_name || '_______________'}, con C.I ${data.tenant_document || '_______________'} en su carácter de LOCATARIO/A quienes convienen en celebrar el presente contrato de locación de inmueble, de acuerdo con las siguientes cláusulas:

PRIMERA: Objeto del contrato.

El locador da en locación al locatario el siguiente inmueble de su propiedad: ${data.unit_identifier || '_______________'} - Piso ${data.floor || '___'}, Edificio ${data.building_name || '_______________'}, ubicado sobre ${data.full_address || '_______________'} de la ciudad de ${data.city || '_______________'}, Paraguay. El departamento con todas sus instalaciones se entrega en perfecto estado de conservación, instalación y funcionamiento. Al reintegrarse, deberá devolver el locatario todo en el mismo estado recibido, salvo deterioros causados por el buen uso y el transcurso del tiempo. Caso contrario, responderá por los daños y perjuicios, que involucran reparar lo averiado, reponer lo faltante, más los alquileres perdidos, por el lapso insumido en reparaciones.

SEGUNDA: Precio y forma de pago.

El precio del alquiler se fija en la suma de ${data.currency} ${data.rent_amount || '_______________'} (${data.rent_amount_words || '_______________'}) mensuales, pagaderos por adelantado el día ${data.payment_day || '1'} del mes en curso directamente a la cuenta de ${data.agency_name}.

Expensas: ${data.currency} ${data.expenses_amount || '0'} (${data.expenses_amount_words || '_______________'}) directamente a la cuenta de ${data.expenses_pay_to || '_______________'}.

TOTALIZANDO el monto de ${data.currency} ${totalAmount}. El locatario debe presentar la boleta de depósito del pago del alquiler en su totalidad a ${data.agency_name} (${data.agency_phone}) dentro de los primeros cinco (5) días para la obtención del recibo de alquiler. El retraso de la entrega de boletas de pago en el banco será considerado pago tardío y tendrá costo adicional (ver cláusula décima). La falta de pago de dos mensualidades consecutivas así como también el servicio de la Ande y/o alternadas de los alquileres en los plazos y modos convenidos, así como el incumplimiento y/o violación de cualquiera de las cláusulas del presente contrato da derecho al locador a pedir el desalojo y rescisión del inmueble. ${waterText} Los demás servicios como ser energía eléctrica, línea baja de telefonía, internet, televisión por cable o cualquier otro que el locatario decida contratar sean por su cuenta exclusiva.${depositText}

TERCERA: Estacionamiento.

${parkingText}

CUARTA: Reglamento interno del Edificio ${data.building_name || '_______________'}.

El locatario recibe una copia por escrito del Reglamento Interno del Edificio ${data.building_name || '_______________'} al firmar este contrato y esa firma establece conformidad en cumplir todas sus cláusulas.

Media firma locatario/s_____________    Media Firma locador _____________

QUINTA: Plazo del contrato.

El presente contrato tendrá vigencia comenzando el ${formatDateLong(data.start_date)} y finalizando el ${formatDateLong(data.end_date)} a las ${data.end_time || '17'} horas. Después de la caducación del contrato, ambas partes deberán estar de acuerdo firmado por escrito para continuar por otro periodo convenido. En caso contrario, el locatario deberá restituir y desocupar el inmueble, sin interpelación alguna, al locador en las mismas condiciones en que la recibió, libre de ocupantes, objetos, con los respectivos libres de deudas de alquileres y expensas y/o servicios que deba abonar.

SEXTA: Descripción, estado y mantención del inmueble.

El inmueble consta de las instalaciones correspondientes a la unidad. El locatario recibe el departamento en estado de uso y conservación incluyendo limpieza y buena conservación de los muebles. El locatario tiene la obligación de mantener el buen estado de todas las instalaciones y entregarlas en buen estado de funcionamiento una vez terminado el contrato. Esto incluye:
a) Reparación profesional de deterioros que se produzcan por culpa de la negligencia.
b) Reponer o abonar el importe de muebles o efectos con deterioro irreparables, perdidos o extraviados.
c) Mantenimiento periódico de los artefactos eléctricos, acondicionadores de aire, termocalefones y otros.

SÉPTIMA: Destino y uso del inmueble.

El inmueble se destina exclusivamente para vivienda familiar del locatario. Todas las personas viviendo en la unidad por más de 15 días deberán ser registradas dentro de este contrato y son responsables a seguir las normas establecidas en este contrato y en el Reglamento Interno del Edificio ${data.building_name || '_______________'}. Queda prohibido el subarrendamiento, la cesión a terceros, y la realización de modificaciones sin autorización expresa por escrito con la firma del locador. ${petsText}

OCTAVA: Renovación del contrato.

El presente contrato podrá renovarse por un periodo acordado por ambas partes. Dicha renovación deberá ser notificada por escrito al locador por el locatario con al menos 30 días de anticipación a la fecha de vencimiento. En caso contrario, el contrato se renovará automáticamente, pudiendo ajustarse las condiciones, incluido el precio del alquiler. La permanencia del locatario dentro del departamento por cualquiera de los días adicionales, será cobrado por mes entero una vez terminado el contrato.

NOVENA: Rescisión del contrato.

Cualquiera de las partes podrá rescindir el presente contrato antes del vencimiento del plazo, notificando a la otra parte con 30 (treinta) días de anticipación. En caso de rescisión anticipada por parte del locatario sin el preaviso establecido, tendrá que abonar ${data.early_termination_penalty || '1 mes de alquiler'} como parte de multa.

DÉCIMA: Mora en el pago.

El pago del alquiler se realizará por adelantado el primer día del mes hábil en un solo pago al inicio del contrato, según lo establecido en la cláusula segunda. En caso de mora en el pago de algún servicio que esté a cargo del locatario, se aplicará un interés diario de ${data.currency} ${data.daily_late_fee || '20.000'} (Guaraníes veinte mil) por cada día de atraso, a partir del día 6 de cada mes. Así también el locatario correrá con cualquier otro gasto que ocasione al locador por esta demora de pago, como ser cartas, telegramas, costos de interferencia de la inmobiliaria para exigencia de pagos, y cualquier otro gasto que este incumplimiento ocasione.

DÉCIMA PRIMERA: De las mejoras o arreglos del inmueble.

Queda prohibida toda modificación y/o mejoras voluntarias de carácter permanente en el departamento locado. En caso de que el locador esté de acuerdo con modificaciones o mejoras del departamento, el locatario solamente lo podrá hacer con consentimiento por escrito detallado y firmado de la mejora con sus descripciones específicas. El locatario libera al locador del pago de cualesquiera mejoras, así fueren necesarias y/o urgentes y las toma a su cargo. Así mismo el locatario pagará también el arreglo de todas las averías que acaecieran.

Media firma locatario/s_____________    Media Firma locador _____________

DÉCIMA SEGUNDA: Comprobante de pago de servicios.

El locatario deberá presentar mensualmente los comprobantes de pago de los servicios a su cargo, servicio de energía eléctrica ANDE, NIS Nº${data.ande_nis || '_______________'}${data.additional_services ? `, ${data.additional_services}` : ''} y así también comprobantes de depósito del alquiler citado en cláusula segunda, a la representante de ${data.agency_name} (del +595 ${data.agency_phone}) quien actuará como administradora del inmueble.

DÉCIMA TERCERA: Estado del inmueble al finalizar el contrato.

El locatario se obliga a entregar el inmueble al finalizar el contrato en las mismas condiciones en que fue recibido, incluyendo limpieza a fondo de la unidad y las instalaciones. El locador podrá así también realizar inspecciones al departamento locado con aviso previo de por lo menos 24 horas.

DÉCIMA CUARTA: Responsabilidad del locatario.

El locador no será responsable de los daños y perjuicios que se le produzcan y/u ocasionen al locatario o a terceros en sus personas y/o bienes, originadas por causa de roturas, desperfectos, cortocircuitos, filtraciones, derrumbes, incendios, inundaciones, averías y/o accidentes de cualquier causa, ya que el locatario las toma a su cargo como riesgo propio, incluso el caso fortuito y la fuerza mayor, quedando liberado el locador. Se prohíbe asimismo al locatario depositar materiales inflamables, tóxicos y/o peligrosos en el departamento locado y estacionamiento dentro del edificio, si lo tuviere.

DÉCIMA QUINTA: Desocupación del inmueble.

Antes de finalizar el contrato, el locatario deberá:
1. Acordar con el locador o la administradora el día y la hora para la inspección del inmueble en el día o hasta 3 días anteriores al vencimiento del contrato.
2. Durante la inspección el locador deberá presentar la última factura abonada sin saldo de los servicios a su cargo.
3. Entregar las llaves y controles remotos del inmueble. El locador no recibirá el inmueble si no se cumplen estas condiciones.

DÉCIMA SEXTA: Entrega de llaves.

La entrega de llaves y controles remotos por parte del locatario al locador o administrador se considerará como la finalización del contrato y la desocupación del inmueble. La falta o reposición de estos correrán a cargo del locatario. Las llaves y controles remotos solamente podrán ser entregadas en manos del locador o representante inmobiliario con firma comprobante de recibo de los mismos. El locatario no podrá así autorizar a intermediarios para hacerlo o dejar las llaves y demás dentro del departamento locado. El incumplimiento de la forma de entrega de llaves tendrá un costo de Gs. 300.000 (Guaraníes trescientos mil) por cada artículo no devuelto en la forma estipulada.

DÉCIMA SÉPTIMA: Domicilio y Jurisdicción.

Para todos los efectos del presente contrato, las partes constituyen domicilio en ${data.agency_name}, ${data.full_address ? data.full_address : '_______________'}, ${data.city}, Paraguay; y el locatario en el inmueble objeto de este contrato. Cabe acotar que ambas partes declaran y se obligan, en forma definitiva, irrevocable y como condición indispensable de esta locación, que todos los actos jurídicos, únicamente se perfeccionan por escrito y ninguno en forma oral o verbal, vedando en especial, cualesquiera prórrogas y/o nuevos contratos, sobre este departamento ubicado, fuera de los escritos y firmados por las partes obligadas. Para cualquier controversia que pudiera surgir con motivo de la interpretación o ejecución del presente contrato, las partes se someten a la jurisdicción de los tribunales civiles de la ciudad de ${data.city || '_______________'}, Paraguay.

Finalizan de común acuerdo y en conformidad los firmantes con su respectiva aclaración:


Firma: _________________________              Firma: _________________________
Nombre: ${data.tenant_name || '_______________'}              Nombre: ${data.landlord_name || '_______________'}
C.I: ${data.tenant_document || '_______________'}                    Documento: ${data.landlord_document || '_______________'}
LOCATARIO/A                                   LOCADOR/A`;
};
