import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";


connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const business_id = searchParams.get("business_id");
    const search = searchParams.get("search")?.trim() || "";

    const role:any = await Roles.findOne({ role_name: "AGENT" }).lean();
    if (!role)
      return NextResponse.json(
        { message: "No Agents Found", agents: [], status: 203 },
        { status: 203 }
      );

    const user_roles = await User_roles.find({
      business_id: business_id,
      role_id: role._id,
    }).lean();

    if (user_roles.length === 0)
      return NextResponse.json(
        { message: "No Agents Found", agents: [], status: 203 },
        { status: 203 }
      );

    // Build search query safely
    const query: any = {
      _id: { $in: user_roles.map((r) => r.user_id) },
    };

    if (search) {
      query.name = { $regex: search, $options: "i" }; // search by name
    }
    
    const users = await Users.find(query).select("name email").lean();
    
    return NextResponse.json({ agents: users, status: 200 }, { status: 200 });
  } catch (err) {
    console.log("Error while getting agents: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
