import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Business_staffs from "@/models/business_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest, { params }:{ params: { userid: string } }) {
    try {
        const { userid } = params;

        // Get the business ids the user administers or belongs to.
        const adminAssignments = await Admin_assign_business.find({ user_id: userid, status: 1 }, { business_id: 1 });
        const staffMemberships = await Business_staffs.find({ user_id: userid, status: 1 }, { business_id: 1 });
        const businessIds = [...adminAssignments, ...staffMemberships]
            .map((b: any) => b?.business_id)
            .filter(Boolean);

        if (businessIds.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        // Allow all non-admin roles for selection (regional heads, staff, etc.).
        const allowedRoles = await Roles.find({ role_name: { $ne: "BUSINESS_ADMIN" } }, { _id: 1, role_name: 1 });
        const allowedRoleIds = allowedRoles.map((role: any) => role._id);

        const roleMap = new Map(allowedRoles.map((role: any) => [String(role._id), role.role_name]));

        const usersWithRoles = await User_roles.find({
            business_id: { $in: businessIds },
            role_id: { $in: allowedRoleIds },
            status: 1,
        })
            .populate("user_id", "name email avatar_url status")
            .populate("role_id", "role_name")
            .lean();

        const response = (usersWithRoles || [])
            .filter((entry: any) => entry?.user_id)
            .map((entry: any) => ({
                _id: entry?.user_id?._id,
                name: entry?.user_id?.name,
                email: entry?.user_id?.email,
                avatar_url: entry?.user_id?.avatar_url,
                status: entry?.user_id?.status,
                role: entry?.role_id?.role_name || roleMap.get(String(entry?.role_id)) || null,
            }));

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error.", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
