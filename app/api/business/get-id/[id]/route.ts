import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { canAccessBusiness } from "@/lib/server-access";
import AdminAssignments from "@/models/admin_assign_business.model";
import Business from "@/models/business.model";
import AssignedPlans from "@/models/business_assigned_plan.model";
import BusinessDocs from "@/models/business_docs.model";
import "@/models/super_admin_plans.model";
import "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ message: "Invalid business ID" }, { status: 400 });
    if (!session.user.is_super && !await canAccessBusiness(session.user.id, id)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const business = await Business.findById(id).lean();
    if (!business) return NextResponse.json({ message: "Business not found" }, { status: 404 });
    // Bootstrap only needs identity and presentation information.
    if (req.nextUrl.searchParams.get("summary") === "true") return NextResponse.json({ status: 200, data: { info: business } });
    const [plan, assignments, docs] = await Promise.all([
      AssignedPlans.findOne({ business_id: id }).populate("plan_id").lean(),
      AdminAssignments.find({ business_id: id, status: 1 }).populate({ path: "user_id", select: "name email phone avatar_url" }).lean(),
      BusinessDocs.find({ business_id: id }).lean(),
    ]);
    const admins = assignments.filter((item: any) => item.user_id).map((item: any) => ({
      _id: item._id, business_id: item.business_id, user_id: item.user_id._id,
      admin_name: item.user_id.name, admin_email: item.user_id.email, admin_phone: item.user_id.phone,
    }));
    return NextResponse.json({ status: 200, data: { info: { ...business, admins }, plan, admins, docs } });
  } catch (error) {
    console.error("Business lookup failed", error);
    return NextResponse.json({ message: "Unable to load business" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
