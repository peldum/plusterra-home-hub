import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { FileText, FileDown, Eye, Calendar } from 'lucide-react';
import { generateContractText, generateContractPDF, type ContractData } from '@/lib/contractGenerator';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const defaultData = (): ContractData => {
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  return {
    city: 'Encarnación',
    contractDay: String(now.getDate()),
    contractMonth: MONTHS[now.getMonth()],
    contractYear: String(now.getFullYear()),
    locadorName: '',
    locatarioName: '',
    locatarioDocType: 'CI Paraguay',
    locatarioDocNumber: '',
    locatarioNationality: 'Paraguaya',
    propertyType: 'departamento',
    propertyTypeOther: '',
    propertyDescription: '',
    propertyAddress: '',
    propertyAmenities: '',
    parkingNumber: '',
    nisAnde: '',
    rentAmount: 0,
    includesIVA: false,
    paymentDay: 1,
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    bankRUC: '',
    expensesAmount: 0,
    expensesBankName: '',
    expensesBankAccount: '',
    expensesBankHolder: '',
    expensesBankCI: '',
    depositAmount: 0,
    depositRefundable: false,
    startDate: now.toISOString().split('T')[0],
    endDate: oneYearLater.toISOString().split('T')[0],
    moraDaily: 20000,
    moraFromDay: 6,
    adminName: '',
    adminPhone: '',
    acceptsPets: false,
    propertyForSale: false,
    additionalNotes: '',
  };
};

const fmt = (n: number) => n.toLocaleString('es-PY');

export const ContractGeneratorDialog = ({ open, onOpenChange }: Props) => {
  const [form, setForm] = useState<ContractData>(defaultData());
  const [previewText, setPreviewText] = useState<string | null>(null);

  const set = (patch: Partial<ContractData>) => setForm(f => ({ ...f, ...patch }));

  const totalMonthly = form.rentAmount + form.expensesAmount;

  const handlePreview = () => {
    const text = generateContractText(form);
    setPreviewText(text);
  };

  const handleDownloadPDF = () => {
    try {
      generateContractPDF(form);
      toast.success('PDF generado exitosamente');
    } catch (e) {
      toast.error('Error al generar PDF');
    }
  };

  const handleDownloadWord = () => {
    const text = generateContractText(form);
    const blob = new Blob([text], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_Alquiler_${form.locatarioName?.replace(/\s+/g, '_') || 'borrador'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Documento Word generado');
  };

  const handleAutoEndDate = () => {
    if (form.startDate) {
      const start = new Date(form.startDate + 'T12:00:00');
      start.setFullYear(start.getFullYear() + 1);
      set({ endDate: start.toISOString().split('T')[0] });
    }
  };

  const handleReset = () => {
    setForm(defaultData());
    setPreviewText(null);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 pt-2">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{children}</h3>
      <Separator className="flex-1" />
    </div>
  );

  if (previewText) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Contrato</DialogTitle>
          </DialogHeader>
          <div className="bg-white text-black p-6 rounded-lg border text-sm whitespace-pre-wrap font-serif leading-relaxed max-h-[60vh] overflow-y-auto">
            {previewText}
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setPreviewText(null)}>
              Volver al formulario
            </Button>
            <Button variant="outline" onClick={handleDownloadWord}>
              <FileText className="w-4 h-4 mr-2" />
              Descargar Word
            </Button>
            <Button onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl">Generador de Contrato de Alquiler</DialogTitle>
          <p className="text-xs text-muted-foreground">Completá los datos y generá el contrato listo para imprimir. No se guarda en el sistema.</p>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-6 space-y-4">
          {/* DATOS GENERALES */}
          <SectionTitle>Datos Generales</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <Label className="text-xs">Ciudad</Label>
              <Input value={form.city} onChange={e => set({ city: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Día</Label>
              <Input value={form.contractDay} onChange={e => set({ contractDay: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mes</Label>
              <Select value={form.contractMonth} onValueChange={v => set({ contractMonth: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Año</Label>
              <Input value={form.contractYear} onChange={e => set({ contractYear: e.target.value })} />
            </div>
          </div>

          {/* LOCADOR */}
          <SectionTitle>Locador (Propietario)</SectionTitle>
          <div className="space-y-1">
            <Label className="text-xs">Nombre completo</Label>
            <Input value={form.locadorName} onChange={e => set({ locadorName: e.target.value })} placeholder="Nombre del propietario" />
          </div>

          {/* LOCATARIO */}
          <SectionTitle>Locatario (Inquilino)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre completo</Label>
              <Input value={form.locatarioName} onChange={e => set({ locatarioName: e.target.value })} placeholder="Nombre del inquilino" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nacionalidad</Label>
              <Input value={form.locatarioNationality} onChange={e => set({ locatarioNationality: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de documento</Label>
              <Select value={form.locatarioDocType} onValueChange={v => set({ locatarioDocType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CI Paraguay">CI Paraguay</SelectItem>
                  <SelectItem value="Documento Extranjero">Documento Extranjero</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">N° de documento</Label>
              <Input value={form.locatarioDocNumber} onChange={e => set({ locatarioDocNumber: e.target.value })} placeholder="Ej: 4.567.890" />
            </div>
          </div>

          {/* INMUEBLE */}
          <SectionTitle>Inmueble</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de inmueble</Label>
                <Select value={form.propertyType} onValueChange={v => set({ propertyType: v, propertyTypeOther: v !== 'otro' ? '' : form.propertyTypeOther })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="departamento">Departamento</SelectItem>
                    <SelectItem value="terreno">Terreno</SelectItem>
                    <SelectItem value="salón comercial">Salón Comercial</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.propertyType === 'otro' && (
                <div className="space-y-1">
                  <Label className="text-xs">Descripción del tipo</Label>
                  <Input value={form.propertyTypeOther} onChange={e => set({ propertyTypeOther: e.target.value })} placeholder="Ej: Oficina, Galpón..." />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción del inmueble</Label>
              <Input value={form.propertyDescription} onChange={e => set({ propertyDescription: e.target.value })} placeholder="Ej: Departamento C - Piso 2, Edificio Salto Grande IV" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dirección completa</Label>
              <Input value={form.propertyAddress} onChange={e => set({ propertyAddress: e.target.value })} placeholder="Calle, número, ciudad" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción de ambientes y equipamiento</Label>
              <Textarea value={form.propertyAmenities} onChange={e => set({ propertyAmenities: e.target.value })} placeholder="Ej: una habitación con placard y aire acondicionado, muebles de cocina, termotanque..." className="min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">N° Cochera (opcional)</Label>
                <Input value={form.parkingNumber} onChange={e => set({ parkingNumber: e.target.value })} placeholder="Ej: 7" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NIS ANDE</Label>
                <Input value={form.nisAnde} onChange={e => set({ nisAnde: e.target.value })} placeholder="N° de medidor" />
              </div>
            </div>
          </div>

          {/* PRECIO Y PAGO */}
          <SectionTitle>Precio y Pago</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Alquiler mensual (Gs.)</Label>
                <Input type="number" min={0} value={form.rentAmount || ''} onChange={e => set({ rentAmount: +e.target.value })} placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Día de pago</Label>
                <Input type="number" min={1} max={31} value={form.paymentDay} onChange={e => set({ paymentDay: +e.target.value })} />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="iva" checked={form.includesIVA} onCheckedChange={v => set({ includesIVA: !!v })} />
                  <Label htmlFor="iva" className="text-xs cursor-pointer">Incluye IVA</Label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Cuenta bancaria para depósito de alquiler</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Banco</Label>
                  <Input value={form.bankName} onChange={e => set({ bankName: e.target.value })} placeholder="Ej: Banco Atlas" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">N° Cuenta</Label>
                  <Input value={form.bankAccount} onChange={e => set({ bankAccount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nombre titular</Label>
                  <Input value={form.bankHolder} onChange={e => set({ bankHolder: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RUC</Label>
                  <Input value={form.bankRUC} onChange={e => set({ bankRUC: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Expensas (Gs.)</Label>
                <Input type="number" min={0} value={form.expensesAmount || ''} onChange={e => set({ expensesAmount: +e.target.value })} placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              {form.expensesAmount > 0 && (
                <div className="col-span-2 sm:col-span-2 text-xs text-muted-foreground self-end pb-2">
                  Total mensual: <span className="font-semibold text-foreground">₲ {fmt(totalMonthly)}</span>
                </div>
              )}
            </div>

            {form.expensesAmount > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Cuenta para depósito de expensas</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Banco</Label>
                    <Input value={form.expensesBankName} onChange={e => set({ expensesBankName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">N° Cuenta</Label>
                    <Input value={form.expensesBankAccount} onChange={e => set({ expensesBankAccount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre titular</Label>
                    <Input value={form.expensesBankHolder} onChange={e => set({ expensesBankHolder: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CI</Label>
                    <Input value={form.expensesBankCI} onChange={e => set({ expensesBankCI: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DEPÓSITO / LLAVE */}
          <SectionTitle>Depósito / Llave</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Monto depósito (Gs.)</Label>
              <Input type="number" min={0} value={form.depositAmount || ''} onChange={e => set({ depositAmount: +e.target.value })} placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center gap-2">
                <Checkbox id="refundable" checked={form.depositRefundable} onCheckedChange={v => set({ depositRefundable: !!v })} />
                <Label htmlFor="refundable" className="text-xs cursor-pointer">Reembolsable</Label>
              </div>
            </div>
          </div>

          {/* PLAZO */}
          <SectionTitle>Plazo del Contrato</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fecha inicio</Label>
              <Input type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Fecha fin</Label>
                <button type="button" onClick={handleAutoEndDate} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  +1 año
                </button>
              </div>
              <Input type="date" value={form.endDate} onChange={e => set({ endDate: e.target.value })} />
            </div>
          </div>

          {/* MORA */}
          <SectionTitle>Mora</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Interés diario (Gs.)</Label>
              <Input type="number" min={0} value={form.moraDaily || ''} onChange={e => set({ moraDaily: +e.target.value })} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">A partir del día</Label>
              <Input type="number" min={1} max={31} value={form.moraFromDay} onChange={e => set({ moraFromDay: +e.target.value })} />
            </div>
          </div>

          {/* CONTACTO ADMIN */}
          <SectionTitle>Contacto Administrador</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre administración</Label>
              <Input value={form.adminName} onChange={e => set({ adminName: e.target.value })} placeholder="Ej: Inmobiliaria XYZ" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.adminPhone} onChange={e => set({ adminPhone: e.target.value })} placeholder="Ej: 0984511051" />
            </div>
          </div>

          {/* CLÁUSULAS */}
          <SectionTitle>Cláusulas Adicionales</SectionTitle>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="pets" checked={form.acceptsPets} onCheckedChange={v => set({ acceptsPets: !!v })} />
                <Label htmlFor="pets" className="text-xs cursor-pointer">Acepta mascotas</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sale" checked={form.propertyForSale} onCheckedChange={v => set({ propertyForSale: !!v })} />
                <Label htmlFor="sale" className="text-xs cursor-pointer">Inmueble a la venta</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observaciones adicionales</Label>
              <Textarea value={form.additionalNotes} onChange={e => set({ additionalNotes: e.target.value })} placeholder="Cláusulas personalizadas, condiciones especiales..." className="min-h-[60px]" />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-2 justify-between pt-4 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="text-xs">
              Limpiar todo
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-1.5" />
                Vista previa
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadWord}>
                <FileText className="w-4 h-4 mr-1.5" />
                Word
              </Button>
              <Button type="button" size="sm" onClick={handleDownloadPDF}>
                <FileDown className="w-4 h-4 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
