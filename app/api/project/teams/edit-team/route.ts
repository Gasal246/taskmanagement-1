import connectDB from "@/lib/mongo";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Team_Members from "@/models/team_members.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body{
    _id: string,
    team_name: string,
    team_head: string,
    team_members: string[]
};

export async function PUT(req:NextRequest){
    try{
        const body:Body = await req.json()
        
        const updateProjectTeam = await Project_Teams.findByIdAndUpdate(body._id, {
            $set:{team_name: body.team_name, team_head: body.team_head}
        });

        const existingMembers = await Project_Team_Members.find({project_team_id: body?._id});
        const existingMembersIds = existingMembers.map((mem:any)=> mem.user_id.toString());
        const toAdd = body.team_members.filter((id:string) => !existingMembersIds.includes(id));
        const toRemove = existingMembersIds.filter((id:string)=> !body.team_members.includes(id));
        
        console.log("toAdd: ", toAdd);
        console.log("toRemove: ", toRemove);
        console.log("existing: ", existingMembersIds);
        console.log("body: ", body);

        if(toAdd.length > 0){
            await Project_Team_Members.insertMany(toAdd.map((id:string)=>({
                project_team_id: body?._id,
                user_id: id
            })));
        }

        if(toRemove.length > 0){
            await Project_Team_Members.deleteMany({project_team_id:body?._id, user_id: {$in: toRemove}});
        }

        return NextResponse.json({message:"Team Updated", status:200}, {status:200});

    }catch(err){
        console.log("error while editing team: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}