DROP POLICY IF EXISTS "recipe_allergens_write" ON public.recipe_allergens;

CREATE POLICY "recipe_allergens_write"
  ON public.recipe_allergens FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
