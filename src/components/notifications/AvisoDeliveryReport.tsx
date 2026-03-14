import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAvisoLecturas } from '@/hooks/useNotifications';
import { useAgents } from '@/hooks/useAgents';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';

interface AvisoDeliveryReportProps {
  open: boolean;
  onClose: () => void;
  aviso: {
    id: string;
    titulo: string;
    created_at: string;
    autor_nombre?: string;
  } | null;
}

export const AvisoDeliveryReport = ({ open, onClose, aviso }: AvisoDeliveryReportProps) => {
  const { role } = useAuth();
  const { data: lecturas = [] } = useAvisoLecturas(aviso?.id ?? null);
  const { data: agents = [] } = useAgents();

  if (role !== 'superadmin' && role !== 'admin') return null;

  // All team members (agents + any profiles)
  const allUsers = agents.map((a: any) => ({
    id: a.id,
    name: a.full_name || 'Sin nombre',
  }));

  const readUserIds = new Set(lecturas.map((l: any) => l.user_id));
  const readUsers = lecturas.map((l: any) => ({
    id: l.user_id,
    name: l.user_name,
    visto_at: l.visto_at,
  }));
  const unreadUsers = allUsers.filter((u: any) => !readUserIds.has(u.id));

  const totalDest = allUsers.length;
  const totalVisto = readUsers.length;

  const exportPDF = () => {
    if (!aviso) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Entrega — Aviso', 14, 20);
    doc.setFontSize(11);
    doc.text(`Aviso: ${aviso.titulo}`, 14, 32);
    doc.text(`Enviado: ${format(new Date(aviso.created_at), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 40);
    doc.text(`Autor: ${aviso.autor_nombre || 'Sistema'}`, 14, 48);
    doc.text(`Visto por: ${totalVisto} de ${totalDest}`, 14, 56);

    let y = 68;
    doc.setFontSize(10);
    doc.text('VISTOS:', 14, y); y += 8;
    readUsers.forEach((u) => {
      doc.text(`✓✓ ${u.name} — ${format(new Date(u.visto_at), "dd/MM HH:mm", { locale: es })}`, 18, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    y += 5;
    doc.text('PENDIENTES:', 14, y); y += 8;
    unreadUsers.forEach((u: any) => {
      doc.text(`✗ ${u.name} — No visto aún`, 18, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save(`reporte-aviso-${aviso.titulo.substring(0, 20)}.pdf`);
  };

  const exportExcel = () => {
    if (!aviso) return;
    const rows = [
      ...readUsers.map(u => ({
        Usuario: u.name,
        Estado: 'Visto',
        'Fecha/Hora': format(new Date(u.visto_at), "dd/MM/yyyy HH:mm", { locale: es }),
      })),
      ...unreadUsers.map((u: any) => ({
        Usuario: u.name,
        Estado: 'No visto',
        'Fecha/Hora': '',
      })),
    ];
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Entregas');
    writeFile(wb, `reporte-aviso-${aviso.titulo.substring(0, 20)}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Reporte de Entrega</DialogTitle>
        </DialogHeader>

        {aviso && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm font-semibold text-foreground">{aviso.titulo}</p>
              <p className="text-xs text-muted-foreground">
                Enviado: {format(new Date(aviso.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                {aviso.autor_nombre && ` · Por: ${aviso.autor_nombre}`}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Visto por {totalVisto} de {totalDest}
                </Badge>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <Download className="w-4 h-4 mr-1" /> Excel
              </Button>
            </div>

            {/* Seen */}
            {readUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Visto ({readUsers.length})
                </p>
                <div className="space-y-1.5">
                  {readUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-primary/5">
                      <div className="flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">{u.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(u.visto_at), "dd/MM HH:mm", { locale: es })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not seen */}
            {unreadUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pendiente ({unreadUsers.length})
                </p>
                <div className="space-y-1.5">
                  {unreadUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/30">
                      <X className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{u.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">No visto</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
