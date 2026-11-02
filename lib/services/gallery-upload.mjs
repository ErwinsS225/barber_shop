/**
 * Upload first, then register the metadata. Do not delete an object when the
 * insert outcome is unknown: a committed row could already reference it.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{salonId:string, path:string, file:File, caption:string, position:number, isCurrent:()=>boolean}} input
 * @returns {Promise<{ok:true} | {ok:false, stage:'upload'|'metadata'|'session', uncertain:boolean, cleanup:'done'|'failed'|'not-attempted'}>}
 */
export async function uploadGalleryPhoto(db, input) {
  const storage = db.storage.from('barberpro-gallery');
  let upload;
  try {
    upload = await storage.upload(input.path, input.file, {contentType: input.file.type, upsert: false});
  } catch {
    return {ok: false, stage: 'upload', uncertain: true, cleanup: 'not-attempted'};
  }
  if (upload.error) return {ok: false, stage: 'upload', uncertain: true, cleanup: 'not-attempted'};
  if (!input.isCurrent()) return {ok: false, stage: 'session', uncertain: true, cleanup: 'not-attempted'};

  let result;
  try {
    result = await db.from('bp_gallery').insert({salon_id: input.salonId, path: input.path, caption: input.caption, position: input.position}).select('id').single();
  } catch {
    return {ok: false, stage: 'metadata', uncertain: true, cleanup: 'not-attempted'};
  }
  if (!result.error && result.data?.id) return {ok: true};
  // Only a database constraint/validation error with a normal client response
  // is treated as a definite rejection. Other responses can be ambiguous.
  const code = result.error?.code || '';
  const definite = result.status >= 400 && result.status < 500 && result.status !== 408 && result.status !== 499 && /^(22|23|P0001)/.test(code);
  if (!definite || !input.isCurrent()) return {ok: false, stage: 'metadata', uncertain: true, cleanup: 'not-attempted'};
  try {
    const cleanup = await storage.remove([input.path]);
    return {ok: false, stage: 'metadata', uncertain: false, cleanup: cleanup.error ? 'failed' : 'done'};
  } catch {
    return {ok: false, stage: 'metadata', uncertain: false, cleanup: 'failed'};
  }
}
