import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitPortalLead } from '@/hooks/usePublicListings';
import type { PublicListing } from '@/hooks/usePublicListings';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PublicListing;
}

export const PortalReservationModal = ({ open, onOpenChange, property }: Props) => {
  const { submit } = useSubmitPortalLead();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', accepted: false });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name || name.length < 2) { toast.error('Nombre inválido'); return; }
    if (!phone || phone.length < 6 || !/^[0-9+\-() ]+$/.test(phone)) { toast.error('Teléfono inválido'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Email inválido'); return; }
    if (!form.accepted) { toast.error('Debés aceptar ser contactado'); return; }

    const lastSubmit = sessionStorage.getItem('_lead_ts');
    if (lastSubmit && Date.now() - Number(lastSubmit) < 30000) {
      toast.error('Esperá unos segundos antes de enviar otra solicitud');
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        property_id: property.id,
        captor_agent_id: property.captor_agent_id,
        visitor_name: name,
        visitor_phone: phone,
        email: email || undefined,
        visitor_message: form.message.trim() || `Solicitud de reserva - Disponible desde ${property.disponible_desde}`,
        channel: 'reserva-portal',
      });
      sessionStorage.setItem('_lead_ts', String(Date.now()));
      toast.success(`¡Listo! Te contactaremos antes del ${formatDate(property.disponible_desde!)}`);
      onOpenChange(false);
      setForm({ name: '', phone: '', email: '', message: '', accepted: false });
    } catch {
      toast.error('Error al enviar. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="w-5 h-5 text-[#FC5100]" />
            Reservar esta propiedad
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">
          Disponible desde <span className="font-semibold text-[#FC5100]">{formatDate(property.disponible_desde!)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <input
            type="text"
            placeholder="Nombre completo *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]"
            required
            maxLength={100}
          />
          <input
            type="tel"
            placeholder="Teléfono *"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]"
            required
            maxLength={20}
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]"
            maxLength={255}
          />
          <textarea
            placeholder="¿Algún comentario? (opcional)"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100] resize-none"
            maxLength={500}
          />
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.accepted}
              onChange={e => setForm(f => ({ ...f, accepted: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#FC5100]"
            />
            <span className="text-xs text-gray-600">Acepto que me contacten para coordinar la reserva</span>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Enviando...' : 'Enviar solicitud de reserva'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
