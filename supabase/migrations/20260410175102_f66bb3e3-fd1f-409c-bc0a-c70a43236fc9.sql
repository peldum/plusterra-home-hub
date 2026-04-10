ALTER TABLE public.buildings
ADD COLUMN tipo_calculo_comision text NOT NULL DEFAULT 'sobre_total_neto';

COMMENT ON COLUMN public.buildings.tipo_calculo_comision IS 'Subtipo de cálculo de comisión para Modelo 2: sobre_total_neto o sobre_pago_total_alquiler';