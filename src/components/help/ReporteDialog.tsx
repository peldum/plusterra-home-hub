import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCreateReporte } from '@/hooks/useReportesSoporte';
import { Wrench } from 'lucide-react';

const SECCIONES = [
  'Propiedades',
  'Clientes / Leads',
  'Portal público',
  'App mobile',
  'Comunicaciones',
  'Otro',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReporteDialog = ({ open, onOpenChange }: Props) => {
  const [seccion, setSeccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [urgencia, setUrgencia] = useState('normal');
  const create = useCreateReporte();

  const handleSubmit = () => {
    if (!seccion || !descripcion.trim()) return;
    create.mutate({ seccion, descripcion: descripcion.trim(), urgencia }, {
      onSuccess: () => {
        onOpenChange(false);
        setSeccion('');
        setDescripcion('');
        setUrgencia('normal');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-destructive" />
            ¿Qué está fallando?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sección donde ocurre</Label>
            <Select value={seccion} onValueChange={setSeccion}>
              <SelectTrigger><SelectValue placeholder="Seleccioná la sección" /></SelectTrigger>
              <SelectContent>
                {SECCIONES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descripción del problema</Label>
            <Textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Describí qué está fallando..."
              rows={4}
            />
          </div>
          <div>
            <Label>Urgencia</Label>
            <Select value={urgencia} onValueChange={setUrgencia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!seccion || !descripcion.trim() || create.isPending}
            variant="destructive"
          >
            Enviar reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
