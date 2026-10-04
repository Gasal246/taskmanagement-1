import { authorizeOrganizationMutation } from "@/lib/organization-access";
import connectDB from "@/lib/mongo";
import Business_skills from "@/models/business_skills.model";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAdministerBusiness } from "@/lib/server-access";

export async function POST (req: NextRequest) {
    try {
        await connectDB();
        const accessDenied = await authorizeOrganizationMutation(req);
        if (accessDenied) return accessDenied;
        const { BSkillId } = await req.json();
        if (!BSkillId) {
            return NextResponse.json("Business Skill ID is required", { status: 400 })
        }
        const skill = await Business_skills.findById(BSkillId);
        if (!skill) {
            return NextResponse.json("Skill Not Found", { status: 404 })
        }
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (!session.user.is_super && !await canAdministerBusiness(session.user.id, skill.business_id)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        await Business_skills.findByIdAndUpdate(BSkillId, { status: 0 });
        return NextResponse.json({ message: "Skill removed successfully", status: 200 }, { status: 200 })
    } catch (error) {
        return NextResponse.json("Internal Server Error", { status: 500 })
    }
}
