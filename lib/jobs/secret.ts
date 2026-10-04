import { timingSafeEqual } from "node:crypto";
export function authorizedJobRunner(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}
