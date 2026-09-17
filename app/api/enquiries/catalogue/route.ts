import { NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { enquiryActor } from "@/lib/enquiries/completion-server";
import { getEnquiryCatalogue } from "@/lib/enquiries/catalogue-server";

export async function GET() {
  await connectDB({ throwOnError: true });
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
  return NextResponse.json({ catalogue: await getEnquiryCatalogue(), status: 200 });
}
