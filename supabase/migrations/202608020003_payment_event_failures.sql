alter table public.payment_events
  add column attempts integer not null default 0,
  add column last_error text;
