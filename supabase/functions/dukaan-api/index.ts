import {demoTransactions, validateDraft} from './business.ts';
import {assistant} from './assistant.ts';
import {cors,isAllowedBrowser,hash,randomToken} from './browser-auth.ts';
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const serviceHeaders={'apikey':service,'Authorization':`Bearer ${service}`,'Content-Type':'application/json'};
async function database(path:string,body?:unknown){const r=await fetch(`${base}/rest/v1/${path}`,{method:body?'POST':'GET',headers:serviceHeaders,body:body?JSON.stringify(body):undefined});const text=await r.text();const data=text?JSON.parse(text):null;if(!r.ok)throw new Error(data.message||'Database request failed');return data;}
async function equal(a:string,b:string){return await hash(a)===await hash(b);}
Deno.serve(async(request:Request)=>{
 const corsHeaders=cors(request);
 const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{...corsHeaders,'Cache-Control':'private, no-store'}});
 const withCors=(response:Response)=>{const headers=new Headers(response.headers);for(const [key,value] of Object.entries(corsHeaders))headers.set(key,value);headers.set('Cache-Control','private, no-store');return new Response(response.body,{status:response.status,headers});};
 if(request.method==='OPTIONS')return isAllowedBrowser(request)?new Response(null,{status:204,headers:corsHeaders}):respond({error:'Origin is not allowed'},403);
 try{
  if(!['GET','POST'].includes(request.method))return respond({error:'Method not allowed'},405);
  if(Number(request.headers.get('content-length')||0)>9*1024*1024)return respond({error:'Keep recordings under 28 seconds (8 MB).'},413);
  const serviceToken=request.headers.get('x-dukaan-token')||'';
  let owner=request.headers.get('x-dukaan-user')||'';
  const route=request.headers.get('x-dukaan-route')||new URL(request.url).searchParams.get('route');
  const isService=!!serviceToken;
  const sessionToken=request.headers.get('x-dukaan-session')||'';
  if(!isService&&!isAllowedBrowser(request))return respond({error:'Origin is not allowed'},403);
  let ipHash='';
  if(!isService){
   const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('cf-connecting-ip')||'unknown';
   ipHash=await hash(ip);
   if(route==='session'&&request.method==='POST'){
    if(!await database('rpc/dukaan_public_limit',{p_key:`session:${ipHash}`,p_limit:30,p_window:3600}))return respond({error:'Too many new workspaces. Please try again later.'},429);
    const token=randomToken();
    await database('dukaan_browser_sessions',{token_hash:await hash(token),owner:'browser:'+crypto.randomUUID()});
    return respond({token});
   }
   if(!/^[a-f0-9]{64}$/.test(sessionToken))return respond({error:'Your browser workspace could not be verified. Reload the page to reconnect.'},401);
   const sessions=await database(`dukaan_browser_sessions?token_hash=eq.${await hash(sessionToken)}&select=owner`);
   if(!sessions[0])return respond({error:'Your browser workspace could not be verified. Please use the same browser where it was created.'},401);
   owner=sessions[0].owner;
  }
  if(!owner||owner.length>250)return respond({error:'Unauthorized'},401);
  const config=await database('rpc/dukaan_config',{});
  if(isService&&(!config.dukaan_backend_token||!await equal(serviceToken,config.dukaan_backend_token)))return respond({error:'Unauthorized'},401);
  async function readState(){
   const [shops,rows]=await Promise.all([database(`dukaan_shops?owner=eq.${encodeURIComponent(owner)}&select=name,shopkeeper,demo`),database(`dukaan_transactions?owner=eq.${encodeURIComponent(owner)}&select=data&order=created_at.desc`)]);
   const shop=shops[0]||{name:'My Kirana Store',shopkeeper:'Shopkeeper',demo:true};
   return {shop,transactions:shop.demo?demoTransactions():rows.map((r:any)=>r.data),sarvamReady:!!config.dukaan_sarvam_api_key,browserWorkspace:!isService};
  }
  if(route==='assistant'){
   if(!isService){
    const checks=await Promise.all([database('rpc/dukaan_public_limit',{p_key:`assistant:${owner}`,p_limit:30,p_window:3600}),database('rpc/dukaan_public_limit',{p_key:`assistant-ip:${ipHash}`,p_limit:100,p_window:86400})]);
    if(checks.some(ok=>!ok))return respond({error:'Voice and AI request limit reached. Try again later; manual entry is still available.'},429);
   }
   return withCors(await assistant(request,readState,config.dukaan_sarvam_api_key));
  }
  if(route!=='state')return respond({error:'Not found'},404);
  if(request.method==='GET')return respond(await readState());
  if(!isService&&!await database('rpc/dukaan_public_limit',{p_key:`writes:${owner}`,p_limit:300,p_window:3600}))return respond({error:'Too many updates. Please try again later.'},429);
  const body=await request.json();
  const payload=body.action==='save'?{...validateDraft(body.transaction),id:body.transaction.id}:body;
  const result=await database('rpc/dukaan_mutate',{p_owner:owner,p_action:body.action,p_data:payload});
  return respond(body.action==='save'?{transaction:result}:result);
 }catch(e){return respond({error:e instanceof Error?e.message:'Unable to process your request'},400);}
});

