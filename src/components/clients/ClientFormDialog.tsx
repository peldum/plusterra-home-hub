import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateClient } from '@/hooks/useClients';
import { Loader2 } from 'lucide-react';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const clientTypes = [
  { value: 'inquilino', label: 'Inquilino' },
  { value: 'propietario', label: 'Propietario' },
  { value: 'comprador', label: 'Comprador' },
];

export const ClientFormDialog = ({ open, onOpenChange }: ClientFormDialogProps) => {
  const createMutation = useCreateClient();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    client_type: 'inquilino',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;

    await createMutation.mutateAsync({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      client_type: form.client_type,
      notes: form.notes || null,
    } as any);

    setForm({ full_name: '', email: '', phone: '', birth_date: '', client_type: 'inquilino', notes: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nuevo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre completo *</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="input-field" placeholder="Nombre y apellido" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field" placeholder="correo@ejemplo.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="input-field" placeholder="+595 9XX XXX XXX" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo de cliente</label>
            <select value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}
              className="input-field">
              {clientTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field min-h-[60px] resize-y" placeholder="Observaciones..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Cliente
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
