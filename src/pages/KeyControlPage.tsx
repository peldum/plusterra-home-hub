/**
 * KeyControlPage — Vista global de llaves para Admin, SuperAdmin y Secretaría.
 * Muestra propiedades con llaves en circulación y permite registrar devoluciones.
 */
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useActiveKeyMovements } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from '@/components/keys/KeyStatusBadge';
import { KeyHistoryDialog } from '@/components/keys/KeyHistoryDialog';
import { KeyReturnDialog } from '@/components/keys/KeyReturnDialog';
import { ExternalKeyDialog } from '@/components/keys/ExternalKeyDialog';
import { computeKeyStatus } from '@/hooks/useKeyMovements';
import { Key, Loader2, Users, Wrench, ArrowDownCircle, History, Building2 } from 'lucide-react';

export default function KeyControlPage() {
  const { data: activeMovements, isLoading } = useActiveKeyMovements();

  const [historyProp, setHistoryProp] = useState<{ id: string; title: string } | null>(null);
  const [returnData, setReturnData] = useState<{ id: string; title: string } | null>(null);
  const [externalProp, setExternalProp] = useState<{ id: string; title: string; type: 'AGENTE_EXTERNO' | 'MANTENIMIENTO' } | null>(null);

  return (
    <MainLayout title="Control de Llaves" subtitle="Estado en tiempo real de llaves en circulación">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Page content header */}
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Todas las llaves en circulación</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold text-foreground">{activeMovements?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Llaves fuera</p>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold text-warning">
              {activeMovements?.filter(m => m.movement_type === 'AGENTE_INTERNO').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Con agentes</p>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold text-info">
              {activeMovements?.filter(m => m.movement_type !== 'AGENTE_INTERNO').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Terceros</p>
          </div>
        </div>

        {/* Active movements list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeMovements && activeMovements.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Llaves en circulación</h2>
            {activeMovements.map((m) => {
              const status = computeKeyStatus(m);
              return (
                <div key={m.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-muted flex-shrink-0">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {m.property_title || 'Propiedad'}
                      </p>
                      <KeyStatusBadge
                        status={status.status}
                        responsibleName={status.responsibleName}
                        since={status.since}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                    <button
                      onClick={() => setHistoryProp({ id: m.property_id, title: m.property_title || 'Propiedad' })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                    >
                      <History className="w-3 h-3" /> Historial
                    </button>
                    <button
                      onClick={() => setReturnData({ id: m.property_id, title: m.property_title || 'Propiedad' })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 text-xs hover:bg-success/20 transition-colors"
                    >
                      <ArrowDownCircle className="w-3 h-3" /> Devolución
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Key className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">Todas las llaves en oficina</p>
            <p className="text-sm text-muted-foreground mt-1">No hay llaves en circulación actualmente</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {historyProp && (
        <KeyHistoryDialog
          open={!!historyProp}
          onOpenChange={v => !v && setHistoryProp(null)}
          propertyId={historyProp.id}
          propertyTitle={historyProp.title}
        />
      )}
      {returnData && (
        <KeyReturnDialog
          open={!!returnData}
          onOpenChange={v => !v && setReturnData(null)}
          propertyId={returnData.id}
          propertyTitle={returnData.title}
          currentStatus={computeKeyStatus(
            activeMovements?.find(m => m.property_id === returnData.id) ?? null
          )}
        />
      )}
      {externalProp && (
        <ExternalKeyDialog
          open={!!externalProp}
          onOpenChange={v => !v && setExternalProp(null)}
          propertyId={externalProp.id}
          propertyTitle={externalProp.title}
          defaultType={externalProp.type}
        />
      )}
    </MainLayout>
  );
}
