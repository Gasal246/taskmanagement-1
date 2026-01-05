import { auth } from "@/auth";
// import connectDB from "@/lib/mongo";
// import mongoose from "mongoose";
// import Users from "@/models/users.model";

import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import Location_departments from "@/models/location_departments.model";
import Region_departments from "@/models/region_departments.model";
import User_roles from "@/models/user_roles.model";
import "@/models/roles.model"
import { NextRequest, NextResponse } from "next/server";
import Roles from "@/models/roles.model";
import Users from "@/models/users.model";

// import Region_heads from "@/models/region_heads.model";
// import Region_staffs from "@/models/region_staffs.model";
// import Region_dep_heads from "@/models/region_dep_heads.model";
// import Region_dep_staffs from "@/models/region_dep_staffs.model";

// import Location_heads from "@/models/location_heads.model";
// import Location_staffs from "@/models/location_staffs.model";
// import Location_dep_heads from "@/models/location_dep_heads.model";
// import Location_dep_staffs from "@/models/location_dep_staffs.model";

// import Area_heads from "@/models/area_heads.model";
// import Area_staffs from "@/models/area_staffs.model";
// import Area_dep_heads from "@/models/area_dep_heads.model";
// import Area_dep_staffs from "@/models/area_dep_staffs.model";

// import { NextRequest, NextResponse } from "next/server";
// import User_roles from "@/models/user_roles.model";

// import '@/models/business_regions.model'; 
// import '@/models/business_departments.model'; 
// import '@/models/business_areas.model'; 
// import '@/models/region_departments.model'; 
// import '@/models/location_departments.model'; 
// import '@/models/area_departments.model';
// import '@/models/roles.model';

// connectDB();

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const user_id = searchParams.get("user_id");

//     if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
//       return NextResponse.json(
//         { message: "Invalid or missing user_id", status: 400 },
//         { status: 400 }
//       );
//     }

//     // Base user
//     const userDoc = await Users.findById(user_id)
//       .select("name phone email")
//       .lean();
//     if (!userDoc) {
//       return NextResponse.json(
//         { message: "User not found", status: 404 },
//         { status: 404 }
//       );
//     }

//     // Start with plain object
//     const user: any = { ...userDoc };

//     // Fetch roles in parallel (to avoid long nested queries)
//     const [
//       regionHead,
//       regionStaff,
//       regionDepHead,
//       regionDepStaff,
//       locationHead,
//       locationStaff,
//       locationDepHead,
//       locationDepStaff,
//       areaHead,
//       areaStaff,
//       areaDepHead,
//       areaDepStaff,
//     ] = await Promise.all([
//       Region_heads.findOne({ user_id, status: 1 }).populate("region_id", "region_name"),
//       Region_staffs.findOne({ staff_id: user_id, status: 1 }).populate("region_id", "region_name"),
//       Region_dep_heads.findOne({ user_id }).populate("reg_dep_id", "dep_name"),
//       Region_dep_staffs.findOne({ user_id }).populate("region_dep_id", "dep_name"),

//       Location_heads.findOne({ user_id, status: 1 }).populate("location_id", "location_name"),
//       Location_staffs.findOne({ user_id }).populate("location_id", "location_name"),
//       Location_dep_heads.findOne({ user_id }).populate("location_dep_id", "dep_name"),
//       Location_dep_staffs.findOne({ user_id }).populate("location_dep_id", "dep_name"),

//       Area_heads.findOne({ user_id, status: 1 }).populate("area_id", "area_name"),
//       Area_staffs.findOne({ staff_id: user_id }).populate("area_id", "area_name"),
//       Area_dep_heads.findOne({ user_id }).populate("area_dep_id", "dep_name"),
//       Area_dep_staffs.findOne({ user_id }).populate("area_dep_id", "dep_name"),
//     ]);

//     // Region
//     if (regionHead) {
//       user.region = regionHead.region_id?.region_name;
//     } else if (regionStaff) {
//       user.region = regionStaff.region_id?.region_name;
//       if (regionDepHead) {
//         user.department = regionDepHead.reg_dep_id?.dep_name;
//       } else if (regionDepStaff) {
//         user.department = regionDepStaff.region_dep_id?.dep_name;
//       }
//     }

//     // Location
//     if (locationHead) {
//       user.location = locationHead.location_id?.location_name;
//     } else if (locationStaff) {
//       user.location = locationStaff.location_id?.location_name;
//       if (locationDepHead) {
//         user.department = locationDepHead.location_dep_id?.dep_name;
//       } else if (locationDepStaff) {
//         user.department = locationDepStaff.location_dep_id?.dep_name;
//       }
//     }

//     // Area
//     if (areaHead) {
//       user.area = areaHead.area_id?.area_name;
//     } else if (areaStaff) {
//       user.area = areaStaff.area_id?.area_name;
//       if (areaDepHead) {
//         user.department = areaDepHead.area_dep_id?.dep_name;
//       } else if (areaDepStaff) {
//         user.department = areaDepStaff.area_dep_id?.dep_name;
//       }
//     }

//     const userRole = await User_roles.findOne({user_id: user_id}).populate("role_id", "role_name");
//     user.role = userRole?.role_id?.role_name;

//     return NextResponse.json({ data: user, status: 200 }, { status: 200 });
//   } catch (err) {
//     console.error("Error while getting user data by Id: ", err);
//     return NextResponse.json(
//       { message: "Internal Server Error", status: 500 },
//       { status: 500 }
//     );
//   }
// }


connectDB();

export async function GET(req:NextRequest){
  try{
    const {searchParams} = new URL(req.url);
    const role_id = searchParams.get("role_id");
    const org_id = searchParams.get("org_id");
    
    console.log("role_id: ", role_id);
    console.log("org_id: ", org_id);

    const session:any = await auth();
    if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status:401});

    const user_name = await Users.findById(session?.user?.id).select("name");
    console.log("username: ", user_name);
    console.log("user_id: ", session?.user?.id);
    
    
    
    const userRole = await Roles.findById(role_id)
    if(!userRole) return NextResponse.json({message:"No role found", status:401}, {status:401});

    switch(userRole?.role_name){
      case "REGION_HEAD": {
          const region = await Business_regions.findById(org_id).select("region_name");
          const role = "REGION_HEAD";
          return NextResponse.json({data: {region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "REGION_STAFF": {
        const region = await Business_regions.findById(org_id).select("region_name");
        const role = "REGION_STAFF";
        return NextResponse.json({data: {region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "AREA_HEAD" : {
        const area = await Business_areas.findById(org_id);
        const role = "AREA_HEAD";
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "AREA_STAFF" : {
        const area = await Business_areas.findById(org_id);
        const role = "AREA_STAFF";
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "LOCATION_HEAD": {
        const location = await Business_locations.findById(org_id);
        const role = "LOCATION_HEAD";
        const area = await Business_areas.findById(location?.area_id).select("area_name region_id");
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {location_name: location?.location_name, area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "LOCATION_STAFF": {
        const location = await Business_locations.findById(org_id);
        const role = "LOCATION_STAFF";
        const area = await Business_areas.findById(location?.area_id).select("area_name region_id");
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {location_name: location?.location_name, area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "REGION_DEP_HEAD": {
        const department = await Region_departments.findById(org_id);
        const role = "REGION_DEP_HEAD";
        const region = await Business_regions.findById(department?.region_id).select("region_name");
        return NextResponse.json({data: {dep_name: department?.dep_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "REGION_DEP_STAFF": {
        const department = await Region_departments.findById(org_id);
        const role = "REGION_DEP_STAFF";
        const region = await Business_regions.findById(department?.region_id).select("region_name");
        return NextResponse.json({data: {dep_name: department?.dep_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "AREA_DEP_HEAD": {
        const department = await Area_departments.findById(org_id);
        const role = "AREA_DEP_HEAD";
        const area = await Business_areas.findById(department?.area_id).select("area_name region_id");
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {dep_name: department?.dep_name, area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "AREA_DEP_STAFF": {
        const department = await Area_departments.findById(org_id);
        const role = "AREA_DEP_STAFF";
        const area = await Business_areas.findById(department?.area_id).select("area_name region_id");
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {dep_name: department?.dep_name, area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "LOCATION_DEP_HEAD": {
        const department = await Location_departments.findById(org_id);
        const role = "LOCATION_DEP_HEAD";
        const location = await Business_locations.findById(department?.location_id).select("location_name area_id");
        const area = await Business_areas.findById(location?.area_id).select("area_name region_id");
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {dep_name: department?.dep_name, location_name: location?.location_name, area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
      case "LOCATION_DEP_STAFF": {
        const department = await Location_departments.findById(org_id);
        const role = "LOCATION_DEP_STAFF";
        const location = await Business_locations.findById(department?.location_id).select("location_name area_id");
        const area = await Business_areas.findById(location?.area_id).select("area_name region_id");
        const region = await Business_regions.findById(area?.region_id).select("region_name");
        return NextResponse.json({data: {dep_name: department?.dep_name, location_name: location?.location_name, area_name: area?.area_name, region_name: region?.region_name, role: role, user_name: user_name}, status:200}, {status:200});
      }
    }

  }catch(err){
    console.log("error while getting user-all-details: ", err);
    return NextResponse.json({message:"Internal Server Error", status:500}, {status:500});
  }

}