CREATE TABLE public.temp_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  user_id       uuid NOT NULL REFERENCES public.profiles(id),
  station       text NOT NULL,
  temperature   numeric(5,1) NOT NULL,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.temp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cooks can insert temp_logs"
  ON public.temp_logs FOR INSERT
  WITH CHECK (public.get_user_restaurant() = restaurant_id AND auth.uid() = user_id);

CREATE POLICY "restaurant members can read temp_logs"
  ON public.temp_logs FOR SELECT
  USING (public.get_user_restaurant() = restaurant_id);
