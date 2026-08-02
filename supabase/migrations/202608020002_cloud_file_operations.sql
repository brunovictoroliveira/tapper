create or replace function public.reserve_cloud_file(
  file_id uuid,
  owner_id uuid,
  related_song_id uuid,
  object_path text,
  original_filename text,
  content_type text,
  content_size bigint,
  content_checksum text
)
returns public.cloud_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
  reserved_bytes bigint;
  result public.cloud_files;
begin
  if content_size <= 0 or content_size > 104857600 then
    raise exception 'invalid_file_size';
  end if;
  if object_path !~ ('^users/' || owner_id::text || '/songs/[0-9a-f-]+/[0-9a-f-]+\.[a-z0-9]+$') then
    raise exception 'invalid_object_path';
  end if;
  if not private.has_cloud_write_access(owner_id) then
    raise exception 'premium_required';
  end if;
  if not exists (select 1 from public.songs where id = related_song_id and user_id = owner_id) then
    raise exception 'song_not_found';
  end if;

  select * into profile_row from public.profiles where id = owner_id for update;
  select coalesce(sum(size_bytes), 0) into reserved_bytes
    from public.cloud_files where user_id = owner_id and status = 'pending';
  if profile_row.storage_used_bytes + reserved_bytes + content_size > profile_row.storage_quota_bytes then
    raise exception 'storage_quota_exceeded';
  end if;

  insert into public.cloud_files (
    id, user_id, song_id, object_key, original_name, mime_type, size_bytes, checksum, status
  ) values (
    file_id, owner_id, related_song_id, object_path, original_filename,
    content_type, content_size, content_checksum, 'pending'
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.finalize_cloud_file(file_id uuid)
returns public.cloud_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_row public.cloud_files;
begin
  select * into file_row from public.cloud_files where id = file_id for update;
  if file_row.id is null then raise exception 'file_not_found'; end if;
  if file_row.status = 'ready' then return file_row; end if;
  if file_row.status <> 'pending' then raise exception 'invalid_file_status'; end if;

  update public.profiles
    set storage_used_bytes = storage_used_bytes + file_row.size_bytes
    where id = file_row.user_id
      and storage_used_bytes + file_row.size_bytes <= storage_quota_bytes;
  if not found then raise exception 'storage_quota_exceeded'; end if;

  update public.cloud_files set status = 'ready' where id = file_id returning * into file_row;
  update public.songs set audio_file_id = file_id
    where id = file_row.song_id and user_id = file_row.user_id;
  return file_row;
end;
$$;

create or replace function public.delete_cloud_file_record(file_id uuid, owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_row public.cloud_files;
begin
  select * into file_row from public.cloud_files
    where id = file_id and user_id = owner_id for update;
  if file_row.id is null then return; end if;

  if file_row.status = 'ready' then
    update public.profiles
      set storage_used_bytes = greatest(0, storage_used_bytes - file_row.size_bytes)
      where id = owner_id;
  end if;
  delete from public.cloud_files where id = file_id;
end;
$$;

revoke all on function public.reserve_cloud_file(uuid, uuid, uuid, text, text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.finalize_cloud_file(uuid) from public, anon, authenticated;
revoke all on function public.delete_cloud_file_record(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_cloud_file(uuid, uuid, uuid, text, text, text, bigint, text) to service_role;
grant execute on function public.finalize_cloud_file(uuid) to service_role;
grant execute on function public.delete_cloud_file_record(uuid, uuid) to service_role;
