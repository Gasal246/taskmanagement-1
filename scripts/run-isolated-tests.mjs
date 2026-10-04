import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { once } from "node:events";
import { MongoClient } from "mongodb";

const directory = await mkdtemp(join(tmpdir(), "taskmanager-tests-"));
const listener = net.createServer();
await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const uri = `mongodb://127.0.0.1:${port}/?replicaSet=taskmanager_tests`;
const mongo = spawn(process.env.MONGOD_BINARY || "mongod", [
  "--dbpath", directory, "--port", String(port), "--bind_ip", "127.0.0.1", "--replSet", "taskmanager_tests",
  "--logpath", join(directory, "mongo.log"),
], { stdio: "ignore" });
let startError;
mongo.on("error", error => { startError = error; });
let testProcess;
const stop = () => { testProcess?.kill("SIGTERM"); mongo.kill("SIGTERM"); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  let initialized = false;
  for (let i = 0; i < 50; i++) {
    if (startError) throw startError;
    const client = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
    try {
      await client.connect();
      await client.db("admin").command({ replSetInitiate: { _id: "taskmanager_tests", members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
      initialized = true;
      break;
    } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    finally { await client.close(); }
  }
  if (!initialized) throw new Error("Unable to start isolated MongoDB; install mongod or set MONGOD_BINARY");
  const ready = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  await ready.connect();
  await ready.close();
  console.log("Running tests against an isolated temporary MongoDB replica set.");
  const files = (await Promise.all(["tasks", "enquiries", "projects", "security"].map(async group =>
    (await readdir(`tests/${group}`)).filter(name => /\.test\.(?:cjs|mjs)$/.test(name)).map(name => `tests/${group}/${name}`)
  ))).flat();
  testProcess = spawn(process.execPath, ["--test", ...files], {
    stdio: "inherit", env: { ...process.env, TASK_TIMELINE_TEST_MONGO_URI: uri, SECURITY_TEST_MONGO_URI: uri },
  });
  const [code] = await once(testProcess, "exit");
  process.exitCode = code ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  const exited = mongo.exitCode !== null || mongo.signalCode !== null || startError;
  if (!exited) {
    const stopped = once(mongo, "exit");
    mongo.kill("SIGTERM");
    await stopped;
  }
  await rm(directory, { recursive: true, force: true });
}
