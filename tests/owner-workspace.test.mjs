import test from 'node:test';
import assert from 'node:assert/strict';
import {readOwnerWorkspace, createRequestGate} from '../lib/services/owner-workspace.mjs';

function fakeClient(results) {
  const calls=[];
  const db={calls, from(table) {
    const chain={select(columns){calls.push(['select',table,columns]);return chain}, eq(column,value){calls.push(['eq',table,column,value]);return chain}, maybeSingle(){return Promise.resolve(results[table])}, order(column,options){calls.push(['order',table,column,options]);return table==='bp_bookings'?chain:Promise.resolve(results[table])}, limit(n){calls.push(['limit',table,n]);return Promise.resolve(results[table])}};
    return chain;
  }, rpc(name,params){calls.push(['rpc',name,params]);return Promise.resolve(results[name])}};
  return db;
}
const salon={id:'salon-a',owner_id:'user-a'};
const ok=data=>({data,error:null});

test('loads owner-scoped workspace with the existing booking limit',async()=>{
 const db=fakeClient({bp_salons:ok(salon),bp_services:ok([{id:'service-a'}]),bp_bookings:ok([{id:'booking-a'}]),bp_owner_dashboard:ok([{today_bookings:1}])});
 const result=await readOwnerWorkspace(db,'user-a');
 assert.equal(result.ok,true);assert.equal(result.salon.id,'salon-a');assert.equal(result.bookings[0].id,'booking-a');assert.equal(result.dashboard.today_bookings,1);
 assert.ok(db.calls.some(x=>x[0]==='eq'&&x[1]==='bp_salons'&&x[2]==='owner_id'&&x[3]==='user-a'));
 for(const table of ['bp_services','bp_bookings'])assert.ok(db.calls.some(x=>x[0]==='eq'&&x[1]===table&&x[2]==='salon_id'&&x[3]==='salon-a'));
 assert.ok(db.calls.some(x=>x[0]==='limit'&&x[1]==='bp_bookings'&&x[2]===100));
 assert.ok(db.calls.some(x=>x[0]==='rpc'&&x[1]==='bp_owner_dashboard'&&x[2].p_salon==='salon-a'));
});
test('returns onboarding state when no salon exists without other queries',async()=>{
 const db=fakeClient({bp_salons:ok(null)});const result=await readOwnerWorkspace(db,'user-a');
 assert.deepEqual(result,{ok:true,salon:null,services:[],bookings:[],dashboard:null});assert.ok(!db.calls.some(x=>x[0]==='rpc'));
});
test('does not confuse a salon lookup error with a missing salon',async()=>{
 const db=fakeClient({bp_salons:{data:null,error:{message:'failed'}}});
 assert.deepEqual(await readOwnerWorkspace(db,'user-a'),{ok:false,stage:'salon',salon:null});
});
test('reports each failing workspace dependency without returning misleading empty data',async()=>{
 for(const failing of ['bp_services','bp_bookings','bp_owner_dashboard']){
  const r={bp_salons:ok(salon),bp_services:ok([]),bp_bookings:ok([]),bp_owner_dashboard:ok([])};r[failing]={data:null,error:{message:'failed'}};
  assert.deepEqual(await readOwnerWorkspace(fakeClient(r),'user-a'),{ok:false,stage:'workspace',salon});
 }
});
test('a thrown transport error propagates to the UI for handling',async()=>{
 const db={from(){throw new Error('offline')}};
 await assert.rejects(()=>readOwnerWorkspace(db,'user-a'),/offline/);
});
test('a newer load or session invalidation prevents publishing old results',()=>{
 const gate=createRequestGate();const first=gate.begin();assert.equal(first(),true);const second=gate.begin();assert.equal(first(),false);assert.equal(second(),true);gate.invalidate();assert.equal(second(),false);const next=gate.begin();assert.equal(next(),true);
});

test('out-of-order asynchronous responses publish only the latest result',async()=>{
 const gate=createRequestGate();let publish='';let resolveFirst,resolveSecond;
 const first=new Promise(resolve=>{resolveFirst=resolve});const second=new Promise(resolve=>{resolveSecond=resolve});
 async function load(promise){const isCurrent=gate.begin();const value=await promise;if(isCurrent())publish=value}
 const a=load(first);const b=load(second);resolveSecond('new session');await b;resolveFirst('old session');await a;
 assert.equal(publish,'new session');
});
