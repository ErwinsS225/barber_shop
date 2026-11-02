import test from 'node:test';
import assert from 'node:assert/strict';
import {readVitrineWorkspace,isUncertainStatus} from '../lib/services/vitrine-workspace.mjs';

function client(results) {
 const calls=[];return {calls,from(table){const q={select(v){calls.push(['select',table,v]);return q},eq(k,v){calls.push(['eq',table,k,v]);return q},maybeSingle(){return Promise.resolve(results[table])},order(k){calls.push(['order',table,k]);return table==='bp_bookings'?q:Promise.resolve(results[table])},limit(n){calls.push(['limit',table,n]);return Promise.resolve(results[table])}};return q}};
}
const ok=data=>({data,error:null});const salon={id:'salon-a'};
test('vitrine data is scoped and retains the 100 bookings limit',async()=>{
 const db=client({bp_salons:ok(salon),bp_services:ok([{id:'s'}]),bp_gallery:ok([{id:'g'}]),bp_bookings:ok([{id:'b'}])});const r=await readVitrineWorkspace(db,'user-a');assert.equal(r.ok,true);assert.equal(r.gallery[0].id,'g');
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='bp_salons'&&c[2]==='owner_id'&&c[3]==='user-a'));
 for(const t of ['bp_services','bp_gallery','bp_bookings'])assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]===t&&c[2]==='salon_id'&&c[3]==='salon-a'));
 assert.ok(db.calls.some(c=>c[0]==='limit'&&c[1]==='bp_bookings'&&c[2]===100));
});
test('missing salon differs from failed lookup and failed child reads',async()=>{
 assert.deepEqual(await readVitrineWorkspace(client({bp_salons:ok(null)}),'u'),{ok:true,salon:null,services:[],gallery:[],bookings:[]});
 assert.deepEqual(await readVitrineWorkspace(client({bp_salons:{data:null,error:{}}}),'u'),{ok:false,stage:'salon'});
 for(const table of ['bp_services','bp_gallery','bp_bookings']){const r={bp_salons:ok(salon),bp_services:ok([]),bp_gallery:ok([]),bp_bookings:ok([])};r[table]={data:null,error:{}};assert.deepEqual(await readVitrineWorkspace(client(r),'u'),{ok:false,stage:'workspace'})}
});
test('write timeout and intermediary failures are not reported as definite rejection',()=>{
 for(const code of [0,408,499,500,502,504])assert.equal(isUncertainStatus(code),true);
 for(const code of [200,400,401,403,409])assert.equal(isUncertainStatus(code),false);
});
