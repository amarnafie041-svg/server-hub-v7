import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const activityTypeEnum = pgEnum("activity_type", ["process", "file", "auth", "subdomain", "terminal"]);

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  type: activityTypeEnum("type").notNull(),
  userId: integer("user_id"),
  username: text("username"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});