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

function ensureInit(): void {
  if (initAttempted) return;
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

  // Init once on mount — fire and forget, never updates state
  useEffect(() => {
    ensureInit();
  }, []);

  // Login user when ready
  useEffect(() => {
    if (!user || didLogin.current) return;
    if (!sdkReady || !window.OneSignal) return;

    didLogin.current = true;

    const loginUser = async () => {
      try {
        const OS = window.OneSignal;
        await OS.login(user.id);
        console.log('[OneSignal] 🔗 External ID:', user.id);

        const perm = await OS.Notifications.requestPermission();
        console.log('[OneSignal] 🔔 Permiso:', perm);

        const subId = OS.User?.PushSubscription?.id;
        if (subId) {
          await savePushToken(user.id, subId);
          console.log('[OneSignal] ✅ Suscrito:', subId);
        }

        OS.User.PushSubscription.addEventListener('change', async (event: any) => {
          const newId = event.current?.id;
          if (newId) await savePushToken(user.id, newId);
        });
      } catch (err) {
        console.warn('[OneSignal] ⚠️ Login/suscripción falló (app sigue normal):', err);
      }
    };

    // Delay to let SDK fully settle after init
    const timer = setTimeout(loginUser, 2000);
    return () => clearTimeout(timer);
  }, [user]);
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
