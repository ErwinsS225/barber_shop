import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadGalleryPhoto} from '../lib/services/gallery-upload.mjs';

function setup({upload={data:{path:'p'},error:null},insert={data:{id:'image'},error:null,status:201},cleanup={error:null}}={}){
 const calls=[];const db={storage:{from(bucket){calls.push(['bucket',bucket]);return {async upload(path,file,options){calls.push(['upload',path,options]);if(upload instanceof Error)throw upload;return upload},async remove(paths){calls.push(['remove',paths]);if(cleanup instanceof Error)throw cleanup;return cleanup}}}},from(table){calls.push(['from',table]);return {insert(row){calls.push(['insert',row]);return {select(){return {async single(){if(insert instanceof Error)throw insert;return insert}}}}}}}};
 const input={salonId:'salon',path:'owner/salon/image.png',file:{type:'image/png'},caption:'Photo',position:1,isCurrent:()=>true};return {db,input,calls};
}
test('uploads a photo before registering it and reports success only for a returned row',async()=>{
 const {db,input,calls}=setup();assert.deepEqual(await uploadGalleryPhoto(db,input),{ok:true});assert.deepEqual(calls.map(c=>c[0]),['bucket','upload','from','insert']);assert.equal(calls[3][1].salon_id,'salon');
});
test('never deletes a file when metadata write might have committed',async()=>{
 for(const insert of [{error:{code:''},data:null,status:0},{error:{code:'PGRST116'},data:null,status:406},{error:{code:'P0001'},data:null,status:500},{error:null,data:null,status:201},new Error('offline')]){const {db,input,calls}=setup({insert});const result=await uploadGalleryPhoto(db,input);assert.equal(result.uncertain,true);assert.ok(!calls.some(c=>c[0]==='remove'))}
});
test('cleans up a definite database rejection and reports cleanup failure',async()=>{
 for(const [cleanup,expected] of [[{error:null},'done'],[{error:{}},'failed'],[new Error('offline'),'failed']]){const {db,input,calls}=setup({insert:{error:{code:'P0001'},data:null,status:400},cleanup});const result=await uploadGalleryPhoto(db,input);assert.equal(result.uncertain,false);assert.equal(result.cleanup,expected);assert.ok(calls.some(c=>c[0]==='remove'))}
});
test('does not insert metadata after session changes and does not pretend upload errors are definite',async()=>{
 let f=setup();f.input.isCurrent=()=>false;let result=await uploadGalleryPhoto(f.db,f.input);assert.equal(result.stage,'session');assert.ok(!f.calls.some(c=>c[0]==='insert'||c[0]==='remove'));
 for(const upload of [{error:{message:'network'}},new Error('offline')]){f=setup({upload});result=await uploadGalleryPhoto(f.db,f.input);assert.equal(result.uncertain,true);assert.ok(!f.calls.some(c=>c[0]==='insert'||c[0]==='remove'))}
});
