import { createHash, randomBytes, randomInt } from "node:crypto";
import { hash } from "bcrypt-ts";
import { NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongo";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { transporter } from "@/lib/nodemailer";
import PasswordReset from "@/models/password_reset.model";
import Users from "@/models/users.model";

export const resetEmailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const resetTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const expiresAt = () => new Date(Date.now() + 10 * 60 * 1000);
const genericMessage = "If this account is eligible, a recovery email has been sent.";

export async function issuePasswordReset(emailInput: unknown, kind: "otp" | "link") {
  const parsed = resetEmailSchema.safeParse(emailInput);
  if (!parsed.success) return NextResponse.json({ status: false, message: "Enter a valid email address" }, { status: 400 });
  await connectDB();
  const email = parsed.data;
  if (!await allowAuthAttempt(`reset-send:${email}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ status: false, message: "Too many requests. Try again later." }, { status: 429 });
  }
  const user = await Users.findOne({ email, status: 1 }).select("_id email").lean();
  if (user) {
    const token = kind === "otp" ? String(randomInt(100000, 1000000)) : randomBytes(32).toString("hex");
    // Use only the configured canonical origin, never a caller-controlled header.
    const origin = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
    if (kind === "link" && !origin) throw new Error("Password recovery origin is not configured");
    const link = kind === "link" ? new URL(`/verification/${encodeURIComponent(email)}/reset-password/${token}`, origin!).toString() : "";
    await PasswordReset.findOneAndUpdate({ user_id: (user as any)._id }, {
      token_hash: resetTokenHash(token), kind, expires_at: expiresAt(), attempts: 0,
    }, { upsert: true, new: true });
    await transporter.sendMail({
      from: process.env.NEXT_NODEMAILER_USER,
      to: (user as any).email,
      subject: "Task Manager — Password recovery",
      text: kind === "otp" ? `Your password recovery code is ${token}. It expires in 10 minutes. If you did not request it, ignore this email.` : `Reset your password: ${link}\nThis link expires in 10 minutes. If you did not request it, ignore this email.`,
    });
  }
  return NextResponse.json({ status: true, message: genericMessage });
}

export async function verifyPasswordReset(emailInput: unknown, tokenInput: unknown) {
  const parsed = resetEmailSchema.safeParse(emailInput);
  if (!parsed.success || typeof tokenInput !== "string" || !/^(?:\d{6}|[a-f0-9]{64})$/.test(tokenInput)) {
    return NextResponse.json({ status: false, message: "Invalid or expired recovery code" }, { status: 400 });
  }
  await connectDB();
  if (!await allowAuthAttempt(`reset-verify:${parsed.data}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ status: false, message: "Too many attempts. Request a new code later." }, { status: 429 });
  }
  const user = await Users.findOne({ email: parsed.data, status: 1 }).select("_id").lean();
  if (!user) return NextResponse.json({ status: false, message: "Invalid or expired recovery code" }, { status: 400 });
  const grant = randomBytes(32).toString("hex");
  const reset = await PasswordReset.findOneAndUpdate({
    user_id: (user as any)._id, token_hash: resetTokenHash(tokenInput), kind: { $in: ["otp", "link"] },
    expires_at: { $gt: new Date() }, attempts: { $lt: 5 },
  }, { $set: { token_hash: resetTokenHash(grant), kind: "grant", expires_at: expiresAt(), attempts: 0 } });
  if (!reset) {
    await PasswordReset.updateOne({ user_id: (user as any)._id, kind: "otp" }, { $inc: { attempts: 1 } });
    return NextResponse.json({ status: false, message: "Invalid or expired recovery code" }, { status: 400 });
  }
  return NextResponse.json({ status: true, resetToken: grant }, { headers: { "Cache-Control": "no-store" } });
}

export async function completePasswordReset(body: unknown) {
  const parsed = z.object({
    email: resetEmailSchema,
    token: z.string().regex(/^[a-f0-9]{64}$/),
    password: z.string().min(8).max(64).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password is too long"),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: false, message: "A valid recovery token and an 8–64 character password are required" }, { status: 400 });
  await connectDB();
  const { email, token, password } = parsed.data;
  if (!await allowAuthAttempt(`reset-complete:${email}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ status: false, message: "Too many attempts. Try again later." }, { status: 429 });
  }
  const user = await Users.findOne({ email, status: 1 }).select("_id").lean();
  const invalid = () => NextResponse.json({ status: false, message: "Recovery link is invalid, expired, or already used. Request a new one." }, { status: 400 });
  if (!user) return invalid();
  const filter = { user_id: (user as any)._id, token_hash: resetTokenHash(token), kind: { $in: ["link", "grant"] }, expires_at: { $gt: new Date() } };
  if (!await PasswordReset.exists(filter)) return invalid();
  const passwordHash = await hash(password, 10);
  // Consume proof and update the password together; retries cannot reuse it.
  const session = await Users.db.startSession();
  let completed = false;
  try {
    await session.withTransaction(async () => {
      completed = false;
      const reset = await PasswordReset.findOneAndDelete(filter, { session });
      if (!reset) return;
      const updated = await Users.updateOne({ _id: (user as any)._id, status: 1 }, {
        $set: { password: passwordHash, otp: null }, $inc: { session_version: 1 },
      }, { session });
      if (!updated.matchedCount) throw new Error("Account is unavailable");
      completed = true;
    });
  } finally { await session.endSession(); }
  return completed ? NextResponse.json({ status: true, message: "Password updated. Sign in with your new password." }) : invalid();
}
