-- Run after 001. GPS coordinates are optional, but must be supplied together.
alter table public.bp_salons add column latitude double precision, add column longitude double precision;
alter table public.bp_salons add constraint bp_salons_valid_coordinates check (
  (latitude is null and longitude is null) or
  (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
);

-- Enforce at most six gallery entries per salon, including hidden images.
-- Advisory transaction lock serializes simultaneous inserts for the same salon.
create function public.bp_limit_gallery_to_six() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='UPDATE' and old.salon_id=new.salon_id then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.salon_id::text,0));
  if (select count(*) from public.bp_gallery where salon_id=new.salon_id) >= 6 then
    raise exception 'La galerie est limitée à six photos';
  end if;
  return new;
end $$;
revoke all on function public.bp_limit_gallery_to_six() from public;
create trigger bp_gallery_six_limit before insert or update of salon_id on public.bp_gallery
for each row execute function public.bp_limit_gallery_to_six();
