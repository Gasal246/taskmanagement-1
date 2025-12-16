import connectDB from "@/lib/mongo";
import Department_regions from "@/models/department_regions.model";

connectDB();

export async function POST(request: Request) {
    try {
        const { DepRegionId } = await request.json();
        if (!DepRegionId) return new Response("No department region id provided", { status: 400 });
        
        await Department_regions?.findByIdAndUpdate(DepRegionId, { status: 0 });
        return new Response(JSON.stringify({ message: "Region removed successfully", status: 200 }), { status: 200 });
    } catch (error) {
        console.log(error);
        return new Response("Internal server error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";