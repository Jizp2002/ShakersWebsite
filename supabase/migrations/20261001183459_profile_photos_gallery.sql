begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('avatars','avatars',false,2097152,array['image/webp']),
 ('gallery','gallery',false,2097152,array['image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy avatar_insert on storage.objects for insert to authenticated with check (
 bucket_id='avatars' and public.is_member() and split_part(name,'/',1)=(select auth.uid())::text
);
create policy avatar_read on storage.objects for select to authenticated using (
 bucket_id='avatars' and (split_part(name,'/',1)=(select auth.uid())::text or
 exists(select 1 from public.profiles p where p.avatar_url='storage://avatars/'||storage.objects.name))
);
create policy avatar_delete on storage.objects for delete to authenticated using (
 bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text
);

-- A single operation saves profile text and the selected photo. No arbitrary remote URLs.
create function public.save_profile(p_name text,p_interests text,p_avatar_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_member() then raise exception 'Tu acceso todavía no está aprobado.'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 80 or coalesce(length(p_interests),0)>300 then raise exception 'Revisa el nombre y los intereses.'; end if;
 if p_avatar_url is not null and (p_avatar_url not like 'storage://avatars/'||auth.uid()::text||'/%' or
 not exists(select 1 from storage.objects where bucket_id='avatars' and 'storage://avatars/'||name=p_avatar_url)) then
 raise exception 'La foto debe ser un archivo de tu propio perfil.'; end if;
 update public.profiles set name=trim(p_name),interests=coalesce(p_interests,''),avatar_url=p_avatar_url where id=auth.uid();
end;
$$;
revoke all on function public.save_profile(text,text,text) from public,anon;
grant execute on function public.save_profile(text,text,text) to authenticated;

create table public.gallery_photos (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 owner_id uuid not null references auth.users(id),
 image_url text not null unique,
 caption text not null check(length(trim(caption)) between 3 and 180),
 consent boolean not null default false,
 published boolean not null default false,
 created_at timestamptz not null default now(),
 check(not published or consent),
 check(image_url like 'storage://gallery/'||owner_id::text||'/%')
);
create index gallery_event_idx on public.gallery_photos(event_id);
create index gallery_owner_idx on public.gallery_photos(owner_id);
alter table public.gallery_photos enable row level security;
revoke all on public.gallery_photos from anon,authenticated;
grant select on public.gallery_photos to anon,authenticated;
grant insert,update,delete on public.gallery_photos to authenticated;
create policy gallery_read on public.gallery_photos for select using (
 public.manages_event(event_id) or (published and consent and exists(
 select 1 from public.events e where e.id=event_id and e.status in ('published','finished') and (e.visibility='public' or public.is_member())))
);
create policy gallery_insert on public.gallery_photos for insert to authenticated with check (
 public.manages_event(event_id) and owner_id=(select auth.uid())
);
create policy gallery_update on public.gallery_photos for update to authenticated using (
 public.manages_event(event_id)
) with check (public.manages_event(event_id) and (owner_id=(select auth.uid()) or public.is_admin()));
create policy gallery_delete on public.gallery_photos for delete to authenticated using (public.manages_event(event_id));
create policy gallery_file_insert on storage.objects for insert to authenticated with check (
 bucket_id='gallery' and public.is_staff() and split_part(name,'/',1)=(select auth.uid())::text
);
create policy gallery_file_read on storage.objects for select using (
 bucket_id='gallery' and ((public.is_staff() and (split_part(name,'/',1)=(select auth.uid())::text or public.is_admin())) or
 exists(select 1 from public.gallery_photos g where g.image_url='storage://gallery/'||storage.objects.name))
);
create policy gallery_file_delete on storage.objects for delete to authenticated using (
 bucket_id='gallery' and public.is_staff() and (split_part(name,'/',1)=(select auth.uid())::text or public.is_admin())
);
commit;
