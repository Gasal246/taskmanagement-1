import { completePasswordReset } from "@/lib/password-reset";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try { return await completePasswordReset(await req.json()); }
  catch (error) {
    console.error("Password reset failed", error);
    return NextResponse.json({ status: false, message: "Unable to reset password. Try again later." }, { status: 503 });
  }
}
export const dynamic = "force-dynamic";
