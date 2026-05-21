create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "users manage own subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read restaurant subscriptions"
  on public.push_subscriptions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = push_subscriptions.restaurant_id
        and profiles.role in ('admin', 'superadmin')
    )
  );
