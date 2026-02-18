/**
 * SoftLockGuard — Wrapper que deshabilita acciones restringidas para agentes morosos.
 *
 * Uso:
 *   <SoftLockGuard>
 *     <button onClick={...}>WhatsApp</button>
 *   </SoftLockGuard>
 *
 * Si el agente está moroso:
 *   - El botón se ve deshabilitado (opacidad reducida, cursor not-allowed)
 *   - Al hacer clic, no ejecuta la acción
 *   - Muestra tooltip con el mensaje de acceso limitado
 *
 * Si el agente está al día, renderiza los children sin modificaciones.
 */
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LOCK_MESSAGE = 'Acceso limitado por canon mensual pendiente';

interface SoftLockGuardProps {
  children: React.ReactNode;
  /** Clase CSS adicional para el wrapper cuando está bloqueado */
  lockedClassName?: string;
}

export const SoftLockGuard = ({ children, lockedClassName }: SoftLockGuardProps) => {
  const { isLocked } = useAgentSoftLock();

  if (!isLocked) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`pointer-events-none opacity-40 cursor-not-allowed select-none ${lockedClassName || ''}`}
            aria-disabled="true"
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
          {LOCK_MESSAGE}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
