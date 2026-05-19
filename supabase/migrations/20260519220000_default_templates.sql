-- Add is_default flag to day_templates
ALTER TABLE public.day_templates ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Only one default per restaurant (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS day_templates_one_default
  ON public.day_templates (restaurant_id)
  WHERE is_default = true;

-- Seed default day templates for the existing restaurant
DO $$
DECLARE
  v_restaurant_id uuid;
  v_user_id       uuid;
  v_grill_id      uuid;
  v_garmo_id      uuid;
BEGIN
  SELECT id INTO v_restaurant_id FROM public.restaurants LIMIT 1;
  SELECT id INTO v_user_id       FROM public.profiles WHERE role IN ('superadmin','admin') LIMIT 1;

  IF v_restaurant_id IS NULL OR v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Grill Default template
  INSERT INTO public.day_templates (restaurant_id, created_by, name, is_default, entries)
  VALUES (
    v_restaurant_id, v_user_id, 'Grill Default', true,
    '[
      {"text":"Cabbage Seared — 2 big tray (up)",               "station":"Grill","section":"Opening"},
      {"text":"Kale Chopped — 2 big tray (up)",                 "station":"Grill","section":"Opening"},
      {"text":"Cilantro Stem Chopped — min 1/3 small tray (up)","station":"Grill","section":"Opening"},
      {"text":"Onion Chopped — 1 small tray (up)",              "station":"Grill","section":"Opening"},
      {"text":"Garlic Chopped — 1 medium tray (up)",            "station":"Grill","section":"Opening"},
      {"text":"Ginger Cubes Chopped — 1 small tray (up)",       "station":"Grill","section":"Opening"},
      {"text":"Rogan Josh Lamb Sauce — 1 box (fridge)",         "station":"Grill","section":"Opening"},
      {"text":"Cabbage Sauce — 1 box (fridge)",                 "station":"Grill","section":"Opening"},
      {"text":"Chicken Malai Sauce — 1 box (fridge)",           "station":"Grill","section":"Opening"},
      {"text":"Demi-glace Sauce — 1 box (fridge)",              "station":"Grill","section":"Opening"},
      {"text":"Steak Sous Vide — 1 pc (fridge)",                "station":"Grill","section":"Opening"},
      {"text":"Chicken Malai — 1 pc (warming cabinet)",         "station":"Grill","section":"Opening"},
      {"text":"Lamb Baked — 1 pc (warming cabinet)",            "station":"Grill","section":"Opening"},
      {"text":"Cabbage Seared — wrapped & put away",            "station":"Grill","section":"Closing"},
      {"text":"Kale Chopped — wrapped & put away",              "station":"Grill","section":"Closing"},
      {"text":"Cilantro Stem Chopped — wrapped & put away",     "station":"Grill","section":"Closing"},
      {"text":"Onion Chopped — wrapped & put away",             "station":"Grill","section":"Closing"},
      {"text":"Garlic Chopped — wrapped & put away",            "station":"Grill","section":"Closing"},
      {"text":"Ginger Cubes Chopped — wrapped & put away",      "station":"Grill","section":"Closing"},
      {"text":"Rogan Josh Lamb Sauce — wrapped & put away",     "station":"Grill","section":"Closing"},
      {"text":"Cabbage Sauce — wrapped & put away",             "station":"Grill","section":"Closing"},
      {"text":"Chicken Malai Sauce — wrapped & put away",       "station":"Grill","section":"Closing"},
      {"text":"Demi-glace Sauce — wrapped & put away",          "station":"Grill","section":"Closing"}
    ]'::jsonb
  ) RETURNING id INTO v_grill_id;

  -- Garmo Default template
  INSERT INTO public.day_templates (restaurant_id, created_by, name, is_default, entries)
  VALUES (
    v_restaurant_id, v_user_id, 'Garmo Default', false,
    '[
      {"text":"Raita — 4pc",                                          "station":"Garmo","section":"Opening"},
      {"text":"Tamarind — 4pc",                                       "station":"Garmo","section":"Opening"},
      {"text":"Sweet Yogurt — 4pc",                                   "station":"Garmo","section":"Opening"},
      {"text":"Hari Chutney — 2pc",                                   "station":"Garmo","section":"Opening"},
      {"text":"Mint Vinaigrette — 2pc",                               "station":"Garmo","section":"Opening"},
      {"text":"Tomatoes Big — 1 big tray",                            "station":"Garmo","section":"Opening"},
      {"text":"Tomatoes Small — 1 big tray",                          "station":"Garmo","section":"Opening"},
      {"text":"Potatoes Boiled — 2 trays",                            "station":"Garmo","section":"Opening"},
      {"text":"Cilantro chopped — 1 box",                             "station":"Garmo","section":"Opening"},
      {"text":"Onion Diced — 1 box",                                  "station":"Garmo","section":"Opening"},
      {"text":"Onion Sliced — 1 box",                                 "station":"Garmo","section":"Opening"},
      {"text":"Mishti Doi — 1 box",                                   "station":"Garmo","section":"Opening"},
      {"text":"Oranges — 1 big tray",                                 "station":"Garmo","section":"Opening"},
      {"text":"Pomegranate — 1 big tray",                             "station":"Garmo","section":"Opening"},
      {"text":"Microgreens — 3 box",                                  "station":"Garmo","section":"Opening"},
      {"text":"Pomegranate — 1 small tray (up)",                      "station":"Garmo","section":"Opening"},
      {"text":"Oranges Sliced Peeled — min 1/3 small tray (up)",      "station":"Garmo","section":"Opening"},
      {"text":"Banana Leafs — min 1/3 small tray (up)",               "station":"Garmo","section":"Opening"},
      {"text":"Peaches Grilled — min 1/3 small tray (up)",            "station":"Garmo","section":"Opening"},
      {"text":"Raita — wrapped & labelled",                           "station":"Garmo","section":"Closing"},
      {"text":"Tamarind — wrapped & labelled",                        "station":"Garmo","section":"Closing"},
      {"text":"Sweet Yogurt — wrapped & labelled",                    "station":"Garmo","section":"Closing"},
      {"text":"Hari Chutney — wrapped & labelled",                    "station":"Garmo","section":"Closing"},
      {"text":"Mint Vinaigrette — wrapped & labelled",                "station":"Garmo","section":"Closing"},
      {"text":"Tomatoes Big — put away",                              "station":"Garmo","section":"Closing"},
      {"text":"Tomatoes Small — put away",                            "station":"Garmo","section":"Closing"},
      {"text":"Potatoes Boiled — wrapped & put away",                 "station":"Garmo","section":"Closing"},
      {"text":"Cilantro chopped — wrapped & put away",                "station":"Garmo","section":"Closing"},
      {"text":"Onion Diced — wrapped & put away",                     "station":"Garmo","section":"Closing"},
      {"text":"Onion Sliced — wrapped & put away",                    "station":"Garmo","section":"Closing"},
      {"text":"Mishti Doi — wrapped & labelled",                      "station":"Garmo","section":"Closing"},
      {"text":"Oranges — wrapped & put away",                         "station":"Garmo","section":"Closing"},
      {"text":"Pomegranate — wrapped & put away",                     "station":"Garmo","section":"Closing"},
      {"text":"Microgreens — wrapped & put away",                     "station":"Garmo","section":"Closing"},
      {"text":"Pomegranate (up) — put away",                          "station":"Garmo","section":"Closing"},
      {"text":"Oranges Sliced Peeled (up) — put away",                "station":"Garmo","section":"Closing"},
      {"text":"Banana Leafs (up) — put away",                         "station":"Garmo","section":"Closing"},
      {"text":"Peaches Grilled (up) — put away",                      "station":"Garmo","section":"Closing"}
    ]'::jsonb
  ) RETURNING id INTO v_garmo_id;
END $$;
