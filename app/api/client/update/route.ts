import connectDB from "@/lib/mongo";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import Clients from "@/models/clientCollection";

connectDB();

interface Body {
    clientId: string;
    shortname: string;
    fullname: string;
    details: string;
    region: string;
    area: string;
    [key: string]: any;
}

export async function POST(req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const formData = await req.formData();
        const { clientUpdateForm } = Object.fromEntries(formData) as { clientUpdateForm: string };
        const body = await JSON.parse(clientUpdateForm) as Body;

        const client = await Clients.findById(body?.clientId, { ShortName: 1, AdminId: 1 });
        const someClient = await Clients.findOne({ ShortName: body?.shortname, AdminId: client?.AdminId }, { AdminId: 1 });

        console.log(client, someClient);

        if (someClient && someClient._id.toString() !== client._id.toString()) {
            return Response.json("Email Already Exists For Another Client.");
        }

        const updatedClient = await Clients.findByIdAndUpdate(body?.clientId, {
            ShortName: body.shortname,
            FullName: body?.fullname,
            Details: body?.details,
            Region: body?.region,
            Area: body?.area
        }, { new: true });
        return Response.json(updatedClient);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";