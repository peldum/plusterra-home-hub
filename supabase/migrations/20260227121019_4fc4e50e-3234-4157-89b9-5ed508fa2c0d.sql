-- Clean all test data for production launch
-- Order matters due to foreign keys

DELETE FROM public.brochure_downloads;
DELETE FROM public.portal_leads;
DELETE FROM public.blog_posts;
DELETE FROM public.inventory_items;
DELETE FROM public.key_movements;
DELETE FROM public.maintenance_tickets;
DELETE FROM public.pipeline_deals;
DELETE FROM public.commissions;
DELETE FROM public.payments;
DELETE FROM public.contracts;
DELETE FROM public.deals;
DELETE FROM public.properties;
DELETE FROM public.buildings;
DELETE FROM public.clients;
DELETE FROM public.owners;
DELETE FROM public.alerts;
DELETE FROM public.audit_logs;
DELETE FROM public.agent_fee_payments;
DELETE FROM public.agent_goals;
DELETE FROM public.canon_payments;