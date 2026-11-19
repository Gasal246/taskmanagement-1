import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { enquiryActor, resolveEnquiryCreationBusiness, canAdministerEnquiry } from "./access";
import Countries from "@/models/eq_countries.model";
import Regions from "@/models/eq_region.model";
import Provinces from "@/models/eq_province.model";
import Cities from "@/models/eq_city.model";
import Areas from "@/models/eq_area.model";

/** Directory ownership is mandatory: unowned records are never shared defaults. */
export async function enquiryLocationScope(req: Request, manage = false, hint?: unknown) {
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const requested = hint ?? new URL(req.url).searchParams.get("business_id") ?? undefined;
  const businessId = await resolveEnquiryCreationBusiness(req, actor, requested);
  if (requested && !businessId) return NextResponse.json({ message: "You cannot access this business" }, { status: 403 });
  if (manage && (!businessId || !canAdministerEnquiry({ business_id: businessId }, actor))) {
    return NextResponse.json({ message: "Select a business you administer" }, { status: 403 });
  }
  const filter: Record<string, any> = businessId
    ? { business_id: new mongoose.Types.ObjectId(businessId) }
    : actor.isSuper ? {} : { business_id: { $in: (actor.adminBusinessIds || []).map(id => new mongoose.Types.ObjectId(id)) } };
  return { actor, businessId, filter };
}

/** Check ownership and the hierarchy before accepting a location reference. */
export async function validateLocationParents(values: Record<string, unknown>, businessId: string) {
  const parents: Record<string, any> = {};
  for (const [key, model] of [["country_id", Countries], ["region_id", Regions], ["province_id", Provinces], ["city_id", Cities], ["area_id", Areas]] as const) {
    const id = values[key];
    if (id === undefined) continue;
    if (typeof id !== "string" || !mongoose.isObjectIdOrHexString(id) || !await model.exists({ _id: id, business_id: businessId, ...parents })) {
      return NextResponse.json({ message: "Select locations belonging to this business and hierarchy" }, { status: 400 });
    }
    parents[key] = id;
  }
  return null;
}
