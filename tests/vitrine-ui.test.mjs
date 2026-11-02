import test from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import renderer from 'react-test-renderer';
import {build} from 'esbuild';
import Module from 'node:module';
import {resolve} from 'node:path';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.window={location:{origin:'http://test.invalid',reload(){}},dispatchEvent(){}};
const output=await build({entryPoints:['app/components/VitrineManager.tsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react/jsx-runtime','lucide-react'],plugins:[{name:'test-stubs',setup(b){
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'stub'}));
 b.onResolve({filter:/lib\/supabase$/},()=>({path:'supabase',namespace:'stub'}));
 b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='link'?"const React=require('react'); module.exports=function Link(props){return React.createElement('a',props,props.children)}":path==='supabase'?"exports.getSupabase=()=>globalThis.__bpMockDb;exports.publicImage=()=>'';exports.money=(n)=>String(n);exports.googleMapsUrl=()=>null;":"",loader:'js'}));
}}]});
const m=new Module(resolve('tests/vitrine-bundle.cjs'));m.filename=resolve('tests/vitrine-bundle.cjs');m.paths=Module._nodeModulePaths(resolve('tests'));m._compile(output.outputFiles[0].text,m.filename);const Vitrine=m.exports.default;
const session=id=>({user:{id,email:`${id}@invalid.test`}});
const salon=(id,owner)=>({id,owner_id:owner,name:`Salon ${owner}`,slug:`salon-${owner}`,city:'Abidjan',address:'',phone:'',tagline:'',description:'',latitude:null,longitude:null,published:false,active:true});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fakeDb({initial=session('a'),lookup,signOutResult={error:null},update=async()=>({data:null,error:null,status:200})}){let callback;const db={auth:{onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session:initial},error:null}},async signOut(){return signOutResult}},emit(s){callback('SIGNED_IN',s)},from(table){let filters={};const chain={select(){return chain},update(){return chain},single(){return update()},eq(k,v){filters[k]=v;return chain},maybeSingle(){return lookup(filters.owner_id)},order(){return table==='bp_bookings'?chain:Promise.resolve({data:[],error:null})},limit(){return Promise.resolve({data:[],error:null})}};return chain}};return db}
function text(root){return JSON.stringify(root.toJSON())}

test('a failed owner lookup shows retry instead of the salon creation form',async()=>{
 let failed=true;globalThis.__bpMockDb=fakeDb({lookup:async()=>failed?{data:null,error:{message:'offline'}}:{data:null,error:null}});let r;await act(async()=>{r=renderer.create(React.createElement(Vitrine));await flush()});
 assert.match(text(r),/Impossible de charger votre salon/);assert.doesNotMatch(text(r),/Créons votre vitrine/);
 failed=false;const retry=r.root.findAllByType('button').find(x=>x.props.children==='Réessayer');assert.ok(retry);await act(async()=>{retry.props.onClick();await flush()});assert.match(text(r),/Créons votre vitrine/);
 await act(async()=>r.unmount());
});

test('switching accounts clears the old workspace and ignores its late response',async()=>{
 let resolveA;const first=new Promise(resolve=>{resolveA=resolve});const db=fakeDb({lookup:id=>id==='a'?first:Promise.resolve({data:salon('salon-b','b'),error:null})});globalThis.__bpMockDb=db;let r;await act(async()=>{r=renderer.create(React.createElement(Vitrine));await flush()});
 await act(async()=>{db.emit(session('b'));await flush()});assert.ok(r.root.findAllByType('input').some(x=>x.props.defaultValue==='Salon b'));
 await act(async()=>{resolveA({data:salon('salon-a','a'),error:null});await flush()});assert.ok(r.root.findAllByType('input').some(x=>x.props.defaultValue==='Salon b'));assert.ok(!r.root.findAllByType('input').some(x=>x.props.defaultValue==='Salon a'));
 await act(async()=>r.unmount());
});

test('failed sign out is reported without pretending the account disconnected',async()=>{
 globalThis.__bpMockDb=fakeDb({lookup:async()=>({data:salon('salon-a','a'),error:null}),signOutResult:{error:{message:'offline'}}});let r;await act(async()=>{r=renderer.create(React.createElement(Vitrine));await flush()});
 const button=r.root.findAllByType('button').find(x=>x.children.some(child=>typeof child==='string'&&child.includes('Déconnexion')));assert.ok(button);await act(async()=>{await button.props.onClick();await flush()});assert.match(text(r),/Déconnexion impossible/);assert.ok(r.root.findAllByType('input').some(x=>x.props.defaultValue==='Salon a'));
 await act(async()=>r.unmount());
});


test('an uncertain publication response never displays a publication success',async()=>{
 globalThis.__bpMockDb=fakeDb({lookup:async()=>({data:salon('salon-a','a'),error:null}),update:async()=>({data:null,error:{message:'offline'},status:0})});let r;await act(async()=>{r=renderer.create(React.createElement(Vitrine));await flush()});
 const button=r.root.findAllByType('button').find(x=>x.children.some(c=>typeof c==='string'&&c.includes('Publier ma vitrine')));await act(async()=>{await button.props.onClick();await flush()});
 assert.match(text(r),/réponse est inconnue/i);assert.doesNotMatch(text(r),/Votre vitrine est publiée/);assert.match(text(r),/Vitrine en brouillon/);await act(async()=>r.unmount());
});

test('a late mutation response cannot publish a success into another account',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve});const db=fakeDb({lookup:async(id)=>({data:salon(`salon-${id}`,id),error:null}),update:()=>pending});globalThis.__bpMockDb=db;let r;await act(async()=>{r=renderer.create(React.createElement(Vitrine));await flush()});
 const button=r.root.findAllByType('button').find(x=>x.children.some(c=>typeof c==='string'&&c.includes('Publier ma vitrine')));await act(async()=>{button.props.onClick();await flush()});await act(async()=>{db.emit(session('b'));await flush()});
 await act(async()=>{finish({data:{...salon('salon-a','a'),published:true},error:null,status:200});await flush()});assert.ok(r.root.findAllByType('input').some(x=>x.props.defaultValue==='Salon b'));assert.doesNotMatch(text(r),/Votre vitrine est publiée/);await act(async()=>r.unmount());
});
