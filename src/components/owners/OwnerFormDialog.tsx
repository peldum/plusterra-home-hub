import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateOwner, useUpdateOwner, Owner } from '@/hooks/useOwners';
import { Loader2, UserCheck } from 'lucide-react';

interface OwnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner?: Owner | null;
  onCreated?: (id: string) => void;
}

const emptyForm = {
  full_name: '',
  document_type: 'CI',
  document_number: '',
  email: '',
  phone: '',
  birth_date: '',
  address: '',
  notes: '',
};

export const OwnerFormDialog = ({ open, onOpenChange, owner }: OwnerFormDialogProps) => {
  const createMutation = useCreateOwner();
  const updateMutation = useUpdateOwner();
  const isEditing = !!owner;
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (owner) {
      setForm({
        full_name: owner.full_name || '',
        document_type: owner.document_type || 'CI',
        document_number: owner.document_number || '',
        email: owner.email || '',
        phone: owner.phone || '',
        birth_date: (owner as any).birth_date || '',
        address: owner.address || '',
        notes: owner.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [owner, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;

    const payload = {
      full_name: form.full_name,
      document_type: form.document_type || null,
      document_number: form.document_number || null,
      email: form.email || null,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      address: form.address || null,
      notes: form.notes || null,
    };

    if (isEditing && owner) {
      await updateMutation.mutateAsync({ id: owner.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <UserCheck className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Propietario' : 'Nuevo Propietario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre completo *</label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="input-field"
              placeholder="Nombre y apellido"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo doc.</label>
              <select
                value={form.document_type}
                onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}
                className="input-field"
              >
                <option value="CI">CI</option>
                <option value="RUC">RUC</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Número de documento</label>
              <input
                value={form.document_number}
                onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))}
                className="input-field"
                placeholder="1.234.567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="input-field"
              placeholder="+595 9XX XXX XXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Fecha de cumpleaños</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Dirección</label>
            <input
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="input-field"
              placeholder="Calle, número, ciudad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field min-h-[60px] resize-y"
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear Propietario'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
