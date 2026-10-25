import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), owner: text("owner").notNull(),
  data: text("data").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [index("transactions_owner_idx").on(t.owner)]);
export const shops = sqliteTable("shops", {
  owner: text("owner").primaryKey(), name: text("name").notNull().default("My Kirana Store"),
  shopkeeper: text("shopkeeper").notNull().default("Shopkeeper"),
  demo: integer("demo", { mode: "boolean" }).notNull().default(true),
});
