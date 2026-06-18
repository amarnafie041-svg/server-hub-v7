import { pgTable, serial, text, integer, timestamp, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const processTypeEnum = pgEnum("process_type", ["python", "nodejs", "php", "html", "bot"]);
export const processStatusEnum = pgEnum("process_status", ["running", "stopped", "error"]);

export const processesTable = pgTable("processes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: processTypeEnum("type").notNull(),
  status: processStatusEnum("status").notNull().default("stopped"),
  command: text("command").notNull(),
  workingDir: text("working_dir"),
  port: integer("port"),
  pid: integer("pid"),
  memoryMb: real("memory_mb"),
  cpuPercent: real("cpu_percent"),
  userId: integer("user_id").notNull(),
  startedAt: timestamp("started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProcessSchema = createInsertSchema(processesTable).omit({ id: true, createdAt: true });