import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Project_Teams from "@/models/project_team.model";
import Team_Members from "@/models/team_members.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);

        const type = searchParams.get("type")
        const business_id = searchParams.get("business_id");
        const user_id = searchParams.get("user_id");
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
        const taskType = type || "all";
        if(type && !user_id){
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

        if (user_id) {
            const teamMembers = await Team_Members.find({ user_id }).select("team_id").lean();
            const headTeams = await Project_Teams.find({ team_head: user_id }).select("_id").lean();
            const teamIds = [
                ...teamMembers.map((item:any) => item?.team_id).filter(Boolean),
                ...headTeams.map((item:any) => item?._id).filter(Boolean),
            ];

            if (taskType === "single") {
                query.assigned_to = user_id;
                query.is_project_task = false;
            } else if (taskType === "project") {
                query.is_project_task = true;
                query.assigned_teams = { $in: teamIds.length ? teamIds : [] };
            } else {
                query.$or = [
                    { assigned_to: user_id },
                    { assigned_teams: { $in: teamIds.length ? teamIds : [] } },
                ];
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
