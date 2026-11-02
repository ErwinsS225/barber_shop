-- Restrict privileges explicitly: Supabase installations can grant EXECUTE to
-- anon/authenticated by default, independently of PostgreSQL's PUBLIC grant.
-- Apply after 001-003, after review and tests on an isolated project.
revoke execute on function public.bp_available_slots(uuid,uuid,date),
 public.bp_request_booking(uuid,uuid,date,time,text,text),
 public.bp_change_booking_status(uuid,text),
 public.bp_owner_available_slots(uuid,uuid,date),
 public.bp_create_counter_booking(uuid,uuid,date,time,text,text),
 public.bp_owner_dashboard(uuid),
 public.bp_limit_gallery_to_six(),
 public.bp_record_booking_event() from public, anon, authenticated;

grant execute on function public.bp_available_slots(uuid,uuid,date),
 public.bp_request_booking(uuid,uuid,date,time,text,text) to anon, authenticated;
grant execute on function public.bp_change_booking_status(uuid,text),
 public.bp_owner_available_slots(uuid,uuid,date),
 public.bp_create_counter_booking(uuid,uuid,date,time,text,text),
 public.bp_owner_dashboard(uuid) to authenticated;
