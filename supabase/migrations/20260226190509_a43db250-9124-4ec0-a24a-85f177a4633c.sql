
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS active_template text NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS blocks_config jsonb NOT NULL DEFAULT '[
    {"id": "hero", "enabled": true, "order": 1, "config": {"title": "Encontrá tu próximo hogar", "subtitle": "Propiedades en venta y alquiler en Paraguay", "cta_text": "Buscar propiedades", "bg_image_url": null, "show_search": true}},
    {"id": "banners", "enabled": true, "order": 2, "config": {"autoplay": true, "interval_seconds": 5}},
    {"id": "search", "enabled": true, "order": 3, "config": {}},
    {"id": "featured", "enabled": true, "order": 4, "config": {}},
    {"id": "listings", "enabled": true, "order": 5, "config": {}},
    {"id": "map", "enabled": true, "order": 6, "config": {"show_clusters": true}},
    {"id": "agents", "enabled": true, "order": 7, "config": {}},
    {"id": "whatsapp_cta", "enabled": false, "order": 8, "config": {"text": "¿Necesitás ayuda? Escribinos por WhatsApp", "phone": ""}},
    {"id": "footer", "enabled": true, "order": 9, "config": {}}
  ]'::jsonb;
