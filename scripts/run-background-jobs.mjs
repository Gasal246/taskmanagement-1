import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import ts from "typescript";
import mongoose from "mongoose";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...rest);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
nextEnv.loadEnvConfig(root);
let stopping = false;
let wake;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopping = true; wake?.(); });
try {
  await require("@/lib/mongo").default({ throwOnError: true });
  const { claimJob, processJob } = require("@/lib/jobs/worker");
  if (process.argv.includes("--once")) {
    console.log(JSON.stringify(await require("@/lib/jobs/worker").runJobBatch()));
  } else {
    console.log("Background worker started; polling every two seconds when idle.");
    while (!stopping) {
      const job = await claimJob();
      if (job) await processJob(job);
      else await new Promise(resolve => {
        const timer = setTimeout(() => { wake = undefined; resolve(); }, 2000);
        wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
      });
    }
  }
} catch {
  // Operational errors belong in sanitized job records, never log provider secrets.
  console.error("Background worker stopped unexpectedly. Check database connectivity and job status.");
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
