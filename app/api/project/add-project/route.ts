import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { ObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import User_roles from "@/models/user_roles.model";
import Flow_Log from "@/models/Flow_Log.model";
import Business_Project from "@/models/business_project.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Roles from "@/models/roles.model";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Users from "@/models/users.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Business_regions from "@/models/business_regions.model";

connectDB();

interface Body {
    project_name: string,
    project_description: string,
    business_id: string,
    status: string,
    client_id: ObjectId,
    start_date: Date,
    end_date: Date,
    task_count: number,
    completed_task_count: number,
    type: string,
    priority: string,
    region_id:string | null,
    area_id: string | null,
    role_id: string,
    dept_id: string | null
}

export async function POST(req: NextRequest){
    try{
        const session: any = await auth();
        if(!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const username = await Users.findById(session?.user?.id).select("name");
        const body = await req.json() as Body;
        //const user = await User_roles.findById(session?.user?.id).populate("role_id", "role_name");
        const userRole = await Roles.findById(body?.role_id);
        if(userRole?.role_name == "BUSINESS_ADMIN"){
            const newProject = new Business_Project({
                project_name: body.project_name,
                project_description: body.project_description,
                business_id: body.business_id,
                status: "approved",
                client_id: body.client_id,
                creator: session?.user?.id,
                start_date: body.start_date,
                end_date: body.end_date,
                task_count: 0,
                completed_task_count: 0,
                is_approved: true,
                admin_id: session?.user?.id,
                type: body.type,
                priority: body.priority,
                region_id: body.region_id,
                area_id: body.area_id || null
            })

            const savedProject = await newProject.save();
            const flowLog = new Flow_Log({
                user_id: session?.user?.id,
                Log: `Project Created and Approved by Business Admin -${username.name}`,
                description: `Project ${body.project_name} has been created successfully.`,
                project_id: savedProject._id
            })
            const savedFlowLog = await flowLog.save();
        } else {
            switch(userRole?.role_name){
                case 'REGION_DEP_HEAD':
                    const isSales = await Region_dep_heads.findOne({user_id:session?.user?.id, reg_dep_id: body.dept_id}).populate('reg_dep_id')
                    if(isSales?.reg_dep_id?.type != 'sales'){
                        return new NextResponse("Only Sales Department Heads can create projects", { status: 403 });
                    }
                    const newProject = new Business_Project({
                        project_name: body.project_name,
                        project_description: body.project_description,
                        business_id: body.business_id,
                        status: "pending",
                        creator: session?.user?.id,
                        client_id: body.client_id,
                        start_date: body.start_date,
                        end_date: body.end_date,
                        task_count: 0,
                        completed_task_count: 0,
                        is_approved: false,
                        type: body.type,
                        priority: body.priority,
                        region_id: isSales?.reg_dep_id?.region_id,
                        department_id: body.dept_id
                    })

                    const savedProject = await newProject.save();
                    const flowLog = new Flow_Log({
                        user_id: session?.user?.id,
                        Log: `Project Created by Region Department Head -${username.name}`,
                        description: `Project ${body.project_name} has been created successfully and is pending approval.`,
                        project_id: savedProject._id
                    });
                    const savedFlowLog = await flowLog.save();
                    break;
                case 'AREA_DEP_HEAD':
                    const isSalesArea = await Area_dep_heads.findOne({user_id: session?.user?.id, area_dep_id: body?.dept_id}).populate('area_dep_id');
                    if(isSalesArea?.reg_dep_id?.type != 'sales'){
                        return new NextResponse("Only Sales Department can create projects", { status: 403 });
                    }
                    const newProjectByStaff = new Business_Project({
                        project_name: body.project_name,
                        project_description: body.project_description,
                        business_id: body.business_id,
                        status: "pending",
                        creator: session?.user?.id,
                        client_id: body.client_id,
                        start_date: body.start_date,
                        end_date: body.end_date,
                        task_count: 0,
                        completed_task_count: 0,
                        is_approved: false,
                        type: body.type,
                        priority: body.priority,
                        region_id: isSalesArea?.area_dep_id?.region_id,
                        area_id: isSalesArea?.area_dep_id?.area_id,
                        department_id: body.dept_id
                    })
                    const savedProjectByStaff = await newProjectByStaff.save();
                    const flowLogByStaff = new Flow_Log({
                        user_id: session?.user?.id,
                        Log: `Project Created by Area Sales Department Head -${username.name}`,
                        description: `Project ${body.project_name} has been created successfully and is pending approval.`,
                        project_id: savedProjectByStaff._id
                    });
                    await flowLogByStaff.save();
                    break;
                case 'LOCATION_DEP_HEAD':
                    const isSalesLocation = await Location_dep_heads.findOne({user_id:session?.user?.id, location_dep_id: body.dept_id}).populate('location_dep_id');
                    if(isSalesLocation?.reg_dep_id?.type != 'sales'){
                        return new NextResponse("Only Sales Department can create projects", { status: 403 });
                    }
                    const newProjectByLocation = new Business_Project({
                        project_name: body.project_name,
                        project_description: body.project_description,
                        business_id: body.business_id,
                        status: "pending",
                        creator: session?.user?.id,
                        client_id: body.client_id,
                        start_date: body.start_date,
                        end_date: body.end_date,
                        task_count: 0,
                        completed_task_count: 0,
                        is_approved: false,
                        type: body.type,
                        priority: body.priority,
                        region_id: isSalesLocation?.location_dep_id?.region_id,
                        area_id: isSalesLocation?.location_dep_id?.area_id,
                        location_id: isSalesLocation?.location_dep_id?.location_id,
                        department_id: body.dept_id
                    })
                    const savedProjectByLocation = await newProjectByLocation.save();
                    const flowLogByLocation = new Flow_Log({
                        user_id: session?.user?.id,
                        Log: `Project Created by Location Department Head -${username.name}`,
                        description: `Project ${body.project_name} has been created successfully and is pending approval.`,
                        project_id: savedProjectByLocation._id
                    });
                    const savedFlowLogByLocation = await flowLogByLocation.save();
                    break;
                case "REGION_DEP_STAFF": 
                    const isRegionSales = await Region_dep_staffs.findOne({user_id: session?.user?.id, region_dep_id: body.dept_id}).populate("region_dep_id");
                    if( !isRegionSales || isRegionSales?.region_dep_id?.type != "sales") return NextResponse.json({message: "Only Sales Department can create projects", status: 401}, {status:401});
                    const newRegionStaffProject = new Business_Project({
                        project_name: body.project_name,
                        project_description: body.project_description,
                        business_id: body.business_id,
                        status: "pending",
                        creator: session?.user?.id,
                        client_id: body.client_id,
                        start_date: body.start_date,
                        end_date: body.end_date,
                        task_count: 0,
                        completed_task_count: 0,
                        is_approved: false,
                        type: body.type,
                        priority: body.priority,
                        region_id: isRegionSales?.region_dep_id?.region_id,
                        department_id: body.dept_id
                    });
                    const savedByRegionStaff = await newRegionStaffProject.save();
                    const flowLogByRegion = new Flow_Log({
                        user_id: session?.user?.id,
                        Log: `Project Created by Region Sales Department Staff -${username.name}`,
                        description: `Project ${body.project_name} has been created successfully and is pending approval.`,
                        project_id: savedByRegionStaff._id
                    });
                    await flowLogByRegion.save();
                    break;
                case "AREA_DEP_STAFF":
                    const isAreaSalesStaff = await Area_dep_staffs.findOne({user_id: session?.user?.id, area_dep_id: body.dept_id}).populate("area_dep_id");
                    if(!isAreaSalesStaff || isAreaSalesStaff?.area_dep_id?.type != "sales") return NextResponse.json({message: "Only Sales Department can create projects", status:401}, {status:401});
                    const newAreaStaffProject = new Business_Project({
                        project_name: body.project_name,
                        project_description: body.project_description,
                        business_id: body.business_id,
                        status: "pending",
                        creator: session?.user?.id,
                        client_id: body.client_id,
                        start_date: body.start_date,
                        end_date: body.end_date,
                        task_count: 0,
                        completed_task_count: 0,
                        is_approved: false,
                        type: body.type,
                        priority: body.priority,
                        region_id: isAreaSalesStaff?.area_dep_id?.region_id,
                        area_id: isAreaSalesStaff?.area_dep_id?.area_id,
                        department_id: body.dept_id
                    });
                    const savedAreaStaffProject = await newAreaStaffProject.save();
                    const flowLogArea = new Flow_Log({
                        user_id: session?.user?.id,
                        Log: `Project Created by Area Sales Department Staff -${username.name}`,
                        description: `Project ${body.project_name} has been created successfully and is pending approval.`,
                        project_id: savedAreaStaffProject._id
                    });
                    await flowLogArea.save();
                    break;
                case "LOCATION_DEP_STAFF":
                    const isLocSalesStaff = await Location_dep_staffs.findOne({user_id: session?.user?.id, location_dep_id: body.dept_id}).populate("location_dep_id");
                    if(!isLocSalesStaff || isLocSalesStaff?.location_dep_id?.type != "sales") return NextResponse.json({message: "Only Sales Department can create projects", status:401}, {status:401});
                    const newLocationStaffProject = new Business_Project({
                        project_name: body.project_name,
                        project_description: body.project_description,
                        business_id: body.business_id,
                        status: "pending",
                        creator: session?.user?.id,
                        client_id: body.client_id,
                        start_date: body.start_date,
                        end_date: body.end_date,
                        task_count: 0,
                        completed_task_count: 0,
                        is_approved: false,
                        type: body.type,
                        priority: body.priority,
                        region_id: isLocSalesStaff?.location_dep_id?.region_id,
                        area_id: isLocSalesStaff?.location_dep_id?.area_id,
                        location_id: isLocSalesStaff?.location_dep_id?.location_id,
                        department_id: body.dept_id
                    });
                    const savedLocationStaffProject = await newLocationStaffProject.save();
                    const locationStaffFlow = new Flow_Log({
                        user_id: session?.user?.id,
                        Log: `Project Created by Location Sales Department Staff -${username.name}`,
                        description: `Project ${body.project_name} has been created successfully and is pending approval.`,
                        project_id: savedLocationStaffProject._id
                    })
                    await locationStaffFlow.save();
                    break;
                default:
                    return new NextResponse("You are not authorized to create projects", { status: 403 });
            }
        }
        return NextResponse.json({ message: "Project created successfully", status:201}, { status: 201 });
    } catch(err: any){
        console.log("Error while adding a new project: ", err);
        return new NextResponse(err.message, { status: 500 });
    }
}
