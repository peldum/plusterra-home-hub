import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useInventory, useCreateInventoryItem, useDeleteInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package, Plus, Trash2, Edit, Building2, FileText, Sofa, Tv, Flower2, MoreHorizontal,
} from 'lucide-react';

const categoryConfig: Record<string, { label: string; icon: typeof Sofa }> = {
  furniture: { label: 'Mobiliario', icon: Sofa },
  appliance: { label: 'Electrodoméstico', icon: Tv },
  decoration: { label: 'Decoración', icon: Flower2 },
  other: { label: 'Otro', icon: MoreHorizontal },
};

const conditionLabels: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excelente', color: 'bg-success/10 text-success' },
  good: { label: 'Bueno', color: 'bg-info/10 text-info' },
  used: { label: 'Usado', color: 'bg-warning/10 text-warning' },
  damaged: { label: 'Dañado', color: 'bg-destructive/10 text-destructive' },
};

const Inventory = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const { data: items, isLoading } = useInventory(filterProperty === 'all' ? undefined : filterProperty);
  const { data: properties } = useProperties();
  const { data: contracts } = useContracts();
  const createItem = useCreateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const { isAdmin } = useAuth();

  const [form, setForm] = useState({
    property_id: '',
    contract_id: '',
    item_name: '',
    category: 'furniture',
    condition_delivery: 'good',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.property_id || !form.item_name) return;
    createItem.mutate({
      property_id: form.property_id,
      contract_id: form.contract_id || null,
      item_name: form.item_name,
      category: form.category,
      condition_delivery: form.condition_delivery,
      notes: form.notes || undefined,
    }, {
      onSuccess: () => {
        setFormOpen(false);
        setForm({ property_id: '', contract_id: '', item_name: '', category: 'furniture', condition_delivery: 'good', notes: '' });
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este ítem del inventario?')) {
      deleteItem.mutate(id);
    }
  };

  const activeContracts = contracts?.filter(c => ['active', 'near_expiration'].includes(c.status || '')) || [];

  return (
    <MainLayout
      title="Inventario"
      subtitle="Gestión de inventario de propiedades amobladas"
      action={{ label: 'Agregar Ítem', onClick: () => setFormOpen(true) }}
    >
      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-64">
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por propiedad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las propiedades</SelectItem>
              {properties?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Cargando inventario...</p>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Sin ítems de inventario</p>
          <p className="text-sm text-muted-foreground mt-1">Agregá ítems para llevar control del inventario.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {['Ítem', 'Categoría', 'Propiedad', 'Contrato', 'Estado Entrega', 'Estado Devolución', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(item => {
                  const cat = categoryConfig[item.category] || categoryConfig.other;
                  const condDel = conditionLabels[item.condition_delivery || 'good'];
                  const condRet = item.condition_return ? conditionLabels[item.condition_return] : null;

                  return (
                    <tr key={item.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-secondary/10">
                            <cat.icon className="w-4 h-4 text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.item_name}</p>
                            {item.notes && <p className="text-xs text-muted-foreground truncate max-w-48">{item.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs">{cat.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{item.properties?.title || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.contracts ? (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-foreground">{item.contracts.tenant_name || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`text-xs ${condDel?.color}`}>{condDel?.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {condRet ? (
                          <Badge className={`text-xs ${condRet.color}`}>{condRet.label}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {(isAdmin) && (
                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-secondary" />
              Agregar Ítem al Inventario
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Propiedad *</Label>
              <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar propiedad" /></SelectTrigger>
                <SelectContent>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Contrato (opcional)</Label>
              <Select value={form.contract_id} onValueChange={v => setForm(f => ({ ...f, contract_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sin contrato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin contrato</SelectItem>
                  {activeContracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.properties?.title || '—'} · {c.clients?.full_name || c.tenant_name || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nombre del Ítem *</Label>
              <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="Ej: Sofá 3 cuerpos" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="furniture">Mobiliario</SelectItem>
                    <SelectItem value="appliance">Electrodoméstico</SelectItem>
                    <SelectItem value="decoration">Decoración</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condición</Label>
                <Select value={form.condition_delivery} onValueChange={v => setForm(f => ({ ...f, condition_delivery: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excelente</SelectItem>
                    <SelectItem value="good">Bueno</SelectItem>
                    <SelectItem value="used">Usado</SelectItem>
                    <SelectItem value="damaged">Dañado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones..." />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!form.property_id || !form.item_name || createItem.isPending}>
                {createItem.isPending ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Inventory;