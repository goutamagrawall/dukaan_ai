// Only the public function URL belongs in browser code. No service or Sarvam key is sent here.
const BACKEND='https://djkxkydatcwfruswdkps.supabase.co/functions/v1/dukaan-api';
const SESSION_KEY='dukaan-ai.browser-workspace.v1';
let sessionPromise:Promise<string>|null=null;
async function session():Promise<string>{
 if(sessionPromise)return sessionPromise;
 sessionPromise=(async()=>{
  let existing:string|null;
  try{existing=localStorage.getItem(SESSION_KEY)}catch{throw new Error('Allow browser storage to keep your shop workspace private and persistent.');}
  if(existing)return existing;
  const r=await fetch(`${BACKEND}?route=session`,{method:'POST',signal:AbortSignal.timeout(20000)});
  const data=await r.json() as {token?:string;error?:string};
  if(!r.ok||!data.token)throw new Error(data.error||'Could not create your private browser workspace.');
  try{localStorage.setItem(SESSION_KEY,data.token)}catch{throw new Error('Allow browser storage before saving your shop records.');}
  return data.token;
 })().catch(e=>{sessionPromise=null;throw e});
 return sessionPromise;
}
export async function api(path:string,body?:unknown):Promise<any>{
 const token=await session();const route=path.endsWith('assistant')?'assistant':'state';
 const headers:Record<string,string>={'x-dukaan-session':token};
 if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
 let response:Response;
 try{response=await fetch(`${BACKEND}?route=${route}`,{method:body?'POST':'GET',headers,body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined,cache:'no-store',signal:AbortSignal.timeout(100000)});}catch{throw new Error('Could not reach your shop backend. Check your internet connection and try again.');}
 const data:any=await response.json();
 if(!response.ok)throw new Error(data.error||'Unable to complete request.');
 return data;
}
