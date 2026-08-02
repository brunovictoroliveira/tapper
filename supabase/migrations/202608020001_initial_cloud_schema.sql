create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_plan as enum ('free', 'premium');
create type public.subscription_status as enum ('pending', 'active', 'past_due', 'cancelled');
create type public.song_mode as enum ('major', 'minor', 'unknown');
create type public.cloud_file_status as enum ('pending', 'ready', 'deleting');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  plan public.app_plan not null default 'free',
  storage_quota_bytes bigint not null default 1073741824 check (storage_quota_bytes >= 0),
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_used_bytes <= storage_quota_bytes)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mercadopago' check (provider = 'mercadopago'),
  provider_subscription_id text unique,
  status public.subscription_status not null default 'pending',
  current_period_end timestamptz,
  grace_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_one_current_per_user
  on public.subscriptions(user_id)
  where status in ('pending', 'active', 'past_due');
create index subscriptions_user_id_idx on public.subscriptions(user_id);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_reference text,
  title text not null check (length(trim(title)) between 1 and 240),
  artist text not null default '',
  album text not null default '',
  original_filename text not null default '',
  mime_type text not null default '',
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  detected_key text not null default '',
  detected_mode public.song_mode not null default 'unknown',
  detection_confidence numeric(4, 3) not null default 0 check (detection_confidence between 0 and 1),
  manual_key text not null default '',
  bpm numeric(6, 2) check (bpm is null or bpm between 1 and 999.99),
  notes text not null default '',
  tags text[] not null default '{}',
  audio_file_id uuid,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index songs_user_id_idx on public.songs(user_id);
create unique index songs_user_client_reference_idx on public.songs(user_id, client_reference)
  where client_reference is not null;
create index songs_user_updated_idx on public.songs(user_id, updated_at desc);
create index songs_tags_idx on public.songs using gin(tags);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_reference text,
  song_id uuid references public.songs(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 240),
  project_state jsonb not null default '{}'::jsonb check (jsonb_typeof(project_state) = 'object'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);
create unique index projects_user_client_reference_idx on public.projects(user_id, client_reference)
  where client_reference is not null;
create index projects_user_updated_idx on public.projects(user_id, updated_at desc);

create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  project_state jsonb not null check (jsonb_typeof(project_state) = 'object'),
  created_at timestamptz not null default now(),
  unique(project_id, version)
);

create index project_versions_user_id_idx on public.project_versions(user_id);
create index project_versions_project_idx on public.project_versions(project_id, version desc);

create table public.cloud_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  object_key text not null unique check (object_key ~ '^users/[0-9a-f-]+/'),
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  checksum text not null default '',
  status public.cloud_file_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index cloud_files_user_id_idx on public.cloud_files(user_id);
create index cloud_files_song_id_idx on public.cloud_files(song_id);
alter table public.songs
  add constraint songs_audio_file_id_fkey foreign key (audio_file_id)
  references public.cloud_files(id) on delete set null;

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function private.set_updated_at();
create trigger songs_set_updated_at before update on public.songs
for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.has_cloud_write_access(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = check_user_id
      and (
        (status = 'active' and (current_period_end is null or current_period_end > now()))
        or (status = 'past_due' and grace_period_end > now())
      )
  );
$$;

create or replace function private.can_create_song(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_cloud_write_access(check_user_id)
    and (select count(*) from public.songs where user_id = check_user_id) < 500;
$$;

create or replace function private.can_create_project(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_cloud_write_access(check_user_id)
    and (select count(*) from public.projects where user_id = check_user_id) < 50;
$$;

create or replace function private.owns_song(check_user_id uuid, check_song_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select check_song_id is null or exists (
    select 1 from public.songs where id = check_song_id and user_id = check_user_id
  );
$$;

create or replace function private.increment_project_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_state is distinct from old.project_state then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

create trigger projects_increment_version
before update on public.projects
for each row execute function private.increment_project_version();

create or replace function private.capture_project_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.project_state is not distinct from old.project_state then
    return new;
  end if;

  insert into public.project_versions (project_id, user_id, version, project_state)
  values (new.id, new.user_id, new.version, new.project_state);

  delete from public.project_versions
  where project_id = new.id
    and id not in (
      select id from public.project_versions
      where project_id = new.id
      order by version desc
      limit 5
    );

  return new;
end;
$$;

create trigger projects_capture_version
after insert or update on public.projects
for each row execute function private.capture_project_version();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.songs enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.cloud_files enable row level security;
alter table public.payment_events enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy subscriptions_select_own on public.subscriptions
for select to authenticated using ((select auth.uid()) = user_id);

create policy songs_select_own on public.songs
for select to authenticated using ((select auth.uid()) = user_id);
create policy songs_insert_premium on public.songs
for insert to authenticated with check (
  (select auth.uid()) = user_id and (select private.can_create_song((select auth.uid())))
);
create policy songs_update_premium on public.songs
for update to authenticated using (
  (select auth.uid()) = user_id and (select private.has_cloud_write_access((select auth.uid())))
) with check (
  (select auth.uid()) = user_id and (select private.has_cloud_write_access((select auth.uid())))
);
create policy songs_delete_premium on public.songs
for delete to authenticated using (
  (select auth.uid()) = user_id and (select private.has_cloud_write_access((select auth.uid())))
);

create policy projects_select_own on public.projects
for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_insert_premium on public.projects
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and (select private.can_create_project((select auth.uid())))
  and (select private.owns_song((select auth.uid()), song_id))
);
create policy projects_update_premium on public.projects
for update to authenticated using (
  (select auth.uid()) = user_id and (select private.has_cloud_write_access((select auth.uid())))
) with check (
  (select auth.uid()) = user_id
  and (select private.has_cloud_write_access((select auth.uid())))
  and (select private.owns_song((select auth.uid()), song_id))
);
create policy projects_delete_premium on public.projects
for delete to authenticated using (
  (select auth.uid()) = user_id and (select private.has_cloud_write_access((select auth.uid())))
);

create policy project_versions_select_own on public.project_versions
for select to authenticated using ((select auth.uid()) = user_id);
create policy cloud_files_select_own on public.cloud_files
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.subscriptions, public.songs, public.projects,
  public.project_versions, public.cloud_files to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert (
  user_id, client_reference, title, artist, album, original_filename, mime_type, file_size_bytes,
  duration_ms, detected_key, detected_mode, detection_confidence, manual_key,
  bpm, notes, tags, analyzed_at
) on public.songs to authenticated;
grant update (
  title, artist, album, original_filename, mime_type, file_size_bytes,
  duration_ms, detected_key, detected_mode, detection_confidence, manual_key,
  bpm, notes, tags, analyzed_at
) on public.songs to authenticated;
grant delete on public.songs to authenticated;
grant insert (user_id, client_reference, song_id, name, project_state) on public.projects to authenticated;
grant update (song_id, name, project_state) on public.projects to authenticated;
grant delete on public.projects to authenticated;

revoke all on function private.has_cloud_write_access(uuid) from public;
revoke all on function private.can_create_song(uuid) from public;
revoke all on function private.can_create_project(uuid) from public;
revoke all on function private.owns_song(uuid, uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_cloud_write_access(uuid) to authenticated;
grant execute on function private.can_create_song(uuid) to authenticated;
grant execute on function private.can_create_project(uuid) to authenticated;
grant execute on function private.owns_song(uuid, uuid) to authenticated;
