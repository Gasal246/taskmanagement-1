import { NextResponse } from "next/server";

// Kept for open tabs running older bundles. Authentication events now own these timestamps.
export async function POST() {
  return NextResponse.json({ message: "Activity is recorded by authentication events", status: 410 }, { status: 410 });
}
export const dynamic = "force-dynamic";
