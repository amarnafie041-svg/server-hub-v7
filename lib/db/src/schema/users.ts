import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const roleEnum = pgEnum("role", ["owner", "user"]);
export const themeEnum = pgEnum("theme", ["dark", "light"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: roleEnum("role").notNull().default("user"),
  theme: themeEnum("theme").notNull().default("dark"),
  language: text("language").notNull().default("ar"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });