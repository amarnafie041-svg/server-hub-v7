import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { usersTable, roleEnum, themeEnum, insertUserSchema } from "./schema/users";
import { processesTable, processTypeEnum, processStatusEnum, insertProcessSchema } from "./schema/processes";
import { subdomainsTable, subdomainTypeEnum, subdomainStatusEnum, insertSubdomainSchema } from "./schema/subdomains";
import { activityTable, activityTypeEnum } from "./schema/activity";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, {
  schema: {
    usersTable,
    processesTable,
    subdomainsTable,
    activityTable,
  },
});

export {
  usersTable,
  roleEnum,
  themeEnum,
  insertUserSchema,
  processesTable,
  processTypeEnum,
  processStatusEnum,
  insertProcessSchema,
  subdomainsTable,
  subdomainTypeEnum,
  subdomainStatusEnum,
  insertSubdomainSchema,
  activityTable,
  activityTypeEnum,
};