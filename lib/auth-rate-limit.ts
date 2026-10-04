import { createHash } from "node:crypto";
import AuthRateLimit from "@/models/auth_rate_limit.model";

// Database-backed fixed windows remain effective across application instances.
export async function allowAuthAttempt(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const id = createHash("sha256").update(`${key}:${window}`).digest("hex");
  let result;
  try {
    result = await AuthRateLimit.findOneAndUpdate({ _id: id }, {
      $inc: { count: 1 },
      $setOnInsert: { expires_at: new Date((window + 1) * windowMs) },
    }, { upsert: true, new: true }).lean();
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    result = await AuthRateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true }).lean();
  }
  return Boolean(result && (result as any).count <= limit);
}
