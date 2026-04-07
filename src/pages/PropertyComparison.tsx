import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProperties, Property } from '@/hooks/useProperties';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Search, FileDown, Bed, Bath, Square, MapPin, X, Building2, Trophy, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// ---------- Types ----------
export interface TempProperty {
  id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  area_m2: number;
  bedrooms: number;
  bathrooms: number;
  notes: string;
  isTemp: true;
}

interface CompareItem {
  id: string;
  title: string;
  code: string;
  price: number;
  currency: string;
  location: string;
  area_m2: number;
  bedrooms: number;
  bathrooms: number;
  notes: string;
  isTemp: boolean;
}

// ---------- Helpers ----------
const STORAGE_KEY = 'pluspy_temp_properties';

const loadTempProperties = (): TempProperty[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
};

const saveTempProperties = (items: TempProperty[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

const formatPrice = (amount: number, currency: string) =>
  currency === 'USD' ? `USD ${amount.toLocaleString('en-US')}` : `₲ ${amount.toLocaleString('es-PY')}`;

const toCompareItem = (p: Property): CompareItem => ({
  id: p.id,
  title: p.title,
  code: p.property_code,
  price: Number(p.rental_price) || Number(p.sale_price) || 0,
  currency: p.currency || 'PYG',
  location: [p.address, p.city].filter(Boolean).join(', '),
  area_m2: Number(p.area_m2) || 0,
  bedrooms: p.bedrooms ?? 0,
  bathrooms: p.bathrooms ?? 0,
  notes: '',
  isTemp: false,
});

const tempToCompareItem = (t: TempProperty): CompareItem => ({
  ...t,
  code: 'TEMP',
  isTemp: true,
});

// ---------- Component ----------
const PropertyComparison = () => {
  const { data: properties, isLoading: propsLoading } = useProperties();
  const { user } = useAuth();

  const [selected, setSelected] = useState<CompareItem[]>([]);
  const [tempProps, setTempProps] = useState<TempProperty[]>(loadTempProperties);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [showAddTemp, setShowAddTemp] = useState(false);
  const [propSearch, setPropSearch] = useState('');

  // Temp property form state
  const [tTitle, setTTitle] = useState('');
  const [tPrice, setTPrice] = useState('');
  const [tCurrency, setTCurrency] = useState('PYG');
  const [tLocation, setTLocation] = useState('');
  const [tArea, setTArea] = useState('');
  const [tBed, setTBed] = useState('');
  const [tBath, setTBath] = useState('');
  const [tNotes, setTNotes] = useState('');

  const selectedIds = new Set(selected.map(s => s.id));

  const filteredSystemProps = useMemo(() => {
    if (!properties) return [];
    return properties
      .filter(p => !selectedIds.has(p.id))
      .filter(p => {
        if (!propSearch.trim()) return true;
        const q = propSearch.toLowerCase();
        return p.title.toLowerCase().includes(q) ||
          p.property_code.toLowerCase().includes(q) ||
          (p.address || '').toLowerCase().includes(q);
      })
      .slice(0, 30);
  }, [properties, propSearch, selectedIds]);

  const addSystemProperty = (p: Property) => {
    if (selected.length >= 5) { toast.error('Máximo 5 propiedades'); return; }
    setSelected(prev => [...prev, toCompareItem(p)]);
    setShowAddSystem(false);
    setPropSearch('');
  };

  const addTempProperty = () => {
    if (!tTitle.trim()) return;
    if (selected.length >= 5) { toast.error('Máximo 5 propiedades'); return; }
    const newTemp: TempProperty = {
      id: `temp_${Date.now()}`,
      title: tTitle.trim(),
      price: parseFloat(tPrice) || 0,
      currency: tCurrency,
      location: tLocation.trim(),
      area_m2: parseFloat(tArea) || 0,
      bedrooms: parseInt(tBed) || 0,
      bathrooms: parseInt(tBath) || 0,
      notes: tNotes.trim(),
      isTemp: true,
    };
    const updatedTemps = [...tempProps, newTemp];
    setTempProps(updatedTemps);
    saveTempProperties(updatedTemps);
    setSelected(prev => [...prev, tempToCompareItem(newTemp)]);
    resetTempForm();
    setShowAddTemp(false);
    toast.success('Propiedad temporal agregada');
  };

  const resetTempForm = () => {
    setTTitle(''); setTPrice(''); setTCurrency('PYG'); setTLocation('');
    setTArea(''); setTBed(''); setTBath(''); setTNotes('');
  };

  const removeFromCompare = (id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id));
  };

  const clearAll = () => setSelected([]);

  // Winners calculation
  const winners = useMemo(() => {
    if (selected.length < 2) return {};
    const sameCurrency = selected.every(s => s.currency === selected[0].currency);
    const result: Record<string, string> = {};
    // Cheapest
    if (sameCurrency) {
      const priced = selected.filter(s => s.price > 0);
      if (priced.length > 0) {
        const min = priced.reduce((a, b) => a.price < b.price ? a : b);
        result['price'] = min.id;
      }
    }
    // Largest area
    const withArea = selected.filter(s => s.area_m2 > 0);
    if (withArea.length > 0) {
      const max = withArea.reduce((a, b) => a.area_m2 > b.area_m2 ? a : b);
      result['area'] = max.id;
    }
    // Most bedrooms
    const withBed = selected.filter(s => s.bedrooms > 0);
    if (withBed.length > 0) {
      const max = withBed.reduce((a, b) => a.bedrooms > b.bedrooms ? a : b);
      result['bedrooms'] = max.id;
    }
    return result;
  }, [selected]);

  // PDF Export
  const exportPDF = () => {
    if (selected.length < 2) { toast.error('Seleccioná al menos 2 propiedades'); return; }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Header
    doc.setFillColor(0, 68, 124);
    doc.rect(0, 0, pageW, 25, 'F');
    doc.setFillColor(252, 81, 0);
    doc.rect(0, 25, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comparativo de Propiedades', margin, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-PY'), pageW - margin, 16, { align: 'right' });

    let y = 35;
    const colW = (pageW - margin * 2 - 40) / selected.length;
    const labelX = margin;
    const startX = margin + 42;

    doc.setFontSize(8);

    const rows = [
      { label: 'Propiedad', key: 'title' },
      { label: 'Precio', key: 'price' },
      { label: 'Ubicación', key: 'location' },
      { label: 'Superficie', key: 'area' },
      { label: 'Dormitorios', key: 'bedrooms' },
      { label: 'Baños', key: 'bathrooms' },
      { label: 'Notas', key: 'notes' },
    ];

    rows.forEach((row, ri) => {
      const rowH = 12;
      if (ri % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, pageW - margin * 2, rowH, 'F');
      }

      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'bold');
      doc.text(row.label, labelX, y + 2);

      selected.forEach((item, ci) => {
        const x = startX + ci * colW;
        let val = '';
        const isWinner =
          (row.key === 'price' && winners['price'] === item.id) ||
          (row.key === 'area' && winners['area'] === item.id) ||
          (row.key === 'bedrooms' && winners['bedrooms'] === item.id);

        switch (row.key) {
          case 'title': val = item.title; break;
          case 'price': val = item.price > 0 ? formatPrice(item.price, item.currency) : '-'; break;
          case 'location': val = item.location || '-'; break;
          case 'area': val = item.area_m2 > 0 ? `${item.area_m2} m²` : '-'; break;
          case 'bedrooms': val = item.bedrooms > 0 ? `${item.bedrooms}` : '-'; break;
          case 'bathrooms': val = item.bathrooms > 0 ? `${item.bathrooms}` : '-'; break;
          case 'notes': val = item.notes || '-'; break;
        }

        doc.setFont('helvetica', 'normal');
        if (isWinner) {
          doc.setTextColor(22, 163, 74); // green
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(50, 50, 50);
        }

        // Truncate long text
        const maxChars = Math.floor(colW / 1.8);
        if (val.length > maxChars) val = val.substring(0, maxChars - 1) + '…';

        doc.text(val, x, y + 2);
      });

      y += 12;
    });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Generado por Plusterra Hub', margin, pageH - 8);

    const filename = `Comparativo-Propiedades-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast.success('PDF exportado');
  };

  return (
    <MainLayout title="Comparativo de Propiedades" subtitle={`${selected.length} propiedades seleccionadas`}>
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={() => setShowAddSystem(true)} disabled={selected.length >= 5} className="gap-1">
          <Search className="h-4 w-4" /> Agregar del sistema
        </Button>
        <Button size="sm" variant="outline" onClick={() => { resetTempForm(); setShowAddTemp(true); }} disabled={selected.length >= 5} className="gap-1">
          <Plus className="h-4 w-4" /> Propiedad temporal
        </Button>
        {selected.length >= 2 && (
          <Button size="sm" onClick={exportPDF} className="gap-1">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        )}
        {selected.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="gap-1 text-destructive">
            <Trash2 className="h-4 w-4" /> Limpiar
          </Button>
        )}
      </div>

      {/* Comparison view */}
      {selected.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Comenzá tu comparativo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Agregá propiedades del sistema o creá propiedades temporales para comparar
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => setShowAddSystem(true)} className="gap-1">
              <Search className="h-4 w-4" /> Agregar del sistema
            </Button>
            <Button variant="outline" onClick={() => { resetTempForm(); setShowAddTemp(true); }} className="gap-1">
              <Plus className="h-4 w-4" /> Propiedad temporal
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-4 md:hidden">
            {selected.map(item => (
              <Card key={item.id} className="p-4 relative">
                <button
                  onClick={() => removeFromCompare(item.id)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 text-destructive/60 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate flex-1">{item.title}</h4>
                    {item.isTemp && <Badge variant="outline" className="text-[9px] shrink-0">TEMP</Badge>}
                  </div>
                  {!item.isTemp && <p className="text-[10px] text-muted-foreground font-mono">{item.code}</p>}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Precio</p>
                      <p className={`font-semibold ${winners['price'] === item.id ? 'text-success' : ''}`}>
                        {item.price > 0 ? formatPrice(item.price, item.currency) : '-'}
                        {winners['price'] === item.id && <Trophy className="inline h-3 w-3 ml-1" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Superficie</p>
                      <p className={`font-semibold ${winners['area'] === item.id ? 'text-success' : ''}`}>
                        {item.area_m2 > 0 ? `${item.area_m2} m²` : '-'}
                        {winners['area'] === item.id && <Trophy className="inline h-3 w-3 ml-1" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Dormitorios</p>
                      <p className={`font-semibold ${winners['bedrooms'] === item.id ? 'text-success' : ''}`}>
                        {item.bedrooms > 0 ? item.bedrooms : '-'}
                        {winners['bedrooms'] === item.id && <Trophy className="inline h-3 w-3 ml-1" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Baños</p>
                      <p className="font-semibold">{item.bathrooms > 0 ? item.bathrooms : '-'}</p>
                    </div>
                  </div>

                  {item.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{item.notes}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase p-3 w-32">Característica</th>
                  {selected.map(item => (
                    <th key={item.id} className="text-left p-3 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{item.title}</span>
                        {item.isTemp && <Badge variant="outline" className="text-[9px] shrink-0">TEMP</Badge>}
                        <button onClick={() => removeFromCompare(item.id)} className="p-0.5 hover:text-destructive ml-auto shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {!item.isTemp && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.code}</p>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Precio', render: (i: CompareItem) => i.price > 0 ? formatPrice(i.price, i.currency) : '-', winKey: 'price' },
                  { label: 'Ubicación', render: (i: CompareItem) => i.location || '-' },
                  { label: 'Superficie', render: (i: CompareItem) => i.area_m2 > 0 ? `${i.area_m2} m²` : '-', winKey: 'area' },
                  { label: 'Dormitorios', render: (i: CompareItem) => i.bedrooms > 0 ? `${i.bedrooms}` : '-', winKey: 'bedrooms' },
                  { label: 'Baños', render: (i: CompareItem) => i.bathrooms > 0 ? `${i.bathrooms}` : '-' },
                  { label: 'Notas', render: (i: CompareItem) => i.notes || '-' },
                ].map((row, ri) => (
                  <tr key={row.label} className={ri % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="p-3 text-xs font-medium text-muted-foreground uppercase">{row.label}</td>
                    {selected.map(item => {
                      const isWin = row.winKey && winners[row.winKey] === item.id;
                      return (
                        <td key={item.id} className={`p-3 text-sm ${isWin ? 'text-success font-semibold' : ''}`}>
                          {row.render(item)}
                          {isWin && <Trophy className="inline h-3 w-3 ml-1" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog: Add system property */}
      <Dialog open={showAddSystem} onOpenChange={setShowAddSystem}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Agregar propiedad del sistema</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, código o dirección..."
              value={propSearch}
              onChange={e => setPropSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {propsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filteredSystemProps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
            ) : filteredSystemProps.map(p => {
              const price = Number(p.rental_price) || Number(p.sale_price) || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => addSystemProperty(p)}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.property_code}</p>
                    </div>
                    {price > 0 && (
                      <span className="text-xs font-semibold text-primary shrink-0">
                        {formatPrice(price, p.currency || 'PYG')}
                      </span>
                    )}
                  </div>
                  {p.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.address}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {(p.bedrooms ?? 0) > 0 && <span><Bed className="inline h-3 w-3 mr-0.5" />{p.bedrooms}</span>}
                    {(p.bathrooms ?? 0) > 0 && <span><Bath className="inline h-3 w-3 mr-0.5" />{p.bathrooms}</span>}
                    {Number(p.area_m2) > 0 && <span><Square className="inline h-3 w-3 mr-0.5" />{p.area_m2}m²</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add temporary property */}
      <Dialog open={showAddTemp} onOpenChange={setShowAddTemp}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Propiedad temporal</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            Solo visible para vos, no aparece en el sistema ni en el catálogo.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título *</Label>
              <Input value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder="Ej: Depto 2D Barrio Jara" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Precio</Label>
                <Input type="number" min={0} value={tPrice} onChange={e => setTPrice(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Moneda</Label>
                <Select value={tCurrency} onValueChange={setTCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PYG">₲ Guaraníes</SelectItem>
                    <SelectItem value="USD">USD Dólares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ubicación</Label>
              <Input value={tLocation} onChange={e => setTLocation(e.target.value)} placeholder="Dirección o zona" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">m²</Label>
                <Input type="number" min={0} value={tArea} onChange={e => setTArea(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dorm.</Label>
                <Input type="number" min={0} value={tBed} onChange={e => setTBed(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baños</Label>
                <Input type="number" min={0} value={tBath} onChange={e => setTBath(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Input value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="Ej: De otro agente, oferta válida hasta..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddTemp(false)}>Cancelar</Button>
            <Button size="sm" disabled={!tTitle.trim()} onClick={addTempProperty}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PropertyComparison;
