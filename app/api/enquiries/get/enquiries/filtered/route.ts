import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { filteredAdminEnquiries } from "@/lib/enquiries/admin-list";
import { enrichEnquiries, enquiryActor } from "@/lib/enquiries/completion-server";
import { FacilityCatalogueFilterError } from "@/lib/enquiries/facility-list-filters";
export async function GET(req: NextRequest) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!actor.admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const result = await filteredAdminEnquiries(req.nextUrl.searchParams, actor.actorId);
    return NextResponse.json({ status: 200, ...result, data: await enrichEnquiries(result.data, actor) });
  } catch (error) {
    const invalid = error instanceof FacilityCatalogueFilterError || (error instanceof Error && /Invalid (action filter|action scope|period range)/.test(error.message));
    if (!invalid) console.error("Error filtering enquiries", error);
    return NextResponse.json({ message: invalid ? (error as Error).message : "Unable to load enquiries", status: invalid ? 400 : 500 }, { status: invalid ? 400 : 500 });
  }
}
