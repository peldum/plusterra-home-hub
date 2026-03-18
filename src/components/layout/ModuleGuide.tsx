import { useState, useEffect } from 'react';
import { Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleGuideProps {
  moduleKey: string;
  title?: string;
  tips: string[];
  /** Extra class on the container */
  className?: string;
}

/**
 * Collapsible contextual help banner — Stripe-style.
 * Remembers dismiss state per module in localStorage.
 */
export const ModuleGuide = ({ moduleKey, title = '¿Qué puedo hacer aquí?', tips, className }: ModuleGuideProps) => {
  const storageKey = `guide_dismissed_${moduleKey}`;
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setDismissed(saved === '1');
  }, [storageKey]);

  if (dismissed || tips.length === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        'relative mb-4 rounded-xl border border-primary/20 bg-primary/5 transition-all duration-200',
        className,
      )}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
      >
        <Info className="w-4 h-4 shrink-0" />
        <span className="flex-1">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="No volver a mostrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Entendido, no mostrar más
          </button>
        </div>
      )}
    </div>
  );
};
