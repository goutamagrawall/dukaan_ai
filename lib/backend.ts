import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function proxy(request:Request,route:'state'|'assistant') {
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Please sign in to access your shop.'},{status:401});
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Request origin is not allowed.'},{status:403});
  const config=env as unknown as {DUKAAN_BACKEND_URL?:string;DUKAAN_BACKEND_TOKEN?:string};
  if(!config.DUKAAN_BACKEND_URL||!config.DUKAAN_BACKEND_TOKEN)return Response.json({error:'The Supabase backend connection is not configured.'},{status:503});
  if(Number(request.headers.get('content-length')||0)>9*1024*1024)return Response.json({error:'Request is too large. Keep recordings under 28 seconds.'},{status:413});
  try{
    const headers:Record<string,string>={'x-dukaan-token':config.DUKAAN_BACKEND_TOKEN,'x-dukaan-user':user.userId,'x-dukaan-route':route};
    const type=request.headers.get('content-type');if(type)headers['Content-Type']=type;
    const response=await fetch(config.DUKAAN_BACKEND_URL,{method:request.method,headers,body:request.method==='GET'?undefined:await request.arrayBuffer(),signal:AbortSignal.timeout(100000)});
    return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
  }catch{return Response.json({error:'Could not reach your backend. Please check your connection and try again.'},{status:502});}
}
