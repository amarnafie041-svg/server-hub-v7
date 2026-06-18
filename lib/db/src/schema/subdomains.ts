import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const subdomainTypeEnum = pgEnum("subdomain_type", ["html", "python", "nodejs", "php"]);
export const subdomainStatusEnum = pgEnum("subdomain_status", ["active", "inactive"]);

export const subdomainsTable = pgTable("subdomains", {
  id: serial("id").primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  targetPath: text("target_path").notNull(),
  type: subdomainTypeEnum("type").notNull(),
  status: subdomainStatusEnum("status").notNull().default("active"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubdomainSchema = createInsertSchema(subdomainsTable).omit({ id: true, createdAt: true });