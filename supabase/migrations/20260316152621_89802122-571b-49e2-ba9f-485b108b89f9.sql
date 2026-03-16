
ALTER TABLE public.eventos_internos 
ADD COLUMN IF NOT EXISTS aviso_id uuid REFERENCES public.avisos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lugar text;
