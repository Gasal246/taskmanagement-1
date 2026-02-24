import connectDB from "@/lib/mongo";
import { SALES_STAFF_ROLE_LABEL_SCOPES } from "@/lib/constants";
import Area_departments from "@/models/area_departments.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Eq_enquiry_users from "@/models/eq_enquiry_users.model";
import Location_departments from "@/models/location_departments.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Region_departments from "@/models/region_departments.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Users from "@/models/users.model";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

type SalesScope = "REGION" | "AREA" | "LOCATION";

const getSalesScopeFromRoleLabel = (roleLabel: string): SalesScope | null => {
    const normalizedRoleLabel = (roleLabel || "").toUpperCase();
    const matchedScope = SALES_STAFF_ROLE_LABEL_SCOPES.find((scope) =>
        normalizedRoleLabel.includes(scope)
    );

    if (matchedScope === "REGION" || matchedScope === "AREA" || matchedScope === "LOCATION") {
        return matchedScope;
    }

    return null;
};

const checkSalesStaffByScope = async (user_id: string, roleLabel: string) => {
    const scope = getSalesScopeFromRoleLabel(roleLabel);
    if (!scope) return false;

    if (scope === "REGION") {
        const regionStaffAssignments = await Region_dep_staffs.find(
            { user_id, status: 1 },
            { region_dep_id: 1 }
        ).lean();
        const regionDepartmentIds = regionStaffAssignments
            .map((item: any) => item?.region_dep_id)
            .filter(Boolean);

        if (!regionDepartmentIds.length) return false;

        const salesDepartment = await Region_departments.exists({
            _id: { $in: regionDepartmentIds },
            type: "sales",
            status: 1,
        });

        return Boolean(salesDepartment);
    }

    if (scope === "AREA") {
        const areaStaffAssignments = await Area_dep_staffs.find(
            { user_id, status: 1 },
            { area_dep_id: 1 }
        ).lean();
        const areaDepartmentIds = areaStaffAssignments
            .map((item: any) => item?.area_dep_id)
            .filter(Boolean);

        if (!areaDepartmentIds.length) return false;

        const salesDepartment = await Area_departments.exists({
            _id: { $in: areaDepartmentIds },
            type: "sales",
            status: 1,
        });

        return Boolean(salesDepartment);
    }

    const locationStaffAssignments = await Location_dep_staffs.find(
        { user_id, status: 1 },
        { location_dep_id: 1 }
    ).lean();
    const locationDepartmentIds = locationStaffAssignments
        .map((item: any) => item?.location_dep_id)
        .filter(Boolean);

    if (!locationDepartmentIds.length) return false;

    const salesDepartment = await Location_departments.exists({
        _id: { $in: locationDepartmentIds },
        type: "sales",
        status: 1,
    });

    return Boolean(salesDepartment);
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const user_id = body?.user_id;
        const roleLabel = body?.roleLabel || "";

        if (!user_id || !isValidObjectId(user_id)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const [user, eqUserExists, isSalesStaff] = await Promise.all([
            Users.findOne({ _id: user_id, status: 1 }, { password: 0, otp: 0 }).lean(),
            Eq_enquiry_users.exists({ user_id }),
            checkSalesStaffByScope(user_id, roleLabel),
        ]);

        if (!user) {
            return NextResponse.json(null);
        }

        return NextResponse.json({
            ...user,
            is_eq_user: Boolean(eqUserExists),
            is_sales_staff: isSalesStaff,
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';