-- Owner ERP operations on the same salons/services/bookings as the public site.
-- Requires 001 and 002. Test on a separate Supabase project before production.

create table public.bp_booking_events (
 id bigint generated always as identity primary key,
 booking_id uuid not null references public.bp_bookings(id),
 salon_id uuid not null references public.bp_salons(id),
 actor_id uuid references auth.users(id),
 previous_status text,
 new_status text not null,
 created_at timestamptz not null default now()
);
create index bp_booking_events_booking_idx on public.bp_booking_events(booking_id,created_at);
alter table public.bp_booking_events enable row level security;
revoke all on public.bp_booking_events from anon, authenticated;
grant select on public.bp_booking_events to authenticated;
create policy bp_booking_events_owner_read on public.bp_booking_events for select to authenticated
 using (exists (select 1 from public.bp_salons s where s.id=salon_id and s.owner_id=auth.uid()));

create function public.bp_record_booking_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
   insert into public.bp_booking_events(booking_id,salon_id,actor_id,previous_status,new_status)
   values(new.id,new.salon_id,auth.uid(),null,new.status);
 elsif old.status is distinct from new.status then
   insert into public.bp_booking_events(booking_id,salon_id,actor_id,previous_status,new_status)
   values(new.id,new.salon_id,auth.uid(),old.status,new.status);
 end if;
 return new;
end $$;
revoke all on function public.bp_record_booking_event() from public;
create trigger bp_booking_history after insert or update of status on public.bp_bookings
for each row execute function public.bp_record_booking_event();

-- One shared schedule per salon; independent of public publication status.
create function public.bp_owner_available_slots(p_salon uuid,p_service uuid,p_day date)
returns table(slot text) language sql security definer set search_path=public,extensions as $$
 select to_char(t.start_at at time zone 'Africa/Abidjan','HH24:MI')
 from public.bp_salons salon
 join public.bp_services svc on svc.salon_id=salon.id and svc.id=p_service and svc.active
 cross join lateral generate_series((p_day + time '09:00') at time zone 'Africa/Abidjan', (p_day + time '18:30') at time zone 'Africa/Abidjan', interval '30 minutes') t(start_at)
 where salon.id=p_salon and salon.owner_id=auth.uid() and salon.active
 and p_day between (now() at time zone 'Africa/Abidjan')::date and (now() at time zone 'Africa/Abidjan')::date+90
 and extract(isodow from p_day) between 1 and 6 and t.start_at>now()
 and t.start_at + make_interval(mins=>svc.duration) <= (p_day + time '19:00') at time zone 'Africa/Abidjan'
 and not exists(select 1 from public.bp_bookings b where b.salon_id=salon.id and b.status in ('pending','confirmed') and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(t.start_at,t.start_at+make_interval(mins=>svc.duration),'[)'))
 order by t.start_at;
$$;

create function public.bp_create_counter_booking(p_salon uuid,p_service uuid,p_day date,p_time time,p_name text,p_phone text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare svc public.bp_services%rowtype; start_at timestamptz; new_id uuid;
begin
 if not exists(select 1 from public.bp_salons where id=p_salon and owner_id=auth.uid() and active) then raise exception 'Accès refusé'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 100 or p_phone is null or p_phone !~ '^[0-9+ ()-]{8,25}$' then raise exception 'Informations client invalides'; end if;
 if p_day is null or p_time is null then raise exception 'Créneau invalide'; end if;
 select * into svc from public.bp_services where id=p_service and salon_id=p_salon and active;
 if not found then raise exception 'Prestation indisponible'; end if;
 if not exists(select 1 from public.bp_owner_available_slots(p_salon,p_service,p_day) s where s.slot=to_char(p_time,'HH24:MI')) or extract(second from p_time)<>0 then raise exception 'Créneau indisponible'; end if;
 start_at := (p_day+p_time) at time zone 'Africa/Abidjan';
 insert into public.bp_bookings(salon_id,service_id,client_name,client_phone,starts_at,ends_at,service_name,price,status)
 values(p_salon,p_service,trim(p_name),trim(p_phone),start_at,start_at+make_interval(mins=>svc.duration),svc.name,svc.price,'confirmed') returning id into new_id;
 return new_id;
exception when exclusion_violation then raise exception 'Ce créneau vient d’être réservé';
end $$;

-- Counts are derived in the database; no bookings are treated as revenue.
create function public.bp_owner_dashboard(p_salon uuid)
returns table(today_bookings bigint, pending_bookings bigint, today_completed bigint, active_services bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.bp_salons s where s.id=p_salon and s.owner_id=auth.uid()) then raise exception 'Accès refusé'; end if;
 return query select
   count(*) filter (where (b.starts_at at time zone 'Africa/Abidjan')::date=(now() at time zone 'Africa/Abidjan')::date and b.status not in ('cancelled','rejected')),
   count(*) filter (where b.status='pending'),
   count(*) filter (where (b.starts_at at time zone 'Africa/Abidjan')::date=(now() at time zone 'Africa/Abidjan')::date and b.status='completed'),
   (select count(*) from public.bp_services s where s.salon_id=p_salon and s.active)
 from public.bp_bookings b where b.salon_id=p_salon;
end $$;
revoke all on function public.bp_owner_available_slots(uuid,uuid,date),public.bp_create_counter_booking(uuid,uuid,date,time,text,text),public.bp_owner_dashboard(uuid) from public;
grant execute on function public.bp_owner_available_slots(uuid,uuid,date),public.bp_create_counter_booking(uuid,uuid,date,time,text,text),public.bp_owner_dashboard(uuid) to authenticated;
