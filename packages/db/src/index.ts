import { pgTable, text, integer, timestamp, pgEnum, serial, date } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("user").notNull(),
  displayName: text("display_name"),
  theme: text("theme").default("dark"),
  language: text("language").default("ar"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subdomainsTable = pgTable("subdomains", {
  id: serial("id").primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  targetPath: text("target_path").notNull(),
  type: text("type").notNull(),
  status: text("status").default("active").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const processesTable = pgTable("processes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("custom"),
  status: text("status").default("stopped").notNull(),
  command: text("command").notNull(),
  workingDir: text("working_dir"),
  pid: integer("pid"),
  port: integer("port"),
  memoryMb: integer("memory_mb"),
  cpuPercent: integer("cpu_percent"),
  startedAt: timestamp("started_at"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  target: text("target"),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Subdomain = typeof subdomainsTable.$inferSelect;
export type NewSubdomain = typeof subdomainsTable.$inferInsert;
export type Process = typeof processesTable.$inferSelect;
export type NewProcess = typeof processesTable.$inferInsert;
export type Activity = typeof activityTable.$inferSelect;
export type NewActivity = typeof activityTable.$inferInsert;

export const schema = { usersTable, subdomainsTable, processesTable, activityTable };

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connStr, { prepare: false });
export const db = drizzle(client, { schema });