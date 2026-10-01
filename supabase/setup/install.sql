-- Shakers: instalación inicial en un proyecto nuevo. Ejecutar una sola vez.
-- Proyecto previsto: wjphfluvzsfnbjcwifgc. No contiene datos de demostración.
begin;

-- Fuente: 202609220001_community.sql
-- Shakers v1. Apply to a new Supabase project. No sample users or sample content.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  age_group text not null default '18+' check (age_group in ('13-17','18+')),
  interests text not null default '' check (char_length(interests) <= 300),
  avatar_url text
);
create table public.memberships (
  id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','leader','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  guardian_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 300),
  description text not null check (char_length(btrim(description)) between 2 and 3000),
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
  location text not null check (char_length(btrim(location)) between 2 and 300),
  category text not null check (category in ('Encuentro','Servicio','Estudio')),
  capacity integer check (capacity > 0),
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'draft' check (status in ('draft','published','cancelled','finished')),
  image_url text not null default '/images/worship.jpg' check (image_url ~ '^https://' or image_url ~ '^/images/[a-zA-Z0-9._/-]+$'),
  owner_id uuid not null references public.profiles(id)
);
create table public.registrations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(),
  unique(event_id,user_id)
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, user_id uuid not null, present boolean not null default false,
  unique(event_id,user_id), foreign key(event_id,user_id) references public.registrations(event_id,user_id) on delete cascade
);
create table public.teams (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(btrim(name)) between 2 and 100),
  description text not null check (char_length(description) <= 3000), leader_id uuid not null references public.profiles(id)
);
create table public.team_members (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, unique(team_id,user_id)
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(), team_id uuid not null, user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  task text not null check (char_length(btrim(task)) between 2 and 3000),
  status text not null default 'pending' check (status in ('pending','confirmed','declined')),
  foreign key(team_id,user_id) references public.team_members(team_id,user_id) on delete cascade,
  unique(team_id,event_id,user_id,task)
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null check (char_length(btrim(title)) between 2 and 300),
  body text not null check (char_length(btrim(body)) between 2 and 20000), team_id uuid references public.teams(id),
  expires_at timestamptz not null, featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')), owner_id uuid not null references public.profiles(id)
);
create table public.resources (
  id uuid primary key default gen_random_uuid(), title text not null check (char_length(btrim(title)) between 2 and 300),
  description text not null check (char_length(btrim(description)) between 2 and 3000),
  category text not null check (char_length(btrim(category)) between 2 and 100),
  kind text not null check (kind in ('article','video','pdf')), url text not null default '', body text not null default '' check (char_length(body) <= 20000),
  image_url text not null default '/images/study.jpg' check (image_url ~ '^https://' or image_url ~ '^/images/[a-zA-Z0-9._/-]+$'),
  status text not null default 'draft' check (status in ('draft','published')),
  visibility text not null default 'public' check (visibility in ('public','private')), owner_id uuid not null references public.profiles(id),
  check (kind = 'article' or url ~ '^https://' or (kind='pdf' and url ~ '^storage://documents/[a-f0-9-]+/[a-f0-9-]+\.pdf$')),
  check (status='draft' or kind<>'article' or char_length(btrim(body)) >= 5)
);
-- Keep identity in a separate protected relation. Anonymous prayers never expose the author's UUID to other members.
create table public.prayer_entries (
  id uuid primary key default gen_random_uuid(), body text not null check (char_length(btrim(body)) between 5 and 1500),
  visibility text not null default 'private' check (visibility in ('private','community')),
  anonymous boolean not null default false, author_label text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz not null default now()
);
create table public.prayer_authors (
  prayer_id uuid primary key references public.prayer_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade
);
create table public.prayer_reactions (
  id uuid primary key default gen_random_uuid(), prayer_id uuid not null references public.prayer_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, unique(prayer_id,user_id)
);
create table public.prayer_reports (
  id uuid primary key default gen_random_uuid(), prayer_id uuid not null references public.prayer_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, reason text not null check (char_length(btrim(reason)) between 5 and 500),
  resolved boolean not null default false, unique(prayer_id,user_id)
);
create table public.polls (
  id uuid primary key default gen_random_uuid(), question text not null check (char_length(btrim(question)) between 5 and 300),
  options text[] not null check (cardinality(options) between 2 and 5), closes_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published')), owner_id uuid not null references public.profiles(id)
);
create table public.votes (
  id uuid primary key default gen_random_uuid(), poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, option_index integer not null check (option_index >= 0), unique(poll_id,user_id)
);
create table public.leader_profiles (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(btrim(name)) between 2 and 80),
  function text not null check (char_length(btrim(function)) between 2 and 100), bio text not null check (char_length(bio) <= 3000),
  image_url text not null default '' check (image_url='' or image_url ~ '^https://' or image_url ~ '^/images/[a-zA-Z0-9._/-]+$'),
  published boolean not null default false, consent boolean not null default false, check (not published or consent)
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null,
  action text not null, created_at timestamptz not null default now()
);
create index events_schedule on public.events(starts_at,status);
create index registrations_user on public.registrations(user_id);
create index team_members_user on public.team_members(user_id);
create index assignments_user on public.assignments(user_id);
create index prayer_authors_user on public.prayer_authors(user_id);
create index votes_user on public.votes(user_id);
create index memberships_pending on public.memberships(status);

-- All definer functions have an empty search_path and fully qualified references.
create function public.is_member() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where id=auth.uid() and status='approved');
$$;
create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where id=auth.uid() and status='approved' and role in ('leader','admin'));
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where id=auth.uid() and status='approved' and role='admin');
$$;
create function public.manages_event(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_admin() or (public.is_staff() and exists(select 1 from public.events where id=p_id and owner_id=auth.uid()));
$$;
create function public.manages_team(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_admin() or (public.is_staff() and exists(select 1 from public.teams where id=p_id and leader_id=auth.uid()));
$$;
create function public.in_team(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_member() and exists(select 1 from public.team_members where team_id=p_id and user_id=auth.uid());
$$;
create function public.is_my_leader(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_member() and exists(select 1 from public.teams t join public.team_members m on m.team_id=t.id where t.leader_id=p_id and m.user_id=auth.uid());
$$;
create function public.owns_prayer(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_member() and exists(select 1 from public.prayer_authors where prayer_id=p_id and user_id=auth.uid());
$$;
create function public.moderates_prayer(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_admin() or (public.is_staff() and exists(select 1 from public.prayer_entries where id=p_id and visibility='community'));
$$;
create function public.log_action(p_action text) returns void language sql security definer set search_path='' as $$
  insert into public.audit_log(actor_id,action) values(auth.uid(),p_action);
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','memberships','events','registrations','attendance','teams','team_members','assignments','announcements','resources','prayer_entries','prayer_authors','prayer_reactions','prayer_reports','polls','votes','leader_profiles','audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to anon, authenticated',t);
  end loop;
end $$;

create policy profile_read on public.profiles for select using (id=auth.uid() or public.is_staff() or public.is_my_leader(id));
create policy membership_read on public.memberships for select using (id=auth.uid() or public.is_staff());
create policy event_read on public.events for select using ((status<>'draft' and (visibility='public' or public.is_member())) or public.manages_event(id));
create policy event_insert on public.events for insert with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()));
create policy event_update on public.events for update using (public.manages_event(id)) with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()));
create policy registration_read on public.registrations for select using (public.is_member() and (user_id=auth.uid() or public.manages_event(event_id)));
create policy attendance_read on public.attendance for select using (public.is_member() and (user_id=auth.uid() or public.manages_event(event_id)));
create policy team_read on public.teams for select using (public.is_staff() or public.in_team(id));
create policy team_insert on public.teams for insert with check (public.is_staff() and (leader_id=auth.uid() or public.is_admin()));
create policy team_update on public.teams for update using (public.manages_team(id)) with check (public.is_staff() and (leader_id=auth.uid() or public.is_admin()));
create policy team_member_read on public.team_members for select using (public.is_member() and (user_id=auth.uid() or public.manages_team(team_id)));
create policy team_member_write on public.team_members for all to authenticated using (public.manages_team(team_id)) with check (public.manages_team(team_id));
create policy assignment_read on public.assignments for select using (public.is_member() and (user_id=auth.uid() or public.manages_team(team_id)));
create policy assignment_write on public.assignments for all to authenticated using (public.manages_team(team_id)) with check (public.manages_team(team_id));
create policy announcement_read on public.announcements for select using ((public.is_staff() and (owner_id=auth.uid() or public.is_admin())) or (public.is_member() and status='published' and expires_at>now() and (team_id is null or public.in_team(team_id) or public.manages_team(team_id))));
create policy announcement_insert on public.announcements for insert with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()) and (team_id is null or public.manages_team(team_id)));
create policy announcement_update on public.announcements for update using (public.is_staff() and (owner_id=auth.uid() or public.is_admin())) with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()) and (team_id is null or public.manages_team(team_id)));
create policy resource_read on public.resources for select using ((status='published' and (visibility='public' or public.is_member())) or (public.is_staff() and (owner_id=auth.uid() or public.is_admin())));
create policy resource_insert on public.resources for insert with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()));
create policy resource_update on public.resources for update using (public.is_staff() and (owner_id=auth.uid() or public.is_admin())) with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()));
create policy prayer_read on public.prayer_entries for select using (public.owns_prayer(id) or public.moderates_prayer(id) or (public.is_member() and visibility='community' and status='approved'));
create policy prayer_author_read on public.prayer_authors for select using (public.owns_prayer(prayer_id) or public.moderates_prayer(prayer_id));
create view public.prayers with (security_invoker=true) as select p.*,a.user_id from public.prayer_entries p left join public.prayer_authors a on p.id=a.prayer_id;
grant select on public.prayers to anon,authenticated;
create policy reaction_read on public.prayer_reactions for select using (public.is_member() and user_id=auth.uid());
create policy report_read on public.prayer_reports for select using (public.is_staff());
create policy report_resolve on public.prayer_reports for update using (public.is_staff()) with check (public.is_staff());
create policy poll_read on public.polls for select using (public.is_member() and (status='published' or (public.is_staff() and (owner_id=auth.uid() or public.is_admin()))));
create policy poll_insert on public.polls for insert with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()));
create policy poll_update on public.polls for update using (public.is_staff() and (owner_id=auth.uid() or public.is_admin())) with check (public.is_staff() and (owner_id=auth.uid() or public.is_admin()));
create policy vote_read on public.votes for select using (public.is_member() and user_id=auth.uid());
create policy leader_read on public.leader_profiles for select using ((published and consent) or public.is_admin());
create policy leader_write on public.leader_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy audit_read on public.audit_log for select using (public.is_admin());
grant insert,update on public.events,public.teams,public.team_members,public.assignments,public.announcements,public.resources,public.polls,public.leader_profiles to authenticated;
grant delete on public.team_members,public.assignments to authenticated;
grant update(resolved) on public.prayer_reports to authenticated;

create function public.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,name) values(new.id,case when length(btrim(coalesce(new.raw_user_meta_data->>'full_name',''))) >= 2 then left(btrim(new.raw_user_meta_data->>'full_name'),80) else 'Nuevo miembro' end);
  return new;
end;
$$;
create trigger shakers_signup after insert on auth.users for each row execute function public.on_signup();

create function public.submit_membership(p_name text,p_age_group text,p_interests text default '') returns void language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  select status into current_status from public.memberships where id=auth.uid() for update;
  if current_status in ('approved','suspended') then raise exception 'No puedes cambiar esta solicitud.'; end if;
  update public.profiles set name=btrim(p_name),age_group=p_age_group,interests=coalesce(p_interests,'') where id=auth.uid();
  insert into public.memberships(id) values(auth.uid()) on conflict(id) do update set status='pending',guardian_confirmed=false;
  perform public.log_action('submit_membership');
end;
$$;
create function public.update_profile(p_name text,p_interests text default '') returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_member() then raise exception 'Tu acceso no está aprobado.'; end if;
  update public.profiles set name=btrim(p_name),interests=coalesce(p_interests,'') where id=auth.uid();
end;
$$;
create function public.review_member(p_user_id uuid,p_status text,p_role text,p_guardian boolean) returns void language plpgsql security definer set search_path='' as $$
declare target public.memberships; age text;
begin
  perform pg_catalog.pg_advisory_xact_lock(227001);
  if not public.is_staff() or p_user_id=auth.uid() then raise exception 'No tienes permiso para esta acción.'; end if;
  select * into target from public.memberships where id=p_user_id for update;
  if not found then raise exception 'Solicitud no encontrada.'; end if;
  if not public.is_admin() and (target.status<>'pending' or target.role<>'member' or p_role<>'member' or p_status not in ('approved','rejected')) then raise exception 'Solo coordinación puede cambiar este acceso.'; end if;
  select age_group into age from public.profiles where id=p_user_id;
  if p_status='approved' and age='13-17' and not coalesce(p_guardian,false) then raise exception 'Confirma primero la autorización del responsable.'; end if;
  if p_role in ('leader','admin') and age<>'18+' then raise exception 'Los permisos de liderazgo requieren un responsable adulto.'; end if;
  update public.memberships set status=p_status,role=p_role,guardian_confirmed=coalesce(p_guardian,false) where id=p_user_id;
  perform public.log_action('review_member:'||p_user_id::text||':'||p_status||':'||p_role);
end;
$$;
create function public.set_registration(p_event_id uuid,p_register boolean) returns void language plpgsql security definer set search_path='' as $$
declare ev public.events; total integer;
begin
  if not public.is_member() then raise exception 'Tu acceso todavía no está aprobado.'; end if;
  if p_register is null then raise exception 'Indica si deseas inscribirte.'; end if;
  select * into ev from public.events where id=p_event_id for update;
  if not found or ev.status<>'published' or ev.starts_at<=now() then raise exception 'Este encuentro no admite cambios de inscripción.'; end if;
  if not p_register then delete from public.registrations where event_id=p_event_id and user_id=auth.uid(); return; end if;
  if exists(select 1 from public.registrations where event_id=p_event_id and user_id=auth.uid()) then return; end if;
  select count(*) into total from public.registrations where event_id=p_event_id;
  if ev.capacity is not null and total>=ev.capacity then raise exception 'El encuentro está completo.'; end if;
  insert into public.registrations(event_id,user_id) values(p_event_id,auth.uid());
end;
$$;
create function public.event_registration_count(p_event_id uuid) returns integer language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.events where id=p_event_id and ((status<>'draft' and (visibility='public' or public.is_member())) or public.manages_event(id))) then raise exception 'Encuentro no disponible.'; end if;
  return (select count(*)::integer from public.registrations where event_id=p_event_id);
end;
$$;
create function public.set_attendance(p_event_id uuid,p_user_id uuid,p_present boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.manages_event(p_event_id) then raise exception 'No tienes permiso para registrar asistencia.'; end if;
  insert into public.attendance(event_id,user_id,present) values(p_event_id,p_user_id,p_present) on conflict(event_id,user_id) do update set present=excluded.present;
  perform public.log_action('set_attendance:'||p_event_id::text);
end;
$$;
create function public.respond_assignment(p_assignment_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_member() or p_status not in ('confirmed','declined') then raise exception 'Respuesta no permitida.'; end if;
  update public.assignments a set status=p_status where a.id=p_assignment_id and a.user_id=auth.uid() and exists(select 1 from public.events e where e.id=a.event_id and e.status='published' and e.ends_at>now());
  if not found then raise exception 'Esta responsabilidad ya no está disponible.'; end if;
end;
$$;
create function public.submit_prayer(p_body text,p_visibility text,p_anonymous boolean) returns void language plpgsql security definer set search_path='' as $$
declare prayer_id uuid; label text;
begin
  if not public.is_member() then raise exception 'Tu acceso no está aprobado.'; end if;
  select case when p_anonymous then 'Alguien de la comunidad' else split_part(name,' ',1) end into label from public.profiles where id=auth.uid();
  insert into public.prayer_entries(body,visibility,anonymous,author_label) values(btrim(p_body),p_visibility,p_anonymous,label) returning id into prayer_id;
  insert into public.prayer_authors(prayer_id,user_id) values(prayer_id,auth.uid());
end;
$$;
create function public.review_prayer(p_prayer_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.moderates_prayer(p_prayer_id) or p_status not in ('approved','rejected') then raise exception 'No tienes permiso para revisar esta petición.'; end if;
  update public.prayer_entries set status=p_status where id=p_prayer_id;
  perform public.log_action('review_prayer:'||p_prayer_id::text||':'||p_status);
end;
$$;
create function public.react_to_prayer(p_prayer_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_member() or not exists(select 1 from public.prayer_entries where id=p_prayer_id and visibility='community' and status='approved') then raise exception 'Petición no disponible.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_prayer_id::text,0));
  delete from public.prayer_reactions where prayer_id=p_prayer_id and user_id=auth.uid();
  if not found then insert into public.prayer_reactions(prayer_id,user_id) values(p_prayer_id,auth.uid()); end if;
end;
$$;
create function public.report_prayer(p_prayer_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_member() or not exists(select 1 from public.prayer_entries where id=p_prayer_id and visibility='community' and status='approved') then raise exception 'Petición no disponible.'; end if;
  insert into public.prayer_reports(prayer_id,user_id,reason) values(p_prayer_id,auth.uid(),btrim(p_reason)) on conflict(prayer_id,user_id) do update set reason=excluded.reason,resolved=false;
end;
$$;
create function public.cast_vote(p_poll_id uuid,p_option integer) returns void language plpgsql security definer set search_path='' as $$
declare p public.polls;
begin
  if not public.is_member() then raise exception 'Tu acceso no está aprobado.'; end if;
  select * into p from public.polls where id=p_poll_id for share;
  if not found or p.status<>'published' or p.closes_at<=now() then raise exception 'La encuesta está cerrada.'; end if;
  if p_option is null or p_option<0 or p_option>=cardinality(p.options) then raise exception 'Opción inválida.'; end if;
  insert into public.votes(poll_id,user_id,option_index) values(p_poll_id,auth.uid(),p_option) on conflict(poll_id,user_id) do update set option_index=excluded.option_index;
end;
$$;
create function public.poll_results(p_poll_id uuid) returns integer[] language plpgsql stable security definer set search_path='' as $$
declare p public.polls;
begin
  select * into p from public.polls where id=p_poll_id;
  if not found or not public.is_member() or (p.status<>'published' and not (public.is_staff() and (p.owner_id=auth.uid() or public.is_admin()))) then raise exception 'Encuesta no disponible.'; end if;
  return array(select (select count(*)::integer from public.votes where poll_id=p_poll_id and option_index=i) from generate_series(0,cardinality(p.options)-1) i);
end;
$$;

create function public.validate_event() returns trigger language plpgsql security definer set search_path='' as $$
declare total integer;
begin
  if not exists(select 1 from public.memberships where id=new.owner_id and status='approved' and role in ('leader','admin')) then raise exception 'Selecciona un responsable activo.'; end if;
  select count(*) into total from public.registrations where event_id=new.id;
  if new.capacity is not null and total>new.capacity then raise exception 'El cupo no puede ser menor a los inscritos.'; end if;
  if new.status='draft' and total>0 then raise exception 'Un encuentro con inscritos no puede volver a borrador. Puedes cancelarlo.'; end if;
  return new;
end;
$$;
create trigger validate_event before insert or update on public.events for each row execute function public.validate_event();
create function public.validate_poll() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(227002);
  if exists(select 1 from unnest(new.options) o where char_length(btrim(o)) not between 1 and 200 or o is null) or (select count(distinct o) from unnest(new.options) o)<>cardinality(new.options) then raise exception 'Usa opciones distintas y completas.'; end if;
  if tg_op='UPDATE' and old.options is distinct from new.options and exists(select 1 from public.votes where poll_id=new.id) then raise exception 'No puedes cambiar las opciones de una encuesta que ya tiene votos.'; end if;
  if new.status='published' and new.closes_at>now() and exists(select 1 from public.polls where id<>new.id and status='published' and closes_at>now()) then raise exception 'Cierra la encuesta activa antes de publicar otra.'; end if;
  return new;
end;
$$;
create trigger validate_poll before insert or update on public.polls for each row execute function public.validate_poll();
create function public.validate_team() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.memberships where id=new.leader_id and status='approved' and role in ('leader','admin')) then raise exception 'Selecciona un líder activo.'; end if;
  return new;
end;
$$;
create trigger validate_team before insert or update on public.teams for each row execute function public.validate_team();
create function public.validate_team_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.memberships where id=new.user_id and status='approved') then raise exception 'Selecciona un miembro aprobado.'; end if;
  return new;
end;
$$;
create trigger validate_team_member before insert or update on public.team_members for each row execute function public.validate_team_member();
create function public.audit_content() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.log_action(lower(tg_op)||':'||tg_table_name||':'||new.id::text);
  return new;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['events','teams','team_members','assignments','announcements','resources','polls','leader_profiles'] loop
    execute format('create trigger audit_content after insert or update on public.%I for each row execute function public.audit_content()',t);
  end loop;
end $$;

-- Explicit function grants: never expose definer helpers that write to arbitrary relations.
revoke execute on all functions in schema public from public,anon,authenticated;
grant usage on schema public to anon,authenticated;
grant execute on function public.is_member(),public.is_staff(),public.is_admin(),public.manages_event(uuid),public.manages_team(uuid),public.in_team(uuid),public.is_my_leader(uuid),public.owns_prayer(uuid),public.moderates_prayer(uuid),public.event_registration_count(uuid) to anon,authenticated;
grant execute on function public.submit_membership(text,text,text),public.update_profile(text,text),public.review_member(uuid,text,text,boolean),public.set_registration(uuid,boolean),public.set_attendance(uuid,uuid,boolean),public.respond_assignment(uuid,text),public.submit_prayer(text,text,boolean),public.review_prayer(uuid,text),public.react_to_prayer(uuid),public.report_prayer(uuid,text),public.cast_vote(uuid,integer),public.poll_results(uuid) to authenticated;

-- Fuente: 202609220002_storage.sql
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

-- Fuente: 202609220003_notifications.sql
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid references public.events(id) on delete cascade,
 body text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index notifications_user on public.notifications(user_id,created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to anon,authenticated;
create policy notification_read on public.notifications for select using (public.is_member() and user_id=auth.uid());
create function public.mark_notification(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_member() then raise exception 'Tu acceso no está aprobado.'; end if;
 update public.notifications set read_at=now() where id=p_id and user_id=auth.uid();
end;
$$;
revoke execute on function public.mark_notification(uuid) from public,anon;
grant execute on function public.mark_notification(uuid) to authenticated;
create function public.notify_event_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.starts_at,new.ends_at,new.location,new.status) is distinct from (old.starts_at,old.ends_at,old.location,old.status) then
  insert into public.notifications(user_id,event_id,body)
  select user_id,new.id,case when new.status='cancelled' then 'Se canceló el encuentro: ' else 'Hay cambios en tu encuentro: ' end || new.title
  from public.registrations where event_id=new.id;
 end if;
 return new;
end;
$$;
create trigger notify_event_change after update on public.events for each row execute function public.notify_event_change();
create function public.notify_assignment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or (new.user_id,new.task,new.event_id) is distinct from (old.user_id,old.task,old.event_id) then
  insert into public.notifications(user_id,event_id,body) values(new.user_id,new.event_id,'Tu equipo cuenta contigo: '||new.task);
 end if;
 return new;
end;
$$;
create trigger notify_assignment after insert or update on public.assignments for each row execute function public.notify_assignment();
revoke execute on function public.notify_event_change(),public.notify_assignment() from public,anon,authenticated;
notify pgrst, 'reload schema';

-- Profile photos and event galleries
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
