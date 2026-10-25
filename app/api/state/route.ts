import {proxy} from '@/lib/backend';
export const dynamic='force-dynamic';
export async function GET(request:Request){return proxy(request,'state')}
export async function POST(request:Request){return proxy(request,'state')}
