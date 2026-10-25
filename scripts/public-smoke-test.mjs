import assert from 'node:assert/strict';
const url='https://djkxkydatcwfruswdkps.supabase.co/functions/v1/dukaan-api';
const origin='https://goutamagrawall.github.io';
async function call(route,token,body){const r=await fetch(`${url}?route=${route}`,{method:body||route==='session'?'POST':'GET',headers:{Origin:origin,...(token?{'x-dukaan-session':token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}
const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-dukaan-session,content-type'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
const blocked=await fetch(`${url}?route=session`,{method:'POST',headers:{Origin:'https://untrusted.example'}});assert.equal(blocked.status,403);
const a=await call('session');assert.equal(a.status,200,JSON.stringify(a.data));assert.match(a.data.token,/^[a-f0-9]{64}$/);const token=a.data.token;
const b=await call('session');assert.equal(b.status,200);const other=b.data.token;
assert.equal((await call('state','f'.repeat(64))).status,401);
assert.equal((await call('state',token)).data.browserWorkspace,true);
assert.equal((await call('state',token)).data.shop.demo,true);
assert.equal((await call('state',token,{action:'start'})).status,200);
const id=crypto.randomUUID();
try{
 const sale={id,kind:'sale',customer:'Public QA Customer',items:[{name:'Rice',qty:2,unit:'kg',rate:6000,cost:4000}],paid:0,method:'credit',note:'New isolated browser-session QA transaction'};
 const saved=await call('state',token,{action:'save',transaction:sale});assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.transaction.total,12000);
 assert.equal((await call('state',token,{action:'save',transaction:sale})).status,200);
 assert.equal((await call('state',token)).data.transactions.length,1);
 const isolated=await call('state',other);assert.equal(isolated.data.shop.demo,true);assert.ok(!isolated.data.transactions.some(t=>t.id===id));
 await call('state',other,{action:'delete',id});assert.equal((await call('state',token)).data.transactions.length,1);
 console.log('PASS: public CORS, origin rejection, random private sessions, token validation, server-side totals, save retry safety and cross-browser data isolation');
}finally{await call('state',token,{action:'delete',id});assert.equal((await call('state',token)).data.transactions.length,0);}
if(process.argv.includes('--voice')){
 const key=process.env.SARVAM_TEST_API_KEY;if(!key)throw new Error('Set a temporary SARVAM_TEST_API_KEY for voice QA');
 const fixture=await fetch('https://api.sarvam.ai/text-to-speech',{method:'POST',headers:{'Content-Type':'application/json','api-subscription-key':key},body:JSON.stringify({text:'रमेश को दो किलो चावल साठ रुपये किलो बेचे, उधार।',language_code:'hi-IN',target_language_code:'hi-IN',model:'bulbul:v3',speaker:'shubh',speech_sample_rate:16000})});const audio=await fixture.json();assert.equal(fixture.status,200,JSON.stringify(audio));
 const form=new FormData();form.set('file',new Blob([Buffer.from(audio.audios[0],'base64')],{type:'audio/wav'}),'hindi-qa.wav');form.set('language','hi-IN');
 const r=await fetch(`${url}?route=assistant`,{method:'POST',headers:{Origin:origin,'x-dukaan-session':token},body:form});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(result.intent,'transaction');assert.equal(result.transaction.total,12000);assert.equal(result.transaction.paid,0);
 console.log('PASS: public browser session -> Hindi audio -> Sarvam transcription -> editable 120 INR credit draft');
}
console.log('Public browser backend checks passed; only the newly created QA sessions were used.');
