import mongoose from "mongoose";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const mongoUri = process.env.MONGO_URI;
const apply = process.argv.includes("--apply");

if (!mongoUri) {
  throw new Error("MONGO_URI is required");
}

await mongoose.connect(mongoUri);
const collection = mongoose.connection.collection("business_tasks");
const scalarFilter = {
  is_project_task: true,
  assigned_teams: { $type: "objectId" },
};
const scalarCount = await collection.countDocuments(scalarFilter);

if (!apply) {
  console.log(`${scalarCount} legacy project task(s) would be migrated. Re-run with --apply to update them.`);
  await mongoose.disconnect();
  process.exit(0);
}

const wrapped = await collection.updateMany(scalarFilter, [
  { $set: { assigned_teams: ["$assigned_teams"] } },
]);
const initialized = await collection.updateMany(
  {
    is_project_task: true,
    $or: [{ assigned_teams: null }, { assigned_teams: { $exists: false } }],
  },
  { $set: { assigned_teams: [] } }
);

console.log(`Wrapped ${wrapped.modifiedCount} scalar value(s); initialized ${initialized.modifiedCount} missing value(s).`);
await mongoose.disconnect();
