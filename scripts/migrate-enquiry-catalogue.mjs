import mongoose from "mongoose";
import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const normalize = value => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
const root = new URL("../lib/enquiries/", import.meta.url);
const sectorsSeed = JSON.parse(await readFile(new URL("project-sectors.json", root), "utf8"));
const solutionsSeed = JSON.parse(await readFile(new URL("solution-catalogue.json", root), "utf8"));
const hotelOptions = ["Ultra-Luxury (6/7-Star)", "5-Star Deluxe", "5-Star", "4-Star", "3-Star", "2-Star", "1-Star", "Unrated / Under Classification"];

async function upsert(collection, filter, values, apply) {
  if (!apply) return { planned: 1, inserted: 0 };
  const result = await collection.updateOne(filter, { $setOnInsert: { ...values, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  return { planned: 1, inserted: result.upsertedCount || 0 };
}

export async function migrateEnquiryCatalogue(db, apply = false) {
  const collections = {
    sectors: db.collection("eq_project_sectors"), types: db.collection("eq_facility_types"),
    fields: db.collection("eq_project_sector_fields"), options: db.collection("eq_project_sector_field_options"),
    categories: db.collection("eq_solution_categories"), services: db.collection("eq_solution_services"),
  };
  const totals = { mode: apply ? "apply" : "dry-run", sectors: 0, facilityTypes: 0, fields: 0, fieldOptions: 0, categories: 0, services: 0, inserted: 0, facilityDetailsBackfilled: 0, sectorFieldsBackfilled: 0, solutionDetailsBackfilled: 0, unknownProjectSectors: 0, unknownFacilityTypes: 0, unknownSolutions: 0, unknownHotelClassifications: 0 };
  if (apply) {
    await Promise.all([
      collections.sectors.createIndex({ key: 1 }, { unique: true }), collections.sectors.createIndex({ normalized_name: 1 }, { unique: true }),
      collections.types.createIndex({ key: 1 }, { unique: true }), collections.types.createIndex({ project_sector_id: 1, normalized_name: 1 }, { unique: true }),
      collections.fields.createIndex({ key: 1 }, { unique: true }), collections.fields.createIndex({ project_sector_id: 1, normalized_name: 1 }, { unique: true }),
      collections.options.createIndex({ key: 1 }, { unique: true }), collections.options.createIndex({ field_id: 1, normalized_name: 1 }, { unique: true }),
      collections.categories.createIndex({ key: 1 }, { unique: true }), collections.categories.createIndex({ normalized_name: 1 }, { unique: true }),
      collections.services.createIndex({ key: 1 }, { unique: true }), collections.services.createIndex({ solution_category_id: 1, normalized_name: 1 }, { unique: true }),
    ]);
  }
  for (const [sectorIndex, sector] of sectorsSeed.entries()) {
    const result = await upsert(collections.sectors, { key: sector.code }, { key: sector.code, name: sector.label, normalized_name: normalize(sector.label), is_active: true, sort_order: (sectorIndex + 1) * 10 }, apply);
    totals.sectors += result.planned; totals.inserted += result.inserted;
    const parent = apply ? await collections.sectors.findOne({ key: sector.code }) : null;
    for (const [typeIndex, type] of sector.facilities.entries()) {
      const child = await upsert(collections.types, { key: type.code }, { key: type.code, project_sector_id: parent?._id, name: type.label, normalized_name: normalize(type.label), requires_custom_detail: type.code.endsWith("-99"), is_active: true, sort_order: (typeIndex + 1) * 10 }, apply);
      totals.facilityTypes += child.planned; totals.inserted += child.inserted;
    }
  }
  const hospitality = apply ? await collections.sectors.findOne({ key: "HOS" }) : null;
  const fieldResult = await upsert(collections.fields, { key: "HOS-HOTEL-CLASSIFICATION" }, { key: "HOS-HOTEL-CLASSIFICATION", project_sector_id: hospitality?._id, name: "Hotel Classification", normalized_name: normalize("Hotel Classification"), input_type: "select", is_required: true, is_active: true, sort_order: 10 }, apply);
  totals.fields++; totals.inserted += fieldResult.inserted;
  const hotelField = apply ? await collections.fields.findOne({ key: "HOS-HOTEL-CLASSIFICATION" }) : null;
  for (const [index, name] of hotelOptions.entries()) {
    const option = await upsert(collections.options, { key: `HOS-HOTEL-${String(index + 1).padStart(2, "0")}` }, { key: `HOS-HOTEL-${String(index + 1).padStart(2, "0")}`, field_id: hotelField?._id, name, normalized_name: normalize(name), is_active: true, sort_order: (index + 1) * 10 }, apply);
    totals.fieldOptions++; totals.inserted += option.inserted;
  }
  for (const [categoryIndex, category] of solutionsSeed.entries()) {
    const result = await upsert(collections.categories, { key: category.code }, { key: category.code, name: category.label, normalized_name: normalize(category.label), is_active: true, sort_order: (categoryIndex + 1) * 10 }, apply);
    totals.categories++; totals.inserted += result.inserted;
    const parent = apply ? await collections.categories.findOne({ key: category.code }) : null;
    for (const [serviceIndex, service] of category.solutions.entries()) {
      const child = await upsert(collections.services, { key: service.code }, { key: service.code, solution_category_id: parent?._id, name: service.label, normalized_name: normalize(service.label), requires_custom_detail: service.code === "OTH-01", is_active: true, sort_order: (serviceIndex + 1) * 10 }, apply);
      totals.services++; totals.inserted += child.inserted;
    }
  }
  const camps = db.collection("eq_camps");
  const knownSectors = new Set(sectorsSeed.map(sector => sector.code));
  const knownFacilityTypes = new Set(sectorsSeed.flatMap(sector => sector.facilities.map(type => type.code)));
  const knownServices = new Set(solutionsSeed.flatMap(category => category.solutions.map(service => service.code)));
  totals.unknownProjectSectors = await camps.countDocuments({ project_sector: { $nin: [null, "", ...knownSectors] } });
  totals.unknownFacilityTypes = await camps.countDocuments({ facility_type: { $nin: [null, "", ...knownFacilityTypes] } });
  for await (const camp of camps.find({ $or: [{ facility_type_other: { $nin: [null, ""] } }, { hotel_classification: { $nin: [null, ""] } }] }, { projection: { facility_type_other: 1, facility_type_detail: 1, hotel_classification: 1, sector_field_values: 1 } })) {
    const set = {};
    if (camp.facility_type_other && !camp.facility_type_detail) { set.facility_type_detail = camp.facility_type_other; totals.facilityDetailsBackfilled++; }
    if (camp.hotel_classification && !(camp.sector_field_values || []).some(value => value.field_key === "HOS-HOTEL-CLASSIFICATION")) {
      const optionIndex = hotelOptions.findIndex(name => normalize(name) === normalize(camp.hotel_classification));
      if (optionIndex >= 0) { set.sector_field_values = [...(camp.sector_field_values || []), { field_key: "HOS-HOTEL-CLASSIFICATION", option_key: `HOS-HOTEL-${String(optionIndex + 1).padStart(2, "0")}` }]; totals.sectorFieldsBackfilled++; }
      else totals.unknownHotelClassifications++;
    }
    if (apply && Object.keys(set).length) await camps.updateOne({ _id: camp._id }, { $set: set });
  }
  for (const collectionName of ["eq_camp_solutions", "eq_enquiry_solutions"]) {
    const mappings = db.collection(collectionName);
    totals.unknownSolutions += await mappings.countDocuments({ solutions_required: { $elemMatch: { $nin: [...knownServices] } } });
    for await (const mapping of mappings.find({ solutions_required: "OTH-01", solution_other: { $nin: [null, ""] }, "solution_details.solution_key": { $ne: "OTH-01" } })) {
      totals.solutionDetailsBackfilled++;
      if (apply) await mappings.updateOne({ _id: mapping._id }, { $push: { solution_details: { solution_key: "OTH-01", value: mapping.solution_other } } });
    }
  }
  return totals;
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  try { console.log(JSON.stringify(await migrateEnquiryCatalogue(mongoose.connection.db, apply), null, 2)); }
  finally { await mongoose.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
