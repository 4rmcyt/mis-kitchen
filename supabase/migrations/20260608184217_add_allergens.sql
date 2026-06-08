-- Allergen reference table
CREATE TABLE public.allergens (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  slug  text NOT NULL UNIQUE
);

-- Seed allergens from CCC Allergy Sheet Summer 2025
INSERT INTO public.allergens (name, slug) VALUES
  ('Gluten',         'gluten'),
  ('Celiac',         'celiac'),
  ('Dairy',          'dairy'),
  ('Nuts',           'nuts'),
  ('Vegan',          'vegan'),
  ('Mango',          'mango'),
  ('Onion',          'onion'),
  ('Garlic',         'garlic'),
  ('Legumes',        'legumes'),
  ('Cinnamon',       'cinnamon'),
  ('Sesame',         'sesame'),
  ('Fresh Cilantro', 'fresh-cilantro');

-- Join table: recipe <-> allergen with optional note
CREATE TABLE public.recipe_allergens (
  recipe_id   uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
  note        text,
  PRIMARY KEY (recipe_id, allergen_id)
);

-- RLS
ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allergens_read"
  ON public.allergens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "recipe_allergens_read"
  ON public.recipe_allergens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_id
        AND (r.restaurant_id IN (
          SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        ))
    )
  );

CREATE POLICY "recipe_allergens_write"
  ON public.recipe_allergens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND restaurant_id = (
          SELECT restaurant_id FROM public.recipes WHERE id = recipe_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND restaurant_id = (
          SELECT restaurant_id FROM public.recipes WHERE id = recipe_id
        )
    )
  );

CREATE INDEX idx_recipe_allergens_recipe    ON public.recipe_allergens(recipe_id);
CREATE INDEX idx_recipe_allergens_allergen  ON public.recipe_allergens(allergen_id);
