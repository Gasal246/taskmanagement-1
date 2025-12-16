import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Clients from "@/models/clientCollection";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });
        
        const { clientId, cardId } = await req.json();

        const updatedClient = await Clients.findByIdAndUpdate(clientId, {
            $pull: { ContactInfo: { _id: cardId } }
        }, { new: true });

        return Response.json(updatedClient);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
