import {demoTransactions, validateDraft} from './business.ts';
import {assistant} from './assistant.ts';
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const serviceHeaders={'apikey':service,'Authorization':`Bearer ${service}`,'Content-Type':'application/json'};
async function database(path:string,body?:unknown){const r=await fetch(`${base}/rest/v1/${path}`,{method:body?'POST':'GET',headers:serviceHeaders,body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.message||'Database request failed');return data;}
async function equal(a:string,b:string){const encode=new TextEncoder();const [aa,bb]=await Promise.all([crypto.subtle.digest('SHA-256',encode.encode(a)),crypto.subtle.digest('SHA-256',encode.encode(b))]);let diff=0;const x=new Uint8Array(aa),y=new Uint8Array(bb);for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
Deno.serve(async(request:Request)=>{
 try{
  const token=request.headers.get('x-dukaan-token')||'',owner=request.headers.get('x-dukaan-user')||'';
  if(!token||!owner||owner.length>250)return Response.json({error:'Unauthorized'},{status:401});
  const config=await database('rpc/dukaan_config',{});
  if(!config.dukaan_backend_token||!await equal(token,config.dukaan_backend_token))return Response.json({error:'Unauthorized'},{status:401});
  async function readState(){
   const [shops,rows]=await Promise.all([database(`dukaan_shops?owner=eq.${encodeURIComponent(owner)}&select=name,shopkeeper,demo`),database(`dukaan_transactions?owner=eq.${encodeURIComponent(owner)}&select=data&order=created_at.desc`)]);
   const shop=shops[0]||{name:'My Kirana Store',shopkeeper:'Shopkeeper',demo:true};
   return {shop,transactions:shop.demo?demoTransactions():rows.map((r:any)=>r.data),sarvamReady:!!config.dukaan_sarvam_api_key};
  }
  const route=request.headers.get('x-dukaan-route');
  if(route==='assistant')return await assistant(request,readState,config.dukaan_sarvam_api_key);
  if(route!=='state')return Response.json({error:'Not found'},{status:404});
  if(request.method==='GET')return Response.json(await readState(),{headers:{'Cache-Control':'private, no-store'}});
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  const body=await request.json();
  const payload=body.action==='save'?{...validateDraft(body.transaction),id:body.transaction.id}:body;
  const result=await database('rpc/dukaan_mutate',{p_owner:owner,p_action:body.action,p_data:payload});
  return Response.json(body.action==='save'?{transaction:result}:result);
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unable to process your request'},{status:400});}
});
