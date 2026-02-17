import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ContractFiltersProps {
  statusFilter: string;
  typeFilter: string;
  onStatusChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onExport: (format: 'xlsx' | 'ods' | 'pdf') => void;
}

export const ContractFilters = ({ statusFilter, typeFilter, onStatusChange, onTypeChange, onExport }: ContractFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="draft">Borrador</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="near_expiration">Por vencer</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
          <SelectItem value="cancelled">Cancelado</SelectItem>
          <SelectItem value="terminated">Terminado</SelectItem>
          <SelectItem value="renewed">Renovado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="rental">Alquiler</SelectItem>
          <SelectItem value="temporary_rental">Alq. Temporal</SelectItem>
          <SelectItem value="sale">Venta</SelectItem>
          <SelectItem value="property_management">Administración</SelectItem>
          <SelectItem value="exclusivity">Exclusividad</SelectItem>
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onExport('xlsx')}>
          <Download className="w-4 h-4 mr-1" /> XLSX
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('ods')}>
          <Download className="w-4 h-4 mr-1" /> ODS
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
          <Download className="w-4 h-4 mr-1" /> PDF
        </Button>
      </div>
    </div>
  );
};
