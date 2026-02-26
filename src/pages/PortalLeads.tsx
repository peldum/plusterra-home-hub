import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Phone, MessageCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  nuevo: { label: 'Nuevo', variant: 'default' },
  contactado: { label: 'Contactado', variant: 'secondary' },
  visita: { label: 'Visita', variant: 'outline' },
  negociacion: { label: 'Negociación', variant: 'secondary' },
  cerrado: { label: 'Cerrado', variant: 'default' },
  caido: { label: 'Caído', variant: 'destructive' },
};

const PortalLeads = () => {
  const { role, session } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isAgent = role === 'agent';

  const { data: leads, isLoading } = useQuery({
    queryKey: ['portal-leads', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('portal_leads')
        .select('*, properties:property_id(title, property_code)')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('portal_leads')
        .update({ status, last_action_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-leads'] });
      toast.success('Estado actualizado');
    },
  });

  return (
    <MainLayout title="Portal — Leads" subtitle="Contactos recibidos desde el portal público">
      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !leads?.length ? (
        <Card className="p-12 text-center text-muted-foreground">No hay leads registrados.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead: any) => {
                const st = statusLabels[lead.status] ?? statusLabels.nuevo;
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(lead.created_at), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{lead.visitor_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.visitor_phone}</span>
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(lead as any).properties?.property_code ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={v => updateStatus.mutate({ id: lead.id, status: v })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const phone = lead.visitor_phone?.replace(/\D/g, '');
                          window.open(`https://wa.me/${phone}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </MainLayout>
  );
};

export default PortalLeads;
