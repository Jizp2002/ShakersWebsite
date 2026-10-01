begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('media','media',true,2097152,array['image/jpeg','image/png','image/webp']),
 ('documents','documents',false,10485760,array['application/pdf'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy shakers_upload on storage.objects for insert to authenticated with check (
  bucket_id in ('media','documents') and public.is_staff() and split_part(name,'/',1)=auth.uid()::text
);
create policy shakers_media_read on storage.objects for select using(bucket_id='media');
create policy shakers_documents_read on storage.objects for select using(
  bucket_id='documents' and (
    (public.is_staff() and (split_part(name,'/',1)=auth.uid()::text or public.is_admin()))
    or exists(select 1 from public.resources r where r.url='storage://documents/'||name and r.status='published' and (r.visibility='public' or public.is_member()))
  )
);
create policy shakers_upload_delete on storage.objects for delete to authenticated using(
  bucket_id in ('media','documents') and public.is_staff() and (split_part(name,'/',1)=auth.uid()::text or public.is_admin())
);
commit;
