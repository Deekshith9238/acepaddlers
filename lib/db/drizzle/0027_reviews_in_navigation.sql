-- Put the new Reviews page in the site menu, after everything already there.
-- The menu is the admin's to arrange, so this only adds: it touches no other
-- entry, and does nothing if something already links to /reviews.
UPDATE "settings"
SET "value" = "value" || '[{"label": "Reviews", "href": "/reviews"}]'::jsonb,
    "updated_at" = now()
WHERE "key" = 'navigation'
  AND jsonb_typeof("value") = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements("value") AS item WHERE item->>'href' = '/reviews'
  );
