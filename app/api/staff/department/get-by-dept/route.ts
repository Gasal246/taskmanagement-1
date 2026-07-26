import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Business_skills from "@/models/business_skills.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import User_skills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { PipelineStage, Types } from "mongoose";

type DepartmentRole = "head" | "staff";
type UnionPipelineStage = Exclude<
    PipelineStage,
    PipelineStage.Merge | PipelineStage.Out
>;

const assignmentPipeline = (
    departmentField: string,
    departmentId: Types.ObjectId,
    departmentRole: DepartmentRole
): UnionPipelineStage[] => [
    { $match: { [departmentField]: departmentId } },
    {
        $addFields: {
            department_id: `$${departmentField}`,
            department_role: { $literal: departmentRole },
            role_priority: departmentRole === "head" ? 0 : 1,
        },
    },
];

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const departmentId = searchParams.get("department_id");

        if (!departmentId) {
            return NextResponse.json(
                { message: "Department id is required", status: 400 },
                { status: 400 }
            );
        }

        if (!Types.ObjectId.isValid(departmentId)) {
            return NextResponse.json(
                { message: "Invalid department id", status: 400 },
                { status: 400 }
            );
        }

        await connectDB();

        const departmentObjectId = new Types.ObjectId(departmentId);
        const departmentMembers = await Region_dep_staffs.aggregate([
            ...assignmentPipeline("region_dep_id", departmentObjectId, "staff"),
            {
                $unionWith: {
                    coll: Region_dep_heads.collection.name,
                    pipeline: assignmentPipeline("reg_dep_id", departmentObjectId, "head"),
                },
            },
            {
                $unionWith: {
                    coll: Area_dep_staffs.collection.name,
                    pipeline: assignmentPipeline("area_dep_id", departmentObjectId, "staff"),
                },
            },
            {
                $unionWith: {
                    coll: Area_dep_heads.collection.name,
                    pipeline: assignmentPipeline("area_dep_id", departmentObjectId, "head"),
                },
            },
            {
                $unionWith: {
                    coll: Location_dep_staffs.collection.name,
                    pipeline: assignmentPipeline("location_dep_id", departmentObjectId, "staff"),
                },
            },
            {
                $unionWith: {
                    coll: Location_dep_heads.collection.name,
                    pipeline: assignmentPipeline("location_dep_id", departmentObjectId, "head"),
                },
            },
            // Prefer the head assignment when a user is both a head and a staff member.
            { $sort: { role_priority: 1 } },
            {
                $group: {
                    _id: "$user_id",
                    assignment: { $first: "$$ROOT" },
                    department_roles: { $addToSet: "$department_role" },
                },
            },
            {
                $replaceWith: {
                    $mergeObjects: [
                        "$assignment",
                        { department_roles: "$department_roles" },
                    ],
                },
            },
            {
                $addFields: {
                    is_department_head: { $in: ["head", "$department_roles"] },
                },
            },
            {
                $lookup: {
                    from: Users.collection.name,
                    let: { userId: "$user_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$_id", "$$userId"] },
                                        { $eq: ["$status", 1] },
                                    ],
                                },
                            },
                        },
                        { $project: { name: 1, status: 1 } },
                    ],
                    as: "user_id",
                },
            },
            { $unwind: "$user_id" },
            {
                $lookup: {
                    from: User_skills.collection.name,
                    let: { userId: "$user_id._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$user_id", "$$userId"] },
                            },
                        },
                        {
                            $lookup: {
                                from: Business_skills.collection.name,
                                let: { skillId: "$skill_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$_id", "$$skillId"] },
                                        },
                                    },
                                    { $project: { skill_name: 1 } },
                                ],
                                as: "populated_skill",
                            },
                        },
                        {
                            $set: {
                                skill_id: { $arrayElemAt: ["$populated_skill", 0] },
                            },
                        },
                        { $project: { populated_skill: 0 } },
                    ],
                    as: "skills",
                },
            },
            { $project: { role_priority: 0 } },
        ]);

        return NextResponse.json(
            { data: departmentMembers, status: 200 },
            { status: 200 }
        );
    } catch (err) {
        console.log("Error while getting department members: ", err);
        return NextResponse.json(
            { message: "Internal Server Error", status: 500 },
            { status: 500 }
        );
    }
}
