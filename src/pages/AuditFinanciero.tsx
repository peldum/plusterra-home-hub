import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import {
  useAuditFinanciero,
  ACCION_LABELS,
  ACCION_COLORS,
  ROL_LABELS,
  type AuditFinancieroRecord,
} from '@/hooks/useAuditFinanciero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ShieldCheck, Search, Download, Filter, Eye, ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';

const AuditFinanciero = () => {
  const { role } = useAuth();
  const { data: agents = [] } = useAgents();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userId, setUserId] = useState('');
  const [tipoAccion, setTipoAccion] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AuditFinancieroRecord | null>(null);

  const { data: records = [], isLoading } = useAuditFinanciero({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    userId: userId || undefined,
    tipoAccion,
    search: search || undefined,
  });

  const getAmount = (record: AuditFinancieroRecord) => {
    const v = record.valor_nuevo || record.valor_anterior;
    if (!v) return null;
    const amount = v.amount || v.monthly_rent || v.total_amount;
    if (!amount) return null;
    const currency = v.currency || 'PYG';
    return `${currency} ${Number(amount).toLocaleString('es-PY')}`;
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const logoImg = new Image();
    logoImg.src = '/logo-plusterra-contract.png';

    doc.setFontSize(18);
    doc.text('Auditoría Financiera — Plusterra', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 28);
    if (dateFrom || dateTo) {
      doc.text(`Período: ${dateFrom || '...'} al ${dateTo || '...'}`, 14, 34);
    }
    doc.text(`Total de registros: ${records.length}`, 14, 40);

    // Hash for integrity
    const contentHash = records.map(r => r.id).join('').substring(0, 32);
    doc.setFontSize(7);
    doc.text(`Hash de integridad: ${contentHash}`, 14, 46);

    let y = 54;
    doc.setFontSize(8);

    // Header
    doc.setFont(undefined as any, 'bold');
    doc.text('Fecha/Hora', 14, y);
    doc.text('Usuario', 60, y);
    doc.text('Rol', 110, y);
    doc.text('Acción', 140, y);
    doc.text('Detalle', 190, y);
    doc.setFont(undefined as any, 'normal');
    y += 6;

    records.forEach(r => {
      if (y > 190) { doc.addPage(); y = 20; }
      doc.text(format(new Date(r.fecha_hora), 'dd/MM/yy HH:mm'), 14, y);
      doc.text(r.usuario_nombre.substring(0, 25), 60, y);
      doc.text(ROL_LABELS[r.usuario_rol] || r.usuario_rol, 110, y);
      doc.text(ACCION_LABELS[r.tipo_accion] || r.tipo_accion, 140, y);
      doc.text(r.descripcion.substring(0, 60), 190, y);
      y += 5;
    });

    doc.save(`auditoria-financiera-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Diff view helper
  const renderDiff = (oldVal: any, newVal: any) => {
    if (!oldVal && !newVal) return null;
    const allKeys = new Set([
      ...Object.keys(oldVal || {}),
      ...Object.keys(newVal || {}),
    ]);
    const ignoredKeys = new Set(['id', 'created_at', 'updated_at', 'created_by']);
    const changedKeys = Array.from(allKeys).filter(k => {
      if (ignoredKeys.has(k)) return false;
      return JSON.stringify(oldVal?.[k]) !== JSON.stringify(newVal?.[k]);
    });

    if (changedKeys.length === 0) return <p className="text-xs text-muted-foreground">Sin cambios detectados</p>;

    return (
      <div className="space-y-2">
        {changedKeys.map(key => (
          <div key={key} className="grid grid-cols-3 gap-2 text-xs border-b border-border pb-1">
            <span className="font-medium text-foreground">{key}</span>
            <span className="text-destructive bg-destructive/5 px-2 py-0.5 rounded">
              {oldVal?.[key] !== undefined ? String(oldVal[key]) : '—'}
            </span>
            <span className="text-primary bg-primary/5 px-2 py-0.5 rounded">
              {newVal?.[key] !== undefined ? String(newVal[key]) : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" /> Auditoría Financiera
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro inmutable de todas las acciones financieras del sistema
          </p>
        </div>
        <Button onClick={exportPDF} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción o usuario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Desde</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Hasta</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" />
              </div>
            </div>
            <Select value={tipoAccion} onValueChange={setTipoAccion}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Tipo de acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="PAGO_REGISTRADO">Pago registrado</SelectItem>
                <SelectItem value="PAGO_EDITADO">Pago editado</SelectItem>
                <SelectItem value="PAGO_ELIMINADO">Pago eliminado</SelectItem>
                <SelectItem value="INGRESO_REGISTRADO">Ingreso registrado</SelectItem>
                <SelectItem value="EGRESO_REGISTRADO">Egreso registrado</SelectItem>
                <SelectItem value="ESTADO_CAMBIADO">Estado cambiado</SelectItem>
                <SelectItem value="CONTRATO_CREADO">Contrato creado</SelectItem>
                <SelectItem value="CONTRATO_EDITADO">Contrato editado</SelectItem>
                <SelectItem value="CONTRATO_ELIMINADO">Contrato eliminado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {agents.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando registros...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay registros de auditoría</p>
            </div>
          ) : (
            <DualScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="w-[100px]">Rol</TableHead>
                    <TableHead className="w-[160px]">Acción</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="w-[130px] text-right">Monto</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(record => {
                    const colorClass = ACCION_COLORS[record.tipo_accion] || '';
                    const amount = getAmount(record);
                    return (
                      <TableRow
                        key={record.id}
                        className={`cursor-pointer border-l-4 ${colorClass} hover:bg-muted/50 transition-colors`}
                        onClick={() => setSelectedRecord(record)}
                      >
                        <TableCell className="text-xs">
                          {format(new Date(record.fecha_hora), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {record.usuario_nombre}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {ROL_LABELS[record.usuario_rol] || record.usuario_rol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] ${
                              record.tipo_accion.includes('ELIMINADO') ? 'bg-destructive/10 text-destructive border-0' :
                              record.tipo_accion.includes('REGISTRADO') || record.tipo_accion.includes('CREADO') ? 'bg-primary/10 text-primary border-0' :
                              'bg-accent text-accent-foreground border-0'
                            }`}
                          >
                            {ACCION_LABELS[record.tipo_accion] || record.tipo_accion}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {record.descripcion}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {amount || '—'}
                        </TableCell>
                        <TableCell>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DualScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Detalle de Auditoría
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Fecha/Hora</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(selectedRecord.fecha_hora), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Usuario</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedRecord.usuario_nombre}
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {ROL_LABELS[selectedRecord.usuario_rol] || selectedRecord.usuario_rol}
                    </Badge>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Acción</p>
                  <p className="text-sm font-medium text-foreground">
                    {ACCION_LABELS[selectedRecord.tipo_accion] || selectedRecord.tipo_accion}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Entidad</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {selectedRecord.entidad_tipo}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Descripción</p>
                <p className="text-sm text-foreground">{selectedRecord.descripcion}</p>
              </div>

              {/* Diff view */}
              {(selectedRecord.valor_anterior || selectedRecord.valor_nuevo) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-foreground">Cambios realizados</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-1">
                    <span>Campo</span>
                    <span>Antes</span>
                    <span>Después</span>
                  </div>
                  {renderDiff(selectedRecord.valor_anterior, selectedRecord.valor_nuevo)}
                </div>
              )}

              {selectedRecord.ip_address && (
                <p className="text-[10px] text-muted-foreground">
                  IP: {selectedRecord.ip_address}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditFinanciero;
