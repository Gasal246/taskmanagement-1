import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import { pathToFileURL } from "node:url";

export const locationCollections = ["eq_countries", "eq_regions", "eq_provinces", "eq_cities", "eq_areas", "eq_camps"];

export async function migrateLocationOwnership(db, email, apply = false) {
  if (!email) throw new Error("Provide --business-email");
  const businesses = await db.collection("businesses").find({ business_email: email, status: 1 }).toArray();
  if (businesses.length !== 1) throw new Error("Expected exactly one active business matching the email");
  const business = businesses[0];
  const report = { businessId: String(business._id), businessEmail: email, mode: apply ? "apply" : "dry-run", collections: [] };
  // Snapshot unowned IDs before writing; never transfer records already owned by another business.
  const plans = await Promise.all(locationCollections.map(async name => ({
    name, ids: await db.collection(name).distinct("_id", { business_id: null }),
    alreadyOwned: await db.collection(name).countDocuments({ business_id: business._id }),
    otherOwned: await db.collection(name).countDocuments({ business_id: { $nin: [null, business._id] } }),
  })));
  for (const plan of plans) {
    const result = apply && plan.ids.length ? await db.collection(plan.name).updateMany(
      { _id: { $in: plan.ids }, business_id: null }, { $set: { business_id: business._id } },
    ) : null;
    report.collections.push({ collection: plan.name, unowned: plan.ids.length, alreadyOwned: plan.alreadyOwned, otherOwned: plan.otherOwned, modified: result?.modifiedCount || 0 });
  }
  return report;
}
async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const args = process.argv.slice(2);
  const email = args[args.indexOf("--business-email") + 1];
  if (!args.includes("--business-email") || !email || email.startsWith("--")) throw new Error("Provide --business-email");
  const client = new MongoClient(process.env.MONGO_URI, { maxPoolSize: 2, serverSelectionTimeoutMS: 10000 });
  try { await client.connect(); console.log(JSON.stringify(await migrateLocationOwnership(client.db(), email, args.includes("--apply")), null, 2)); }
  finally { await client.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
