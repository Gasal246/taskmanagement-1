import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { hydrateChangedFieldNames } from "@/lib/enquiry-history-resolver";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");

        const histories = await Eq_enquiry_access.find({ enquiry_id: enquiry_id, user_id: session?.user?.id }).populate({
            path: "history_id",
            populate: [
                {
                    path: "assigned_to",
                    select: "name email"
                },
                {
                    path: "forwarded_by",
                    select: "name email avatar_url"
                },
                {
                    path: "changed_by",
                    select: "name email avatar_url"
                }
            ]
        }).lean();

        histories.sort((a: any, b: any) => {
            return b.history_id.step_number - a.history_id.step_number;
        });

        await hydrateChangedFieldNames(histories, (entry) => entry?.history_id);

        return NextResponse.json({ histories, status: 200 }, { status: 200 });
    } catch (err) {
        console.log("Error while getting histories: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}
