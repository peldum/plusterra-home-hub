import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ONESIGNAL_APP_ID = 'f92acc0b-91dd-4dde-b710-fdd755857779';

let initialized = false;

export const useOneSignal = () => {
  const { user } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const initOneSignal = async () => {
      if (initialized) return;
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        });
        initialized = true;
      } catch (err) {
        console.error('OneSignal init error:', err);
      }
    };
    initOneSignal();
  }, []);

  useEffect(() => {
    if (!user || !initialized) return;
    if (prevUserId.current === user.id) return;
    prevUserId.current = user.id;

    const subscribeUser = async () => {
      try {
        // Set external user id for targeting
        await OneSignal.login(user.id);

        // Prompt for permission
        await OneSignal.Notifications.requestPermission();

        // Get subscription id (player id)
        const subId = OneSignal.User.PushSubscription.id;
        if (subId) {
          await savePushToken(user.id, subId);
        }

        // Listen for future subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
          const newId = event.current?.id;
          if (newId && user) {
            await savePushToken(user.id, newId);
          }
        });
      } catch (err) {
        console.error('OneSignal subscription error:', err);
      }
    };

    subscribeUser();
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
    if (error) console.error('Error saving push token:', error);
  } catch (err) {
    console.error('Error saving push token:', err);
  }
}
