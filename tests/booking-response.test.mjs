import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBookingResponse} from '../lib/booking-response.mjs';

test('only a returned booking UUID confirms creation',()=>{
 assert.equal(classifyBookingResponse({data:'3e798128-d20e-43d0-a9b1-1c0e349d3c80',error:null,status:200}),'confirmed');
 for(const data of [null,'','not-a-uuid',42]) assert.equal(classifyBookingResponse({data,error:null,status:200}),'uncertain');
});
test('transport failures, timeouts and server errors leave the outcome uncertain',()=>{
 for(const status of [0,408,499,500,502,504]) assert.equal(classifyBookingResponse({data:null,error:{message:'error'},status}),'uncertain');
});
test('a normal client or database rejection is not reported as success',()=>{
 for(const status of [400,401,403,409,429]) assert.equal(classifyBookingResponse({data:null,error:{message:'error'},status}),'rejected');
});
