import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    name: string,
    email: string,
    phone: string,
    country: string,
    province: string,
    city: string,
    dob: string,
    gender: string,
    business_id: string
};

export async function POST(req:NextRequest){
    try{

        const body:IBody = await req.json();

        const agentRole = await Roles.findOne({role_name: "AGENT"});
        if(!agentRole) return NextResponse.json({message: "Please Add AGENT role first", status: 400}, {status: 400});

        const newAgent = new Users({
            name: body.name,
            email: body.email,
            Phone: body.phone,
            admin_id: body.business_id,
            status: 1
        });

        const savedAgent = await newAgent.save();

        const newAgentRole = new User_roles({
            user_id: savedAgent?._id,
            role_id: agentRole?._id,
            business_id: body.business_id,
            status: 1
        });

        await newAgentRole.save();

        return NextResponse.json({message: "New Agent Registered", status: 201}, {status: 201});
    }catch(err){
        console.log("Error while adding new Agent: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}