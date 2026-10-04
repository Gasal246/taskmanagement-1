import { DashboardAccessError, resolveDashboardScope } from "@/lib/dashboard-access";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import Location_departments from "@/models/location_departments.model";
import Region_departments from "@/models/region_departments.model";
import User_skills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import "@/models/business_skills.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});

        const {searchParams} = new URL(req.url);
        const user_id = session?.user?.id;
        const role_id = searchParams.get("role_id");
        const org_id = searchParams.get("org_id");

        const scope = await resolveDashboardScope(user_id, role_id, org_id, Boolean(session.user.is_super));
        const [userData, userSkills, org_data] = await Promise.all([
            Users.findById(user_id).lean(),
            User_skills.find({ user_id, status: 1 }).populate("skill_id").lean(),
            getOrganizationData(scope.roleName, scope.resource),
        ]);
        const skills = userSkills.map((skill: any) => skill?.skill_id?.skill_name);
        return NextResponse.json({userData, org_data, skills, status: 200}, {status: 200});
    }catch(err){
        if (err instanceof DashboardAccessError) return NextResponse.json({ message: err.message }, { status: err.status });
        console.log("Error while getting Staff User Profile: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}

async function getOrganizationData(role: string, resource: any) {
    const isDepartment = role.includes("_DEP_");
    const kind = role.startsWith("LOCATION") ? "location" : role.startsWith("AREA") ? "area" : "region";
    const model = kind === "location" ? (isDepartment ? Location_departments : Business_locations)
        : kind === "area" ? (isDepartment ? Area_departments : Business_areas)
        : (isDepartment ? Region_departments : Business_regions);
    const paths = ["region_id", "area_id", "location_id"].filter(path => model.schema.path(path));
    // Populate the authorized resource rather than finding it a second time.
    const row: any = paths.length ? await model.populate({ ...resource }, paths.map(path => ({ path }))) : resource;
    return { role, ...(isDepartment ? { department: row } : { [kind]: row }),
        ...(row.region_id ? { region: row.region_id } : {}),
        ...((isDepartment || kind === "location") && row.area_id ? { area: row.area_id } : {}),
        ...(isDepartment && row.location_id ? { location: row.location_id } : {}),
    };
}
