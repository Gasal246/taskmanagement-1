import { verifyPasswordReset } from "@/lib/password-reset";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try { const body = await req.json(); return await verifyPasswordReset(body.email, body.otp); }
  catch (error) {
    console.error("Recovery verification failed", error);
    return NextResponse.json({ status: false, message: "Unable to verify recovery code. Try again later." }, { status: 503 });
  }
}
export const dynamic = "force-dynamic";
