/* global __ENV, __VU, open */
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { endpoint, endpointNames, validPayload } from "./workload.mjs";

const baseUrl = String(__ENV.BASE_URL || "").replace(/\/$/, "");
if (!/^https?:\/\/[^/@?#\s]+$/.test(baseUrl)) throw new Error("Set BASE_URL to the origin of a dedicated staging deployment");
const maxUsers = Number(__ENV.MAX_USERS || 3000);
if (!Number.isInteger(maxUsers) || maxUsers < 1 || maxUsers > 10000) throw new Error("MAX_USERS must be between 1 and 10000");
const actors = new SharedArray("authenticated staging users", () => JSON.parse(open(__ENV.ACTORS_FILE || "./actors.local.json")));
if (actors.length < maxUsers || new Set(actors.slice(0, maxUsers).map(actor => actor.userId)).size !== maxUsers) throw new Error("Provide a distinct authenticated test user for each virtual user");
if (actors.some(actor => !actor.cookie || ![actor.userId, actor.businessId, actor.regionId, actor.roleId].every(id => /^[a-f0-9]{24}$/i.test(id || "")) || !["admin", "staff"].includes(actor.role))) throw new Error("Each actor requires real userId, businessId, regionId, roleId, cookie and role (admin or staff)");

export const options = {
  discardResponseBodies: true,
  scenarios: {
    users: {
      executor: "ramping-vus", startVUs: 0,
      stages: [
        { duration: "2m", target: Math.min(300, maxUsers) },
        { duration: "3m", target: Math.min(1000, maxUsers) },
        { duration: "3m", target: maxUsers },
        { duration: "10m", target: maxUsers },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], checks: ["rate>0.99"],
    http_req_duration: ["p(95)<750", "p(99)<2000"],
    ...Object.fromEntries(endpointNames.map(name => [`http_req_duration{name:${name}}`, ["p(95)<750", "p(99)<2000"]])),
  },
};

export function setup() {
  // Fail before the ramp if expired sessions/permissions turn the run into a 401/403 benchmark.
  for (const role of ["admin", "staff"]) {
    const actor = actors.slice(0, maxUsers).find(a => a.role === role);
    if (!actor) throw new Error(`Provide at least one ${role} actor in the tested cohort`);
    for (const pick of [.1, .4, .6, .75, .85, .925, .975]) {
      const route = endpoint(actor, pick);
      const response = http.get(baseUrl + route.path, {
        headers: { Cookie: actor.cookie, Accept: "application/json" }, responseType: "text",
        timeout: "15s", redirects: 0, tags: { name: route.name },
      });
      let payload;
      try { payload = response.json(); } catch { /* Invalid payload fails preflight. */ }
      if (response.status !== 200 || !validPayload(route.name, payload)) throw new Error(`Authenticated preflight failed: ${route.name}, HTTP ${response.status}`);
    }
  }
}

export default function () {
  const actor = actors[__VU - 1];
  const { path, name } = endpoint(actor, Math.random(), 1 + Math.floor(Math.random() * 5));
  const response = http.get(baseUrl + path, {
    headers: { Cookie: actor.cookie, Accept: "application/json" },
    timeout: "15s", redirects: 0, tags: { name },
  });
  check(response, { "authorized API returned 200": result => result.status === 200 });
  // Active sessions with human think time, rather than 3000 requests each second.
  sleep(5 + Math.random() * 10);
}
