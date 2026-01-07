import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);

        const type = searchParams.get("type")
        const business_id = searchParams.get("business_id");
        const startDateRaw = searchParams.get("startDate");
        const endDateRaw = searchParams.get("endDate");
        const parseDate = (value: string | null) => {
            if (!value || value === "undefined" || value === "null") return null;
            const date = new Date(value);
            return Number.isNaN(date.valueOf()) ? null : date;
        };
        const startDate = parseDate(startDateRaw);
        const endDate = parseDate(endDateRaw);
        
        const query:any = {};
        if(!business_id) return NextResponse.json({message: "Please Provide business_id"}, {status:400});
        query.business_id = business_id;
        if(type){
            switch(type){
                case 'project':
                    query.is_project_task = true;
                    break;
                case 'single':
                    query.is_project_task = false;
                    break;
                case 'all':
                    break;
            }
        }

        if(startDate || endDate ){
            query.start_date = {};
            if(startDate) query.start_date.$gte = startDate;
            if(endDate) query.start_date.$lte = endDate;
        }
        
        const tasks = await Business_Tasks.find(query).exec();
        return NextResponse.json({data:tasks}, {status:200});
    }catch(err){
        console.log("error while getting tasks", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}
