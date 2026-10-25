import {proxy} from '@/lib/backend';
export const dynamic='force-dynamic';
export async function POST(request:Request){return proxy(request,'assistant')}
