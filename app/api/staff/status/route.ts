import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { sendTrigger } from "../../helpers/notification-helper";
import { canManageUser } from "@/lib/server-access";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const session: any = await auth();
        if (!session) {
            return new NextResponse("Unauthorised Access to req", { status: 401 });
        }
        const user = await Users.findById(session?.user?.id, { name: 1, email: 1 });
        const { staffid, status }: { staffid: string, status: StaffStatus } = await req.json();
        if (!["active", "blocked"].includes(status)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
        if (!session.user.is_super && !await canManageUser(session.user.id, staffid)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        const statusMap: Record<StaffStatus, number> = {
            active: 1,
            blocked: 0,
            unverified: 0,
        };
        const nextStatus = statusMap[status] ?? 1;
        if (status === 'blocked') {
            console.log("Blocking user and sending notification.");
            await sendTrigger(`private-user-${staffid}`, 'block-user', `You Have Been Blocked By ${user?.name || 'admin'}`);
        }
        const updatedUser = await Users.findByIdAndUpdate(staffid, { status: nextStatus }, { new: true });
        if (!updatedUser) return NextResponse.json({ message: "User not found" }, { status: 404 });
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
