import { db } from "@workspace/db";
import { activityTable } from "@workspace/db";

type ActivityType = "process" | "file" | "auth" | "subdomain" | "terminal";

interface LogActivityParams {
  action: string;
  target: string;
  type: ActivityType;
  userId?: number;
  username?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(activityTable).values({
      action: params.action,
      target: params.target,
      type: params.type,
      userId: params.userId ?? null,
      username: params.username ?? null,
    });
  } catch {
    // Non-critical - don't throw
  }
}
