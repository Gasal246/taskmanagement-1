import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    project_description: string | null,
    start_date: string,
    end_date: string | null,
    type: string,
    client_id: string | null,
    business_id: string,
    region_id: string | null,
    enquiry_id: string
}

export async function POST(req:NextRequest){
    try{
        const body : IBody = await req.json();

        
        const session: any = await auth();
        if(!session) return NextResponse.json({message: "Unauthorized Access", status: 401}, {status: 200});
        
        const enquiry = await Eq_enquiry.findById(body.enquiry_id).populate("camp_id");
        
        const prioirty = enquiry.prioirty < 3 ? "low" : enquiry.prioirty > 3 && enquiry.prioirty < 7 ? "normal" : "high"
        
        const newProject = new Business_Project({
            project_name: enquiry?.camp_id?.camp_name,
            project_description: body.project_description,
            business_id: body.business_id,
            region_id: body.region_id,
            creator: session?.user?.id,
            client_id: body.client_id, 
            start_date: body.start_date,
            end_date: body.end_date,
            is_approved: true,
            type: body.type,
            approved_by: session?.user?.id,
            admin_id: session?.user?.id,
            prioirty: prioirty
        });

        const saved = await newProject.save();

        await Eq_enquiry.findByIdAndUpdate(body.enquiry_id, {$set: {status: "Closed", is_converted: true}});

        return NextResponse.json({message: "Project Added", status: 200, project_id: saved._id}, {status: 200});

    }catch(err){
        console.log("Error while Converting Enquiry to Project: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
        
    }
}