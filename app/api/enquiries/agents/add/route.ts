import connectDB from "@/lib/mongo";
import Eq_agents_details from "@/models/eq_agents_details.model";
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
    contract_no: string,
    contract_expiry: Date,
    country_id: string,
    region_id: string,
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

        const agentDetails = new Eq_agents_details({
            country_id: body.country_id,
            region_id: body.region_id,
            contract_no: body.contract_no,
            contract_expiry: body.contract_expiry,
            user_id: savedAgent?._id
        });

        await agentDetails.save();

        await newAgentRole.save();

        return NextResponse.json({message: "New Agent Registered", status: 201, agent: savedAgent, agentId: savedAgent?._id}, {status: 201});
    }catch(err){
        console.log("Error while adding new Agent: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
