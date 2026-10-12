import { NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongo";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { findActiveUserByEmail } from "@/lib/users/find-active-user-by-email";

const schema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 });
    }

    await connectDB();
    if (!await allowAuthAttempt(`password-status:${parsed.data.email}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ message: "Too many attempts. Try again later." }, { status: 429 });
    }

    const user = await findActiveUserByEmail(parsed.data.email, "+password");
    return NextResponse.json({
      exists: Boolean(user),
      hasPassword: Boolean(user && typeof user.password === "string" && user.password.length > 0),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to check password status", error);
    return NextResponse.json({ message: "Unable to check this account right now." }, { status: 503 });
  }
}

export const dynamic = "force-dynamic";
