import { auth } from "@/auth";
import { HEAD_ROLES } from "@/lib/constants";
import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";
import User_roles from "@/models/user_roles.model";
import Region_staffs from "@/models/region_staffs.model";
import Area_staffs from "@/models/area_staffs.model";
import Location_staffs from "@/models/location_staffs.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import User_skills from "@/models/user_skills.model";
import "@/models/users.model";
import "@/models/business_skills.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await auth();
        
        if(!session) return NextResponse.json({message:"Un-Authorized Access", status:401}, {status:401});

        const {searchParams} = new URL(req.url);
        const role_id = searchParams.get("role_id");
        const domain_id = searchParams.get("domain_id");
        if (!role_id || !domain_id) {
            return NextResponse.json({message:"Role id and domain id are required", status:400}, {status:400});
        }

        const userRole = await User_roles.findOne({user_id:session?.user?.id, role_id: role_id}).populate("role_id", "role_name");
        if(!userRole) return NextResponse.json({message:"No role found for the user", status:401}, {status:401});
        const roleName = userRole?.role_id?.role_name;
        if (!roleName || !HEAD_ROLES.includes(roleName)) {
            return NextResponse.json({message:"Un-Authorized Access", status:403}, {status:403});
        }

        const roleConfig: Record<string, {
            model: any;
            domainField: string;
            userField: "staff_id" | "user_id";
            staffRole: string;
        }> = {
            REGION_HEAD: { model: Region_staffs, domainField: "region_id", userField: "staff_id", staffRole: "REGION_STAFF" },
            REGION_DEP_HEAD: { model: Region_dep_staffs, domainField: "region_dep_id", userField: "user_id", staffRole: "REGION_DEP_STAFF" },
            AREA_HEAD: { model: Area_staffs, domainField: "area_id", userField: "staff_id", staffRole: "AREA_STAFF" },
            AREA_DEP_HEAD: { model: Area_dep_staffs, domainField: "area_dep_id", userField: "user_id", staffRole: "AREA_DEP_STAFF" },
            LOCATION_HEAD: { model: Location_staffs, domainField: "location_id", userField: "user_id", staffRole: "LOCATION_STAFF" },
            LOCATION_DEP_HEAD: { model: Location_dep_staffs, domainField: "location_dep_id", userField: "user_id", staffRole: "LOCATION_DEP_STAFF" },
        };

        const config = roleConfig[roleName];
        if (!config) {
            return NextResponse.json({message:"Staff Role Not Recognized", status:400}, {status:400});
        }

        const staffs = await config.model.find({ [config.domainField]: domain_id, status: 1 })
            .populate({
                path: config.userField,
                model: "users",
                select: "name email phone status avatar_url last_login last_logout",
                match: { status: 1 },
            })
            .lean();

        const activeStaffs = (staffs || []).filter((staff: any) => staff?.[config.userField]);
        const userIds = Array.from(
            new Set(
                activeStaffs
                    .map((staff: any) => staff?.[config.userField]?._id)
                    .filter(Boolean)
                    .map((id: any) => id.toString())
            )
        );

        const skillDocs = userIds.length
            ? await User_skills.find({ user_id: { $in: userIds }, status: 1 })
                .populate("skill_id", "skill_name")
                .lean()
            : [];

        const skillsByUserId = new Map<string, any[]>();
        for (const skill of skillDocs) {
            const key = skill?.user_id?.toString();
            if (!key) continue;
            const existing = skillsByUserId.get(key) || [];
            existing.push(skill);
            skillsByUserId.set(key, existing);
        }

        const data = activeStaffs.map((staff: any) => {
            const user = staff?.[config.userField];
            const userId = user?._id?.toString() || "";
            return {
                _id: user?._id,
                name: user?.name || "",
                email: user?.email || "",
                phone: user?.phone || "",
                status: user?.status ?? 0,
                avatar_url: user?.avatar_url || null,
                last_login: user?.last_login || null,
                last_logout: user?.last_logout || null,
                role: config.staffRole,
                skills: skillsByUserId.get(userId) || [],
            };
        });

        return NextResponse.json({data, status: 200}, {status:200});
        
    }catch(err){
        console.log("Error while getting all staffs: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500});
    }
}
