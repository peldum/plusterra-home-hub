import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRegisterExternalKey } from '@/hooks/useKeyMovements';
import { Users, Wrench, Key } from 'lucide-react';

type FlowType = 'AGENTE_EXTERNO' | 'MANTENIMIENTO';

interface ExternalKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  defaultType?: FlowType;
}

const WORK_TYPES = ['Plomería', 'Electricidad', 'Pintura', 'Albañilería', 'Cerrajería', 'Limpieza', 'Inspección', 'Otro'];

export const ExternalKeyDialog = ({ open, onOpenChange, propertyId, propertyTitle, defaultType = 'AGENTE_EXTERNO' }: ExternalKeyDialogProps) => {
  const [type, setType] = useState<FlowType>(defaultType);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notes, setNotes] = useState('');

  const register = useRegisterExternalKey();

  const reset = () => {
    setName(''); setCompany(''); setDocument(''); setPhone('');
    setWorkType(''); setMotivo(''); setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !document.trim()) return;
    await register.mutateAsync({
      propertyId,
      movementType: type,
      externalName: name.trim(),
      externalCompany: company.trim() || undefined,
      externalDocument: document.trim(),
      externalPhone: phone.trim() || undefined,
      workType: workType.trim() || undefined,
      motivo: motivo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Entrega a Tercero
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{propertyTitle}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => setType('AGENTE_EXTERNO')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                type === 'AGENTE_EXTERNO' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Users className="w-4 h-4" /> Agente Externo
            </button>
            <button type="button"
              onClick={() => setType('MANTENIMIENTO')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                type === 'MANTENIMIENTO' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Wrench className="w-4 h-4" /> Mantenimiento
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Nombre y Apellido *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
                maxLength={100}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Empresa / Inmobiliaria</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Ej: RE/MAX Paraguay"
                maxLength={100}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Documento (CI) *</label>
              <input
                value={document}
                onChange={e => setDocument(e.target.value)}
                placeholder="Ej: 4.567.890"
                required
                maxLength={20}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Teléfono</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: 0981 234 567"
                maxLength={30}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {type === 'MANTENIMIENTO' && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Tipo de trabajo</label>
                <select
                  value={workType}
                  onChange={e => setWorkType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Seleccionar...</option>
                  {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Motivo</label>
              <input
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Visita para cotizar, mostrar propiedad..."
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Notas adicionales</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones..."
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={register.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {register.isPending ? 'Registrando...' : 'Registrar Entrega'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
