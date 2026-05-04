import connectDB from "@/lib/mongo";
import { normalizeCampVisitedStatusForMap } from "@/lib/enquiries/camp-visited-status";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_countries.model";
import "@/models/eq_region.model";
import "@/models/eq_province.model";
import "@/models/eq_city.model";
import "@/models/eq_area.model";

connectDB();

const parseCoordinate = (value?: string | null) => {
    if (!value) return null;

    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const country_id = searchParams.get("country_id");
        const region_id = searchParams.get("region_id");
        const province_id = searchParams.get("province_id");

        const query: any = {
            is_active: true,
        };

        if (country_id) query.country_id = country_id;
        if (region_id) query.region_id = region_id;
        if (province_id) query.province_id = province_id;

        const camps = await Eq_camps.find(query)
            .populate({ path: "country_id", select: "country_name" })
            .populate({ path: "region_id", select: "region_name" })
            .populate({ path: "province_id", select: "province_name" })
            .populate({ path: "city_id", select: "city_name" })
            .populate({ path: "area_id", select: "area_name" })
            .sort({ camp_name: 1 })
            .lean();

        const mappedCamps = camps
            .map((camp: any) => {
                const latitude = parseCoordinate(camp?.latitude);
                const longitude = parseCoordinate(camp?.longitude);

                if (latitude === null || longitude === null) {
                    return null;
                }

                const visited_status = normalizeCampVisitedStatusForMap(camp?.visited_status);

                return {
                    _id: String(camp?._id),
                    camp_name: camp?.camp_name || "Unnamed camp",
                    camp_type: camp?.camp_type || "",
                    camp_capacity: camp?.camp_capacity || "",
                    camp_occupancy: camp?.camp_occupancy ?? null,
                    visited_status,
                    latitude,
                    longitude,
                    country: camp?.country_id?.country_name || "",
                    region: camp?.region_id?.region_name || "",
                    province: camp?.province_id?.province_name || "",
                    city: camp?.city_id?.city_name || "",
                    area: camp?.area_id?.area_name || "",
                };
            })
            .filter(Boolean);

        const summary = mappedCamps.reduce(
            (acc: { total: number; visited: number; toVisit: number; awarded: number; cancelled: number; justAdded: number }, camp: any) => {
                acc.total += 1;

                switch (camp.visited_status) {
                    case "Visited":
                        acc.visited += 1;
                        break;
                    case "To Visit":
                        acc.toVisit += 1;
                        break;
                    case "Awarded":
                        acc.awarded += 1;
                        break;
                    case "On Hold / Cancelled":
                        acc.cancelled += 1;
                        break;
                    default:
                        acc.justAdded += 1;
                        break;
                }

                return acc;
            },
            { total: 0, visited: 0, toVisit: 0, awarded: 0, cancelled: 0, justAdded: 0 }
        );

        return NextResponse.json(
            {
                status: 200,
                camps: mappedCamps,
                summary,
            },
            { status: 200 }
        );
    } catch (err) {
        console.log("Error while getting camps for map: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}
