import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import renderer from 'react-test-renderer';
import {build} from 'esbuild';
import Module from 'node:module';
import {resolve} from 'node:path';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.window={location:{reload(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){}};
const built=await build({entryPoints:['app/components/ConnectedERP.tsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react/jsx-runtime','lucide-react'],plugins:[{name:'stubs',setup(b){
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'stub'}));b.onResolve({filter:/lib\/supabase$/},()=>({path:'supabase',namespace:'stub'}));b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='link'?"const React=require('react');module.exports=function Link(p){return React.createElement('a',p,p.children)}":path==='supabase'?"exports.getSupabase=()=>globalThis.__bpConnectedDb;exports.publicImage=()=>'';exports.money=(n)=>String(n);exports.googleMapsUrl=()=>null;":"",loader:'js'}));
}}]});
const m=new Module(resolve('tests/connected-bundle.cjs'));m.filename=resolve('tests/connected-bundle.cjs');m.paths=Module._nodeModulePaths(resolve('tests'));m._compile(built.outputFiles[0].text,m.filename);const Connected=m.exports.default;
const session=id=>({user:{id,email:`${id}@invalid.test`}});const salon=(id,owner)=>({id,owner_id:owner,name:`Salon ${owner}`,slug:`salon-${owner}`,city:'Abidjan',published:false,active:true});
const flush=()=>new Promise(resolve=>setImmediate(resolve));const snapshot=r=>JSON.stringify(r.toJSON());
function fakeDb({lookup}){let callback;return {auth:{onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session:session('a')},error:null}},async signOut(){return {error:null}}},emit(s){callback('SIGNED_IN',s)},from(table){let filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},maybeSingle(){return lookup(filters.owner_id)},order(){return table==='bp_bookings'?q:Promise.resolve({data:[],error:null})},limit(){return Promise.resolve({data:[],error:null})}};return q},rpc(){return Promise.resolve({data:[{today_bookings:0,pending_bookings:0,today_completed:0,active_services:0}],error:null})}}}
test('connected ERP reports owner load failure and allows retry without onboarding',async()=>{let fails=true;globalThis.__bpConnectedDb=fakeDb({lookup:async()=>fails?{error:{message:'offline'},data:null}:{error:null,data:salon('salon-a','a')}});let r;await act(async()=>{r=renderer.create(React.createElement(Connected));await flush()});assert.match(snapshot(r),/Impossible de charger votre salon/);assert.doesNotMatch(snapshot(r),/Créons votre vitrine/);fails=false;const retry=r.root.findAllByType('button').find(x=>x.children.includes('Réessayer'));await act(async()=>{retry.props.onClick();await flush()});assert.match(snapshot(r),/Salon a/);await act(async()=>r.unmount())});
test('connected ERP ignores a late load from a previous owner',async()=>{let finish;const old=new Promise(resolve=>{finish=resolve});const db=fakeDb({lookup:id=>id==='a'?old:Promise.resolve({data:salon('salon-b','b'),error:null})});globalThis.__bpConnectedDb=db;let r;await act(async()=>{r=renderer.create(React.createElement(Connected));await flush()});await act(async()=>{db.emit(session('b'));await flush()});assert.match(snapshot(r),/Salon b/);await act(async()=>{finish({data:salon('salon-a','a'),error:null});await flush()});assert.match(snapshot(r),/Salon b/);assert.doesNotMatch(snapshot(r),/Salon a/);await act(async()=>r.unmount())});
