-- Run ONLY on an isolated Supabase project with migrations 001-005 applied.
-- Simulates roles/claims with fictitious users; every successful run rolls back.
-- This does not test real Auth, PostgREST or Storage object APIs.
begin;
with u as (insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(gen_random_uuid(),'authenticated','authenticated','bp-isolation-a@invalid.test','{}'::jsonb,'{}'::jsonb,now(),now()) returning id) select set_config('bp_test.a',id::text,true) from u;
with u as (insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(gen_random_uuid(),'authenticated','authenticated','bp-isolation-b@invalid.test','{}'::jsonb,'{}'::jsonb,now(),now()) returning id) select set_config('bp_test.b',id::text,true) from u;
with s as (insert into public.bp_salons(owner_id,slug,name,published) values(current_setting('bp_test.a')::uuid,'bp-isolation-a','Salon A fictif',true) returning id) select set_config('bp_test.salon_a',id::text,true) from s;
with s as (insert into public.bp_salons(owner_id,slug,name,published) values(current_setting('bp_test.b')::uuid,'bp-isolation-b','Salon B fictif',true) returning id) select set_config('bp_test.salon_b',id::text,true) from s;
with s as (insert into public.bp_services(salon_id,name,price,duration) values(current_setting('bp_test.salon_a')::uuid,'Service A fictif',1000,30) returning id) select set_config('bp_test.service_a',id::text,true) from s;
with s as (insert into public.bp_services(salon_id,name,price,duration,active) values(current_setting('bp_test.salon_a')::uuid,'Service masque',1000,30,false) returning id) select set_config('bp_test.hidden_service',id::text,true) from s;
with s as (insert into public.bp_services(salon_id,name,price,duration) values(current_setting('bp_test.salon_b')::uuid,'Service B fictif',1000,30) returning id) select set_config('bp_test.service_b',id::text,true) from s;
with g as (insert into public.bp_gallery(salon_id,path,visible) values(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.a')||'/'||current_setting('bp_test.salon_a')||'/hidden.png',false) returning id) select set_config('bp_test.hidden_gallery',id::text,true) from g;
select set_config('bp_test.day',((now() at time zone 'Africa/Abidjan')::date+case when extract(isodow from ((now() at time zone 'Africa/Abidjan')::date+1))=7 then 2 else 1 end)::text,true);
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.bp_services where id=current_setting('bp_test.service_a')::uuid)<>1 then raise exception 'public active service hidden'; end if;
 if (select count(*) from public.bp_services where id=current_setting('bp_test.hidden_service')::uuid)<>0 then raise exception 'inactive service exposed'; end if;
 if (select count(*) from public.bp_gallery where id=current_setting('bp_test.hidden_gallery')::uuid)<>0 then raise exception 'hidden gallery metadata exposed'; end if;
 begin perform public.bp_request_booking(current_setting('bp_test.salon_b')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date,'09:00'::time,'Client fictif','0102030405');raise exception 'cross-salon public booking succeeded';exception when raise_exception then if sqlerrm<>'Prestation indisponible' then raise;end if;end;
end $$;
select set_config('bp_test.booking',public.bp_request_booking(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date,'09:00'::time,'Client fictif','0102030405')::text,true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bp_test.b'),true);
do $$ declare changed integer; begin
 if (select count(*) from public.bp_bookings where id=current_setting('bp_test.booking')::uuid)<>0 then raise exception 'B can read A booking'; end if;
 if (select count(*) from public.bp_booking_events where booking_id=current_setting('bp_test.booking')::uuid)<>0 then raise exception 'B can read A booking history'; end if;
 update public.bp_services set price=1 where id=current_setting('bp_test.service_a')::uuid;get diagnostics changed=row_count;if changed<>0 then raise exception 'B modified A service';end if;
 delete from public.bp_gallery where id=current_setting('bp_test.hidden_gallery')::uuid;get diagnostics changed=row_count;if changed<>0 then raise exception 'B deleted A gallery metadata';end if;
 begin insert into public.bp_services(salon_id,name,price,duration) values(current_setting('bp_test.salon_a')::uuid,'Forged',1000,30);raise exception 'B inserted A service';exception when insufficient_privilege then null;end;
 begin update public.bp_bookings set status='confirmed' where id=current_setting('bp_test.booking')::uuid;raise exception 'direct booking update succeeded';exception when insufficient_privilege then null;end;
 begin perform public.bp_change_booking_status(current_setting('bp_test.booking')::uuid,'confirmed');raise exception 'B changed A booking';exception when raise_exception then if sqlerrm<>'Réservation introuvable' then raise;end if;end;
 begin perform public.bp_create_counter_booking(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date,'10:00'::time,'Client fictif','0102030405');raise exception 'B created A counter booking';exception when raise_exception then if sqlerrm<>'Accès refusé' then raise;end if;end;
 if exists(select 1 from public.bp_owner_available_slots(current_setting('bp_test.salon_a')::uuid,current_setting('bp_test.service_a')::uuid,current_setting('bp_test.day')::date)) then raise exception 'B can query A owner slots';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bp_test.a'),true);
do $$ begin
 if (select count(*) from public.bp_bookings where id=current_setting('bp_test.booking')::uuid and status='pending')<>1 then raise exception 'A booking missing';end if;
 begin update public.bp_salons set owner_id=current_setting('bp_test.b')::uuid where id=current_setting('bp_test.salon_a')::uuid;raise exception 'owner transfer succeeded';exception when insufficient_privilege then null;end;
 perform public.bp_change_booking_status(current_setting('bp_test.booking')::uuid,'confirmed');
 if (select count(*) from public.bp_booking_events where booking_id=current_setting('bp_test.booking')::uuid)<>2 then raise exception 'booking history incorrect';end if;
end $$;
rollback;
