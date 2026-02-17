import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useProperties } from '@/hooks/useProperties';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VisitFormDialog = ({ open, onOpenChange }: VisitFormDialogProps) => {
  const { user } = useAuth();
  const { data: clients } = useClients();
  const { data: properties } = useProperties();
  const [isPending, setIsPending] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    property_id: '',
    date: '',
    time: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.property_id || !form.date || !form.time) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setIsPending(true);

    const clientName = clients?.find(c => c.id === form.client_id)?.full_name || '';
    const propertyTitle = properties?.find(p => p.id === form.property_id)?.title || '';

    const { error } = await supabase.from('alerts').insert({
      title: `Visita: ${propertyTitle}`,
      message: `Visita agendada con ${clientName} el ${form.date} a las ${form.time}. ${form.notes}`,
      alert_type: 'visit',
      user_id: user!.id,
      due_date: form.date,
    });
    
    setIsPending(false);

    if (error) {
      toast.error('Error al agendar visita: ' + error.message);
      return;
    }

    toast.success('Visita agendada exitosamente');
    setForm({ client_id: '', property_id: '', date: '', time: '', notes: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Agendar Visita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cliente *</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="input-field" required>
              <option value="">Seleccionar cliente</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Propiedad *</label>
            <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
              className="input-field" required>
              <option value="">Seleccionar propiedad</option>
              {properties?.map(p => <option key={p.id} value={p.id}>{p.property_code} - {p.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fecha *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hora *</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="input-field" required />
            </div>
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
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Agendar Visita
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
