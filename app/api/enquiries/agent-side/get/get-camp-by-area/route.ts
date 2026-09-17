import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_camp_solutions from "@/models/eq_camp_solutions.model";
import { EMPTY_CAMP_SOLUTIONS } from "@/lib/enquiries/solutions";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const area_id = searchParams.get("area_id");
        if(!area_id) return NextResponse.json({message: "Please select area first", status: 400}, {status: 400});

        const camps: any[] = await Eq_camps.find({area_id: area_id, is_active: true}).lean();
        const mappings: any[] = await Eq_camp_solutions.find({ camp_id: { $in: camps.map(camp => camp._id) } }).lean();
        const solutionsByCamp = new Map(mappings.map(mapping => [String(mapping.camp_id), mapping]));
        const enriched = camps.map(camp => {
            const mapping = solutionsByCamp.get(String(camp._id));
            return {
                ...camp,
                solutions_required: mapping?.solutions_required || EMPTY_CAMP_SOLUTIONS.solutions_required,
                solution_details: mapping?.solution_details || EMPTY_CAMP_SOLUTIONS.solution_details,
                solution_other: mapping?.solution_other || "",
                primary_solution: mapping?.primary_solution || "",
                commercial_model: mapping?.commercial_model || EMPTY_CAMP_SOLUTIONS.commercial_model,
            };
        });

        return NextResponse.json({camps: enriched, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting camps: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}
