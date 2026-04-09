import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_heads from "@/models/area_heads.model";
import Area_departments from "@/models/area_departments.model";
import Business_Project from "@/models/business_project.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_heads from "@/models/location_heads.model";
import Location_departments from "@/models/location_departments.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_heads from "@/models/region_heads.model";
import Region_departments from "@/models/region_departments.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import "@/models/business_clients.model";
import "@/models/business_regions.model";
import "@/models/business_areas.model";
import "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) {
            return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const business_id = searchParams.get("business_id");
        const role_id_param = searchParams.get("role_id");
        const org_id = searchParams.get("org_id");
        const tab = searchParams.get("tab") || searchParams.get("status") || searchParams.get("section");
        const type = searchParams.get("type");
        const client_id = searchParams.get("client_id");
        const region_id = searchParams.get("region_id");
        const area_id = searchParams.get("area_id");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const pageRaw = searchParams.get("page");
        const limitRaw = searchParams.get("limit");

        const page = Math.max(1, Number(pageRaw) || 1);
        const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
        const skip = (page - 1) * limit;

        let roleId: string | null = role_id_param;
        if (!roleId) {
            const roleCookie = req.cookies.get("user_role")?.value;
            if (roleCookie) {
                try {
                    roleId = JSON.parse(roleCookie)?._id;
                } catch {
                    roleId = null;
                }
            }
        }

        let roleName: string | undefined;
        if (roleId) {
            const role: { role_name?: string } | null = await Roles.findById(roleId)
                .select("role_name")
                .lean<{ role_name?: string }>();
            roleName = role?.role_name;
        }

        if (!roleName) {
            const userRole = await User_roles.findOne({ user_id: session?.user?.id, status: 1 })
                .populate({ path: "role_id", select: { role_name: 1 } })
                .lean();
            roleName = (userRole as any)?.role_id?.role_name;
        }

        const query: any = {};
        if (business_id) {
            query.business_id = business_id;
        }

        const scopeOr: any[] = [];
        const addScope = (condition: any) => {
            if (condition) scopeOr.push(condition);
        };

        const [directAssignedProjects, headedTeams, teamMembershipRows] = await Promise.all([
            Business_Project.find({
                $or: [
                    { project_head: session?.user?.id },
                    { project_heads: session?.user?.id },
                    { project_supervisors: session?.user?.id },
                ],
            })
                .select("_id")
                .lean(),
            Project_Teams.find({ team_head: session?.user?.id })
                .select("project_id")
                .lean(),
            Project_Team_Members.find({ user_id: session?.user?.id })
                .select("project_team_id")
                .lean(),
        ]);

        const teamIds = teamMembershipRows
            .map((row: any) => row?.project_team_id)
            .filter(Boolean);
        const memberTeamProjects = teamIds.length > 0
            ? await Project_Teams.find({ _id: { $in: teamIds } })
                .select("project_id")
                .lean()
            : [];
        const assignedProjectIds = Array.from(
            new Set(
                [
                    ...directAssignedProjects.map((project: any) => project?._id),
                    ...headedTeams.map((team: any) => team?.project_id),
                    ...memberTeamProjects.map((team: any) => team?.project_id),
                ]
                    .filter(Boolean)
                    .map((id: any) => id?.toString?.() ?? String(id))
            )
        );

        if (assignedProjectIds.length > 0) {
            addScope({ _id: { $in: assignedProjectIds } });
        }

        switch (roleName) {
            case "REGION_HEAD": {
                const regions = await Region_heads.find({ user_id: session?.user?.id, status: 1 })
                    .select("region_id")
                    .lean();
                const regionIds = regions.map((rg: any) => rg?.region_id).filter(Boolean);
                if (regionIds.length > 0) {
                    addScope({ region_id: { $in: regionIds } });
                }
                break;
            }
            case "AREA_HEAD": {
                const areas = await Area_heads.find({ user_id: session?.user?.id, status: 1 })
                    .select("area_id")
                    .lean();
                const areaIds = areas.map((ar: any) => ar?.area_id).filter(Boolean);
                if (areaIds.length > 0) {
                    addScope({ area_id: { $in: areaIds } });
                }
                break;
            }
            case "LOCATION_HEAD": {
                const locations = await Location_heads.find({ user_id: session?.user?.id, status: 1 })
                    .select("location_id")
                    .lean();
                const locationIds = locations.map((loc: any) => loc?.location_id).filter(Boolean);
                if (locationIds.length > 0) {
                    addScope({ location_id: { $in: locationIds } });
                }
                break;
            }
            case "REGION_DEP_HEAD": {
                const regionDeptHeads = await Region_dep_heads.find({
                    user_id: session?.user?.id,
                    status: 1,
                    ...(org_id ? { reg_dep_id: org_id } : {}),
                })
                    .select("reg_dep_id")
                    .lean();
                const deptIds = regionDeptHeads.map((head: any) => head?.reg_dep_id).filter(Boolean);
                if (deptIds.length > 0) {
                    const departments = await Region_departments.find({ _id: { $in: deptIds } })
                        .select("region_id type")
                        .lean();
                    departments.forEach((dept: any) => {
                        if (dept?.region_id && dept?.type) {
                            addScope({ region_id: dept.region_id, type: dept.type });
                        }
                    });
                }
                break;
            }
            case "AREA_DEP_HEAD": {
                const areaDeptHeads = await Area_dep_heads.find({
                    user_id: session?.user?.id,
                    status: 1,
                    ...(org_id ? { area_dep_id: org_id } : {}),
                })
                    .select("area_dep_id")
                    .lean();
                const deptIds = areaDeptHeads.map((head: any) => head?.area_dep_id).filter(Boolean);
                if (deptIds.length > 0) {
                    const departments = await Area_departments.find({ _id: { $in: deptIds } })
                        .select("area_id type")
                        .lean();
                    departments.forEach((dept: any) => {
                        if (dept?.area_id && dept?.type) {
                            addScope({ area_id: dept.area_id, type: dept.type });
                        }
                    });
                }
                break;
            }
            case "LOCATION_DEP_HEAD": {
                const locationDeptHeads = await Location_dep_heads.find({
                    user_id: session?.user?.id,
                    status: 1,
                    ...(org_id ? { location_dep_id: org_id } : {}),
                })
                    .select("location_dep_id")
                    .lean();
                const deptIds = locationDeptHeads.map((head: any) => head?.location_dep_id).filter(Boolean);
                if (deptIds.length > 0) {
                    const departments = await Location_departments.find({ _id: { $in: deptIds } })
                        .select("location_id type")
                        .lean();
                    departments.forEach((dept: any) => {
                        if (dept?.location_id && dept?.type) {
                            addScope({ location_id: dept.location_id, type: dept.type });
                        }
                    });
                }
                break;
            }
            case "REGION_STAFF":
            case "AREA_STAFF":
            case "LOCATION_STAFF":
            case "REGION_DEP_STAFF":
            case "AREA_DEP_STAFF":
            case "LOCATION_DEP_STAFF":
            case "AGENT": {
                addScope({ creator: session?.user?.id });
                break;
            }
            default:
                addScope({ creator: session?.user?.id });
                break;
        }

        if (scopeOr.length > 0) {
            query.$or = scopeOr;
        } else {
            return NextResponse.json({
                data: [],
                pagination: { page, limit, total: 0, totalPages: 1 },
            });
        }

        if (tab) {
            switch (tab) {
                case "waiting":
                case "waiting-for-approval":
                case "waiting_for_approval":
                    query.is_approved = false;
                    break;
                case "current":
                case "ongoing":
                case "on-going":
                case "on_going":
                    query.is_approved = true;
                    query.status = { $in: ["approved", "pending"] };
                    break;
                case "previous":
                case "completed":
                    query.status = "completed";
                    break;
            }
        }

        if (type) query.type = type;
        if (client_id) query.client_id = client_id;
        if (region_id) query.region_id = region_id;
        if (area_id) query.area_id = area_id;

        if (startDate || endDate) {
            query.start_date = {};
            if (startDate) query.start_date.$gte = new Date(startDate);
            if (endDate) query.start_date.$lte = new Date(endDate);
        }

        const [projects, total] = await Promise.all([
            Business_Project.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("client_id", "client_name")
                .populate("region_id", "region_name")
                .populate("area_id", "area_name region_id")
                .populate("creator", "name email avatar_url")
                .populate("admin_id", "name email avatar_url")
                .lean(),
            Business_Project.countDocuments(query),
        ]);

        return NextResponse.json(
            {
                data: projects,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
            },
            { status: 200 }
        );
    } catch (err) {
        console.log("Error while getting staff projects: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}
