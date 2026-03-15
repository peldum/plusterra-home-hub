import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateProperty, useUpdateProperty, useOwners, Property } from '@/hooks/useProperties';
import { Loader2, Crown, Video, Globe, Star, Camera, UserPlus } from 'lucide-react';
import { OwnerFormDialog } from '@/components/owners/OwnerFormDialog';
import type { Database } from '@/integrations/supabase/types';
import { PropertyPhotosSection } from './PropertyPhotosSection';
import { LocationMapPicker } from './LocationMapPicker';
import { PremiumUpgradeBanner } from './PremiumUpgradeBanner';
import { useAgentPlan } from '@/hooks/useAgentPlan';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';

const cityGroups: { department: string; cities: string[] }[] = [
  { department: 'Itapúa', cities: ['Encarnación', 'Cambyretá', 'San Juan del Paraná', 'Capitán Miranda', 'Obligado', 'Bella Vista', 'Hohenau', 'Fram', 'Trinidad', 'Jesús', 'Nueva Alborada', 'Coronel Bogado'] },
  { department: 'Central', cities: ['Asunción', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Limpio', 'Ñemby', 'Mariano Roque Alonso', 'Villa Elisa', 'San Antonio', 'Itauguá', 'Areguá', 'Ypacaraí', 'San Bernardino', 'Itá', 'Villeta'] },
  { department: 'Alto Paraná', cities: ['Ciudad del Este', 'Hernandarias', 'Presidente Franco', 'Minga Guazú', 'Santa Rita'] },
  { department: 'Cordillera', cities: ['Caacupé', 'Paraguarí'] },
  { department: 'Guairá', cities: ['Villarrica'] },
  { department: 'Caaguazú', cities: ['Caaguazú', 'Coronel Oviedo'] },
  { department: 'Misiones', cities: ['San Juan Bautista', 'Ayolas'] },
  { department: 'Ñeembucú', cities: ['Pilar'] },
  { department: 'Concepción', cities: ['Concepción', 'Horqueta'] },
  { department: 'San Pedro', cities: ['San Estanislao'] },
  { department: 'Amambay', cities: ['Pedro Juan Caballero', 'Capitán Bado'] },
  { department: 'Canindeyú', cities: ['Salto del Guairá', 'Curuguaty'] },
  { department: 'Presidente Hayes', cities: ['Villa Hayes', 'Benjamín Aceval'] },
  { department: 'Boquerón', cities: ['Filadelfia', 'Loma Plata', 'Neuland'] },
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
  const { data: agentPlan } = useAgentPlan();
  const { role, user } = useAuth();
  const canAssignAgent = role === 'admin' || role === 'superadmin' || role === 'accounting';
  const { data: agents } = useAgents();
  const agentList = canAssignAgent ? (agents || []).filter(a => a.role === 'agent' && a.status === 'active') : [];
  const isPremium = agentPlan === 'premium' || role === 'admin' || role === 'superadmin';
  const isEditing = !!property;
  const [showOwnerForm, setShowOwnerForm] = useState(false);

  const [form, setForm] = useState({
    title: '',
    property_type: 'apartment' as PropertyType,
    status: 'draft' as PropertyStatus,
    address: '',
    city: 'Encarnación',
    neighborhood: '',
    bedrooms: '' as any,
    bathrooms: '' as any,
    area_m2: '' as any,
    rental_price: '' as any,
    sale_price: '' as any,
    currency: 'PYG' as CurrencyType,
    description: '',
    owner_id: '',
    management_fee_pct: 5,
    has_garage: false,
    garage_details: '',
    nis_ande: '',
    key_location: 'office',
    captor_agent_id: '',
    // Portal fields
    is_published: false,
    is_featured: false,
    public_description: '',
    public_lat: '',
    public_lng: '',
    exact_location_enabled: false,
    amenities: '' as string,
    video_url: '',
    tour_360_url: '',
    // Mejora 2: disponible_desde
    disponible_desde: '',
    // Mejora 3: toggles
    cocina_integrada: false,
    acepta_mascotas: false,
    // Visibilidad portal
    visible_en_portal: true,
  });

  useEffect(() => {
    if (property) {
      const p = property as any;
      setForm({
        title: property.title || '',
        property_type: property.property_type,
        status: property.status,
        address: property.address || '',
        city: property.city || 'Asunción',
        neighborhood: property.neighborhood || '',
        bedrooms: property.bedrooms ?? '',
        bathrooms: property.bathrooms ?? '',
        area_m2: property.area_m2 ? Number(property.area_m2) : '',
        rental_price: property.rental_price ? Number(property.rental_price) : '',
        sale_price: property.sale_price ? Number(property.sale_price) : '',
        currency: property.currency || 'PYG',
        description: property.description || '',
        owner_id: property.owner_id || '',
        management_fee_pct: Number(property.management_fee_pct) || 5,
        has_garage: property.has_garage || false,
        garage_details: property.garage_details || '',
        nis_ande: property.nis_ande || '',
        key_location: p.key_location || 'office',
        captor_agent_id: property.captor_agent_id || '',
        is_published: p.is_published || false,
        is_featured: p.is_featured || false,
        public_description: p.public_description || '',
        public_lat: p.public_lat ? String(p.public_lat) : '',
        public_lng: p.public_lng ? String(p.public_lng) : '',
        exact_location_enabled: p.exact_location_enabled || false,
        amenities: Array.isArray(p.amenities) ? (p.amenities as string[]).join(', ') : '',
        video_url: p.video_url || '',
        tour_360_url: p.tour_360_url || '',
        disponible_desde: p.disponible_desde || '',
        cocina_integrada: p.cocina_integrada || false,
        acepta_mascotas: p.acepta_mascotas || false,
        visible_en_portal: p.visible_en_portal ?? true,
      });
    } else {
      setForm({
        title: '', property_type: 'apartment', status: 'draft', address: '', city: 'Encarnación',
        neighborhood: '', bedrooms: '', bathrooms: '', area_m2: '', rental_price: '', sale_price: '',
        currency: 'PYG', description: '', owner_id: '', management_fee_pct: 5, has_garage: false,
        garage_details: '', nis_ande: '', key_location: 'office', captor_agent_id: '',
        is_published: false, is_featured: false, public_description: '', public_lat: '', public_lng: '',
        exact_location_enabled: false, amenities: '', video_url: '', tour_360_url: '',
        disponible_desde: '', cocina_integrada: false, acepta_mascotas: false,
        visible_en_portal: true,
      });
    }
  }, [property, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const amenitiesArray = form.amenities
      ? form.amenities.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      ...form,
      owner_id: form.owner_id || null,
      captor_agent_id: form.captor_agent_id || undefined,
      bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms),
      bathrooms: form.bathrooms === '' ? null : Number(form.bathrooms),
      area_m2: form.area_m2 === '' ? null : Number(form.area_m2),
      rental_price: form.rental_price === '' ? null : Number(form.rental_price),
      sale_price: form.sale_price === '' ? null : Number(form.sale_price),
      public_description: form.public_description.trim() || null,
      public_lat: form.public_lat ? Number(form.public_lat) : null,
      public_lng: form.public_lng ? Number(form.public_lng) : null,
      published_at: form.is_published ? (isEditing && (property as any).is_published ? (property as any).published_at : new Date().toISOString()) : null,
      amenities: amenitiesArray,
      video_url: isPremium && form.video_url.trim() ? form.video_url.trim() : null,
      tour_360_url: isPremium && form.tour_360_url.trim() ? form.tour_360_url.trim() : null,
      is_featured: isPremium ? form.is_featured : false,
      disponible_desde: form.disponible_desde ? form.disponible_desde : null,
    } as any;
    // Remove the comma-separated string version
    delete payload.amenities;
    payload.amenities = amenitiesArray;

    if (isEditing) {
      await updateMutation.mutateAsync({ id: property.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
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
                {(owners as any[])?.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.full_name}{(canAssignAgent && o.agente_nombre) ? ` (${o.agente_nombre})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowOwnerForm(true)}
                className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Agregar propietario
              </button>
            </div>
          </div>

          {/* Disponible desde (opcional, cualquier estado) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Disponible desde (opcional)</label>
            <input
              type="date"
              value={form.disponible_desde}
              onChange={e => setForm(f => ({ ...f, disponible_desde: e.target.value }))}
              className="input-field"
              placeholder="Seleccioná una fecha"
            />
          </div>


          {canAssignAgent && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">👤 Agente Captador *</label>
              <select
                value={form.captor_agent_id}
                onChange={e => setForm(f => ({ ...f, captor_agent_id: e.target.value }))}
                className="input-field"
              >
                <option value="">— Yo mismo —</option>
                {agentList.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Asigná esta propiedad a un agente específico.</p>
            </div>
          )}


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
                {cityGroups.map(g => (
                  <optgroup key={g.department} label={g.department}>
                    {g.cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
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
              <input type="number" min={0} value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value === '' ? '' : +e.target.value }))}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Baños</label>
              <input type="number" min={0} value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value === '' ? '' : +e.target.value }))}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Área (m²)</label>
              <input type="number" min={0} step="0.01" value={form.area_m2} onChange={e => setForm(f => ({ ...f, area_m2: e.target.value === '' ? '' : +e.target.value }))}
                className="input-field" placeholder="0" />
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
              <input type="number" min={0} value={form.rental_price} onChange={e => setForm(f => ({ ...f, rental_price: e.target.value === '' ? '' : +e.target.value }))}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Precio Venta</label>
              <input type="number" min={0} value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value === '' ? '' : +e.target.value }))}
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

          {/* Quick toggles: cocina integrada + mascotas */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <input type="checkbox" checked={form.cocina_integrada}
                onChange={e => setForm(f => ({ ...f, cocina_integrada: e.target.checked }))}
                className="w-4 h-4 rounded border-input accent-primary" />
              <span className="text-sm font-medium text-foreground">🍳 Sala/cocina integrada</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <input type="checkbox" checked={form.acepta_mascotas}
                onChange={e => setForm(f => ({ ...f, acepta_mascotas: e.target.checked }))}
                className="w-4 h-4 rounded border-input accent-primary" />
              <span className="text-sm font-medium text-foreground">🐾 Se aceptan mascotas</span>
            </label>
          </div>

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

          {/* Portal link info */}
          {isEditing && form.is_published && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">🌐 Esta propiedad está publicada en el portal.</span>
              <a
                href={`/portal/propiedades/${property?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver en la web →
              </a>
            </div>
          )}

          {/* Portal Público Section */}
          {isEditing && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                🌐 Portal Público
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${form.is_published ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {form.is_published ? 'PUBLICADA' : 'NO PUBLICADA'}
                </span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_published}
                      onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                      className="w-4 h-4 rounded border-input accent-primary" />
                    <span className="text-sm font-medium">Publicar en portal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.visible_en_portal}
                      onChange={e => setForm(f => ({ ...f, visible_en_portal: e.target.checked }))}
                      className="w-4 h-4 rounded border-input accent-primary" />
                    <span className="text-sm font-medium">👁 Mostrar en portal público</span>
                  </label>
                  {isPremium ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_featured}
                        onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                        className="w-4 h-4 rounded border-input accent-yellow-500" />
                      <span className="text-sm font-medium flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-500" /> Destacada</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 opacity-50 cursor-not-allowed" title="Disponible en Plan Premium">
                      <input type="checkbox" disabled className="w-4 h-4 rounded border-input" />
                      <span className="text-sm font-medium flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Destacada</span>
                      <span className="text-[10px] text-amber-600 font-medium bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">Premium</span>
                    </div>
                  )}
                </div>

                {/* Multimedia Avanzada — Premium */}
                <div className="pt-3 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Video className="w-4 h-4" /> Multimedia Avanzada
                    {!isPremium && <span className="text-[10px] text-amber-600 font-medium bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded ml-1">Premium</span>}
                  </h4>
                  {isPremium ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">🎬 Video (YouTube / Vimeo)</label>
                        <input value={form.video_url}
                          onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                          className="input-field" placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">🌐 Tour 360° (Matterport / Kuula)</label>
                        <input value={form.tour_360_url}
                          onChange={e => setForm(f => ({ ...f, tour_360_url: e.target.value }))}
                          className="input-field" placeholder="https://my.matterport.com/show/..." />
                      </div>
                    </div>
                  ) : (
                    <PremiumUpgradeBanner />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Descripción pública</label>
                  <textarea value={form.public_description}
                    onChange={e => setForm(f => ({ ...f, public_description: e.target.value }))}
                    className="input-field min-h-[60px] resize-y" placeholder="Descripción visible en el portal público (si vacía usa la interna)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Amenities</label>
                  <input value={form.amenities}
                    onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))}
                    className="input-field" placeholder="Piscina, Gimnasio, Parrilla, Seguridad 24hs (separar con coma)" />
                </div>
                <LocationMapPicker
                  lat={form.public_lat}
                  lng={form.public_lng}
                  onLocationChange={(lat, lng) => setForm(f => ({ ...f, public_lat: lat, public_lng: lng }))}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.exact_location_enabled}
                    onChange={e => setForm(f => ({ ...f, exact_location_enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-input" />
                  <span className="text-sm">Mostrar ubicación exacta en mapa público</span>
                </label>
              </div>
            </div>
          )}

          {/* Reference Photos */}
          {isEditing && property?.id ? (
            <div className="pt-4 border-t border-border">
              <PropertyPhotosSection propertyId={property.id} />
            </div>
          ) : !isEditing && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Podrás agregar fotos después de crear la propiedad.
              </span>
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
    <OwnerFormDialog
      open={showOwnerForm}
      onOpenChange={setShowOwnerForm}
    />
    </>
  );
};
