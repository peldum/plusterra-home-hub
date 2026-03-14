import { useOneSignal } from '@/hooks/useOneSignal';

export const OneSignalProvider = ({ children }: { children?: React.ReactNode }) => {
  try {
    useOneSignal();
  } catch (err) {
    console.warn('[OneSignalProvider] Error capturado, app continúa:', err);
  }
  return <>{children}</> ;
};
