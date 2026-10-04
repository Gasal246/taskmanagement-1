import mongoose from "mongoose";
import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";
import { mapPoint } from "../lib/maps/coordinates.mjs";

export async function migrateCampMapPoints(db, apply = false) {
  const camps = db.collection("eq_camps");
  const summary = { mode: apply ? "apply" : "dry-run", scanned: 0, valid: 0, invalid: 0, changed: 0, updated: 0 };
  let writes = [];
  async function flush() {
    if (apply && writes.length) { const result = await camps.bulkWrite(writes, { ordered: false }); summary.updated += result.modifiedCount; }
    writes = [];
  }
  for await (const camp of camps.find({}, { projection: { latitude: 1, longitude: 1, map_point: 1 } }).batchSize(500)) {
    summary.scanned++;
    const point = mapPoint(camp.latitude, camp.longitude);
    if (point) summary.valid++; else summary.invalid++;
    if (JSON.stringify(camp.map_point) === JSON.stringify(point)) continue;
    summary.changed++;
    // Don't overwrite coordinates changed while the migration was running.
    writes.push({ updateOne: { filter: { _id: camp._id, latitude: camp.latitude ?? null, longitude: camp.longitude ?? null }, update: point ? { $set: { map_point: point } } : { $unset: { map_point: "" } } } });
    if (writes.length === 500) await flush();
  }
  await flush();
  return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, maxPoolSize: 2, serverSelectionTimeoutMS: 5000 });
    console.log(JSON.stringify(await migrateCampMapPoints(mongoose.connection.db, process.argv.includes("--apply"))));
  } finally { await mongoose.disconnect(); }
}
