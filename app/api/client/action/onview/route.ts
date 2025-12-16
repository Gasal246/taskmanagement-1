import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Clients from "@/models/clientCollection";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest){
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const { clientId }:{ clientId: string } = await req.json();
        const client = await Clients.findById(clientId, { OpenedBy: 1 });
        if(client?.OpenedBy?.includes(clientId)){
            return new NextResponse("Already Exist", { status: 300 })
        }
        const updatedClient = await Clients.findByIdAndUpdate(clientId, { $push:{ OpenedBy: session?.user?.id } }, { new: true });
        return Response.json(updatedClient);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error.", { status: 500 });
    }
}

export const dynamic = "force-dynamic";

