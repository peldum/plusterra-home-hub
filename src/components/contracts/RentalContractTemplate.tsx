import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useCreateContract } from '@/hooks/useContracts';
import { useProperties } from '@/hooks/useProperties';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import {
  type RentalContractData,
  defaultRentalContractData,
  generateRentalContractText,
} from '@/lib/contractTemplates';
import { FileText, Download, Printer, MessageCircle, ArrowLeft, Eye } from 'lucide-react';

interface RentalContractTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
}

export const RentalContractTemplate = ({ open, onOpenChange, onBack }: RentalContractTemplateProps) => {
  const [data, setData] = useState<RentalContractData>({ ...defaultRentalContractData });
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const createContract = useCreateContract();
  const { data: properties } = useProperties();
  const { data: clients } = useClients();
  const { user } = useAuth();

  const update = (key: keyof RentalContractData, value: any) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const contractText = generateRentalContractText(data);

  const handleGenerateAndSave = () => {
    if (!selectedPropertyId) {
      toast.error('Debés seleccionar una propiedad antes de generar el contrato.');
      return;
    }

    const client = clients?.find(
      (c) => c.full_name === data.tenant_name
    );

    const payload: any = {
      contract_type: 'rental' as const,
      property_id: selectedPropertyId,
      client_id: client?.id || undefined,
      tenant_name: data.tenant_name,
      tenant_document: data.tenant_document,
      landlord_name: data.landlord_name,
      landlord_document: data.landlord_document,
      start_date: data.start_date,
      end_date: data.end_date,
      monthly_rent: Number(data.rent_amount.replace(/\./g, '') || 0),
      currency: data.currency === 'Gs.' ? 'PYG' : 'USD',
      has_garage: data.has_garage,
      garage_details: data.has_garage ? `Cochera ${data.garage_number}` : null,
      nis_ande: data.ande_nis,
      property_address: data.full_address,
      services_included: data.includes_water ? 'Agua incluida' : '',
      notes: data.additional_services || undefined,
      contract_data: data as any,
      status: 'active' as const,
      responsible_agent_id: user?.id,
      periodicity: 'monthly',
      expenses_included: Number(data.expenses_amount.replace(/\./g, '') || 0) > 0,
    };

    createContract.mutate(payload, {
      onSuccess: () => {
        handlePrintPDF();
        onOpenChange(false);
        setData({ ...defaultRentalContractData });
        setShowPreview(false);
      },
    });
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Contrato de Alquiler</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; padding: 40px 60px; color: #000; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 24px; }
        p { text-align: justify; margin-bottom: 12px; }
        .signature { margin-top: 60px; display: flex; justify-content: space-between; }
        .sig-block { text-align: center; width: 40%; }
        .sig-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 8px; }
        @media print { body { padding: 20px 40px; } }
      </style></head><body>
      ${contractText.split('\n').map((line) => {
        if (line.startsWith('CONTRATO DE ALQUILER')) return `<h1>${line}</h1>`;
        if (line.match(/^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA)/))
          return `<h3 style="margin-top:20px; font-size:13pt;">${line}</h3>`;
        if (line.startsWith('Media firma') || line.startsWith('Firma:')) return '';
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      }).join('')}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `📋 *Contrato de Alquiler*\n\n` +
      `🏢 ${data.building_name} - ${data.unit_identifier}\n` +
      `👤 Locatario: ${data.tenant_name}\n` +
      `📅 Vigencia: ${data.start_date} al ${data.end_date}\n` +
      `💰 Monto: ${data.currency} ${data.rent_amount}/mes\n\n` +
      `Generado por ${data.agency_name}`
    );
    window.open(`https://wa.me/${data.tenant_phone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  const selectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const p = properties?.find((pr) => pr.id === propertyId);
    if (p) {
      setData((prev) => ({
        ...prev,
        building_name: p.title,
        full_address: p.address || '',
        has_garage: p.has_garage || false,
        garage_number: p.garage_details || '',
        ande_nis: p.nis_ande || '',
      }));
    }
  };

  const selectClient = (clientId: string) => {
    const c = clients?.find((cl) => cl.id === clientId);
    if (c) {
      setData((prev) => ({
        ...prev,
        tenant_name: c.full_name,
        tenant_document: c.document_number || '',
        tenant_phone: c.phone || '',
        tenant_email: c.email || '',
      }));
    }
  };

  if (showPreview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> Vista Previa del Contrato
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded-lg border border-border p-6 bg-background">
            <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {contractText}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Editar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintPDF}>
                <Printer className="w-4 h-4 mr-1" /> Imprimir / PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={!data.tenant_phone}>
                <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
              <Button onClick={handleGenerateAndSave} disabled={createContract.isPending || !selectedPropertyId}>
                <Download className="w-4 h-4 mr-1" />
                {createContract.isPending ? 'Guardando...' : 'Guardar y Generar PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-5 h-5 shrink-0" /> Contrato de Alquiler — Paraguay
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 px-4 sm:px-6">
          <div className="overflow-x-auto shrink-0 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 sm:w-full">
              <TabsTrigger value="general" className="text-xs whitespace-nowrap">General</TabsTrigger>
              <TabsTrigger value="property" className="text-xs whitespace-nowrap">Propiedad</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs whitespace-nowrap">Financiero</TabsTrigger>
              <TabsTrigger value="term" className="text-xs whitespace-nowrap">Plazo</TabsTrigger>
              <TabsTrigger value="penalties" className="text-xs whitespace-nowrap">Otros</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0 mt-4 pr-2">
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha del Contrato *</Label>
                  <Input type="date" value={data.contract_date} onChange={(e) => update('contract_date', e.target.value)} />
                </div>
                <div>
                  <Label>Ciudad *</Label>
                  <Input value={data.city} onChange={(e) => update('city', e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Locador (Propietario)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={data.landlord_name} onChange={(e) => update('landlord_name', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div>
                  <Label>Documento *</Label>
                  <Input value={data.landlord_document} onChange={(e) => update('landlord_document', e.target.value)} placeholder="CI / RUC" />
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Locatario (Inquilino)</p>
              {clients && clients.length > 0 && (
                <div>
                  <Label>Cargar desde cliente existente</Label>
                  <Select onValueChange={selectClient}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={data.tenant_name} onChange={(e) => update('tenant_name', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div>
                  <Label>Documento *</Label>
                  <Input value={data.tenant_document} onChange={(e) => update('tenant_document', e.target.value)} placeholder="CI" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={data.tenant_phone} onChange={(e) => update('tenant_phone', e.target.value)} placeholder="+595 9XX XXX XXX" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={data.tenant_email} onChange={(e) => update('tenant_email', e.target.value)} placeholder="email@ejemplo.com" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="property" className="space-y-4 mt-0">
              {properties && properties.length > 0 && (
                <div>
                  <Label>Cargar desde propiedad existente</Label>
                  <Select onValueChange={selectProperty}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar propiedad..." /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title} - {p.address || ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tipo de inmueble toggle */}
              <div>
                <Label className="mb-2 block">Tipo de Inmueble</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update('property_kind', 'apartment')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      (data as any).property_kind !== 'house'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    🏢 Edificio / Depto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      update('property_kind', 'house');
                      update('floor', '');
                      update('unit_identifier', '');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      (data as any).property_kind === 'house'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    🏠 Casa
                  </button>
                </div>
              </div>

              {(data as any).property_kind === 'house' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nombre o Identificación de la Propiedad *</Label>
                    <Input value={data.building_name} onChange={(e) => update('building_name', e.target.value)} placeholder="Ej: Casa Barrio San Isidro" />
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección Completa *</Label>
                    <Input value={data.full_address} onChange={(e) => update('full_address', e.target.value)} placeholder="Calle, entre calles..." />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre del Edificio *</Label>
                    <Input value={data.building_name} onChange={(e) => update('building_name', e.target.value)} placeholder="Ej: Salto Grande IV" />
                  </div>
                  <div>
                    <Label>Identificador de Unidad *</Label>
                    <Input value={data.unit_identifier} onChange={(e) => update('unit_identifier', e.target.value)} placeholder="Ej: Departamento C" />
                  </div>
                  <div>
                    <Label>Piso</Label>
                    <Input value={data.floor} onChange={(e) => update('floor', e.target.value)} placeholder="Ej: 5" />
                  </div>
                  <div>
                    <Label>Dirección Completa *</Label>
                    <Input value={data.full_address} onChange={(e) => update('full_address', e.target.value)} placeholder="Calle, entre calles..." />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Estacionamiento</Label>
                <RadioGroup
                  value={data.parking_option}
                  onValueChange={(v: 'included' | 'optional' | 'not_included') => {
                    update('parking_option', v);
                    if (v === 'included') {
                      update('has_garage', true);
                    } else {
                      update('has_garage', false);
                      update('garage_number', '');
                    }
                    if (v !== 'optional') update('parking_monthly_cost', '');
                  }}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="included" id="parking-included" />
                    <Label htmlFor="parking-included" className="font-normal">Incluido</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="parking-optional" />
                    <Label htmlFor="parking-optional" className="font-normal">Opcional con costo mensual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_included" id="parking-none" />
                    <Label htmlFor="parking-none" className="font-normal">No incluido</Label>
                  </div>
                </RadioGroup>
              </div>
              {data.parking_option === 'included' && (
                <div>
                  <Label>Número de Cochera</Label>
                  <Input value={data.garage_number} onChange={(e) => update('garage_number', e.target.value)} placeholder="Ej: 16" />
                </div>
              )}
              {data.parking_option === 'optional' && (
                <div>
                  <Label>Costo Mensual de Estacionamiento</Label>
                  <Input value={data.parking_monthly_cost} onChange={(e) => update('parking_monthly_cost', e.target.value)} placeholder="Ej: 300.000" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="financial" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Moneda</Label>
                  <Select value={data.currency} onValueChange={(v) => update('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gs.">Guaraníes (Gs.)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Día de Pago</Label>
                  <Input value={data.payment_day} onChange={(e) => update('payment_day', e.target.value)} placeholder="1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto Alquiler *</Label>
                  <Input value={data.rent_amount} onChange={(e) => update('rent_amount', e.target.value)} placeholder="1.920.000" />
                </div>
                <div>
                  <Label>Monto en Letras</Label>
                  <Input value={data.rent_amount_words} onChange={(e) => update('rent_amount_words', e.target.value)} placeholder="Guaraníes un millón novecientos veinte mil" />
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Expensas</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto Expensas</Label>
                  <Input value={data.expenses_amount} onChange={(e) => update('expenses_amount', e.target.value)} placeholder="280.000" />
                </div>
                <div>
                  <Label>Expensas en Letras</Label>
                  <Input value={data.expenses_amount_words} onChange={(e) => update('expenses_amount_words', e.target.value)} placeholder="Doscientos ochenta mil" />
                </div>
              </div>
              <div>
                <Label>Pagar Expensas a</Label>
                <Input value={data.expenses_pay_to} onChange={(e) => update('expenses_pay_to', e.target.value)} placeholder="Nombre del consorcio o administrador" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>¿Incluye agua?</Label>
                  <p className="text-xs text-muted-foreground">El agua está incluida en el alquiler</p>
                </div>
                <Switch checked={data.includes_water} onCheckedChange={(v) => update('includes_water', v)} />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Depósito</p>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>¿Requiere depósito?</Label>
                  <p className="text-xs text-muted-foreground">Depósito de garantía reembolsable</p>
                </div>
                <Switch checked={data.has_deposit} onCheckedChange={(v) => {
                  update('has_deposit', v);
                  if (!v) {
                    update('deposit_amount', '');
                    update('deposit_amount_words', '');
                  }
                }} />
              </div>
              {data.has_deposit && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monto Depósito *</Label>
                    <Input value={data.deposit_amount} onChange={(e) => update('deposit_amount', e.target.value)} placeholder="1.920.000" />
                  </div>
                  <div>
                    <Label>Depósito en Letras</Label>
                    <Input value={data.deposit_amount_words} onChange={(e) => update('deposit_amount_words', e.target.value)} placeholder="Un millón novecientos veinte mil" />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="term" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Inicio *</Label>
                  <Input type="date" value={data.start_date} onChange={(e) => update('start_date', e.target.value)} />
                </div>
                <div>
                  <Label>Fecha Fin *</Label>
                  <Input type="date" value={data.end_date} onChange={(e) => update('end_date', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Hora de Finalización</Label>
                <Input value={data.end_time} onChange={(e) => update('end_time', e.target.value)} placeholder="17:00" />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Servicios</p>
              <div>
                <Label>NIS ANDE</Label>
                <Input value={data.ande_nis} onChange={(e) => update('ande_nis', e.target.value)} placeholder="Nº de medidor ANDE" />
              </div>
              <div>
                <Label>Servicios Adicionales</Label>
                <Input value={data.additional_services} onChange={(e) => update('additional_services', e.target.value)} placeholder="Otros servicios incluidos" />
              </div>
            </TabsContent>

            <TabsContent value="penalties" className="space-y-4 mt-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Penalidades</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Interés Diario por Mora</Label>
                  <Input value={data.daily_late_fee} onChange={(e) => update('daily_late_fee', e.target.value)} placeholder="20.000" />
                </div>
                <div>
                  <Label>Multa Rescisión Anticipada</Label>
                  <Input value={data.early_termination_penalty} onChange={(e) => update('early_termination_penalty', e.target.value)} placeholder="1 mes de alquiler" />
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Mascotas</p>
              <div className="space-y-2">
                <Label>¿Se permiten mascotas?</Label>
                <RadioGroup
                  value={data.pets_option}
                  onValueChange={(v: 'not_allowed' | 'allowed_with_conditions') => {
                    update('pets_option', v);
                    if (v === 'not_allowed') {
                      update('pet_deposit_amount', '');
                      update('pet_penalty_amount', '');
                      update('pet_notes', '');
                    }
                  }}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_allowed" id="pets-no" />
                    <Label htmlFor="pets-no" className="font-normal">No permitido</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="allowed_with_conditions" id="pets-yes" />
                    <Label htmlFor="pets-yes" className="font-normal">Permitido con condiciones</Label>
                  </div>
                </RadioGroup>
              </div>
              {data.pets_option === 'allowed_with_conditions' && (
                <div className="space-y-4 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Depósito por Mascota</Label>
                      <Input value={data.pet_deposit_amount} onChange={(e) => update('pet_deposit_amount', e.target.value)} placeholder="500.000" />
                    </div>
                    <div>
                      <Label>Penalidad por Daños</Label>
                      <Input value={data.pet_penalty_amount} onChange={(e) => update('pet_penalty_amount', e.target.value)} placeholder="1.000.000" />
                    </div>
                  </div>
                  <div>
                    <Label>Condiciones Adicionales</Label>
                    <Textarea value={data.pet_notes} onChange={(e) => update('pet_notes', e.target.value)} placeholder="Ej: Solo mascotas pequeñas, mantener limpieza en áreas comunes..." rows={2} />
                  </div>
                </div>
              )}

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Administración</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Inmobiliaria</Label>
                  <Input value={data.agency_name} onChange={(e) => update('agency_name', e.target.value)} />
                </div>
                <div>
                  <Label>Teléfono Inmobiliaria</Label>
                  <Input value={data.agency_phone} onChange={(e) => update('agency_phone', e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!data.tenant_name || !data.landlord_name || !data.start_date}
            >
              <Eye className="w-4 h-4 mr-1" /> Vista Previa
            </Button>
            <Button
              onClick={handleGenerateAndSave}
              disabled={!selectedPropertyId || !data.tenant_name || !data.landlord_name || !data.start_date || !data.rent_amount || createContract.isPending}
            >
              {createContract.isPending ? 'Guardando...' : 'Generar Contrato'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
