import { useNotificationsRealtime } from '@/hooks/useNotifications';

/**
 * Invisible mount point for the single notifications realtime subscription.
 * Lives in AppShell so the channel survives route changes.
 */
export const NotificationsRealtimeMount = () => {
  useNotificationsRealtime();
  return null;
};