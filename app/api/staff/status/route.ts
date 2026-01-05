import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { sendTrigger } from "../../helpers/notification-helper";

connectDB();

export async function POST(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) {
            return new NextResponse("Unauthorised Access to req", { status: 401 });
        }
        const user = await Users.findById(session?.user?.id, { name: 1, email: 1 });
        const { staffid, status }: { staffid: string, status: StaffStatus } = await req.json();
        const statusMap: Record<StaffStatus, number> = {
            active: 1,
            blocked: 0,
            unverified: 0,
        };
        const nextStatus = statusMap[status] ?? 1;
        if (status === 'blocked') {
            console.log("Blocking user and sending notification.");
            await sendTrigger(`channel-${staffid}`, 'block-user', `You Have Been Blocked By ${user?.name || 'admin'}`);
        }
        const updatedUser = await Users.findByIdAndUpdate(staffid, { status: nextStatus }, { new: true });
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
