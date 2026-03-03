import { useState } from 'react';
import { PortalPropertyCard } from '@/components/portal/PortalPropertyCard';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicListing } from '@/hooks/usePublicListings';
import { AgentQRDialog } from './AgentQRDialog';

type Filter = 'all' | 'rent' | 'sale' | 'temporary';

interface Props {
  listings: PublicListing[];
  agentName: string;
}

export const AgentListingsGrid = ({ listings, agentName }: Props) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [showQR, setShowQR] = useState(false);

  const filtered = listings.filter(p => {
    if (filter === 'all') return true;
    const hasRent = Number(p.rental_price) > 0;
    const hasSale = Number(p.sale_price) > 0;
    if (filter === 'rent') return hasRent && p.rental_period !== 'daily';
    if (filter === 'sale') return hasSale;
    if (filter === 'temporary') return hasRent && p.rental_period === 'daily';
    return true;
  });

  const hasRent = listings.some(p => Number(p.rental_price) > 0 && p.rental_period !== 'daily');
  const hasSale = listings.some(p => Number(p.sale_price) > 0);
  const hasTemp = listings.some(p => Number(p.rental_price) > 0 && p.rental_period === 'daily');
  const showFilters = [hasRent, hasSale, hasTemp].filter(Boolean).length > 1;

  const tabs: { key: Filter; label: string; show: boolean }[] = [
    { key: 'all', label: `Todas (${listings.length})`, show: true },
    { key: 'rent', label: 'Alquiler', show: hasRent },
    { key: 'sale', label: 'Venta', show: hasSale },
    { key: 'temporary', label: 'Temporal', show: hasTemp },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" />
          Propiedades
        </h2>
        <div className="flex items-center gap-2">
          {showFilters && (
            <div className="flex bg-muted rounded-lg p-0.5">
              {tabs.filter(t => t.show).map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filter === t.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowQR(true)}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            title="Compartir QR"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No hay propiedades en esta categoría.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => <PortalPropertyCard key={p.id} property={p} />)}
        </div>
      )}

      <AgentQRDialog open={showQR} onOpenChange={setShowQR} agentName={agentName} />
    </div>
  );
};
