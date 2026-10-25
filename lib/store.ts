import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { demoTransactions, type Transaction } from "./business";
export async function context() {
  const user = await getChatGPTUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const db = env.DB;
  if (!db) throw new Error("Database is unavailable.");
  return { db, owner: user.userId };
}
export async function readState() {
  const { db, owner } = await context();
  const shop = await db.prepare("SELECT name, shopkeeper, demo FROM shops WHERE owner = ?").bind(owner).first<{name:string; shopkeeper:string; demo:number}>();
  const rows=await db.prepare("SELECT data FROM transactions WHERE owner = ? ORDER BY created_at DESC").bind(owner).all<{data:string}>();
  const demo = shop ? !!shop.demo : true;
  return { shop: { name: shop?.name || "My Kirana Store", shopkeeper: shop?.shopkeeper || "Shopkeeper", demo }, transactions: demo ? demoTransactions() : rows.results.map(r=>JSON.parse(r.data) as Transaction), sarvamReady: !!(env as any).SARVAM_API_KEY };
}
export function errorResponse(e: unknown) {const message=e instanceof Error?e.message:"Something went wrong. Please try again.";return Response.json({error:message},{status:message==="UNAUTHORIZED"?401:400});}
export function sameOrigin(request: Request) { const origin=request.headers.get("origin"); if(origin && origin!==new URL(request.url).origin) throw new Error("Request origin is not allowed."); }
