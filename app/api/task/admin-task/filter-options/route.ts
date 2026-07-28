import { auth } from "@/auth";
import { getRoleNameFromRequest, getBusinessHeads } from "@/app/api/helpers/task-filter-scope";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import connectDB from "@/lib/mongo";
import Business_staffs from "@/models/business_staffs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    const businessId = req.nextUrl.searchParams.get("business_id") || "";
    const kind = req.nextUrl.searchParams.get("kind");
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }
    if (kind !== "staff" && kind !== "heads") {
      return NextResponse.json({ message: "Invalid filter option kind", status: 400 }, { status: 400 });
    }

    const activeBusinessId = await resolveActiveBusinessIdForUser(session.user.id);
    if (
      !businessId ||
      activeBusinessId !== businessId ||
      !getRoleNameFromRequest(req).includes("ADMIN")
    ) {
      return NextResponse.json({ message: "Unauthorized Access", status: 403 }, { status: 403 });
    }

    if (kind === "heads") {
      const heads = await getBusinessHeads(businessId);
      return NextResponse.json({
        data: heads.map((head) => ({ id: head.id, name: head.name, email: head.email })),
        status: 200,
      });
    }

    const memberships = await Business_staffs.find({ business_id: businessId, status: 1 })
      .select("user_id")
      .populate({
        path: "user_id",
        select: "name email",
        match: { status: 1 },
      })
      .lean();
    const data = memberships
      .map((membership: any) => membership.user_id)
      .filter(Boolean)
      .map((user: any) => ({
        id: user._id.toString(),
        name: user.name || "Unknown user",
        email: user.email || "",
      }));

    return NextResponse.json({ data, status: 200 });
  } catch (error) {
    console.log("Error while loading admin task filter options", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
