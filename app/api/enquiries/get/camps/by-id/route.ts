import { enquiryActor, enquiryVisibilityStages } from "@/lib/enquiries/access";
import Enquiries from "@/models/eq_enquiries.model";
import mongoose from "mongoose";
import Eq_camp_solutions from "@/models/eq_camp_solutions.model";
import { EMPTY_CAMP_SOLUTIONS } from "@/lib/enquiries/solutions";
import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_countries.model";
import "@/models/eq_region.model";
import "@/models/eq_province.model";
import "@/models/eq_city.model";
import "@/models/eq_area.model";
import "@/models/eq_camp_headoffice.model";
import "@/models/eq_camp_client_company.model";
import "@/models/eq_camp_contacts.model";
import "@/models/eq_camp_landlord.model";
import "@/models/eq_camp_realestate.model";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const {searchParams} = new URL(req.url);
        const camp_id = searchParams.get("camp_id");

        const camp = await Eq_camps.findById(camp_id)
            .populate({
                path:"country_id",
                select: "country_name"
            })
            .populate({
                path:"region_id",
                select:"region_name"
            })
            .populate({
                path:"province_id",
                select: "province_name"
            })
            .populate({
                path:"city_id",
                select: "city_name"
            })
            .populate({
                path:"area_id",
                select: "area_name"
            })
            .populate("landlord_id")
            .populate("realestate_id")
            .populate("client_company_id")
            .populate("headoffice_id")
            .lean();

            const actor = await enquiryActor();
            if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            if (!mongoose.isValidObjectId(camp_id)) return NextResponse.json({ message: "Provide a valid Facility ID" }, { status: 400 });
            const visible = await Enquiries.aggregate([{ $match: { camp_id: new mongoose.Types.ObjectId(camp_id!) } }, ...enquiryVisibilityStages(actor), { $project: { _id: 1 } }]);
            const contacts = await Eq_camp_contacts.find({ camp_id, $or: [{ enquiry_id: null }, { enquiry_id: { $in: visible.map(entry => entry._id) } }] }).lean();

        const mapping: any = await Eq_camp_solutions.findOne({ camp_id }).lean();
        const solutions = mapping ? {
            solutions_required: mapping.solutions_required,
            solution_details: mapping.solution_details || [],
            solution_other: mapping.solution_other,
            primary_solution: mapping.primary_solution,
            commercial_model: mapping.commercial_model,
        } : EMPTY_CAMP_SOLUTIONS;
        return NextResponse.json({camp: camp ? { ...camp, ...solutions } : camp, contacts, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting camp by id: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
