-- Migration: Performance indexes & Guardian traceability for minors
begin;

-- Composite indexes for frequent queries and filtering
create index if not exists events_schedule_opt on public.events(status, starts_at);
create index if not exists announcements_active_opt on public.announcements(status, expires_at);
create index if not exists gallery_event_published_opt on public.gallery_photos(event_id, published, consent);
create index if not exists prayer_entries_active_opt on public.prayer_entries(status, visibility, created_at desc);

-- Guardian audit and traceability for minors (13-17)
alter table public.memberships
  add column if not exists guardian_name text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_verified_at timestamptz,
  add column if not exists guardian_verified_by uuid references public.profiles(id);

create or replace function public.review_member(
  p_user_id uuid,
  p_status text,
  p_role text,
  p_guardian boolean,
  p_guardian_name text,
  p_guardian_phone text
) returns void language plpgsql security definer set search_path='' as $$
declare target public.memberships; age text;
begin
  perform pg_catalog.pg_advisory_xact_lock(227001);
  if not public.is_staff() or p_user_id=auth.uid() then raise exception 'No tienes permiso para esta acción.'; end if;
  select * into target from public.memberships where id=p_user_id for update;
  if not found then raise exception 'Solicitud no encontrada.'; end if;
  if not public.is_admin() and (target.status<>'pending' or target.role<>'member' or p_role<>'member' or p_status not in ('approved','rejected')) then raise exception 'Solo coordinación puede cambiar este acceso.'; end if;
  if p_role='admin' or target.role='admin' then raise exception 'El acceso de coordinación está reservado.'; end if;
  if target.requested_role='leader' and not public.is_admin() then raise exception 'Solo coordinación revisa solicitudes de líder.'; end if;
  select age_group into age from public.profiles where id=p_user_id;
  if p_status='approved' and age='13-17' and not coalesce(p_guardian,false) then raise exception 'Confirma primero la autorización del responsable.'; end if;
  if p_role in ('leader','admin') and age<>'18+' then raise exception 'Los permisos de liderazgo requieren un responsable adulto.'; end if;
  update public.memberships
  set status=p_status,
      role=p_role,
      guardian_confirmed=coalesce(p_guardian,false),
      guardian_name=case when coalesce(p_guardian,false) then nullif(btrim(p_guardian_name),'') else null end,
      guardian_phone=case when coalesce(p_guardian,false) then nullif(btrim(p_guardian_phone),'') else null end,
      guardian_verified_at=case when coalesce(p_guardian,false) then now() else null end,
      guardian_verified_by=case when coalesce(p_guardian,false) then auth.uid() else null end
  where id=p_user_id;
  perform public.log_action('review_member:'||p_user_id::text||':'||p_status||':'||p_role);
end;
$$;

revoke all on function public.review_member(uuid,text,text,boolean,text,text) from public,anon;
grant execute on function public.review_member(uuid,text,text,boolean,text,text) to authenticated;

-- Backwards-compatible overload for 4 arguments
create or replace function public.review_member(p_user_id uuid,p_status text,p_role text,p_guardian boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.review_member(p_user_id, p_status, p_role, p_guardian, null::text, null::text);
end;
$$;

revoke all on function public.review_member(uuid,text,text,boolean) from public,anon;
grant execute on function public.review_member(uuid,text,text,boolean) to authenticated;

commit;
