alter table public.payment_events
  add column user_id uuid references auth.users(id) on delete set null;
create index payment_events_user_id_idx on public.payment_events(user_id);
