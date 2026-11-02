-- Run ONLY on an isolated Supabase project after migrations 001-005.
-- Uses transaction-scoped fictitious users and storage.objects metadata only;
-- no file is uploaded and no direct Storage deletion is attempted. Roll back.
begin;
with u as (insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(gen_random_uuid(),'authenticated','authenticated','bp-phase1-storage-a@invalid.test','{}'::jsonb,'{}'::jsonb,now(),now()) returning id) select set_config('bp_test.owner_a',id::text,true) from u;
with u as (insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(gen_random_uuid(),'authenticated','authenticated','bp-phase1-storage-b@invalid.test','{}'::jsonb,'{}'::jsonb,now(),now()) returning id) select set_config('bp_test.owner_b',id::text,true) from u;
with s as (insert into public.bp_salons(owner_id,slug,name) values(current_setting('bp_test.owner_a')::uuid,'bp-test-storage-a','Salon fictif A') returning id) select set_config('bp_test.salon_a',id::text,true) from s;
with s as (insert into public.bp_salons(owner_id,slug,name) values(current_setting('bp_test.owner_b')::uuid,'bp-test-storage-b','Salon fictif B') returning id) select set_config('bp_test.salon_b',id::text,true) from s;
-- This specially-shaped salon name exposes the old ambiguous-column policy.
update public.bp_salons set name='prefix/'||id::text||'/suffix' where id=current_setting('bp_test.salon_b')::uuid;
select set_config('bp_test.path_a',current_setting('bp_test.owner_a')||'/'||current_setting('bp_test.salon_a')||'/fiction.png',true);
select set_config('bp_test.path_b',current_setting('bp_test.owner_b')||'/'||current_setting('bp_test.salon_b')||'/fiction.png',true);
select set_config('bp_test.forged',current_setting('bp_test.owner_b')||'/'||current_setting('bp_test.salon_a')||'/fiction.png',true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bp_test.owner_b'),true);
do $$ begin
 begin insert into storage.objects(bucket_id,name) values('barberpro-gallery',current_setting('bp_test.path_a'));raise exception 'other owner path accepted'; exception when insufficient_privilege then null; end;
 begin insert into storage.objects(bucket_id,name) values('barberpro-gallery',current_setting('bp_test.forged'));raise exception 'forged salon path accepted'; exception when insufficient_privilege then null; end;
end $$;
insert into storage.objects(bucket_id,name) values('barberpro-gallery',current_setting('bp_test.path_b'));
select set_config('request.jwt.claim.sub',current_setting('bp_test.owner_a'),true);
insert into storage.objects(bucket_id,name) values('barberpro-gallery',current_setting('bp_test.path_a'));
do $$ begin
 if (select count(*) from storage.objects where bucket_id='barberpro-gallery' and name=current_setting('bp_test.path_a'))<>1 then raise exception 'owner cannot see own metadata'; end if;
 if (select count(*) from storage.objects where bucket_id='barberpro-gallery' and name=current_setting('bp_test.path_b'))<>0 then raise exception 'owner sees other owner metadata'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='barberpro-gallery' and name=current_setting('bp_test.path_a'))<>0 then raise exception 'anonymous metadata listing allowed'; end if;
end $$;
rollback;
