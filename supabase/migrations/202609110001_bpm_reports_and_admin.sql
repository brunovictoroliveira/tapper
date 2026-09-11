-- O único administrador é promovido manualmente por uma credencial service_role:
-- update public.profiles set role = 'admin' where id = '<UUID_DO_USUARIO>';
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

create or replace function private.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = check_user_id and role = 'admin'
  );
$$;

create table public.bpm_detections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_title text not null check (length(trim(song_title)) between 1 and 240),
  artist text not null default '' check (length(artist) <= 240),
  bpm numeric(6, 2) not null check (bpm between 1 and 999.99),
  detection_method text not null check (detection_method in ('manual', 'automatic')),
  detected_at timestamptz not null default now()
);

create index bpm_detections_detected_at_idx on public.bpm_detections(detected_at desc);
create index bpm_detections_user_id_idx on public.bpm_detections(user_id);
alter table public.bpm_detections enable row level security;

create policy bpm_detections_insert_own on public.bpm_detections
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy bpm_detections_select_own on public.bpm_detections
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.bpm_detections from anon, authenticated;
grant select, insert (user_id, song_title, artist, bpm, detection_method) on public.bpm_detections to authenticated;

create or replace function public.admin_bpm_detection_report()
returns table (
  id uuid,
  user_name text,
  song_title text,
  artist text,
  bpm numeric,
  detection_method text,
  detected_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    detection.id,
    profile.display_name as user_name,
    detection.song_title,
    detection.artist,
    detection.bpm,
    detection.detection_method,
    detection.detected_at
  from public.bpm_detections detection
  join public.profiles profile on profile.id = detection.user_id
  where private.is_admin((select auth.uid()))
  order by detection.detected_at desc;
$$;

revoke all on function private.is_admin(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
revoke all on function public.admin_bpm_detection_report() from public;
grant execute on function public.admin_bpm_detection_report() to authenticated;
