begin;
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
commit;
