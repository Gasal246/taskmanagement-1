import test from "node:test";
import assert from "node:assert/strict";
import { endpoint, endpointNames, validPayload } from "./workload.mjs";
import { seedLocalFixture } from "./local-fixture.mjs";

const actor = { userId: "1".repeat(24), businessId: "2".repeat(24), regionId: "3".repeat(24), roleId: "4".repeat(24), role: "staff" };
test("shared workload covers every named endpoint with persisted actor scopes", () => {
  const names = new Set();
  for (const role of ["staff", "admin"]) for (const pick of [.1, .4, .6, .75, .85, .925, .975]) {
    const route = endpoint({ ...actor, role }, pick, 2, 1700000000000);
    names.add(route.name);
    assert.ok(route.path.startsWith("/api/"));
    if (route.name === "dashboard") {
      assert.equal(new URL(route.path, "http://localhost").searchParams.get("role_id"), actor.roleId);
      assert.equal(new URL(route.path, "http://localhost").searchParams.get("org_id"), actor.regionId);
    }
  }
  assert.deepEqual([...names].sort(), [...endpointNames].sort());
});
test("fixture refuses external or existing application database URIs before connecting", async () => {
  for (const uri of ["mongodb://database.example/app", "mongodb://127.0.0.1:27017/taskmanager", undefined]) {
    await assert.rejects(seedLocalFixture(uri, "test-only"), /restricted to the isolated loopback database/);
  }
});
test("payload validation rejects error envelopes returned with HTTP 200", () => {
  for (const name of endpointNames) assert.equal(validPayload(name, { message: "Failed", status: 200 }), false);
  assert.equal(validPayload("staff-tasks", { data: [], pagination: { total: 0 } }), true);
  assert.equal(validPayload("calendar", { items: [], pagination: { hasMore: false } }), true);
  assert.equal(validPayload("dashboard", { data: { dashboard: { pendingTasks: 0 } } }), true);
  assert.equal(validPayload("facility-map", { camps: [], clusters: [], visibleTotal: 0 }), true);
});
