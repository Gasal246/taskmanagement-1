import { auth } from "@/auth";
import { getRoleNameFromRequest, getBusinessHeads } from "@/app/api/helpers/task-filter-scope";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    const businessId = req.nextUrl.searchParams.get("business_id");
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
    const activeBusinessId = await resolveActiveBusinessIdForUser(session.user.id);
    if (!businessId || activeBusinessId !== businessId || !getRoleNameFromRequest(req).includes("ADMIN")) {
      return NextResponse.json({ message: "Unauthorized Access" }, { status: 403 });
    }
    return NextResponse.json({ data: await getBusinessHeads(businessId), status: 200 });
  } catch (error) {
    console.log("Error while loading task heads", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
