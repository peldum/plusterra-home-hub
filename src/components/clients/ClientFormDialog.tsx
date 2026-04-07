import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { Loader2 } from 'lucide-react';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: { id: string; full_name: string; email?: string; phone?: string; birth_date?: string; client_type?: string; notes?: string } | null;
}

const clientTypes = [
  { value: 'inquilino', label: 'Inquilino' },
  { value: 'propietario', label: 'Propietario' },
  { value: 'comprador', label: 'Comprador' },
];

export const ClientFormDialog = ({ open, onOpenChange, editData }: ClientFormDialogProps) => {
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isEditing = !!editData;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    client_type: 'inquilino',
    notes: '',
  });

  useEffect(() => {
    if (editData) {
      setForm({
        full_name: editData.full_name || '',
        email: editData.email || '',
        phone: editData.phone || '',
        birth_date: editData.birth_date || '',
        client_type: editData.client_type || 'inquilino',
        notes: editData.notes || '',
      });
    } else {
      setForm({ full_name: '', email: '', phone: '', birth_date: '', client_type: 'inquilino', notes: '' });
    }
  }, [editData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: editData!.id,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        client_type: form.client_type,
        notes: form.notes || null,
      });
    } else {
      await createMutation.mutateAsync({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        client_type: form.client_type,
        notes: form.notes || null,
      } as any);
    }

    setForm({ full_name: '', email: '', phone: '', birth_date: '', client_type: 'inquilino', notes: '' });
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre completo *</label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre y apellido" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+595 9XX XXX XXX" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Fecha de cumpleaños</label>
            <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo de cliente</label>
            <Select value={form.client_type} onValueChange={v => setForm(f => ({ ...f, client_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {clientTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notas</label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones..." rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditing ? 'Guardar' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
