import { issuePasswordReset } from "@/lib/password-reset";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    return await issuePasswordReset(body.email, body.kind === "otp" ? "otp" : "link");
  } catch (error) {
    console.error("Password recovery email failed", error);
    return NextResponse.json({ status: false, message: "Unable to send recovery email. Try again later." }, { status: 503 });
  }
}
export const dynamic = "force-dynamic";
