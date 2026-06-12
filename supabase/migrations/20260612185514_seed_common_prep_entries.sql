-- Append Common/Prep entries to the default day_template.
-- Idempotent: skips if "Cut Potato" Common/Prep entry already exists.
UPDATE day_templates
SET entries = entries || '[
  {"text": "Cut Potato",       "station": "Common", "section": "Prep"},
  {"text": "Cook Potato",      "station": "Common", "section": "Prep"},
  {"text": "Pistachio Mix",    "station": "Common", "section": "Prep"},
  {"text": "Cut Pomegranate",  "station": "Common", "section": "Prep"},
  {"text": "Orange Chutney",   "station": "Common", "section": "Prep"},
  {"text": "Hari Chutney",     "station": "Common", "section": "Prep"},
  {"text": "Rice",             "station": "Common", "section": "Prep"},
  {"text": "Chicken Tandoori 3 trays", "station": "Common", "section": "Prep"},
  {"text": "Chili Oil",        "station": "Common", "section": "Prep"},
  {"text": "Egg Mix",          "station": "Common", "section": "Prep"},
  {"text": "Lamb Warm",        "station": "Common", "section": "Prep"},
  {"text": "Paratha",          "station": "Common", "section": "Prep"}
]'::jsonb
WHERE is_default = true
  AND NOT (entries @> '[{"text": "Cut Potato", "station": "Common", "section": "Prep"}]'::jsonb);
