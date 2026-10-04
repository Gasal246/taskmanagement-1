import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import nextEnv from "@next/env";
import ts from "typescript";

// Reuse model index declarations; never drop indexes or rewrite records.
const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolveFilename.call(this, request.startsWith("@/") ? path.join(projectRoot, request.slice(2)) : request, parent, ...rest);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);
const modelFiles = [
  "user_regions.model", "user_locations.model",
  "business_areas.model", "business_locations.model", "region_departments.model", "area_departments.model",
  "location_departments.model", "region_heads.model", "region_staffs.model", "area_heads.model",
  "area_staffs.model", "location_heads.model", "location_staffs.model", "region_dep_heads.model",
  "region_dep_staffs.model", "area_dep_heads.model", "area_dep_staffs.model", "location_dep_heads.model",
  "location_dep_staffs.model", "department_heads.model", "department_staffs.model", "department_regions.model",
  "department_areas.model", "business_regions.model", "business_departments.model",
  "users.model", "password_reset.model", "auth_rate_limit.model", "enquiry_counter.model",
  "eq_enquiries.model", "eq_camps.model", "eq_users_log.model", "eq_enquiry_histories", "eq_enquiry_access.model", "admin_assign_business.model",
  "business_staffs.model", "user_roles.model", "business_tasks.model", "task_activities.model",
  "business_project.model", "project_team_members.model", "notifications.model", "calendar_events.model", "Flow_Log.model", "project_team.model", "project_departments.model", "background_jobs.model", "fcm_tokens.model", "activity_comments.model", "activity_comment_reads.model",
];
const models = modelFiles.map(file => require(path.resolve(`models/${file}.ts`)).default);
const apply = process.argv.includes("--apply");
const planOnly = process.argv.includes("--plan");
if (planOnly) {
  for (const model of models) console.log(JSON.stringify({ collection: model.collection.name, indexes: model.schema.indexes() }));
} else {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required; --plan prints declarations without a database connection");
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5_000, maxPoolSize: 2, autoIndex: false, autoCreate: false });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== "isdbgrid") throw new Error("Transactions require a MongoDB replica set or sharded cluster");
    for (const model of models) {
      if (apply) {
        // Pre-create even counter collections with only the implicit _id index.
        // Their first writes otherwise attempt collection creation inside a transaction.
        await model.createCollection();
        await model.createIndexes();
        console.log(`Ensured declared indexes for ${model.collection.name}`);
      } else {
        const diff = await model.diffIndexes();
        console.log(JSON.stringify({ collection: model.collection.name, toCreate: diff.toCreate }));
      }
    }
    if (!apply) console.log("Dry run only. Re-run with --apply to create indexes; existing indexes will be retained.");
  } finally { await mongoose.disconnect(); }
}
