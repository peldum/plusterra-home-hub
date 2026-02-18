/**
 * SoftLockBanner — Banner discreto para agentes con acceso limitado por canon pendiente.
 * Solo se muestra si el agente está moroso (isLocked = true).
 * No invasivo: aparece en la parte superior del contenido, se puede ignorar.
 */
import { AlertTriangle } from 'lucide-react';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';

export const SoftLockBanner = () => {
  const { isLocked } = useAgentSoftLock();

  if (!isLocked) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <p className="text-sm font-medium">
        Tu acceso está limitado por pago pendiente.{' '}
        <span className="font-normal opacity-80">Regularizá tu canon mensual para operar normalmente.</span>
      </p>
    </div>
  );
};
