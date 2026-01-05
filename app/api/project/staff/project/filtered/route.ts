import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_heads from "@/models/area_heads.model";
import Business_Project from "@/models/business_project.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_heads from "@/models/location_heads.model";
import Project_Departments from "@/models/project_departments.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_heads from "@/models/region_heads.model";
import Roles from "@/models/roles.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const section = searchParams.get("section"); // current | waiting | approved
        const domainWise = searchParams.get("domainWise"); // client | region | department
        const domainId = searchParams.get("domainId"); // followed Id for selected domain
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const role_id = searchParams.get("role_id");
        const org_id = searchParams.get("org_id"); // current user's department-ID
        console.log("role_id: ", role_id);

        const role = await Roles.findById(role_id).select("role_name");

        const query: any = {};
        console.log("roleData: ", role);
        // Initialize OR query
        const orArray: any[] = [];

        switch (role?.role_name) {
            case "REGION_HEAD": {
                const region: any = await Region_heads.find({ user_id: session?.user?.id });
                if (region?.length > 0) {
                    query.region_id = { $in: region?.map((rg: any) => rg?.region_id) };
                    query.is_approved = true;
                }
                console.log("regionprojs: ", region);
                break;
            }
            case "AREA_HEAD": {
                const area: any = await Area_heads.find({ user_id: session?.user?.id });
                if (area?.length > 0){
                    query.area_id = { $in: area?.area_id };
                    query.is_approved = true;
                } 
                break;
            } case "LOCATION_HEAD": {
                const location: any = await Location_heads.find({ user_id: session?.user?.id });
                if (location.length > 0){
                    query.location_id = { $in: location?.location_id };
                    query.is_approved = true;
                } 
                break;
            }
            default: {
                if (
                    role?.role_name === "REGION_DEP_HEAD" ||
                    role?.role_name === "AREA_DEP_HEAD" ||
                    role?.role_name === "LOCATION_DEP_HEAD"
                ) {
                    let deptField = ""; // field name in dep_heads collection
                    let userDeptModel;

                    switch (role?.role_name) {
                        case "REGION_DEP_HEAD":
                            deptField = "reg_dep_id";
                            userDeptModel = Region_dep_heads;
                            break;
                        case "AREA_DEP_HEAD":
                            deptField = "area_dep_id";
                            userDeptModel = Area_dep_heads;
                            break;
                        case "LOCATION_DEP_HEAD":
                            deptField = "location_dep_id";
                            userDeptModel = Location_dep_heads;
                            break;
                    }

                    // Check if user belongs to this department
                    const userDept = await userDeptModel?.findOne({
                        user_id: session?.user?.id,
                        [deptField]: org_id,
                    });

                    // Collect project IDs from teams
                    const teamIds = await Project_Team_Members.find({ user_id: session?.user?.id })
                        .select("project_team_id")
                        .lean();

                    const teamProjectIds = await Project_Teams.find({
                        _id: { $in: teamIds.map((t) => t.project_team_id) },
                    })
                        .select("project_id")
                        .lean();

                    // 🧩 NEW LOGIC: Fetch projects linked to the department
                    if (userDept) {
                        const projectDepartments = await Project_Departments.find({
                            department_id: new mongoose.Types.ObjectId(org_id!),
                        }).select("project_id");

                        if (projectDepartments.length > 0) {
                            const deptProjectIds = projectDepartments.map((pd) => pd.project_id);
                            orArray.push({ _id: { $in: deptProjectIds } });
                        }
                    }

                    // Include team projects if any
                    if (teamProjectIds.length > 0) {
                        orArray.push({ _id: { $in: teamProjectIds.map((p) => p.project_id) } });
                    }
                }
            }
        }

        if (section) {
            switch (section) {
                case "waiting":
                    query.is_approved = false;
                    query.creator = session?.user?.id;
                    break;
                case "current":
                    query.is_approved = true;
                    query.status = { $in: ["approved", "pending"] };
                    break;
                case "previous":
                    query.status = "completed";
                    break;
            }
        }

        if (domainWise && domainId) {
            switch (domainWise) {
                case "client":
                    query.client_id = new mongoose.Types.ObjectId(domainId)
                    break;
                case "region":
                    query.region_id = new mongoose.Types.ObjectId(domainId)
                    break;
                case "department":
                    query.type = new mongoose.Types.ObjectId(domainId)
                    break;
            }
        }

        if (startDate || endDate) {
            query.start_date = {};
            if (startDate) query.start_date.$gte = new Date(startDate);
            if (endDate) query.start_date.$lte = new Date(endDate);
        }
        console.log("query: ", query);

        if (orArray.length > 0) {
            query.$or = orArray;
        }

        const projects = await Business_Project.find(query).exec();
        return NextResponse.json({ data: projects, status: 200 }, { status: 200 });

    } catch (err) {
        console.log("Error while getting staff projects: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 })
    }
}