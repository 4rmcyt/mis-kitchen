DROP POLICY IF EXISTS "day_templates_admin_write" ON public.day_templates;

CREATE POLICY "day_templates_admin_insert" ON public.day_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND restaurant_id = day_templates.restaurant_id
        AND role = ANY (ARRAY['admin', 'superadmin'])
    )
  );

CREATE POLICY "day_templates_admin_update" ON public.day_templates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND restaurant_id = day_templates.restaurant_id
        AND role = ANY (ARRAY['admin', 'superadmin'])
    )
  );

CREATE POLICY "day_templates_admin_delete" ON public.day_templates FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND restaurant_id = day_templates.restaurant_id
        AND role = ANY (ARRAY['admin', 'superadmin'])
    )
  );
