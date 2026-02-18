-- Agregar campo payment_status a profiles para soft-lock manual por admins
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'AL_DIA'
  CHECK (payment_status IN ('AL_DIA', 'MOROSO'));

-- Comentario descriptivo
COMMENT ON COLUMN public.profiles.payment_status IS
  'Estado de pago manual: AL_DIA = sin restricciones, MOROSO = soft-lock activo (solo lectura)';
