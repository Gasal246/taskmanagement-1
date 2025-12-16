import connectDB from "@/lib/mongo";
import Eq_enquiry_users from "@/models/eq_enquiry_users.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const business_id = searchParams.get("business_id");
        const user_type = searchParams.get("user_type");
        if (!business_id) return NextResponse.json({ message: "Please Provide Business_id", status: 400 }, { status: 400 });


        switch (user_type) {
            case "users": {
                const users = await Eq_enquiry_users.find({ business_id: business_id }).populate({
                    path: "user_id",
                    select: "name email"
                });

                return NextResponse.json({ users, status: 200 }, { status: 200 });
            }
            case "agents": {
                const agent_role_id = await Roles.findOne({ role_name: "AGENT" }).select("role_name").lean();
                if (!agent_role_id) return NextResponse.json({ message: "No Agents found", status: 400 }, { status: 200 });

                const agent_roles = await User_roles.find({ role_id: agent_role_id, business_id: business_id }).select("user_id").lean();
                const agent_ids = agent_roles?.map((agent) => agent.user_id);

                const agents = await Users.find({ _id: { $in: agent_ids } }).select("name email");

                return NextResponse.json({ agents, status: 200 }, { status: 200 })
            }
        }

    } catch (err) {
        console.log("Error while Getting Enquiry Users: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}