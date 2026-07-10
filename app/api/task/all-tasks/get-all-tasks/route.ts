import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Project_Teams from "@/models/project_team.model";
import Team_Members from "@/models/team_members.model";
import Task_Activities from "@/models/task_activities.model";
import { auth } from "@/auth";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import { escapeRegex, getBusinessHeads, getRoleNameFromRequest } from "@/app/api/helpers/task-filter-scope";
import Business_staffs from "@/models/business_staffs.model";
import mongoose from "mongoose";
import { addTaskAssignmentSummaries } from "@/app/api/helpers/task-assignment-summary";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session: any = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
        const {searchParams} = new URL(req.url);

        const type = searchParams.get("type")
        const business_id = searchParams.get("business_id");
        const user_id = searchParams.get("user_id");
        const startDateRaw = searchParams.get("startDate");
        const endDateRaw = searchParams.get("endDate");
        const pageRaw = searchParams.get("page");
        const limitRaw = searchParams.get("limit");
        const nameQuery = (searchParams.get("nameQuery") || "").trim();
        const staffId = (searchParams.get("staffId") || "").trim();
        const assignedById = (searchParams.get("assignedById") || "").trim();
        const parseDate = (value: string | null) => {
            if (!value || value === "undefined" || value === "null") return null;
            const date = new Date(value);
            return Number.isNaN(date.valueOf()) ? null : date;
        };
        const startDate = parseDate(startDateRaw);
        const endDate = parseDate(endDateRaw);
        const page = Math.max(1, Number(pageRaw) || 1);
        const limit = Math.min(50, Math.max(1, Number(limitRaw) || 12));
        const skip = (page - 1) * limit;
        
        const query:any = {};
        if(!business_id) return NextResponse.json({message: "Please Provide business_id"}, {status:400});
        const activeBusinessId = await resolveActiveBusinessIdForUser(session.user.id);
        const roleName = getRoleNameFromRequest(req);
        if (!activeBusinessId || activeBusinessId !== business_id || !roleName.includes("ADMIN")) {
            return NextResponse.json({ message: "Unauthorized Access" }, { status: 403 });
        }
        if (staffId) {
            if (!mongoose.isValidObjectId(staffId)) {
                return NextResponse.json({ message: "Invalid staff filter", status: 400 }, { status: 400 });
            }
            const allowedStaff = await Business_staffs.exists({ business_id, user_id: staffId, status: 1 });
            if (!allowedStaff) {
                return NextResponse.json({ message: "Staff filter is not permitted", status: 403 }, { status: 403 });
            }
        }
        if (assignedById) {
            if (!mongoose.isValidObjectId(assignedById)) {
                return NextResponse.json({ message: "Invalid assigned-by filter", status: 400 }, { status: 400 });
            }
            const headIds = (await getBusinessHeads(business_id)).map((head) => head.id);
            if (!headIds.includes(assignedById)) {
                return NextResponse.json({ message: "Assigned-by filter is not permitted", status: 403 }, { status: 403 });
            }
            query.creator = assignedById;
        }
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

        const matchMetadata = new Map<string, { staffTaskAssigned?: boolean; staffActivityAssigned?: boolean; nameMatched?: boolean }>();
        if (nameQuery) {
            const regex = new RegExp(escapeRegex(nameQuery), "i");
            const matchingActivities = await Task_Activities.find({ activity: regex }).select("task_id").lean();
            const activityTaskIds = matchingActivities.map((item: any) => item.task_id).filter(Boolean);
            query.$and = [...(query.$and || []), { $or: [{ task_name: regex }, { _id: { $in: activityTaskIds } }] }];
            activityTaskIds.forEach((id: any) => matchMetadata.set(id.toString(), { nameMatched: true }));
        }
        if (staffId) {
            const matchingActivities = await Task_Activities.find({ assigned_to: staffId }).select("task_id").lean();
            const activityTaskIds = matchingActivities.map((item: any) => item.task_id).filter(Boolean);
            query.$and = [...(query.$and || []), { $or: [{ assigned_to: staffId }, { _id: { $in: activityTaskIds } }] }];
            activityTaskIds.forEach((id: any) => {
                const previous = matchMetadata.get(id.toString()) || {};
                matchMetadata.set(id.toString(), { ...previous, staffActivityAssigned: true });
            });
        }

        const [tasks, total] = await Promise.all([
            Business_Tasks.find(query)
                .skip(skip)
                .limit(limit)
                .lean(),
            Business_Tasks.countDocuments(query),
        ]);

        const tasksWithAssignments = await addTaskAssignmentSummaries(tasks);
        const data = tasksWithAssignments.map((task: any) => {
            const metadata = matchMetadata.get(task._id.toString()) || {};
            return {
                ...task,
                match: {
                    nameMatched: Boolean(nameQuery && (metadata.nameMatched || new RegExp(escapeRegex(nameQuery), "i").test(task.task_name || ""))),
                    staffTaskAssigned: Boolean(staffId && task.assigned_to?.toString() === staffId),
                    staffActivityAssigned: Boolean(staffId && metadata.staffActivityAssigned),
                    assignedByMatched: Boolean(assignedById && task.creator?.toString() === assignedById),
                },
            };
        });
        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        }, {status:200});
    }catch(err){
        console.log("error while getting tasks", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}
