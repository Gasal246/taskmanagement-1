import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function PUT(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const user_id = searchParams.get("user_id");
        const role_id:any = await Roles.findOne({role_name: "AGENT"}).lean();
        const userRole = await User_roles.findOne({role_id: role_id._id, user_id: user_id});
        if(userRole?.status == 1){
            userRole.status = 0;
            await Users.findByIdAndUpdate(user_id, {$set: {status: 0}});
            await userRole.save();
            return NextResponse.json({message: "Agent deactivated", status: 200}, {status: 200});
        } else {
            userRole.status = 1;
            await Users.findByIdAndUpdate(user_id, {$set: {status: 1}});
            await userRole.save();
            return NextResponse.json({message: "Agent Activated", status: 200}, {status: 200});
        }
    }catch(err){
        console.log("Error while activating / deactivating agent: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}