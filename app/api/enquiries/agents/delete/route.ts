import connectDB from "@/lib/mongo";
import Eq_agents_details from "@/models/eq_agents_details.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const agent_id = searchParams.get("agent_id");

        const agent_role_id:any = await Roles.findOne({role_name: "AGENT"}).select("role_name").lean();
        await User_roles.deleteOne({role_id: agent_role_id._id, user_id: agent_id});
        await Eq_agents_details.deleteOne({user_id: agent_id});
        await Users.findByIdAndDelete(agent_id);

        return NextResponse.json({message: "Agent Deleted Successfully", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while deleting an Agent: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}