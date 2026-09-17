import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { enquiryActor } from "@/lib/enquiries/completion-server";
import {
  cleanCatalogueKey, cleanCatalogueName, duplicateCatalogueError, isValidCatalogueKey, newCatalogueKey,
} from "@/lib/enquiries/catalogue-server";
import { normalizeCatalogueName } from "@/lib/enquiries/catalogue";
import EqProjectSector from "@/models/eq_project_sector.model";
import EqFacilityType from "@/models/eq_facility_type.model";
import EqSectorField from "@/models/eq_project_sector_field.model";
import EqSectorFieldOption from "@/models/eq_project_sector_field_option.model";
import EqSolutionCategory from "@/models/eq_solution_category.model";
import EqSolutionService from "@/models/eq_solution_service.model";
import EqCamp from "@/models/eq_camps.model";

const definitions: Record<string, { model: any; parentField?: string; parentModel?: any }> = {
  project_sector: { model: EqProjectSector },
  facility_type: { model: EqFacilityType, parentField: "project_sector_id", parentModel: EqProjectSector },
  sector_field: { model: EqSectorField, parentField: "project_sector_id", parentModel: EqProjectSector },
  field_option: { model: EqSectorFieldOption, parentField: "field_id", parentModel: EqSectorField },
  solution_category: { model: EqSolutionCategory },
  solution_service: { model: EqSolutionService, parentField: "solution_category_id", parentModel: EqSolutionCategory },
};
const userKeyEntities = new Set(["project_sector", "facility_type"]);

async function admin() {
  await connectDB({ throwOnError: true });
  const actor = await enquiryActor();
  if (!actor) return { error: NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 }) };
  if (!actor.admin) return { error: NextResponse.json({ message: "Only administrators can manage Facility settings", status: 403 }, { status: 403 }) };
  return { actor };
}

function failure(error: any) {
  if (duplicateCatalogueError(error)) {
    const duplicateKey = Boolean(error?.keyPattern?.key || error?.keyValue?.key);
    return NextResponse.json({ message: duplicateKey ? "That code is already in use" : "That name already exists under this parent", status: 409 }, { status: 409 });
  }
  const status = Number(error?.status) || 500;
  console.error("Facility catalogue mutation failed:", error);
  return NextResponse.json({ message: error?.message || "Internal Server Error", status }, { status });
}

export async function POST(req: NextRequest) {
  const access = await admin();
  if (access.error) return access.error;
  try {
    const body = await req.json();
    const definition = definitions[body?.entity];
    if (!definition) return NextResponse.json({ message: "Invalid catalogue entity", status: 400 }, { status: 400 });
    const name = cleanCatalogueName(body.name);
    if (!name || name.length > 200) return NextResponse.json({ message: "Enter a name of up to 200 characters", status: 400 }, { status: 400 });
    const acceptsUserKey = userKeyEntities.has(body.entity);
    const key = acceptsUserKey ? cleanCatalogueKey(body.key) : newCatalogueKey();
    if (acceptsUserKey && !isValidCatalogueKey(key)) return NextResponse.json({ message: "Enter a code of up to 50 characters using letters, numbers, and hyphens", status: 400 }, { status: 400 });
    if (await definition.model.exists({ key }).collation({ locale: "en", strength: 2 })) return NextResponse.json({ message: "That code is already in use", status: 409 }, { status: 409 });
    const values: any = { key, name, normalized_name: normalizeCatalogueName(name), is_active: true };
    if (definition.parentField) {
      const parent = await definition.parentModel.findById(body.parent_id).lean();
      if (!parent) return NextResponse.json({ message: "Parent item not found", status: 404 }, { status: 404 });
      if (parent.is_active === false) return NextResponse.json({ message: "Restore the parent item before adding children", status: 409 }, { status: 409 });
      if (body.entity === "field_option" && parent.input_type !== "select") return NextResponse.json({ message: "Options can only be added to select fields", status: 400 }, { status: 400 });
      values[definition.parentField] = parent._id;
    }
    if (body.entity === "sector_field") {
      if (!["text", "select"].includes(body.input_type)) return NextResponse.json({ message: "Select text or select input", status: 400 }, { status: 400 });
      values.input_type = body.input_type;
      values.is_required = Boolean(body.is_required);
    }
    if (["facility_type", "solution_service"].includes(body.entity)) values.requires_custom_detail = Boolean(body.requires_custom_detail);
    const scope = definition.parentField ? { [definition.parentField]: values[definition.parentField] } : {};
    const latest = await definition.model.findOne(scope).sort({ sort_order: -1 }).select("sort_order").lean();
    values.sort_order = Number(latest?.sort_order || 0) + 10;
    const created = await definition.model.create(values);
    return NextResponse.json({ item: created, message: "Catalogue item added", status: 201 }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PUT(req: NextRequest) {
  const access = await admin();
  if (access.error) return access.error;
  try {
    const body = await req.json();
    const definition = definitions[body?.entity];
    if (!definition) return NextResponse.json({ message: "Invalid catalogue entity", status: 400 }, { status: 400 });
    const item: any = await definition.model.findById(body.id);
    if (!item) return NextResponse.json({ message: "Catalogue item not found", status: 404 }, { status: 404 });
    if (body.action === "set_active") item.is_active = Boolean(body.is_active);
    else if (body.action === "reorder") {
      const direction = body.direction === "up" ? -1 : body.direction === "down" ? 1 : 0;
      if (!direction) return NextResponse.json({ message: "Invalid reorder direction", status: 400 }, { status: 400 });
      const scope = definition.parentField ? { [definition.parentField]: item[definition.parentField] } : {};
      const comparison = direction < 0 ? { $lt: item.sort_order } : { $gt: item.sort_order };
      const adjacent: any = await definition.model.findOne({ ...scope, sort_order: comparison }).sort({ sort_order: direction < 0 ? -1 : 1 });
      if (adjacent) {
        const order = item.sort_order; item.sort_order = adjacent.sort_order; adjacent.sort_order = order;
        await adjacent.save();
      }
    } else {
      if (body.name !== undefined) {
        const name = cleanCatalogueName(body.name);
        if (!name || name.length > 200) return NextResponse.json({ message: "Enter a name of up to 200 characters", status: 400 }, { status: 400 });
        item.name = name; item.normalized_name = normalizeCatalogueName(name);
      }
      if (body.entity === "sector_field") {
        if (body.input_type && body.input_type !== item.input_type) {
          if (await EqCamp.exists({ "sector_field_values.field_key": item.key })) return NextResponse.json({ message: "Input type cannot change after Facilities use this field", status: 409 }, { status: 409 });
          if (!["text", "select"].includes(body.input_type)) return NextResponse.json({ message: "Select text or select input", status: 400 }, { status: 400 });
          item.input_type = body.input_type;
        }
        if (body.is_required !== undefined) item.is_required = Boolean(body.is_required);
      }
      if (["facility_type", "solution_service"].includes(body.entity) && body.requires_custom_detail !== undefined) item.requires_custom_detail = Boolean(body.requires_custom_detail);
    }
    await item.save();
    return NextResponse.json({ item, message: "Catalogue item updated", status: 200 });
  } catch (error) { return failure(error); }
}
