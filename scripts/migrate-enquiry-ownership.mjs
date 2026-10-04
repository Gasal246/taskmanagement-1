import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import nextEnv from "@next/env";

const validId = value => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

// Current membership is evidence for review, never an automatic ownership grant.
export async function ownershipReport(db) {
  const creatorCache = new Map();
  const records = [];
  for await (const enquiry of db.collection("eq_enquiries").find({ business_id: null }, { projection: { createdBy: 1, enquiry_uuid: 1 } })) {
    const key = String(enquiry.createdBy || "");
    if (!creatorCache.has(key)) {
      const candidateIds = validId(key) ? (await Promise.all([
        db.collection("business_staffs").distinct("business_id", { user_id: new ObjectId(key), status: 1 }),
        db.collection("admin_assign_businesses").distinct("business_id", { user_id: new ObjectId(key), status: 1 }),
        db.collection("user_roles").distinct("business_id", { user_id: new ObjectId(key), status: 1 }),
        db.collection("eq_enquiry_users").distinct("business_id", { user_id: new ObjectId(key) }),
      ])).flat().filter(Boolean).map(String) : [];
      if (creatorCache.size >= 5000) creatorCache.clear();
      creatorCache.set(key, [...new Set(candidateIds)]);
    }
    const projects = await db.collection("business_projects").distinct("business_id", { enquiry_id: enquiry._id });
    const candidates = [...new Set([...creatorCache.get(key), ...projects.filter(Boolean).map(String)])];
    records.push({ enquiry_id: String(enquiry._id), enquiry_uuid: enquiry.enquiry_uuid || "", candidate_business_ids: candidates, suggested_business_id: candidates.length === 1 ? candidates[0] : null, requires_review: true });
  }
  return { missingOwnership: records.length, ambiguousOrMissing: records.filter(row => !row.suggested_business_id).length, records };
}

export async function applyOwnershipMapping(db, mapping) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) throw new Error("Mapping must be an object of enquiry ID to reviewed business ID");
  const entries = Object.entries(mapping);
  if (entries.some(([enquiry, business]) => !validId(enquiry) || !validId(business))) throw new Error("Every mapping must contain valid enquiry and business IDs");
  // Validate the whole file before the first write. Never overwrite pinned ownership.
  for (const [enquiry, business] of entries) {
    const row = await db.collection("eq_enquiries").findOne({ _id: new ObjectId(enquiry) }, { projection: { business_id: 1 } });
    if (!row) throw new Error(`Enquiry ${enquiry} does not exist`);
    if (row.business_id && String(row.business_id) !== business) throw new Error(`Enquiry ${enquiry} already has different ownership`);
    if (!await db.collection("businesses").findOne({ _id: new ObjectId(business), status: 1 }, { projection: { _id: 1 } })) throw new Error(`Business ${business} is missing or inactive`);
  }
  let modified = 0;
  for (let offset = 0; offset < entries.length; offset += 500) {
    const result = await db.collection("eq_enquiries").bulkWrite(entries.slice(offset, offset + 500).map(([enquiry, business]) => ({ updateOne: {
      filter: { _id: new ObjectId(enquiry), business_id: null },
      update: { $set: { business_id: new ObjectId(business) } },
    } })), { ordered: true });
    modified += result.modifiedCount;
  }
  return { reviewed: entries.length, modified };
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const args = process.argv.slice(2);
  const option = flag => { const i = args.indexOf(flag); return i < 0 ? null : args[i + 1]; };
  const mappingPath = option("--mapping");
  if (args.includes("--apply") && !mappingPath) throw new Error("--apply requires --mapping with explicitly reviewed ownership; reports never apply themselves");
  const client = new MongoClient(process.env.MONGO_URI, { maxPoolSize: 2, serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();
    if (args.includes("--apply")) {
      console.log(JSON.stringify(await applyOwnershipMapping(db, JSON.parse(await fs.readFile(mappingPath, "utf8")))));
    } else {
      const report = await ownershipReport(db);
      const reportPath = option("--report");
      if (reportPath) await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
      console.log(JSON.stringify({ missingOwnership: report.missingOwnership, ambiguousOrMissing: report.ambiguousOrMissing, reportPath, dryRun: true }));
    }
  } finally { await client.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
