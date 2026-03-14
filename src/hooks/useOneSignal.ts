import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ONESIGNAL_APP_ID = 'f92acc0b-91dd-4dde-b710-fdd755857779';

let sdkReady = false;
let sdkPromise: Promise<void> | null = null;

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

function ensureInit(): Promise<void> {
  if (sdkReady) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve) => {
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
        console.error('[OneSignal] ❌ Error al inicializar:', err);
      }
      resolve();
    });
  });

  return sdkPromise;
}

export const useOneSignal = () => {
  const { user } = useAuth();
  const prevUserId = useRef<string | null>(null);
  const subscribed = useRef(false);

  useEffect(() => {
    if (!subscribed.current) {
      ensureInit().then(() => {
        subscribed.current = true;
      });
    }
  }, []);

  useEffect(() => {
    if (!sdkReady || !user) return;
    if (prevUserId.current === user.id) return;
    prevUserId.current = user.id;

    const OS = window.OneSignal;
    if (!OS) { console.warn('[OneSignal] SDK no disponible'); return; }

    (async () => {
      try {
        await OS.login(user.id);
        console.log('[OneSignal] 🔗 External ID:', user.id);

        const perm = await OS.Notifications.requestPermission();
        console.log('[OneSignal] 🔔 Permiso:', perm);

        const subId = OS.User?.PushSubscription?.id;
        console.log('[OneSignal] 📱 Subscription ID:', subId || 'pendiente');
        if (subId) {
          await savePushToken(user.id, subId);
          console.log('[OneSignal] ✅ Suscrito:', subId);
        }

        OS.User.PushSubscription.addEventListener('change', async (event: any) => {
          const newId = event.current?.id;
          console.log('[OneSignal] 🔄 Subscription cambió:', newId);
          if (newId && user) await savePushToken(user.id, newId);
        });
      } catch (err) {
        console.error('[OneSignal] ❌ Error suscripción:', err);
      }
    })();
  }, [user]);
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
