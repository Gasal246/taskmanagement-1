import { issuePasswordReset } from "@/lib/password-reset";
import { NextResponse } from "next/server";
export async function POST(_req: Request, context: { params: Promise<{ email: string }> }) {
  try { return await issuePasswordReset((await context.params).email, "otp"); }
  catch (error) {
    console.error("Recovery email failed", error);
    return NextResponse.json({ status: false, message: "Unable to send recovery email. Try again later." }, { status: 503 });
  }
}
export const dynamic = "force-dynamic";
