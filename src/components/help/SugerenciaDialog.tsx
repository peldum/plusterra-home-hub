import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCreateSugerencia } from '@/hooks/useSugerencias';
import { Lightbulb } from 'lucide-react';

const CATEGORIAS = [
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

export const SugerenciaDialog = ({ open, onOpenChange }: Props) => {
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const create = useCreateSugerencia();

  const handleSubmit = () => {
    if (!categoria || !descripcion.trim()) return;
    create.mutate({ categoria, descripcion: descripcion.trim(), prioridad }, {
      onSuccess: () => {
        onOpenChange(false);
        setCategoria('');
        setDescripcion('');
        setPrioridad('media');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-secondary" />
            ¿Qué mejorarías o agregarías?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Categoría</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue placeholder="Seleccioná una categoría" /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value.slice(0, 500))}
              placeholder="Describí tu sugerencia..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">{descripcion.length}/500</p>
          </div>
          <div>
            <Label>Prioridad</Label>
            <Select value={prioridad} onValueChange={setPrioridad}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!categoria || !descripcion.trim() || create.isPending}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            Enviar sugerencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
