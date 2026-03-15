import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ONESIGNAL_APP_ID = 'f92acc0b-91dd-4dde-b710-fdd755857779';

let initAttempted = false;
let sdkReady = false;

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

const isPublicPortalPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/portal' || path.startsWith('/portal/');
};

function ensureInit(): void {
  if (typeof window === 'undefined' || initAttempted || sdkReady) return;
  initAttempted = true;

  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
        sdkReady = true;
        console.log('[OneSignal] ✅ Inicializado correctamente');
      } catch (err) {
        console.warn('[OneSignal] ⚠️ Init falló (app sigue normal):', err);
      }
    });
  } catch (err) {
    console.warn('[OneSignal] ⚠️ Deferred push falló:', err);
  }
}

export const useOneSignal = () => {
  const { user } = useAuth();
  const didLogin = useRef(false);
  const initialized = useRef(false);
  const loginInFlight = useRef(false);
  const mountedRef = useRef(true);
  const subscriptionListenerBound = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Init only for authenticated backoffice usage (avoid public-portal side effects)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.id) return;
    if (isPublicPortalPath()) return;
    if (initialized.current) return;

    initialized.current = true;

    try {
      ensureInit();
    } catch (err) {
      console.warn('[OneSignal] ⚠️ Error en init defensivo:', err);
    }
  }, [user?.id]);

  // Login user when SDK is ready (with bounded retry)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!user?.id) {
      didLogin.current = false;
      loginInFlight.current = false;
      initialized.current = false;
      subscriptionListenerBound.current = false;
      return;
    }

    if (isPublicPortalPath()) return;
    if (didLogin.current || loginInFlight.current) return;

    let isMounted = true;

    const loginUser = async () => {
      if (!isMounted || !mountedRef.current) return;
      if (didLogin.current || loginInFlight.current) return;
      if (!sdkReady || !window.OneSignal) return;

      loginInFlight.current = true;

      try {
        const OS = window.OneSignal;
        await OS.login(user.id);
        if (!isMounted || !mountedRef.current) return;

        didLogin.current = true;
        console.log('[OneSignal] 🔗 External ID:', user.id);

        const perm = await OS.Notifications.requestPermission();
        console.log('[OneSignal] 🔔 Permiso:', perm);

        const subId = OS.User?.PushSubscription?.id;
        if (subId) {
          await savePushToken(user.id, subId);
          console.log('[OneSignal] ✅ Suscrito:', subId);
        }

        if (!subscriptionListenerBound.current) {
          OS.User?.PushSubscription?.addEventListener('change', async (event: any) => {
            try {
              const newId = event.current?.id;
              if (newId) await savePushToken(user.id, newId);
            } catch (err) {
              console.warn('[OneSignal] ⚠️ Error en change listener:', err);
            }
          });
          subscriptionListenerBound.current = true;
        }
      } catch (err) {
        console.warn('[OneSignal] ⚠️ Login/suscripción falló (app sigue normal):', err);
      } finally {
        if (isMounted) loginInFlight.current = false;
      }
    };

    try {
      ensureInit();
    } catch (err) {
      console.warn('[OneSignal] ⚠️ Error iniciando SDK antes de login:', err);
    }

    const poll = window.setInterval(() => {
      void loginUser();
      if (didLogin.current) window.clearInterval(poll);
    }, 600);

    const stopPoll = window.setTimeout(() => {
      window.clearInterval(poll);
    }, 12_000);

    void loginUser();

    return () => {
      isMounted = false;
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
    };
  }, [user?.id]);
};

async function savePushToken(userId: string, playerId: string) {
  try {
    await supabase
      .from('user_push_tokens' as any)
      .upsert(
        { user_id: userId, onesignal_player_id: playerId, updated_at: new Date().toISOString() } as any,
        { onConflict: 'user_id,onesignal_player_id' }
      );
  } catch (err) {
    console.warn('[OneSignal] Token save failed:', err);
  }
}
