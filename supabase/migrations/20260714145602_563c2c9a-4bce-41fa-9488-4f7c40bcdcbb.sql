
-- Allow authenticated users to insert alerts for themselves (visits, birthdays)
CREATE POLICY "Users insert own alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow agents to insert reservation-related alerts targeting admin/superadmin/secretaria/accounting
CREATE POLICY "Agents insert reservation alerts to managers"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_agent()
  AND alert_type IN ('reservation_request', 'reservation_approved', 'reservation_rejected', 'reservation')
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = alerts.user_id
      AND ur.role IN ('superadmin', 'admin', 'accounting', 'secretaria')
  )
);
