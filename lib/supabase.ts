import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client:SupabaseClient | null = null;
export function getSupabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url || !key) return null;
 if(!client) client=createClient(url,key);
 return client;
}
export type Salon = {id:string;owner_id:string;slug:string;name:string;city:string;address:string;phone:string;tagline:string;description:string;latitude:number|null;longitude:number|null;published:boolean;active:boolean};
export type Service = {id:string;salon_id:string;name:string;description:string;price:number;duration:number;active:boolean};
export type Gallery = {id:string;salon_id:string;path:string;caption:string;position:number;visible:boolean};
export type Booking = {id:string;client_name:string;client_phone:string;starts_at:string;service_name:string;price:number;status:string};
export const money = (v:number)=>new Intl.NumberFormat('fr-FR').format(v);
export function publicImage(path:string){const db=getSupabase();return db ? db.storage.from('barberpro-gallery').getPublicUrl(path).data.publicUrl : ''}

export function googleMapsUrl(latitude:number|null,longitude:number|null){
 if(latitude===null||longitude===null||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180) return null;
 return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
