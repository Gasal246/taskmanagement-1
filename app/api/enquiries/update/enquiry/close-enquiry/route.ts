import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    enquiry_id: string,
    feedback: string | null
}

export async function PUT(req:NextRequest){
    try{

        const body: IBody = await req.json();
        
        const session: any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message: "Unauthorized Access", status: 401}, {status: 200});
        
        const enquiry = await Eq_enquiry.findById(body.enquiry_id);
        
        const last_update:any = await Eq_enquiry_histories.findOne({enquiry_id: body.enquiry_id}).sort({step_number: -1}).lean();
        
        const newUpdate = new Eq_enquiry_histories({
            camp_id: enquiry?.camp_id,
            enquiry_id: body.enquiry_id,
            forwarded_by: session?.user?.id,
            step_number: last_update?.step_number ? last_update?.step_number : 1 ,
            priority: last_update?.prioirty,
            is_finished: true,
            feedback: body.feedback,
            action: "Closed"
        });

        await newUpdate.save();

        enquiry.status = "Closed";

        await enquiry.save();

        return NextResponse.json({message: "Enquiry Closed", status: 200}, {status: 200});
    }catch(err)
    {
        console.log("Error while closing an Enquiry: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500})
    }
}