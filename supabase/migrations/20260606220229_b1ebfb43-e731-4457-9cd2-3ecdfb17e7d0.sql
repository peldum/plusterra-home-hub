-- 1) Remove sensitive realtime publication entries (not used by app)
ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_chat_settings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_push_tokens;

-- 2) Revoke internal-only column from anon on properties
REVOKE SELECT (created_by) ON public.properties FROM anon;