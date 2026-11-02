/**
 * Read the owner workspace using the existing Supabase contract. The caller
 * supplies the client so errors and access boundaries can be tested without a
 * network or service-role key. Authorization remains enforced by Supabase.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} userId
 * @returns {Promise<{ok: false, stage: 'salon' | 'workspace', salon: import('../supabase').Salon | null} | {ok: true, salon: import('../supabase').Salon | null, services: import('../supabase').Service[], bookings: import('../supabase').Booking[], dashboard: import('../supabase').Dashboard | null}>}
 */
export async function readOwnerWorkspace(db, userId) {
  const salonResult = await db.from('bp_salons').select('*').eq('owner_id', userId).maybeSingle();
  if (salonResult.error) return { ok: false, stage: 'salon', salon: null };
  const salon = /** @type {import('../supabase').Salon | null} */ (salonResult.data);
  if (!salon) return { ok: true, salon: null, services: [], bookings: [], dashboard: null };

  const [services, bookings, dashboard] = await Promise.all([
    db.from('bp_services').select('*').eq('salon_id', salon.id).order('created_at'),
    db.from('bp_bookings').select('id,client_name,client_phone,starts_at,service_name,price,status')
      .eq('salon_id', salon.id).order('starts_at', { ascending: false }).limit(100),
    db.rpc('bp_owner_dashboard', { p_salon: salon.id }),
  ]);
  if (services.error || bookings.error || dashboard.error) return { ok: false, stage: 'workspace', salon };
  return {
    ok: true,
    salon,
    services: /** @type {import('../supabase').Service[]} */ (services.data || []),
    bookings: /** @type {import('../supabase').Booking[]} */ (bookings.data || []),
    dashboard: /** @type {import('../supabase').Dashboard | null} */ (dashboard.data?.[0] || null),
  };
}

/** Allows only the latest request to publish state; invalidation cancels stale results. */
export function createRequestGate() {
  let revision = 0;
  return {
    begin() { const current = ++revision; return () => current === revision; },
    invalidate() { revision++; },
  };
}
