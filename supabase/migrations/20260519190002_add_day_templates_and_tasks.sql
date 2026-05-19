-- Day templates: named sets of station-template references + section assignment
CREATE TABLE public.day_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  entries       jsonb NOT NULL DEFAULT '[]',
  -- entries schema: [{template_id: uuid, section: 'Opening'|'Closing'|'Other'}]
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.day_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant members can read day_templates"
  ON public.day_templates FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins can manage day_templates"
  ON public.day_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND restaurant_id = day_templates.restaurant_id
        AND role IN ('admin', 'superadmin')
    )
  );

-- Tasks: actual tasks for a specific date
CREATE TABLE public.tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text          text NOT NULL,
  station       text NOT NULL DEFAULT 'Common',
  section       text NOT NULL DEFAULT 'Other', -- 'Opening' | 'Closing' | 'Other'
  date          date NOT NULL DEFAULT CURRENT_DATE,
  done          boolean NOT NULL DEFAULT false,
  done_at       timestamptz,
  done_by       uuid REFERENCES public.profiles(id),
  source        text NOT NULL DEFAULT 'manual', -- 'manual' | 'template' | 'admin'
  template_id   uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  comment       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Cooks see tasks for their station within ±3 days, plus their own tasks
CREATE POLICY "cooks can read relevant tasks"
  ON public.tasks FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND date BETWEEN CURRENT_DATE - 3 AND CURRENT_DATE + 3
  );

-- Admins see all tasks in their restaurant
CREATE POLICY "admins can read all tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND restaurant_id = tasks.restaurant_id
        AND role IN ('admin', 'superadmin')
    )
  );

-- Any authenticated member can create tasks
CREATE POLICY "members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Cooks can only update done/done_at/done_by/comment on tasks (not delete)
CREATE POLICY "cooks can update task completion and comment"
  ON public.tasks FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only admins can delete tasks
CREATE POLICY "admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND restaurant_id = tasks.restaurant_id
        AND role IN ('admin', 'superadmin')
    )
  );

-- Index for common query pattern
CREATE INDEX tasks_date_station_idx ON public.tasks (restaurant_id, date, station);
