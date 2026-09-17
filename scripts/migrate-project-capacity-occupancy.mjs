import mongoose from "mongoose";
import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";

const EMPTY_LABELS = new Set(["", "-", "n/a", "na", "none", "not specified", "unknown"]);

const cleanDescriptionValue = value => String(value || "")
  .replace(/\*+/g, "")
  .trim()
  .replace(/[.;,]+$/, "")
  .trim();

const isSpecified = value => !EMPTY_LABELS.has(String(value || "").trim().toLowerCase());

export function capacityOccupancyFromDescription(description) {
  let capacity = null;
  let occupancy = null;

  for (const sourceLine of String(description || "").split(/\r?\n/)) {
    const line = sourceLine.replace(/\*+/g, "").trim().replace(/^[-•]\s*/, "");
    const capacityMatch = line.match(/^(?:camp\s+)?capacity\s*[:\-]\s*(.*?)\s*$/i);
    if (capacity === null && capacityMatch) {
      const value = cleanDescriptionValue(capacityMatch[1]);
      if (isSpecified(value)) capacity = value;
    }

    const occupancyMatch = line.match(/^(?:(?:camp|current)\s+)?occupancy\s*[:\-]\s*(.*?)\s*$/i);
    if (occupancy === null && occupancyMatch) {
      const value = cleanDescriptionValue(occupancyMatch[1]);
      if (isSpecified(value)) {
        const normalized = value.replace(/,/g, "");
        if (/^\d+(?:\.\d+)?$/.test(normalized)) occupancy = Number(normalized);
      }
    }
  }

  return { facility_capacity: capacity, facility_occupancy: occupancy };
}

const fieldIsEmpty = value => value === null || value === undefined || value === "";

export async function migrateProjectCapacityOccupancy(db, apply = false) {
  const projects = db.collection("business_projects");
  const summary = {
    mode: apply ? "apply" : "dry-run",
    projectsScanned: 0,
    descriptionsWithValues: 0,
    projectsUpdated: 0,
    capacityFieldsUpdated: 0,
    occupancyFieldsUpdated: 0,
    skippedExistingFields: 0,
  };
  const candidates = [];

  for await (const project of projects.find({}, {
    projection: {
      project_name: 1,
      project_description: 1,
      facility_capacity: 1,
      facility_occupancy: 1,
    },
  })) {
    summary.projectsScanned++;
    const extracted = capacityOccupancyFromDescription(project.project_description);
    if (extracted.facility_capacity === null && extracted.facility_occupancy === null) continue;
    summary.descriptionsWithValues++;

    const updates = {};
    if (extracted.facility_capacity !== null) {
      if (fieldIsEmpty(project.facility_capacity)) updates.facility_capacity = extracted.facility_capacity;
      else summary.skippedExistingFields++;
    }
    if (extracted.facility_occupancy !== null) {
      if (fieldIsEmpty(project.facility_occupancy)) updates.facility_occupancy = extracted.facility_occupancy;
      else summary.skippedExistingFields++;
    }
    if (!Object.keys(updates).length) continue;

    candidates.push({
      projectId: String(project._id),
      projectName: String(project.project_name || "Untitled project"),
      updates,
    });
    if (!apply) continue;

    let changed = false;
    for (const [field, value] of Object.entries(updates)) {
      const result = await projects.updateOne(
        {
          _id: project._id,
          $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: "" },
          ],
        },
        { $set: { [field]: value } },
      );
      if (!result.modifiedCount) continue;
      changed = true;
      if (field === "facility_capacity") summary.capacityFieldsUpdated++;
      if (field === "facility_occupancy") summary.occupancyFieldsUpdated++;
    }
    if (changed) summary.projectsUpdated++;
  }

  if (!apply) {
    summary.projectsUpdated = candidates.length;
    summary.capacityFieldsUpdated = candidates.filter(entry => "facility_capacity" in entry.updates).length;
    summary.occupancyFieldsUpdated = candidates.filter(entry => "facility_occupancy" in entry.updates).length;
  }

  return { summary, candidates };
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const result = await migrateProjectCapacityOccupancy(mongoose.connection, apply);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
