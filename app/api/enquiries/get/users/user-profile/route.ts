import connectDB from "@/lib/mongo";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get("user_id");
        if (!user_id) return NextResponse.json({ message: "User not selected", status: 400 }, { status: 200 });

        const user = await Users.findById(user_id).select("name email phone status").lean();

        const latestAssigned = await Eq_enquiry_histories.aggregate([
            // 1️⃣ Filter only histories assigned to this user
            {
                $match: { assigned_to: new mongoose.Types.ObjectId(user_id) }
            },

            // 2️⃣ Sort by enquiry_id + step_number DESC
            {
                $sort: { enquiry_id: 1, step_number: -1 }
            },

            // 3️⃣ Group by enquiry_id → pick the FIRST (latest step)
            {
                $group: {
                    _id: "$enquiry_id",
                    latestHistory: { $first: "$$ROOT" }
                }
            },

            // 4️⃣ Replace root to make cleaner output
            {
                $replaceRoot: { newRoot: "$latestHistory" }
            },

            // 5️⃣ Populate enquiry details (join to eq_enquiry)
            {
                $lookup: {
                    from: "eq_enquiries",
                    localField: "enquiry_id",
                    foreignField: "_id",
                    as: "enquiry"
                }
            },
            {
                $unwind: "$enquiry"
            },
            {
                $lookup: {
                    from: "eq_camps",
                    localField: "camp_id",
                    foreignField: "_id",
                    as: "camp"
                }
            },
            {
                $unwind: "$camp"
            }
        ]);

        console.log("latest Assigned: ", latestAssigned);

        return NextResponse.json({ enquiries: latestAssigned, user, status: 200 }, { status: 200 });

    } catch (err) {
        console.log("Error while getting user profile: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}