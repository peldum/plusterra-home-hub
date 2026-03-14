-- Table to store OneSignal player IDs mapped to user IDs
CREATE TABLE public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_player_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, onesignal_player_id)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users manage own push tokens"
  ON public.user_push_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all tokens (for sending notifications)
CREATE POLICY "Admins read all push tokens"
  ON public.user_push_tokens
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_superadmin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_push_tokens;