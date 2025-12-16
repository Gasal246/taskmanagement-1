import connectDB from "@/lib/mongo";
import Eq_users_log from "@/models/eq_users_log.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const user_id = searchParams.get("user_id");
        if(!user_id) return NextResponse.json({message: "Please select user", status: 400}, {status:200});

        const user_logs = await Eq_users_log.find({user_id: user_id}).populate({
            path: "camp_id",
            select: "camp_name"
        }).sort({createdAt: -1}).lean();

        const user_name = await Users.findById(user_id).select("name").lean();

        return NextResponse.json({user_logs, user_name, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting User logs: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}