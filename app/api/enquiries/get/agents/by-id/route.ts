import { authorizeUserProfile } from "@/lib/server-access";
import { enquiryActor, enquiryManagementFilter } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import Eq_agents_details from "@/models/eq_agents_details.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_region.model";
import "@/models/eq_countries.model";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const {searchParams} = new URL(req.url);
        const agent_id = searchParams.get("agent_id");

        const denied = await authorizeUserProfile(agent_id);
        if (denied) return denied;
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (actor.actorId !== agent_id && !actor.admin) return NextResponse.json({ message: "An active administrator role is required" }, { status: 403 });
        const scope = actor.actorId === agent_id ? {} : enquiryManagementFilter(actor);

        const agent = await Users.findById(agent_id).select("name email phone status").lean();
        const enquiries = await Eq_enquiry.find({createdBy: agent_id, ...scope}).populate("camp_id");

        const agentDetails = await Eq_agents_details.findOne({user_id: agent_id}).populate([
            {path: "country_id", select: "country_name"},
            {path: "region_id", select: "region_name"}
        ]).lean();

        const onGoing = enquiries.filter((enq)=> enq.status == "In Progress").length;
        const closed = enquiries.filter((enq)=> enq.status == "Closed").length;

        return NextResponse.json({agent, enquiries, onGoing, closed, agentDetails, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting Agent by ID: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}