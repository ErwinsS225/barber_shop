-- BARBERPRO public vitrine MVP. Review in a separate test project before deploying.
-- This schema is standalone and does not yet integrate with ERP tenants/employees.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

create table public.bp_salons (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
 name text not null check (length(trim(name)) between 2 and 100),
 city text not null default 'Abidjan' check (length(city) <= 100),
 address text not null default '' check (length(address) <= 200),
 phone text not null default '' check (length(phone) <= 30),
 tagline text not null default '' check (length(tagline) <= 160),
 description text not null default '' check (length(description) <= 1500),
 published boolean not null default false,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(owner_id)
);
create table public.bp_services (
 id uuid primary key default gen_random_uuid(),
 salon_id uuid not null references public.bp_salons(id) on delete cascade,
 name text not null check (length(trim(name)) between 2 and 100),
 description text not null default '' check (length(description) <= 500),
 price integer not null check(price >= 0 and price <= 10000000),
 duration integer not null check(duration between 15 and 240),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(id,salon_id)
);
create table public.bp_gallery (
 id uuid primary key default gen_random_uuid(),
 salon_id uuid not null references public.bp_salons(id) on delete cascade,
 path text not null unique,
 caption text not null default '' check(length(caption) <= 140),
 position integer not null default 0,
 visible boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.bp_bookings (
 id uuid primary key default gen_random_uuid(),
 salon_id uuid not null references public.bp_salons(id),
 service_id uuid not null,
 client_name text not null check(length(trim(client_name)) between 2 and 100),
 client_phone text not null check(client_phone ~ '^[0-9+ ()-]{8,25}$'),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 service_name text not null,
 price integer not null,
 status text not null default 'pending' check(status in ('pending','confirmed','completed','cancelled','rejected','no_show')),
 created_at timestamptz not null default now(),
 foreign key (service_id,salon_id) references public.bp_services(id,salon_id),
 check(ends_at > starts_at),
 exclude using gist (salon_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status in ('pending','confirmed'))
);
create index bp_services_salon_idx on public.bp_services(salon_id);
create index bp_gallery_salon_idx on public.bp_gallery(salon_id,position);
create index bp_bookings_salon_start_idx on public.bp_bookings(salon_id,starts_at);

alter table public.bp_salons enable row level security;
alter table public.bp_services enable row level security;
alter table public.bp_gallery enable row level security;
alter table public.bp_bookings enable row level security;
revoke all on public.bp_salons,public.bp_services,public.bp_gallery,public.bp_bookings from anon,authenticated;
grant select on public.bp_salons,public.bp_services,public.bp_gallery to anon,authenticated;
grant insert,update,delete on public.bp_salons,public.bp_services,public.bp_gallery to authenticated;
grant select on public.bp_bookings to authenticated;
create policy salons_read on public.bp_salons for select using ((published and active) or owner_id = auth.uid());
create policy salons_insert on public.bp_salons for insert to authenticated with check (owner_id=auth.uid());
create policy salons_update on public.bp_salons for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy salons_delete on public.bp_salons for delete to authenticated using (owner_id=auth.uid());
create policy services_read on public.bp_services for select using (exists(select 1 from public.bp_salons s where s.id=salon_id and (s.owner_id=auth.uid() or (s.published and s.active and bp_services.active))));
create policy services_manage on public.bp_services for all to authenticated using (exists(select 1 from public.bp_salons s where s.id=salon_id and s.owner_id=auth.uid())) with check (exists(select 1 from public.bp_salons s where s.id=salon_id and s.owner_id=auth.uid()));
create policy gallery_read on public.bp_gallery for select using (exists(select 1 from public.bp_salons s where s.id=salon_id and (s.owner_id=auth.uid() or (s.published and s.active and bp_gallery.visible))));
create policy gallery_manage on public.bp_gallery for all to authenticated using (exists(select 1 from public.bp_salons s where s.id=salon_id and s.owner_id=auth.uid())) with check (exists(select 1 from public.bp_salons s where s.id=salon_id and s.owner_id=auth.uid()) and split_part(path,'/',1)=auth.uid()::text and split_part(path,'/',2)=salon_id::text);
create policy bookings_owner_read on public.bp_bookings for select to authenticated using (exists(select 1 from public.bp_salons s where s.id=salon_id and s.owner_id=auth.uid()));

-- Demo schedule for the first release: Mon-Sat, 09:00-19:00 Africa/Abidjan,
-- one shared resource per salon. No employee calendars or holidays yet.
create or replace function public.bp_available_slots(p_salon uuid,p_service uuid,p_day date)
returns table(slot text) language sql security definer set search_path=public,extensions as $$
 select to_char(t.start_at at time zone 'Africa/Abidjan','HH24:MI')
 from public.bp_salons salon
 join public.bp_services svc on svc.salon_id=salon.id and svc.id=p_service and svc.active
 cross join lateral generate_series((p_day + time '09:00') at time zone 'Africa/Abidjan', (p_day + time '18:30') at time zone 'Africa/Abidjan', interval '30 minutes') t(start_at)
 where salon.id=p_salon and salon.published and salon.active
 and p_day between (now() at time zone 'Africa/Abidjan')::date and (now() at time zone 'Africa/Abidjan')::date+90
 and extract(isodow from p_day) between 1 and 6 and t.start_at>now()
 and t.start_at + make_interval(mins=>svc.duration) <= (p_day + time '19:00') at time zone 'Africa/Abidjan'
 and not exists(select 1 from public.bp_bookings b where b.salon_id=salon.id and b.status in ('pending','confirmed') and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(t.start_at,t.start_at+make_interval(mins=>svc.duration),'[)'))
 order by t.start_at;
$$;
create or replace function public.bp_request_booking(p_salon uuid,p_service uuid,p_day date,p_time time,p_name text,p_phone text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare svc public.bp_services%rowtype; start_at timestamptz; new_id uuid;
begin
 if p_name is null or length(trim(p_name)) not between 2 and 100 or p_phone is null or p_phone !~ '^[0-9+ ()-]{8,25}$' then raise exception 'Informations client invalides'; end if;
 if p_day is null or p_time is null then raise exception 'Créneau invalide'; end if;
 select * into svc from public.bp_services where id=p_service and salon_id=p_salon and active and exists(select 1 from public.bp_salons where id=p_salon and published and active);
 if not found then raise exception 'Prestation indisponible'; end if;
 if not exists(select 1 from public.bp_available_slots(p_salon,p_service,p_day) s where s.slot=to_char(p_time,'HH24:MI')) or extract(second from p_time)<>0 then raise exception 'Créneau indisponible'; end if;
 start_at := (p_day+p_time) at time zone 'Africa/Abidjan';
 insert into public.bp_bookings(salon_id,service_id,client_name,client_phone,starts_at,ends_at,service_name,price)
 values(p_salon,p_service,trim(p_name),trim(p_phone),start_at,start_at+make_interval(mins=>svc.duration),svc.name,svc.price) returning id into new_id;
 return new_id;
exception when exclusion_violation then raise exception 'Ce créneau vient d’être réservé';
end $$;
create or replace function public.bp_change_booking_status(p_booking uuid,p_status text)
returns void language plpgsql security definer set search_path=public,extensions as $$
declare current_status text;
begin
 select b.status into current_status from public.bp_bookings b join public.bp_salons s on s.id=b.salon_id where b.id=p_booking and s.owner_id=auth.uid() for update of b;
 if not found then raise exception 'Réservation introuvable'; end if;
 if not ((current_status='pending' and p_status in ('confirmed','rejected','cancelled')) or (current_status='confirmed' and p_status in ('completed','cancelled','no_show'))) then raise exception 'Transition non autorisée'; end if;
 update public.bp_bookings set status=p_status where id=p_booking;
end $$;
revoke all on function public.bp_available_slots(uuid,uuid,date),public.bp_request_booking(uuid,uuid,date,time,text,text),public.bp_change_booking_status(uuid,text) from public;
grant execute on function public.bp_available_slots(uuid,uuid,date),public.bp_request_booking(uuid,uuid,date,time,text,text) to anon,authenticated;
grant execute on function public.bp_change_booking_status(uuid,text) to authenticated;

-- Images are public objects: an unlisted/hidden image can still be viewed by anyone
-- who knows its URL. Do not upload confidential material.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('barberpro-gallery','barberpro-gallery',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy bp_gallery_storage_insert on storage.objects for insert to authenticated with check (bucket_id='barberpro-gallery' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.bp_salons s where s.id::text=(storage.foldername(name))[2] and s.owner_id=auth.uid()));
create policy bp_gallery_storage_delete on storage.objects for delete to authenticated using (bucket_id='barberpro-gallery' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.bp_salons s where s.id::text=(storage.foldername(name))[2] and s.owner_id=auth.uid()));
