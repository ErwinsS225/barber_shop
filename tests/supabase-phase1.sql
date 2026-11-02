-- Run ONLY on a disposable, isolated Supabase test project after migrations 001-004.
-- Transaction-scoped synthetic auth.users rows simulate JWT claims; they do not
-- test Supabase Auth, PostgREST, Storage uploads, or real concurrent sessions.
-- Any failed assertion aborts the transaction; successful execution rolls back.
begin;
with u as (insert into auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values (gen_random_uuid(),'authenticated','authenticated','bp-phase1-a@invalid.test','{}'::jsonb,'{}'::jsonb,now(),now()) returning id) select set_config('bp_test.owner_a',id::text,true) from u;
with u as (insert into auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values (gen_random_uuid(),'authenticated','authenticated','bp-phase1-b@invalid.test','{}'::jsonb,'{}'::jsonb,now(),now()) returning id) select set_config('bp_test.owner_b',id::text,true) from u;
with s as (insert into public.bp_salons(owner_id,slug,name,published) values (current_setting('bp_test.owner_a')::uuid,'bp-test-a','Salon fictif A',true) returning id) select set_config('bp_test.salon_a',id::text,true) from s;
with s as (insert into public.bp_salons(owner_id,slug,name,published) values (current_setting('bp_test.owner_b')::uuid,'bp-test-b','Salon fictif B',false) returning id) select set_config('bp_test.salon_b',id::text,true) from s;
with s as (insert into public.bp_services(salon_id,name,price,duration) values (current_setting('bp_test.salon_a')::uuid,'Prestation fictive A',1000,60) returning id) select set_config('bp_test.service_a',id::text,true) from s;
with s as (insert into public.bp_services(salon_id,name,price,duration) values (current_setting('bp_test.salon_b')::uuid,'Prestation fictive B',1000,30) returning id) select set_config('bp_test.service_b',id::text,true) from s;
select set_config('bp_test.day',((now() at time zone 'Africa/Abidjan')::date + case when extract(isodow from ((now() at time zone 'Africa/Abidjan')::date + 1))=7 then 2 else 1 end)::text,true);
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.bp_salons where id=current_setting('bp_test.salon_a')::uuid)<>1 then raise exception 'published salon missing'; end if;
 if (select count(*) from public.bp_salons where id=current_setting('bp_test.salon_b')::uuid)<>0 then raise exception 'unpublished salon exposed'; end if;
 if not exists(select 1 from public.bp_available_slots(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date) where slot='09:00') then raise exception 'public slot missing'; end if;
 begin perform * from public.bp_bookings; raise exception 'anonymous booking read succeeded'; exception when insufficient_privilege then null; end;
 begin perform * from public.bp_owner_dashboard(current_setting('bp_test.salon_a')::uuid); raise exception 'anonymous dashboard access succeeded'; exception when insufficient_privilege then null; end;
end $$;
select set_config('bp_test.booking',public.bp_request_booking(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date,'09:00'::time,'Client fictif','0102030405')::text,true);
do $$ begin
 if exists(select 1 from public.bp_available_slots(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date) where slot='09:30') then raise exception 'overlapping slot exposed'; end if;
 if not exists(select 1 from public.bp_available_slots(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date) where slot='10:00') then raise exception 'adjacent slot missing'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bp_test.owner_b'),true);
do $$ declare changed integer; begin
 if (select count(*) from public.bp_bookings where id=current_setting('bp_test.booking')::uuid)<>0 then raise exception 'B sees A booking'; end if;
 if (select count(*) from public.bp_booking_events where booking_id=current_setting('bp_test.booking')::uuid)<>0 then raise exception 'B sees A history'; end if;
 update public.bp_salons set name='Modification interdite' where id=current_setting('bp_test.salon_a')::uuid;
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'B modified A salon'; end if;
 begin perform public.bp_change_booking_status(current_setting('bp_test.booking')::uuid,'confirmed'); raise exception 'B changed A booking'; exception when raise_exception then if sqlerrm='B changed A booking' then raise; end if; end;
 begin perform * from public.bp_owner_dashboard(current_setting('bp_test.salon_a')::uuid); raise exception 'B accessed A dashboard'; exception when raise_exception then if sqlerrm='B accessed A dashboard' then raise; end if; end;
 if not exists(select 1 from public.bp_owner_available_slots(current_setting('bp_test.salon_b')::uuid,current_setting('bp_test.service_b')::uuid,current_setting('bp_test.day')::date) where slot='09:00') then raise exception 'draft owner slot missing'; end if;
 perform public.bp_create_counter_booking(current_setting('bp_test.salon_b')::uuid,current_setting('bp_test.service_b')::uuid,current_setting('bp_test.day')::date,'09:00'::time,'Client fictif','0102030405');
end $$;
select set_config('request.jwt.claim.sub',current_setting('bp_test.owner_a'),true);
do $$ declare i integer; begin
 if (select count(*) from public.bp_bookings where id=current_setting('bp_test.booking')::uuid and status='pending')<>1 then raise exception 'A missing pending booking'; end if;
 perform public.bp_change_booking_status(current_setting('bp_test.booking')::uuid,'confirmed');
 perform public.bp_change_booking_status(current_setting('bp_test.booking')::uuid,'completed');
 begin perform public.bp_change_booking_status(current_setting('bp_test.booking')::uuid,'confirmed'); raise exception 'invalid transition succeeded'; exception when raise_exception then if sqlerrm='invalid transition succeeded' then raise; end if; end;
 if (select count(*) from public.bp_booking_events where booking_id=current_setting('bp_test.booking')::uuid)<>3 then raise exception 'history count incorrect'; end if;
 if (select active_services from public.bp_owner_dashboard(current_setting('bp_test.salon_a')::uuid))<>1 then raise exception 'dashboard incorrect'; end if;
 update public.bp_salons set latitude=5.3,longitude=-4.0 where id=current_setting('bp_test.salon_a')::uuid;
 begin update public.bp_salons set latitude=91 where id=current_setting('bp_test.salon_a')::uuid; raise exception 'invalid GPS accepted'; exception when check_violation then null; end;
 for i in 1..6 loop insert into public.bp_gallery(salon_id,path) values(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.owner_a')||'/'||current_setting('bp_test.salon_a')||'/photo-'||i||'.png'); end loop;
 begin insert into public.bp_gallery(salon_id,path) values(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.owner_a')||'/'||current_setting('bp_test.salon_a')||'/photo-7.png'); raise exception 'seventh photo accepted'; exception when raise_exception then if sqlerrm='seventh photo accepted' then raise; end if; end;
 if (select count(*) from public.bp_gallery where salon_id=current_setting('bp_test.salon_a')::uuid)<>6 then raise exception 'gallery count incorrect'; end if;
end $$;
rollback;
