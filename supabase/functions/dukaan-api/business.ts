export type Kind = "sale" | "purchase" | "expense" | "payment";
export type Item = { name: string; qty: number; unit: string; rate: number; cost: number | null };
export type Transaction = { id: string; kind: Kind; customer: string; items: Item[]; total: number; paid: number; method: "cash" | "upi" | "credit"; note: string; date: string; demo?: boolean };
export type Draft = Omit<Transaction, "id" | "date"> & { id?: string; date?: string };
export const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n / 100).replace(/\.00$/, "");
export function indiaDay(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
export function daysAgo(n: number) { return indiaDay(new Date(Date.now() - n * 86400000)); }
export function itemTotal(items: Item[]) { return items.reduce((sum, i) => sum + Math.round(i.qty * i.rate), 0); }
export function validateDraft(input: any): Draft {
  if (!input || !["sale", "purchase", "expense", "payment"].includes(input.kind)) throw new Error("Choose a transaction type.");
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) throw new Error("Add between 1 and 50 items.");
  const items: Item[] = input.items.map((i: any) => {
    const name = String(i.name || "").trim().slice(0, 120), qty = Number(i.qty), rate = Number(i.rate), cost = i.cost === null || i.cost === "" || i.cost === undefined ? null : Number(i.cost);
    if (!name || !Number.isFinite(qty) || qty <= 0 || qty > 100000 || !Number.isSafeInteger(rate) || rate < 0 || rate > 100000000 || (cost !== null && (!Number.isSafeInteger(cost) || cost < 0 || cost > 100000000))) throw new Error("Each item needs a name, a positive quantity, and a valid price.");
    return { name, qty, rate, cost, unit: String(i.unit || "pcs").slice(0, 15) };
  });
  const total = itemTotal(items);
  if (!Number.isSafeInteger(total) || total <= 0 || total > 1000000000) throw new Error("The total must be between ₹0.01 and ₹1 crore.");
  const paid = Number(input.paid);
  if (!Number.isSafeInteger(paid) || paid < 0 || paid > total) throw new Error("Amount received cannot exceed the total or be negative.");
  const customer = String(input.customer || "").trim().slice(0, 120);
  if ((input.kind === "payment" || (input.kind === "sale" && paid < total)) && !customer) throw new Error("Add a customer name to track udhaar.");
  if (input.kind !== "sale" && paid !== total) throw new Error("Purchases, expenses and collections must be paid in full.");
  const method = ["cash", "upi", "credit"].includes(input.method) ? input.method : "cash";
  if (method === "credit" && (input.kind !== "sale" || paid !== 0)) throw new Error("Use Cash or UPI for partial payments and collections.");
  return { kind: input.kind, customer, items, total, paid, method, note: String(input.note || "").slice(0, 1000) };
}
export function ledger(transactions: Transaction[]) {
  const accounts: Record<string, { name: string; balance: number; transactions: Transaction[] }> = {};
  for (const t of [...transactions].sort((a,b) => a.date.localeCompare(b.date))) {
    if (!t.customer || !["sale", "payment"].includes(t.kind)) continue;
    const key = t.customer.trim().toLocaleLowerCase();
    accounts[key] ??= { name: t.customer, balance: 0, transactions: [] };
    accounts[key].balance += t.kind === "sale" ? t.total - t.paid : -t.total;
    accounts[key].transactions.push(t);
  }
  return Object.values(accounts).sort((a,b) => b.balance - a.balance);
}
export function summary(transactions: Transaction[], day = indiaDay()) {
  const today = transactions.filter(t => indiaDay(new Date(t.date)) === day), sales = today.filter(t => t.kind === "sale");
  const expenses = today.filter(t => t.kind === "expense").reduce((s,t) => s+t.total, 0), known = sales.flatMap(t => t.items).filter(i => i.cost !== null);
  return { sales: sales.reduce((s,t) => s+t.total, 0), salesCount: sales.length, expenses,
    credit: ledger(transactions).reduce((s,a) => s + Math.max(0,a.balance), 0),
    profit: known.reduce((s,i) => s + Math.round(i.qty*(i.rate-(i.cost || 0))), 0) - expenses,
    knownItems: known.length, totalItems: sales.flatMap(t => t.items).length, knownRevenue: itemTotal(known),
    collected: today.filter(t => t.kind === "sale" || t.kind === "payment").reduce((s,t) => s+t.paid,0),
  };
}
export function demoTransactions(): Transaction[] {
  const today = indiaDay();
  const make = (id: string, kind: Kind, customer: string, items: Item[], paid: number | null, hour: number, day = today, method: Transaction["method"] = "cash"): Transaction => ({ id, kind, customer, items, total: itemTotal(items), paid: paid ?? itemTotal(items), method, note: "Sample transaction", date: `${day}T${String(hour).padStart(2,"0")}:15:00+05:30`, demo: true });
  const item = (name: string, qty: number, rate: number, cost: number | null, unit = "pcs") => ({name,qty,rate:rate*100,cost:cost===null?null:cost*100,unit});
  return [
    make("demo-1","sale","Ramesh Kumar",[item("Basmati rice",5,80,62,"kg"),item("Sunflower oil",2,150,125,"L")],0,10,today,"credit"),
    make("demo-2","sale","Priya Sharma",[item("Aashirvaad atta",1,285,245,"bag"),item("Amul milk",2,32,28,"pack")],null,11,today,"upi"),
    make("demo-3","expense","",[item("Electricity bill",1,450,null)],null,11),
    make("demo-4","sale","Walk-in customer",[item("Everyday groceries",1,2450,1980)],null,12,today,"upi"),
    make("demo-5","sale","Suresh Patel",[item("Monthly essentials",1,1870,1510)],null,13),
    make("demo-6","sale","Anita Devi",[item("Toor dal",3,160,125,"kg"),item("Sugar",2,45,38,"kg")],20000,14,today,"cash"),
    make("demo-7","purchase","Sharma Distributors",[item("Store supplies",1,1200,null)],null,14),
    make("demo-8","sale","Walk-in customer",[item("Kitchen essentials",1,3560,2880)],null,15,today,"upi"),
    make("demo-9","sale","Meena Gupta",[item("Weekly groceries",1,1640,1310)],null,16),
    make("demo-10","sale","Ramesh Kumar",[item("Household supplies",1,1400,1150)],0,12,daysAgo(2),"credit"),
    make("demo-11","payment","Ramesh Kumar",[item("Udhaar collection",1,500,null)],null,13,daysAgo(1),"upi"),
    make("demo-12","sale","Vijay Singh",[item("Monthly groceries",1,2350,1920)],0,12,daysAgo(3),"credit"),
    ...[6200,7100,5850,9200,8150,10400].map((n,i)=>make(`demo-history-${i}`,"sale","Walk-in customer",[item("Daily sales",1,n,Math.round(n*.79))],null,17,daysAgo(6-i))),
  ].sort((a,b)=>b.date.localeCompare(a.date));
}
export function answerQuestion(type: string, customer: string, period: string, txs: Transaction[]) {
  const range = period === "yesterday" ? [daysAgo(1),daysAgo(1)] : period === "week" ? [daysAgo(6),indiaDay()] : period === "month" ? [indiaDay().slice(0,7)+"-01",indiaDay()] : period === "all" ? ["0000", "9999"] : [indiaDay(),indiaDay()];
  const filtered = txs.filter(t=>{const d=indiaDay(new Date(t.date));return d>=range[0]&&d<=range[1]});
  const label = period === "today" ? "Today" : period === "yesterday" ? "Yesterday" : period === "week" ? "The last 7 days" : period === "month" ? "This month" : "All time";
  if(type === "credit") {
    const accounts=ledger(txs);
    if(customer) {const a=accounts.find(a=>a.name.toLowerCase()===customer.toLowerCase()) || accounts.find(a=>a.name.toLowerCase().includes(customer.toLowerCase()));return a ? `${a.name} has ${money(Math.max(0,a.balance))} in outstanding udhaar. यह रकम अभी बाकी है।` : `No ledger found for “${customer}”. Check the customer's name in Credit ledger.`;}
    return `Total outstanding udhaar is ${money(accounts.reduce((s,a)=>s+Math.max(0,a.balance),0))} across ${accounts.filter(a=>a.balance>0).length} customers. कुल इतना उधार बाकी है।`;
  }
  const sales=filtered.filter(t=>t.kind==="sale"), expenses=filtered.filter(t=>t.kind==="expense").reduce((s,t)=>s+t.total,0);
  if(type === "expenses") return `${label}: ${money(expenses)} in expenses. इतना खर्च हुआ है।`;
  if(type === "profit") {const items=sales.flatMap(t=>t.items), known=items.filter(i=>i.cost!==null);return known.length ? `${label}: estimated profit is ${money(known.reduce((s,i)=>s+Math.round(i.qty*(i.rate-(i.cost||0))),0)-expenses)}. Based on cost data for ${known.length} of ${items.length} item lines, after expenses. Purchases are inventory, not an immediate profit deduction.` : "Add unit costs to your sales to calculate a profit estimate.";}
  return `${label}: ${money(sales.reduce((s,t)=>s+t.total,0))} in sales from ${sales.length} transactions. इतनी बिक्री हुई है।`;
}
