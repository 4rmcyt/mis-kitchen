-- ── 1a. prep_items catalog ────────────────────────────────────
CREATE TABLE public.prep_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name             text NOT NULL,
  station          text NOT NULL DEFAULT 'Common',
  default_quantity int,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

ALTER TABLE public.prep_items ENABLE ROW LEVEL SECURITY;

-- cook: SELECT only
CREATE POLICY "prep_items_read"
  ON public.prep_items FOR SELECT
  TO authenticated
  USING (restaurant_id = public.get_user_restaurant());

-- admin: full CRUD
CREATE POLICY "prep_items_insert_admin"
  ON public.prep_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND restaurant_id = public.get_user_restaurant());

CREATE POLICY "prep_items_update_admin"
  ON public.prep_items FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  WITH CHECK (public.is_admin() AND restaurant_id = public.get_user_restaurant());

CREATE POLICY "prep_items_delete_admin"
  ON public.prep_items FOR DELETE
  TO authenticated
  USING (public.is_admin() AND restaurant_id = public.get_user_restaurant());

CREATE INDEX idx_prep_items_restaurant ON public.prep_items(restaurant_id);

-- ── 1b. tasks: prep_item_id + quantity ───────────────────────
ALTER TABLE public.tasks
  ADD COLUMN prep_item_id uuid NULL REFERENCES public.prep_items(id) ON DELETE SET NULL,
  ADD COLUMN quantity     int  NULL;

CREATE INDEX idx_tasks_prep_item ON public.tasks(prep_item_id) WHERE prep_item_id IS NOT NULL;

-- ── 1d. Insert 12 prep_items + rewrite day_template entries ──
DO $$
DECLARE
  v_restaurant_id uuid;
  v_template_id   uuid;

  -- item ids
  id_cut_potato        uuid;
  id_cook_potato       uuid;
  id_pistachio_mix     uuid;
  id_cut_pomegranate   uuid;
  id_orange_chutney    uuid;
  id_hari_chutney      uuid;
  id_rice              uuid;
  id_chicken_tandoori  uuid;
  id_chili_oil         uuid;
  id_egg_mix           uuid;
  id_lamb_warm         uuid;
  id_paratha           uuid;
BEGIN
  SELECT id INTO v_restaurant_id FROM public.restaurants LIMIT 1;
  IF v_restaurant_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_template_id
    FROM public.day_templates
   WHERE restaurant_id = v_restaurant_id AND is_default = true
   LIMIT 1;

  -- Insert catalog rows, capture ids
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Cut Potato',          'Common', NULL) RETURNING id INTO id_cut_potato;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Cook Potato',         'Common', NULL) RETURNING id INTO id_cook_potato;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Pistachio Mix',       'Common', NULL) RETURNING id INTO id_pistachio_mix;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Cut Pomegranate',     'Common', NULL) RETURNING id INTO id_cut_pomegranate;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Orange Chutney',      'Common', NULL) RETURNING id INTO id_orange_chutney;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Hari Chutney',        'Common', NULL) RETURNING id INTO id_hari_chutney;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Rice',                'Common', NULL) RETURNING id INTO id_rice;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Chicken Tandoori',    'Common', NULL) RETURNING id INTO id_chicken_tandoori;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Chili Oil',           'Common', NULL) RETURNING id INTO id_chili_oil;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Egg Mix',             'Common', NULL) RETURNING id INTO id_egg_mix;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Lamb Warm',           'Common', NULL) RETURNING id INTO id_lamb_warm;
  INSERT INTO public.prep_items (restaurant_id, name, station, default_quantity)
    VALUES (v_restaurant_id, 'Paratha',             'Common', NULL) RETURNING id INTO id_paratha;

  -- Rewrite the default template's Common/Prep entries to include prep_item_id.
  -- Station-checklist entries (Opening/Closing) are left untouched.
  IF v_template_id IS NOT NULL THEN
    UPDATE public.day_templates
    SET entries = (
      SELECT jsonb_agg(
        CASE
          WHEN (e->>'station') = 'Common' AND (e->>'section') = 'Prep' THEN
            CASE e->>'text'
              WHEN 'Cut Potato'                 THEN e || jsonb_build_object('prep_item_id', id_cut_potato::text)
              WHEN 'Cook Potato'                THEN e || jsonb_build_object('prep_item_id', id_cook_potato::text)
              WHEN 'Pistachio Mix'              THEN e || jsonb_build_object('prep_item_id', id_pistachio_mix::text)
              WHEN 'Cut Pomegranate'            THEN e || jsonb_build_object('prep_item_id', id_cut_pomegranate::text)
              WHEN 'Orange Chutney'             THEN e || jsonb_build_object('prep_item_id', id_orange_chutney::text)
              WHEN 'Hari Chutney'               THEN e || jsonb_build_object('prep_item_id', id_hari_chutney::text)
              WHEN 'Rice'                       THEN e || jsonb_build_object('prep_item_id', id_rice::text)
              WHEN 'Chicken Tandoori 3 trays'   THEN jsonb_build_object(
                                                       'text',         'Chicken Tandoori',
                                                       'station',      'Common',
                                                       'section',      'Prep',
                                                       'prep_item_id', id_chicken_tandoori::text
                                                     )
              WHEN 'Chili Oil'                  THEN e || jsonb_build_object('prep_item_id', id_chili_oil::text)
              WHEN 'Egg Mix'                    THEN e || jsonb_build_object('prep_item_id', id_egg_mix::text)
              WHEN 'Lamb Warm'                  THEN e || jsonb_build_object('prep_item_id', id_lamb_warm::text)
              WHEN 'Paratha'                    THEN e || jsonb_build_object('prep_item_id', id_paratha::text)
              ELSE e
            END
          ELSE e
        END
      )
      FROM jsonb_array_elements(entries) AS e
    )
    WHERE id = v_template_id;
  END IF;
END $$;

-- ── 1e. quantity freeze — extend enforce_task_update_columns ─
-- quantity is conditionally editable: cook may change it only while done=false.
-- assigned_to and prep_item_id are read-only for cooks.
-- auth.uid() IS NULL → service-role path, allow through (consistent with INSERT trigger).
CREATE OR REPLACE FUNCTION public.enforce_task_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Admins may change any column
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Service-role / unauthenticated server path: allow through
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reject changes to read-only columns
  IF (
    NEW.text          IS DISTINCT FROM OLD.text          OR
    NEW.station       IS DISTINCT FROM OLD.station       OR
    NEW.section       IS DISTINCT FROM OLD.section       OR
    NEW.date          IS DISTINCT FROM OLD.date          OR
    NEW.source        IS DISTINCT FROM OLD.source        OR
    NEW.template_id   IS DISTINCT FROM OLD.template_id   OR
    NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id OR
    NEW.created_by    IS DISTINCT FROM OLD.created_by    OR
    NEW.assigned_to   IS DISTINCT FROM OLD.assigned_to   OR
    NEW.prep_item_id  IS DISTINCT FROM OLD.prep_item_id
  ) THEN
    RAISE EXCEPTION 'permission denied: cooks may only update done, done_at, done_by, comment, and quantity';
  END IF;

  -- quantity: editable only while task is open
  IF NEW.quantity IS DISTINCT FROM OLD.quantity AND OLD.done = true THEN
    RAISE EXCEPTION 'permission denied: quantity cannot be changed after task is done';
  END IF;

  -- done_by must be caller's uid
  IF NEW.done_by IS NOT NULL AND NEW.done_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: done_by must be your own user id';
  END IF;

  RETURN NEW;
END;
$$;
