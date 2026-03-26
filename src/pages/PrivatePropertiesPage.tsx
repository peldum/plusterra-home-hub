import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateProperties, useCreatePrivateProperty, useUpdatePrivateProperty, useDeletePrivateProperty, type PrivateProperty } from '@/hooks/usePrivateProperties';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Search, Briefcase, FileText, Building2, Phone, MapPin, Bed, Bath, Ruler } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  apartment: 'Departamento', house: 'Casa', land: 'Terreno', office: 'Oficina', commercial: 'Local', other: 'Otro',
};

const PrivatePropertiesPage = () => {
  const { user } = useAuth();
  const { data: props = [], isLoading } = usePrivateProperties();
  const createProp = useCreatePrivateProperty();
  const updateProp = useUpdatePrivateProperty();
  const deleteProp = useDeletePrivateProperty();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PrivateProperty | null>(null);
  const [search, setSearch] = useState('');

  const emptyForm = {
    title: '', property_type: 'apartment', address: '', city: '', neighborhood: '',
    bedrooms: '' as any, bathrooms: '' as any, area_m2: '' as any,
    rental_price: '' as any, sale_price: '' as any, currency: 'PYG',
    description: '', contact_name: '', contact_phone: '', notes: '', status: 'disponible',
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    if (!search) return props;
    const s = search.toLowerCase();
    return props.filter(p =>
      p.title.toLowerCase().includes(s) ||
      (p.address || '').toLowerCase().includes(s) ||
      (p.city || '').toLowerCase().includes(s) ||
      (p.contact_name || '').toLowerCase().includes(s)
    );
  }, [props, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: PrivateProperty) => {
    setEditing(p);
    setForm({
      title: p.title, property_type: p.property_type, address: p.address || '', city: p.city || '',
      neighborhood: p.neighborhood || '', bedrooms: p.bedrooms ?? '', bathrooms: p.bathrooms ?? '',
      area_m2: p.area_m2 ? Number(p.area_m2) : '', rental_price: p.rental_price ? Number(p.rental_price) : '',
      sale_price: p.sale_price ? Number(p.sale_price) : '', currency: p.currency, description: p.description || '',
      contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', notes: p.notes || '', status: p.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms),
      bathrooms: form.bathrooms === '' ? null : Number(form.bathrooms),
      area_m2: form.area_m2 === '' ? null : Number(form.area_m2),
      rental_price: form.rental_price === '' ? null : Number(form.rental_price),
      sale_price: form.sale_price === '' ? null : Number(form.sale_price),
      created_by: user!.id,
    };
    if (editing) {
      await updateProp.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createProp.mutateAsync(payload as any);
    }
    setShowForm(false);
  };

  const fmtPrice = (v: number | null, currency: string) => {
    if (!v) return '—';
    return `${currency === 'USD' ? 'USD' : 'Gs.'} ${v.toLocaleString('es-PY')}`;
  };

  const exportPDF = () => {
    if (filtered.length === 0) { toast.error('No hay propiedades para exportar'); return; }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ml = 15;
    const mr = 15;
    const contentW = pw - ml - mr;
    let y = 20;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pw, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cartera Privada — Catálogo Personal', ml, 14);
    doc.setFontSize(8);
    doc.text(`${filtered.length} propiedades · ${new Date().toLocaleDateString('es-PY')}`, pw - mr, 14, { align: 'right' });

    y = 30;
    doc.setTextColor(0, 0, 0);

    filtered.forEach((p, i) => {
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFillColor(245, 245, 245);
      doc.roundedRect(ml, y, contentW, 28, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${p.title}`, ml + 3, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);

      const details: string[] = [];
      if (p.property_type) details.push(typeLabels[p.property_type] || p.property_type);
      if (p.city) details.push(p.city);
      if (p.address) details.push(p.address);
      doc.text(details.join(' · '), ml + 3, y + 12);

      const specs: string[] = [];
      if (p.bedrooms) specs.push(`${p.bedrooms} hab`);
      if (p.bathrooms) specs.push(`${p.bathrooms} baños`);
      if (p.area_m2) specs.push(`${p.area_m2} m²`);
      if (p.rental_price) specs.push(`Alq: ${fmtPrice(Number(p.rental_price), p.currency)}`);
      if (p.sale_price) specs.push(`Vta: ${fmtPrice(Number(p.sale_price), p.currency)}`);
      doc.text(specs.join(' · '), ml + 3, y + 18);

      const contact: string[] = [];
      if (p.contact_name) contact.push(p.contact_name);
      if (p.contact_phone) contact.push(p.contact_phone);
      if (contact.length > 0) {
        doc.setTextColor(37, 99, 235);
        doc.text('Contacto: ' + contact.join(' — '), ml + 3, y + 24);
      }

      doc.setTextColor(0, 0, 0);
      y += 32;
    });

    // Footer
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Confidencial — Cartera Privada', ml, 290);
      doc.text(`Pág. ${p}/${pages}`, pw - mr, 290, { align: 'right' });
    }

    doc.save(`Cartera_Privada_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exportado');
  };

  return (
    <MainLayout
      title="Cartera Privada"
      subtitle="Catálogo personal de propiedades externas"
      actionNode={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportPDF} disabled={filtered.length === 0}>
            <FileText className="w-4 h-4 mr-1" /> Exportar PDF
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Nueva propiedad
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay propiedades en tu cartera privada</p>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <Card key={p.id} className="hover:ring-1 ring-primary/20 transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">{p.title}</h3>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProp.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{typeLabels[p.property_type] || p.property_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                  </div>
                  {(p.city || p.address) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.city, p.address].filter(Boolean).join(' · ')}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {p.bedrooms && <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{p.bedrooms}</span>}
                    {p.bathrooms && <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{p.bathrooms}</span>}
                    {p.area_m2 && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{Number(p.area_m2)}m²</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-foreground">
                    {p.rental_price && <span>Alq: {fmtPrice(Number(p.rental_price), p.currency)}</span>}
                    {p.sale_price && <span>Vta: {fmtPrice(Number(p.sale_price), p.currency)}</span>}
                  </div>
                  {p.contact_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{p.contact_name} {p.contact_phone && `· ${p.contact_phone}`}</p>
                  )}
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar propiedad' : 'Nueva propiedad privada'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Título *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Depto 3 hab centro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Departamento</SelectItem>
                    <SelectItem value="house">Casa</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="office">Oficina</SelectItem>
                    <SelectItem value="commercial">Local</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Estado</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="reservada">Reservada</SelectItem>
                    <SelectItem value="negociacion">En negociación</SelectItem>
                    <SelectItem value="cerrada">Cerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Ciudad</label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Encarnación" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dirección</label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Hab.</label>
                <Input type="number" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Baños</label>
                <Input type="number" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">m²</label>
                <Input type="number" value={form.area_m2} onChange={e => setForm(f => ({ ...f, area_m2: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PYG">Gs.</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Alquiler</label>
                <Input type="number" value={form.rental_price} onChange={e => setForm(f => ({ ...f, rental_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Venta</label>
                <Input type="number" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Contacto</label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nombre dueño/contacto" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Teléfono</label>
                <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+595..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descripción</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notas internas</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || createProp.isPending || updateProp.isPending}>
              {editing ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PrivatePropertiesPage;
