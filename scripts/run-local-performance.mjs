import { spawn, execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, open } from "node:fs/promises";
import { tmpdir, cpus, totalmem, platform, release } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import net from "node:net";
import http from "node:http";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { MongoClient, ObjectId } from "mongodb";
import { seedLocalFixture } from "../tests/load/local-fixture.mjs";
import { endpoint, endpointNames, validPayload } from "../tests/load/workload.mjs";

const args = process.argv.slice(2);
const valueOptions = new Set(["--users", "--fixture-users", "--hold", "--ramp", "--output"]);
for (let i = 0; i < args.length; i++) {
  if (valueOptions.has(args[i])) { i++; continue; }
  if (!["--diagnostics-only", "--trace-queries", "--auth-failure-probe"].includes(args[i])) throw new Error(`Unknown performance option: ${args[i]}`);
}
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const stages = String(option("--users", "100,500,1000,3000")).split(",").map(Number);
const fixtureUsers = Number(option("--fixture-users", String(Math.max(...stages))));
const holdSeconds = Number(option("--hold", "30")), rampSeconds = Number(option("--ramp", "10"));
const output = resolve(option("--output", "tests/load/local-performance-results.json"));
if (stages.some(n => !Number.isInteger(n) || n < 1 || n > 3000) || !stages.length ||
    !Number.isInteger(fixtureUsers) || fixtureUsers < Math.max(...stages) || fixtureUsers > 3000 ||
    !Number.isFinite(holdSeconds) || holdSeconds < 10 || holdSeconds > 600 ||
    !Number.isFinite(rampSeconds) || rampSeconds < 1 || rampSeconds > 120) throw new Error("Use 1–3000 users, hold 10–600 seconds, ramp 1–120 seconds");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const shellExec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "taskmanager-load-"));
const buildDirectory = `.next-performance-${randomBytes(8).toString("hex")}`;
const children = [];
const resources = [];
let mongoClient, monitor, monitoring = false, interrupted = false;
const stop = () => { interrupted = true; for (const child of children) child.kill("SIGTERM"); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const report = {
  generatedAt: new Date().toISOString(), kind: "isolated-local-production-http", node: process.version,
  hardware: { platform: platform(), osRelease: release(), logicalCPUs: cpus().length, ramGiB: totalmem() / 1024 ** 3 },
  limitations: ["Application, MongoDB and load generator share one machine; this is not production capacity certification.",
    "Synthetic read-only workload with pre-issued real Auth.js JWTs; login, writes, providers, uploads and browser rendering are excluded.",
    "Closed workload: one in-flight request per user, then 5–15 seconds of think time. Slow responses reduce offered throughput.",
    "Short local holds are not a soak test. No pre-change HTTP baseline exists for a speedup comparison."],
  configuration: { stages, fixtureUsers, rampSeconds, holdSeconds, thinkSeconds: [5, 15], requestTimeoutSeconds: 15, mongoMaxPoolSize: 30,
    latencyIncludes: "HTTP connect/queue, response transfer and JSON validation", resourceSampleSeconds: 1,
    applicationProcesses: 1, mongoReplicaMembers: 1, wiredTigerCacheGiB: 1 },
  stages: [],
};
async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
async function start(command, argv, env, logfile) {
  const log = await open(join(directory, logfile), "w", 0o600);
  const child = spawn(command, argv, { env, stdio: ["ignore", log.fd, log.fd] });
  children.push(child);
  child.on("error", error => { child.startError = error; });
  await log.close();
  return child;
}
function checkChild(child, name) {
  if (child.startError || child.exitCode !== null || child.signalCode !== null) throw new Error(`${name} failed; inspect its temporary log while the runner is active`);
}
async function closeChild(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.startError) return;
  const done = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await done;
  clearTimeout(timer);
}
function percentile(values, p) { return values.length ? Number(values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)].toFixed(1)) : null; }
function summarize(samples, seconds) {
  const durations = samples.map(s => s.ms).sort((a, b) => a - b), success = samples.filter(s => s.ok);
  const successfulDurations = success.map(s => s.ms).sort((a, b) => a - b);
  const counts = {};
  for (const s of samples) counts[s.status] = (counts[s.status] || 0) + 1;
  return { requests: samples.length, successes: success.length, errors: samples.length - success.length,
    errorRate: samples.length ? (samples.length - success.length) / samples.length : null,
    completedRps: Number((samples.length / seconds).toFixed(2)), successRps: Number((success.length / seconds).toFixed(2)),
    p50ms: percentile(durations, .5), p95ms: percentile(durations, .95), p99ms: percentile(durations, .99),
    successfulP95ms: percentile(successfulDurations, .95), statusCounts: counts,
    meanResponseBytes: samples.length ? Math.round(samples.reduce((n, s) => n + s.bytes, 0) / samples.length) : 0 };
}
// Fixed seed makes the workload repeatable without synchronizing all actors.
let randomState = 123456789;
function random() { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 4294967296; }
function httpGet(origin, route, cookie, agent) {
  const began = performance.now();
  return new Promise(resolve => {
    let settled = false, request;
    const finish = value => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      resolve({ ...value, ms: performance.now() - began });
    };
    const timer = setTimeout(() => { finish({ ok: false, status: "timeout", bytes: 0 }); request?.destroy(); }, 15000);
    request = http.get(origin + route.path, { agent, headers: { Cookie: cookie, Accept: "application/json" } }, response => {
      const chunks = []; let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) { finish({ ok: false, status: "oversized", bytes }); request.destroy(); }
        else chunks.push(chunk);
      });
      response.on("error", () => finish({ ok: false, status: "response-error", bytes }));
      response.on("end", () => {
        let payload;
        try { payload = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* Invalid JSON counts as failure. */ }
        const cookies = [].concat(response.headers["set-cookie"] || []);
        finish({ ok: response.statusCode === 200 && validPayload(route.name, payload), status: String(response.statusCode), bytes, payload,
          sessionCookieCleared: cookies.some(cookie => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/.test(cookie) && /Max-Age=0/i.test(cookie)),
          retryAfter: response.headers["retry-after"] });
      });
    });
    request.on("error", () => finish({ ok: false, status: "network-error", bytes: 0 }));
  });
}
try {
  const mongoPort = await freePort(), appPort = await freePort();
  const uri = `mongodb://127.0.0.1:${mongoPort}/local_load_${randomBytes(8).toString("hex")}?replicaSet=local_load`;
  const secret = randomBytes(48).toString("hex"), origin = `http://127.0.0.1:${appPort}`;
  // Blank every project .env key before Next loads its files; retain OS variables.
  // Only this child environment changes, never the user's environment file.
  const env = { ...process.env };
  for (const file of [".env", ".env.local", ".env.production", ".env.production.local", ".env.example"]) {
    const content = await readFile(file, "utf8").catch(() => "");
    for (const match of content.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=/gm)) env[match[1]] = "";
  }
  Object.assign(env, { NODE_ENV: "production", MONGO_URI: uri, MONGO_AUTO_INDEX: "false", MONGO_MAX_POOL_SIZE: "30",
    AUTH_SECRET: secret, NEXTAUTH_SECRET: secret, AUTH_URL: origin, NEXTAUTH_URL: origin, NEXT_TELEMETRY_DISABLED: "1",
    TASKMANAGER_PERFORMANCE_BUILD_DIR: buildDirectory });
  console.log(`Isolated benchmark logs: ${directory} (removed on completion; no sessions printed)`);
  {
    console.log("Building the production application with isolated environment overrides...");
    const began = performance.now();
    const build = await start(process.execPath, ["node_modules/next/dist/bin/next", "build"], env, "build.log");
    const [code] = await once(build, "exit");
    report.buildSeconds = Number(((performance.now() - began) / 1000).toFixed(2));
    if (code !== 0) throw new Error("Production build failed (build.log); benchmark not run");
  }
  report.isolatedBuild = true;
  console.log("Starting temporary loopback MongoDB replica set...");
  const mongo = await start(process.env.MONGOD_BINARY || "mongod", ["--dbpath", directory, "--port", String(mongoPort),
    "--bind_ip", "127.0.0.1", "--replSet", "local_load", "--wiredTigerCacheSizeGB", "1", "--logpath", join(directory, "mongo.log"),
    ...(args.includes("--auth-failure-probe") ? ["--setParameter", "enableTestCommands=1"] : [])], env, "mongod.log");
  let initialized = false;
  for (let i = 0; i < 50 && !interrupted; i++) {
    checkChild(mongo, "MongoDB");
    const client = new MongoClient(`mongodb://127.0.0.1:${mongoPort}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
    try {
      await client.connect();
      await client.db("admin").command({ replSetInitiate: { _id: "local_load", members: [{ _id: 0, host: `127.0.0.1:${mongoPort}` }] } });
      initialized = true; break;
    } catch { await delay(100); } finally { await client.close(); }
  }
  if (!initialized) throw new Error("Cannot initialize temporary MongoDB replica set");
  mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 2 });
  await mongoClient.connect();
  console.log(`Seeding ${fixtureUsers} distinct users and representative synthetic records...`);
  const { actors, dataset } = await seedLocalFixture(uri, secret, fixtureUsers);
  report.dataset = dataset;
  const indexes = await start(process.execPath, ["scripts/create-performance-indexes.mjs", "--apply"], env, "indexes.log");
  const [indexCode] = await once(indexes, "exit");
  if (indexCode !== 0) throw new Error("Temporary database index creation failed");
  report.indexesApplied = true;
  const app = await start(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], env, "app.log");
  const agent = new http.Agent({ keepAlive: true, maxSockets: 3500, maxFreeSockets: 128 });
  resources.push(agent);
  let ready = false;
  for (let i = 0; i < 60 && !interrupted; i++) {
    checkChild(app, "Application");
    try {
      const response = await fetch(origin + "/api/users/get-user/all-details", { signal: AbortSignal.timeout(1000), redirect: "manual" });
      if (response.status === 401) { ready = true; break; }
    } catch { /* Wait for real HTTP server. */ }
    await delay(250);
  }
  if (!ready) throw new Error("Application did not become ready with the authentication boundary enabled");
  const adminActor = actors.find(a => a.role === "admin"), staffActor = actors.find(a => a.role === "staff");
  async function probeAuthFailure() {
    const actor = staffActor || adminActor;
    const sessionRoute = { name: "session-probe", path: "/api/auth/session" };
    console.log("Testing temporary auth pool starvation and recovery against the isolated database...");
    const control = await httpGet(origin, sessionRoute, actor.cookie, agent);
    if (control.payload?.user?.id !== actor.userId) throw new Error("Authentication probe control session failed");
    let responses;
    try {
      await mongoClient.db("admin").command({ configureFailPoint: "failCommand", mode: "alwaysOn",
        data: { failCommands: ["find"], blockConnection: true, blockTimeMS: 5000 } });
      responses = await Promise.all(Array.from({ length: 45 }, () => httpGet(origin, sessionRoute, actor.cookie, agent)));
    } finally {
      await mongoClient.db("admin").command({ configureFailPoint: "failCommand", mode: "off" });
    }
    const unavailable = responses.filter(r => r.status === "503");
    const recovered = await httpGet(origin, sessionRoute, actor.cookie, agent);
    const resourceRoute = endpoint(actor, .1);
    const users = mongoClient.db().collection("users"), userId = new ObjectId(actor.userId);
    await users.updateOne({ _id: userId }, { $set: { status: 0 } });
    const blocked = await httpGet(origin, resourceRoute, actor.cookie, agent);
    await users.updateOne({ _id: userId }, { $set: { status: 1 }, $inc: { session_version: 1 } });
    const revoked = await httpGet(origin, resourceRoute, actor.cookie, agent);
    await users.deleteOne({ _id: userId });
    const deleted = await httpGet(origin, resourceRoute, actor.cookie, agent);
    report.authenticationFailureProbe = { concurrentSessionReads: responses.length,
      statusCounts: summarize(responses, 1).statusCounts, temporaryFailures: unavailable.length,
      unavailableResponsesPreserveCookies: unavailable.every(r => !r.sessionCookieCleared),
      unavailableResponsesHaveRetryAfter: unavailable.every(r => r.retryAfter === "2"),
      sessionRecoveredWithOriginalCookie: recovered.status === "200" && recovered.payload?.user?.id === actor.userId,
      blockedAccountDenied: blocked.status === "401", revokedSessionDenied: revoked.status === "401", deletedAccountDenied: deleted.status === "401",
      rejectedSessionsClearCookies: [blocked, revoked, deleted].every(r => r.sessionCookieCleared) };
    const probe = report.authenticationFailureProbe;
    if (!probe.temporaryFailures || responses.some(r => !["200", "503"].includes(r.status)) || Object.values(probe).some(v => v === false)) throw new Error("Authentication failure/revocation probe failed");
    console.log("Real HTTP auth probes passed: outage returns 503 without cookie deletion; recovery and revocation checks hold.");
  }
  const probes = [];
  report.preflight = probes;
  for (const actor of [adminActor, staffActor].filter(Boolean)) {
    for (const pick of [.1, .4, .6, .75, .85, .925, .975]) {
      const route = endpoint(actor, pick);
      const response = await httpGet(origin, route, actor.cookie, agent);
      const populated = route.name.endsWith("-tasks") || route.name.endsWith("-enquiries") || route.name === "organization-staffs"
        ? response.payload?.data?.length > 0 : route.name === "calendar" ? response.payload?.items?.length > 0
        : route.name === "facility-map" ? response.payload?.visibleTotal === dataset.facilities
        : route.name === "dashboard" ? response.payload?.data?.dashboard?.pendingTasks > 0
        : response.payload?.data?.counts?.staffs > 0;
      probes.push({ endpoint: route.name, role: actor.role, status: response.status, valid: response.ok && populated, ms: Number(response.ms.toFixed(1)) });
      if (!response.ok || !populated) throw new Error(`Preflight failed: ${route.name} (${actor.role}), HTTP ${response.status}; no capacity results generated`);
    }
  }
  report.preflight = probes;
  async function traceQueries() {
    console.log("Tracing real HTTP database operations separately from the load measurements...");
    report.diagnostics = [];
    for (const actor of [adminActor, staffActor].filter(Boolean)) {
      for (const pick of [.1, .4, .6, .75, .925, .975]) {
        const route = endpoint(actor, pick);
        // Profiling is enabled only on this temporary database, never during the load ramp.
        const began = new Date();
        await mongoClient.db().command({ profile: 2 });
        let response;
        try { response = await httpGet(origin, route, actor.cookie, agent); }
        finally { await mongoClient.db().command({ profile: 0 }); }
        const operations = await mongoClient.db().collection("system.profile").find({ ts: { $gte: began },
          ns: { $not: /system\.profile$/ } }).toArray();
        const summaries = [];
        for (const op of operations) {
          const command = op.command || {};
          const summary = { collection: command.aggregate || command.find || op.ns?.split(".").slice(1).join("."),
            operation: command.aggregate ? "aggregate" : command.find ? "find" : op.op,
            durationMs: op.millis, documentsExamined: op.docsExamined, keysExamined: op.keysExamined,
            returned: op.nreturned, planSummary: op.planSummary };
          if (command.aggregate && Array.isArray(command.pipeline)) {
            const explanation = await mongoClient.db().command({ explain: { aggregate: command.aggregate,
              pipeline: command.pipeline, cursor: {}, ...(command.allowDiskUse ? { allowDiskUse: true } : {}) }, verbosity: "executionStats" });
            summary.explanation = (explanation.stages || [explanation]).map(stage => {
              const stats = stage.$cursor?.executionStats || stage.executionStats;
              return { stage: stage.executionStats ? "executionStats" : Object.keys(stage).find(key => key.startsWith("$") && key !== "$clusterTime") || "unknown",
                collection: stage.$lookup?.from, returned: stage.nReturned ?? stats?.nReturned,
                documentsExamined: stage.totalDocsExamined ?? stats?.totalDocsExamined,
                keysExamined: stage.totalKeysExamined ?? stats?.totalKeysExamined,
                executionMillis: stage.executionTimeMillisEstimate ?? stats?.executionTimeMillis,
                collectionScans: stage.collectionScans, indexesUsed: stage.indexesUsed };
            });
          }
          summaries.push(summary);
        }
        report.diagnostics.push({ endpoint: route.name, role: actor.role, valid: response.ok, ms: Number(response.ms.toFixed(1)), operations: summaries });
        console.log(`Traced ${route.name}: ${summaries.length} database operations`);
        if (!response.ok) throw new Error(`Diagnostic request failed: ${route.name}`);
      }
    }
  }
  if (args.includes("--diagnostics-only")) {
    await traceQueries();
    if (args.includes("--auth-failure-probe")) await probeAuthFailure();
    report.completed = true;
  } else {
  console.log("Authenticated payload preflight passed. Beginning stepped user load...");
  const cpuSeconds = value => value.trim().split(":").reduce((acc, n) => acc * 60 + Number(n), 0);
  async function sampleResources() {
    if (monitoring) return;
    monitoring = true;
    try {
      const { stdout } = await shellExec("ps", ["-p", `${app.pid},${mongo.pid},${process.pid}`, "-o", "pid=,rss=,time="]);
      const processes = Object.fromEntries(stdout.trim().split("\n").map(line => {
        const [pid, rss, cpu] = line.trim().split(/\s+/);
        return [pid, { rssMiB: Number(rss) / 1024, cpuSeconds: cpuSeconds(cpu) }];
      }));
      const status = await mongoClient.db("admin").command({ serverStatus: 1 });
      resources.push({ at: performance.now(), app: processes[app.pid], mongo: processes[mongo.pid], generator: processes[process.pid],
        connections: status.connections.current, queuedReaders: status.globalLock.currentQueue.readers,
        queryOps: status.opcounters.query, commandOps: status.opcounters.command });
    } catch { /* Sample failures must not abort HTTP requests. */ } finally { monitoring = false; }
  }
  await sampleResources();
  monitor = setInterval(sampleResources, 1000);
  for (const users of stages) {
    if (interrupted) throw new Error("Benchmark interrupted");
    checkChild(app, "Application"); checkChild(mongo, "MongoDB");
    const began = performance.now(), rampEnd = began + rampSeconds * 1000, holdEnd = rampEnd + holdSeconds * 1000;
    const samples = [], steady = [], starts = [], delays = monitorEventLoopDelay({ resolution: 20 });
    delays.enable();
    let inFlight = 0, maxInFlight = 0;
    const cpuStart = process.cpuUsage();
    console.log(`Stage: ${users} virtual users; ${rampSeconds}s ramp + ${holdSeconds}s hold`);
    await Promise.all(actors.slice(0, users).map(async actor => {
      await delay(random() * rampSeconds * 1000);
      while (performance.now() < holdEnd && !interrupted) {
        const started = performance.now();
        starts.push(started);
        const route = endpoint(actor, random()); // First pages stay nonempty for this fixture.
        maxInFlight = Math.max(maxInFlight, ++inFlight);
        const response = await httpGet(origin, route, actor.cookie, agent);
        inFlight--;
        const sample = { name: route.name, started, completed: performance.now(), ms: response.ms, ok: response.ok, status: response.status, bytes: response.bytes };
        samples.push(sample);
        if (started >= rampEnd) steady.push(sample);
        if (performance.now() < holdEnd) await delay(Math.min((5 + random() * 10) * 1000, Math.max(0, holdEnd - performance.now())));
      }
    }));
    delays.disable();
    await sampleResources();
    const finished = performance.now(), elapsed = (finished - began) / 1000;
    const resourceWindow = resources.filter(r => r.at >= began && r.at <= finished && r.app && r.mongo && r.generator);
    const first = resourceWindow[0], last = resourceWindow.at(-1);
    const metrics = {};
    for (const name of ["app", "mongo", "generator"]) {
      metrics[name] = { peakRssMiB: resourceWindow.length ? Number(Math.max(...resourceWindow.map(r => r[name].rssMiB)).toFixed(1)) : null,
        averageCpuCores: first && last && last.at > first.at ? Number(((last[name].cpuSeconds - first[name].cpuSeconds) / ((last.at - first.at) / 1000)).toFixed(2)) : null };
    }
    const result = { users, elapsedSeconds: Number(elapsed.toFixed(2)), drainSeconds: Number(Math.max(0, (finished - holdEnd) / 1000).toFixed(2)), maxInFlight,
      all: summarize(samples, elapsed), steadyStarted: { ...summarize(steady, holdSeconds), offeredRps: Number((starts.filter(t => t >= rampEnd).length / holdSeconds).toFixed(2)),
        note: "Latencies/errors include requests started during hold and completed during drain; completedRps is a cohort count/hold, not a completion-window rate." },
      steadyCompletedRps: Number((samples.filter(s => s.completed >= rampEnd && s.completed <= holdEnd).length / holdSeconds).toFixed(2)),
      endpoints: Object.fromEntries(endpointNames.map(name => [name, summarize(steady.filter(s => s.name === name), holdSeconds)])),
      resources: { ...metrics, peakMongoConnections: resourceWindow.length ? Math.max(...resourceWindow.map(r => r.connections)) : null,
        peakQueuedReaders: resourceWindow.length ? Math.max(...resourceWindow.map(r => r.queuedReaders)) : null,
        queryOperations: first && last ? last.queryOps - first.queryOps : null,
        commandOperations: first && last ? last.commandOps - first.commandOps : null,
        monitoringCommandOperationsIncluded: true },
      generator: { eventLoopP99ms: Number((delays.percentile(99) / 1e6).toFixed(2)), cpuSeconds: Object.values(process.cpuUsage(cpuStart)).reduce((a, b) => a + b, 0) / 1e6 } };
    result.meetsTargets = steady.length > 0 && result.steadyStarted.errorRate < .01 && result.steadyStarted.p95ms < 750 && result.steadyStarted.p99ms < 2000;
    report.stages.push(result);
    console.log(JSON.stringify({ users, holdRequests: steady.length, p95ms: result.steadyStarted.p95ms, p99ms: result.steadyStarted.p99ms,
      errorPercent: Number((result.steadyStarted.errorRate * 100).toFixed(2)), completedRps: result.steadyCompletedRps, meetsTargets: result.meetsTargets }));
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    if (result.steadyStarted.errorRate > .2) {
      report.stoppedEarly = `Stopped after ${users} users because errors exceeded 20%; larger stages were not attempted.`;
      console.log(report.stoppedEarly); break;
    }
  }
  const serverLog = await readFile(join(directory, "app.log"), "utf8");
  report.serverLogErrorOccurrences = Object.fromEntries(["MongoWaitQueueTimeoutError", "MongoServerSelectionError", "JWTSessionError", "MongoNetworkTimeoutError"].map(name =>
    [name, serverLog.split(name).length - 1]));
  if (args.includes("--trace-queries")) {
    // Close the load server before diagnostics so pending timed-out HTTP work cannot
    // contaminate the sequential query measurements; the temporary DB stays alive.
    await closeChild(app);
    const freshApp = await start(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], env, "diagnostic-app.log");
    for (let i = 0; i < 60; i++) {
      checkChild(freshApp, "Diagnostic application");
      try { if ((await fetch(origin + "/api/users/get-user/all-details", { signal: AbortSignal.timeout(1000) })).status === 401) break; } catch { /* Starting. */ }
      await delay(250);
    }
    await traceQueries();
  }
  if (args.includes("--auth-failure-probe")) await probeAuthFailure();
  report.completed = true;
  }
} catch (error) {
  report.completed = false;
  report.failure = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearInterval(monitor);
  while (monitoring) await delay(50);
  for (const resource of resources) if (resource instanceof http.Agent) resource.destroy();
  await mongoClient?.close();
  for (const child of [...children].reverse()) await closeChild(child);
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  await rm(directory, { recursive: true, force: true });
  await rm(resolve(buildDirectory), { recursive: true, force: true });
  console.log(`Sanitized performance report: ${output}`);
}
