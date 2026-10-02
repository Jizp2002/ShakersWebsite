-- A requested role is a preference, never an authorization claim.
alter table public.memberships add column requested_role text not null default 'member'
  check (requested_role in ('member','leader'));

create function public.submit_membership(p_name text,p_age_group text,p_interests text,p_requested_role text)
returns void language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.'; end if;
  if p_requested_role is null or p_requested_role not in ('member','leader') then raise exception 'Elige joven o líder.'; end if;
  if p_requested_role='leader' and p_age_group is distinct from '18+' then raise exception 'El liderazgo requiere ser adulto.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  select status into current_status from public.memberships where id=auth.uid() for update;
  if current_status in ('approved','suspended') then raise exception 'No puedes cambiar esta solicitud.'; end if;
  update public.profiles set name=btrim(p_name),age_group=p_age_group,interests=coalesce(p_interests,'') where id=auth.uid();
  insert into public.memberships(id,requested_role) values(auth.uid(),p_requested_role)
    on conflict(id) do update set status='pending',role='member',guardian_confirmed=false,requested_role=excluded.requested_role;
  perform public.log_action('submit_membership');
end;
$$;
revoke all on function public.submit_membership(text,text,text,text) from public,anon;
grant execute on function public.submit_membership(text,text,text,text) to authenticated;

-- Older deployed clients remain compatible during the Netlify rollout.
create or replace function public.submit_membership(p_name text,p_age_group text,p_interests text default '')
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform public.submit_membership(p_name,p_age_group,p_interests,'member');
end;
$$;

create or replace function public.review_member(p_user_id uuid,p_status text,p_role text,p_guardian boolean) returns void language plpgsql security definer set search_path='' as $$
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
  update public.memberships set status=p_status,role=p_role,guardian_confirmed=coalesce(p_guardian,false) where id=p_user_id;
  perform public.log_action('review_member:'||p_user_id::text||':'||p_status||':'||p_role);
end;
$$;
