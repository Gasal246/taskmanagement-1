import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (
    req: NextRequest,
    { params }: { params: Promise<{ userid: string }> }
) {
    try {
        const { userid } = await params;
        if (!userid || !isValidObjectId(userid)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }
        const user = await Users.findById(userid);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await Roles.find({}).limit(1); // JUST REFRESING THE SCHEMA FOR POPULATING IT
        const userRoles = await User_roles.find({ user_id: userid, status: 1})
            .populate({
                path: "role_id",
                select: { role_name: 1, role_number: 1 }
            })
            .sort({ role_number: 1 });
        
        const roles = userRoles.map((role: any) => {
            const clean = role.role_id.toObject();

            return {
                ...clean,
                business_id: role?.business_id
            }
        });

        return NextResponse.json(roles);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
