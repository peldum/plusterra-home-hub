import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ONESIGNAL_APP_ID = 'f92acc0b-91dd-4dde-b710-fdd755857779';

let initialized = false;
let initPromise: Promise<void> | null = null;

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

function getOneSignal(): any | null {
  return window.OneSignal ?? null;
}

function initOneSignal(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
        initialized = true;
        console.log('[OneSignal] ✅ Inicializado correctamente');
        resolve();
      } catch (err) {
        console.error('[OneSignal] ❌ Error al inicializar:', err);
        resolve();
      }
    });
  });

  return initPromise;
}

export const useOneSignal = () => {
  const { user } = useAuth();
  const prevUserId = useRef<string | null>(null);

  // Init SDK once
  useEffect(() => {
    initOneSignal();
  }, []);

  // Subscribe user after login
  useEffect(() => {
    if (!user || !initialized) return;
    if (prevUserId.current === user.id) return;
    prevUserId.current = user.id;

    const subscribeUser = async () => {
      const OS = getOneSignal();
      if (!OS) {
        console.warn('[OneSignal] SDK no disponible');
        return;
      }

      try {
        // Set external user id
        await OS.login(user.id);
        console.log('[OneSignal] 🔗 External ID set:', user.id);

        // Request permission
        const permission = await OS.Notifications.requestPermission();
        console.log('[OneSignal] 🔔 Permiso:', permission);

        // Get subscription id
        const subId = OS.User?.PushSubscription?.id;
        console.log('[OneSignal] 📱 Subscription ID:', subId || 'pendiente');

        if (subId) {
          await savePushToken(user.id, subId);
          console.log('[OneSignal] ✅ Usuario suscrito:', subId);
        }

        // Listen for future subscription changes
        OS.User.PushSubscription.addEventListener('change', async (event: any) => {
          const newId = event.current?.id;
          console.log('[OneSignal] 🔄 Subscription cambió:', newId);
          if (newId && user) {
            await savePushToken(user.id, newId);
          }
        });
      } catch (err) {
        console.error('[OneSignal] ❌ Error de suscripción:', err);
      }
    };

    subscribeUser();
  }, [user, initialized]);
};

async function savePushToken(userId: string, playerId: string) {
  try {
    const { error } = await supabase
      .from('user_push_tokens' as any)
      .upsert(
        { user_id: userId, onesignal_player_id: playerId, updated_at: new Date().toISOString() } as any,
        { onConflict: 'user_id,onesignal_player_id' }
      );
    if (error) console.error('[OneSignal] Error guardando token:', error);
    else console.log('[OneSignal] 💾 Token guardado en DB');
  } catch (err) {
    console.error('[OneSignal] Error guardando token:', err);
  }
}
