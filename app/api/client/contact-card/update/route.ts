import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Clients from "@/models/clientCollection";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    clientId: string;
    cardId: string;
    Name: string;
    Designation: string;
    Email: string;
    Phone: string;
}

export async function POST(req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const formData = await req.formData();
        const { contactForm } = Object.fromEntries(formData) as { contactForm: string };
        const body = await JSON.parse(contactForm) as Body;

        const updatedClient = await Clients.findByIdAndUpdate(
            body.clientId,
            {
                $set: {
                    "ContactInfo.$[contact].Name": body?.Name,
                    "ContactInfo.$[contact].Email": body?.Email,
                    "ContactInfo.$[contact].Designation": body?.Designation,
                    "ContactInfo.$[contact].Phone": body?.Phone
                }
            },
            {
                new: true,
                arrayFilters: [{ "contact._id": body?.cardId }]
            }
        );

        return Response.json(updatedClient);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
