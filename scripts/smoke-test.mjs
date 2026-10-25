import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// This smoke test always creates a fresh, dedicated QA owner. It never acts as a real shop owner.
const config=await readFile('.dev.vars','utf8');
const base=config.match(/DUKAAN_BACKEND_URL=(.+)/)[1].trim();
const token=config.match(/DUKAAN_BACKEND_TOKEN=(.+)/)[1].trim();
const owner='qa:dukaan-smoke:'+crypto.randomUUID();
const headers={'Content-Type':'application/json','x-dukaan-token':token,'x-dukaan-user':owner,'x-dukaan-route':'state'};
async function call(route,body){const r=await fetch(base,{headers:{...headers,'x-dukaan-route':route},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
const initial=await call('state');assert.equal(initial.status,200,JSON.stringify(initial.data));assert.equal(initial.data.sarvamReady,true);assert.equal(initial.data.shop.demo,true);
assert.ok([401,403].includes((await fetch(base)).status));
console.log('PASS: isolated QA workspace initialized; unauthenticated backend requests rejected');
const parsed=await call('assistant',{text:'रमेश को दो किलो चावल साठ रुपये किलो और एक लीटर तेल एक सौ पचास रुपये, उधार।'});
assert.equal(parsed.status,200,JSON.stringify(parsed.data));assert.equal(parsed.data.intent,'transaction');assert.equal(parsed.data.transaction.total,27000);assert.equal(parsed.data.transaction.paid,0);assert.equal(parsed.data.transaction.items.length,2);
console.log('PASS: deployed Supabase + Sarvam Hindi parsing, correct 270 INR credit');
const query=await call('assistant',{text:'Ramesh ka kitna udhaar baaki hai?'});assert.equal(query.status,200);assert.equal(query.data.intent,'query');assert.match(query.data.answer,/1,600/);
console.log('PASS: Hinglish question answered from sample ledger');
await call('state',{action:'start'});
const id=crypto.randomUUID(), paymentId=crypto.randomUUID();
try {
 const sale={id,kind:'sale',customer:'QA Test Customer',items:[{name:'Rice',qty:2.5,unit:'kg',rate:6000,cost:4000}],total:1,paid:5000,method:'cash',note:'ISOLATED QA ONLY'};
 const s=await call('state',{action:'save',transaction:sale});assert.equal(s.status,200,JSON.stringify(s.data));assert.equal(s.data.transaction.total,15000);
 assert.equal((await call('state',{action:'save',transaction:sale})).status,200);assert.equal((await call('state')).data.transactions.length,1);
 const payment={id:paymentId,kind:'payment',customer:'QA Test Customer',items:[{name:'Collection',qty:1,unit:'pcs',rate:3000,cost:null}],paid:3000,method:'upi',note:'ISOLATED QA ONLY'};
 assert.equal((await call('state',{action:'save',transaction:payment})).status,200);
 assert.equal((await call('state',{action:'save',transaction:{...payment,id:crypto.randomUUID(),items:[{...payment.items[0],rate:8000}],paid:8000}})).status,400);
 assert.equal((await call('state',{action:'delete',id})).status,400);
 const edit=await call('state',{action:'save',transaction:{...sale,items:[{...sale.items[0],qty:3}]}});assert.equal(edit.status,200);assert.equal(edit.data.transaction.total,18000);
 // Independent requests must not overcollect even when issued concurrently.
 const attempts=await Promise.all([1,2,3].map(()=>call('state',{action:'save',transaction:{...payment,id:crypto.randomUUID(),items:[{...payment.items[0],rate:6000}],paid:6000}})));
 assert.equal(attempts.filter(r=>r.status===200).length,1);
 for(const a of attempts.filter(r=>r.status===200))await call('state',{action:'delete',id:a.data.transaction.id});
 console.log('PASS: persistence, integer totals, idempotent save, partial credit, collections, edit, protected deletion, and concurrent overcollection guard');
} finally {
 await call('state',{action:'delete',id:paymentId});await call('state',{action:'delete',id});assert.equal((await call('state')).data.transactions.length,0);
}
console.log('All Supabase smoke checks passed. Only the dedicated qa: workspace was changed; its QA transactions were removed.');

