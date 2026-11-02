/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function readDirectory(db) {
  const result = await db.from('bp_salons').select('*,bp_gallery(*)').eq('published',true).eq('active',true).order('created_at',{ascending:false}).limit(100);
  if (result.error) return {ok:false, salons:[]};
  return {ok:true, salons:result.data || []};
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} slug
 * @returns {Promise<{ok:false, stage:'salon'|'workspace'|'missing'} | {ok:true, salon:import('../supabase').Salon, gallery:import('../supabase').Gallery[], services:import('../supabase').Service[]}>}
 */
export async function readPublicSalon(db,slug) {
  const result = await db.from('bp_salons').select('*').eq('slug',slug).eq('published',true).eq('active',true).maybeSingle();
  if (result.error) return {ok:false, stage:'salon'};
  if (!result.data) return {ok:false, stage:'missing'};
  const [gallery,services] = await Promise.all([
    db.from('bp_gallery').select('*').eq('salon_id',result.data.id).eq('visible',true).order('position'),
    db.from('bp_services').select('*').eq('salon_id',result.data.id).eq('active',true).order('created_at'),
  ]);
  if (gallery.error || services.error) return {ok:false, stage:'workspace'};
  return {ok:true, salon:/** @type {import('../supabase').Salon} */ (result.data),gallery:/** @type {import('../supabase').Gallery[]} */ (gallery.data||[]),services:/** @type {import('../supabase').Service[]} */ (services.data||[])};
}
