/**
 * Read all data needed by the vitrine manager without conflating a failed read
 * with an empty workspace. The caller remains responsible for session gating.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} userId
 * @returns {Promise<{ok: false, stage: 'salon' | 'workspace'} | {ok: true, salon: import('../supabase').Salon | null, services: import('../supabase').Service[], gallery: import('../supabase').Gallery[], bookings: import('../supabase').Booking[]}>}
 */
export async function readVitrineWorkspace(db, userId) {
  const salon = await db.from('bp_salons').select('*').eq('owner_id', userId).maybeSingle();
  if (salon.error) return {ok: false, stage: 'salon'};
  if (!salon.data) return {ok: true, salon: null, services: [], gallery: [], bookings: []};
  const [services, gallery, bookings] = await Promise.all([
    db.from('bp_services').select('*').eq('salon_id', salon.data.id).order('created_at'),
    db.from('bp_gallery').select('*').eq('salon_id', salon.data.id).order('position'),
    db.from('bp_bookings').select('id,client_name,client_phone,starts_at,service_name,price,status')
      .eq('salon_id', salon.data.id).order('starts_at', {ascending: false}).limit(100),
  ]);
  if (services.error || gallery.error || bookings.error) return {ok: false, stage: 'workspace'};
  return {
    ok: true,
    salon: /** @type {import('../supabase').Salon} */ (salon.data),
    services: /** @type {import('../supabase').Service[]} */ (services.data || []),
    gallery: /** @type {import('../supabase').Gallery[]} */ (gallery.data || []),
    bookings: /** @type {import('../supabase').Booking[]} */ (bookings.data || []),
  };
}

/** A network or intermediary failure does not prove whether a mutation committed.
 * @param {number} status
 */
export function isUncertainStatus(status) {
  return status === 0 || status === 408 || status === 499 || status >= 500;
}
