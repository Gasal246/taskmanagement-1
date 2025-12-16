import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import Superadmin from "@/models/superAdminCollection";

export async function GET(req: NextRequest){
    try {
        const { searchParams } = new URL(req.url);
        const userid = searchParams.get('id');
        const information = await Superadmin?.findById(userid);
        return Response.json(information)
    } catch (error) {
        console.log(error)
    }
}

export const dynamic = "force-dynamic"