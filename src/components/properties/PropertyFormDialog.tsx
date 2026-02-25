import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateProperty, useUpdateProperty, useOwners, Property } from '@/hooks/useProperties';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { PropertyPhotosSection } from './PropertyPhotosSection';

const paraguayCities = [
  'Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora',
  'Limpio', 'Ñemby', 'Mariano Roque Alonso', 'Villa Elisa', 'San Antonio', 'Encarnación', 'Pedro Juan Caballero',
  'Caaguazú', 'Coronel Oviedo', 'Concepción', 'Villarrica', 'Pilar', 'Paraguarí', 'Itauguá', 'Areguá',
  'Ypacaraí', 'San Bernardino', 'Caacupé', 'Hernandarias', 'Presidente Franco', 'Minga Guazú',
  'Filadelfia', 'Salto del Guairá', 'Ayolas', 'Itá', 'Villeta', 'Villa Hayes', 'Benjamín Aceval',
  'San Estanislao', 'Santa Rita', 'Horqueta', 'Curuguaty', 'San Juan Bautista', 'Obligado',
  'Bella Vista', 'Hohenau', 'Fram', 'Capitán Bado', 'Loma Plata', 'Neuland',
];

type PropertyType = Database['public']['Enums']['property_type'];
type PropertyStatus = Database['public']['Enums']['property_status'];
type CurrencyType = Database['public']['Enums']['currency_type'];

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
}

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local Comercial' },
  { value: 'other', label: 'Otro' },
];

const statusOptions: { value: PropertyStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'available', label: 'Disponible' },
  { value: 'reserved', label: 'Reservada' },
  { value: 'rented', label: 'Alquilada' },
  { value: 'sold', label: 'Vendida' },
  { value: 'archived', label: 'Archivada' },
];

export const PropertyFormDialog = ({ open, onOpenChange, property }: PropertyFormDialogProps) => {
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();
  const { data: owners } = useOwners();
  const isEditing = !!property;

  const [form, setForm] = useState({
    title: '',
    property_type: 'apartment' as PropertyType,
    status: 'draft' as PropertyStatus,
    address: '',
    city: 'Asunción',
    neighborhood: '',
    bedrooms: 0,
    bathrooms: 0,
    area_m2: 0,
    rental_price: 0,
    sale_price: 0,
    currency: 'PYG' as CurrencyType,
    description: '',
    owner_id: '',
    management_fee_pct: 5,
    has_garage: false,
    garage_details: '',
    nis_ande: '',
    public_website_url: '',
    key_location: 'office',
  });

  useEffect(() => {
    if (property) {
      setForm({
        title: property.title || '',
        property_type: property.property_type,
        status: property.status,
        address: property.address || '',
        city: property.city || 'Asunción',
        neighborhood: property.neighborhood || '',
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        area_m2: Number(property.area_m2) || 0,
        rental_price: Number(property.rental_price) || 0,
        sale_price: Number(property.sale_price) || 0,
        currency: property.currency || 'PYG',
        description: property.description || '',
        owner_id: property.owner_id || '',
        management_fee_pct: Number(property.management_fee_pct) || 5,
        has_garage: property.has_garage || false,
        garage_details: property.garage_details || '',
        nis_ande: property.nis_ande || '',
        public_website_url: property.public_website_url || '',
        key_location: (property as any).key_location || 'office',
      });
    } else {
      setForm({
        title: '', property_type: 'apartment', status: 'draft', address: '', city: 'Asunción',
        neighborhood: '', bedrooms: 0, bathrooms: 0, area_m2: 0, rental_price: 0, sale_price: 0,
        currency: 'PYG', description: '', owner_id: '', management_fee_pct: 5, has_garage: false,
        garage_details: '', nis_ande: '', public_website_url: '', key_location: 'office',
      });
    }
  }, [property, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      ...form,
      owner_id: form.owner_id || null,
      area_m2: form.area_m2 || null,
      rental_price: form.rental_price || null,
      sale_price: form.sale_price || null,
      public_website_url: form.public_website_url.trim() || null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: property.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title + Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field" placeholder="Ej: Departamento 2 amb. Villa Morra" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
              <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value as PropertyType }))}
                className="input-field">
                {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Status + Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Estado</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PropertyStatus }))}
                className="input-field">
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Propietario</label>
              <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                className="input-field">
                <option value="">Sin asignar</option>
                {owners?.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Dirección</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="input-field" placeholder="Calle y número" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Ciudad</label>
              <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="input-field">
                {paraguayCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Barrio</label>
            <input value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
              className="input-field" placeholder="Ej: Villa Morra, Carmelitas..." />
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Dormitorios</label>
              <input type="number" min={0} value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: +e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Baños</label>
              <input type="number" min={0} value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: +e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Área (m²)</label>
              <input type="number" min={0} value={form.area_m2} onChange={e => setForm(f => ({ ...f, area_m2: +e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Moneda</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as CurrencyType }))}
                className="input-field">
                <option value="PYG">Guaraníes (₲)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Precio Alquiler</label>
              <input type="number" min={0} value={form.rental_price} onChange={e => setForm(f => ({ ...f, rental_price: +e.target.value }))}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Precio Venta</label>
              <input type="number" min={0} value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: +e.target.value }))}
                className="input-field" placeholder="0" />
            </div>
          </div>

          {/* Management + Garage + NIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fee Administración (%)</label>
              <input type="number" min={0} max={100} value={form.management_fee_pct}
                onChange={e => setForm(f => ({ ...f, management_fee_pct: +e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">NIS ANDE</label>
              <input value={form.nis_ande} onChange={e => setForm(f => ({ ...f, nis_ande: e.target.value }))}
                className="input-field" placeholder="Número NIS" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.has_garage}
                  onChange={e => setForm(f => ({ ...f, has_garage: e.target.checked, garage_details: e.target.checked ? f.garage_details : '' }))}
                  className="w-4 h-4 rounded border-input" />
                <span className="text-sm font-medium text-foreground">Tiene cochera</span>
              </label>
            </div>
          </div>

          {form.has_garage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Precio Cochera ({form.currency === 'PYG' ? '₲' : 'USD'})</label>
                <input type="number" min={0} value={form.garage_details}
                  onChange={e => setForm(f => ({ ...f, garage_details: e.target.value }))}
                  className="input-field" placeholder="0 = incluida en el precio" />
                <p className="text-xs text-muted-foreground mt-1">Ingrese 0 si está incluida o el monto adicional</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field min-h-[80px] resize-y" placeholder="Descripción de la propiedad..." />
          </div>

          {/* Key Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">🔑 Ubicación de la llave *</label>
            <select
              value={form.key_location}
              onChange={e => setForm(f => ({ ...f, key_location: e.target.value }))}
              className="input-field"
            >
              <option value="office">En oficina (Plusterra)</option>
              <option value="owner">En poder del Propietario</option>
              <option value="agent">En poder del Captador</option>
              <option value="not_managed">No administramos llaves</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Indica dónde se encuentra la llave actualmente.</p>
          </div>

          {/* Public website URL */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              🌐 Link web externa <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              type="url"
              value={form.public_website_url}
              onChange={e => setForm(f => ({ ...f, public_website_url: e.target.value }))}
              className="input-field"
              placeholder="https://miinmobiliaria.com/propiedad/..."
            />
            <p className="text-xs text-muted-foreground mt-1">Se mostrará como botón "Ver en la web" en el detalle de la propiedad.</p>
          </div>

          {/* Reference Photos - only show when editing */}
          {isEditing && property?.id && (
            <div className="pt-4 border-t border-border">
              <PropertyPhotosSection propertyId={property.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Propiedad'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
