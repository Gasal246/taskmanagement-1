import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";
import mongoose from "mongoose";
import { encode } from "next-auth/jwt";

// Load actual schema declarations without the auth mocks used by unit tests.
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "../..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);
const model = name => require(path.join(root, "models", `${name}.ts`)).default;

export async function seedLocalFixture(uri, secret, userCount = 3000) {
  // The runner creates this URI itself. Never accept an existing database target.
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/local_load_[a-f0-9]+\?replicaSet=local_load$/.test(uri)) {
    throw new Error("Fixture seeding is restricted to the isolated loopback database");
  }
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  try {
    const models = Object.fromEntries([
      "users.model", "business.model", "roles.model", "admin_assign_business.model", "business_staffs.model",
      "user_roles.model", "business_regions.model", "region_staffs.model", "business_departments.model",
      "project_departments.model", "project_team.model", "project_team_members.model", "business_project.model",
      "business_tasks.model", "task_activities.model", "eq_camps.model", "eq_enquiries.model",
      "eq_enquiry_histories", "eq_enquiry_access.model", "calendar_events.model",
    ].map(name => [name.replace(/\.model$/, ""), model(name)]));
    const id = () => new mongoose.Types.ObjectId();
    const businessCount = Math.min(10, userCount);
    const businesses = Array.from({ length: businessCount }, (_, i) => ({ _id: id(), business_name: `Load business ${i}`, status: 1 }));
    const regions = businesses.map(b => ({ _id: id(), business_id: b._id, region_name: "Load region", status: 1 }));
    const departments = businesses.map(b => ({ _id: id(), business_id: b._id, dep_name: "Load sales", status: 1 }));
    const roles = [{ _id: id(), role_name: "BUSINESS_ADMIN" }, { _id: id(), role_name: "REGION_STAFF" }];
    const users = Array.from({ length: userCount }, (_, i) => ({
      _id: id(), name: `Load user ${i}`, email: `load-${i}@example.invalid`, status: 1, session_version: 0,
    }));
    const admin = i => i < businessCount || i % 30 === 0;
    const projects = regions.map((r, i) => ({ _id: id(), business_id: r.business_id, region_id: r._id,
      project_name: `Load project ${i}`, creator: users[i]._id, type: "sales", status: "approved", is_approved: true,
      task_count: 0, completed_task_count: 0 }));
    const projectDeps = projects.map((p, i) => ({ _id: id(), project_id: p._id, department_id: departments[i]._id,
      department_name: "Sales", is_active: true }));
    const teams = projects.map((p, i) => ({ _id: id(), project_id: p._id, project_dept_id: projectDeps[i]._id,
      team_name: "Load team", team_head: users[i]._id }));
    const insert = async (name, rows) => { if (rows.length) await models[name].insertMany(rows); };
    await insert("business", businesses);
    await insert("business_regions", regions);
    await insert("business_departments", departments);
    await insert("roles", roles);
    await insert("users", users);
    await insert("admin_assign_business", users.flatMap((u, i) => admin(i) ? [{ user_id: u._id, business_id: businesses[i % businessCount]._id, status: 1 }] : []));
    await insert("business_staffs", users.map((u, i) => ({ user_id: u._id, business_id: businesses[i % businessCount]._id, status: 1 })));
    await insert("user_roles", users.map((u, i) => ({ user_id: u._id, business_id: businesses[i % businessCount]._id, role_id: roles[admin(i) ? 0 : 1]._id, status: 1 })));
    await insert("region_staffs", users.map((u, i) => ({ staff_id: u._id, region_id: regions[i % businessCount]._id, status: 1 })));
    await insert("business_project", projects);
    await insert("project_departments", projectDeps);
    await insert("project_team", teams);
    await insert("project_team_members", users.map((u, i) => ({ user_id: u._id, project_team_id: teams[i % businessCount]._id })));
    const now = Date.now();
    const start = new Date(now - 3600000), end = new Date(now + 86400000);
    const camps = Array.from({ length: 10000 }, (_, i) => ({ _id: id(), camp_name: `Load facility ${i}`,
      is_active: true, is_eq_added: true, visited_status: "To Visit", camp_capacity: "500", camp_occupancy: 350,
      latitude: String(24 + (i % 100) / 100), longitude: String(54 + Math.floor(i / 100) / 100) }));
    await insert("eq_camps", camps);
    const tasks = users.flatMap((u, i) => Array.from({ length: 10 }, (_, j) => ({ _id: id(),
      business_id: businesses[i % businessCount]._id, assigned_to: u._id, creator: u._id,
      task_name: `Load task ${i}-${j}`, task_description: "Synthetic workload", status: j % 3 === 0 ? "Completed" : "To Do",
      priority: "normal", is_project_task: j % 2 === 0, project_id: j % 2 === 0 ? projects[i % businessCount]._id : undefined,
      start_date: start, end_date: end, activity_count: 1, completed_activity: j % 3 === 0 ? 1 : 0,
    })));
    await insert("business_tasks", tasks);
    await insert("task_activities", tasks.map(t => ({ task_id: t._id, activity: "Load activity", assigned_to: t.assigned_to,
      created_by: t.creator, is_done: t.status === "Completed", start_date: start, end_date: end })));
    const enquiries = users.flatMap((u, i) => Array.from({ length: 10 }, (_, j) => ({ _id: id(),
      business_id: businesses[i % businessCount]._id, createdBy: u._id, camp_id: camps[(i * 10 + j) % camps.length]._id,
      enquiry_uuid: `LOAD-${i}-${j}`, is_active: true, is_completed: false, status: "To Visit", priority: "1",
      next_action: "Call", next_action_due: end, comments: "Synthetic enquiry", enquiry_brought_by: [u._id],
    })));
    await insert("eq_enquiries", enquiries);
    await insert("eq_enquiry_histories", enquiries.map(e => ({ enquiry_id: e._id, camp_id: e.camp_id,
      change_type: "ACTION_SCHEDULED", action_origin: "initial", action: "Call", next_step_date: end,
      forwarded_by: e.createdBy, assigned_to: [e.createdBy], step_number: 1, is_finished: false,
      action_assignments: [{ user_id: e.createdBy, status: "pending", revision: 0 }] })));
    await insert("eq_enquiry_access", enquiries.map(e => ({ enquiry_id: e._id, camp_id: e.camp_id, user_id: e.createdBy })));
    await insert("calendar_events", users.map((u, i) => ({ business_id: businesses[i % businessCount]._id,
      title: "Load meeting", created_by: u._id, attendee_ids: [u._id], start_date: start, end_date: end })));
    const actors = [];
    for (let i = 0; i < users.length; i++) {
      const u = users[i], roleName = admin(i) ? "BUSINESS_ADMIN" : "REGION_STAFF";
      const token = await encode({ secret, salt: "authjs.session-token", maxAge: 7200,
        token: { user: { userid: String(u._id), email: u.email, is_super: false, session_version: 0 } } });
      const businessId = String(businesses[i % businessCount]._id), regionId = String(regions[i % businessCount]._id);
      actors.push({ userId: String(u._id), businessId, regionId, roleId: String(roles[admin(i) ? 0 : 1]._id), role: admin(i) ? "admin" : "staff",
        cookie: `authjs.session-token=${token}; user_role=${encodeURIComponent(JSON.stringify({ role_name: roleName, _id: String(roles[admin(i) ? 0 : 1]._id) }))}; user_domain=${encodeURIComponent(JSON.stringify({ business_id: businessId, value: regionId }))}` });
    }
    return { actors, dataset: { users: users.length, businesses: businesses.length, projects: projects.length,
      facilities: camps.length, tasks: tasks.length, activities: tasks.length, enquiries: enquiries.length,
      enquiryActions: enquiries.length, enquiryAccessRows: enquiries.length, calendarEvents: users.length } };
  } finally { await mongoose.disconnect(); }
}
