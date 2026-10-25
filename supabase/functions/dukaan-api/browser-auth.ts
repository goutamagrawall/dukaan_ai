const allowedOrigins=new Set([
 'https://goutamagrawall.github.io',
 'https://dukaan-ai-shopkeeper.geethanshr.chatgpt.site',
 'http://127.0.0.1:5173',
 'http://localhost:5173',
 'http://127.0.0.1:4173',
 'http://localhost:4173'
]);
export function cors(request:Request){
 const origin=request.headers.get('Origin')||'';
 return allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, x-dukaan-session','Access-Control-Max-Age':'86400'}:{};
}
export function isAllowedBrowser(request:Request){return allowedOrigins.has(request.headers.get('Origin')||'');}
export async function hash(value:string){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(data)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');}
