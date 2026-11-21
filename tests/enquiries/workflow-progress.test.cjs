require('./register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const mongoose = require('mongoose');
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
const { NextRequest } = require('next/server');
const access = require('../../lib/enquiries/access.ts');
const { enrichEnquiries } = require('../../lib/enquiries/completion-server.ts');
const { staffEnquiryVisibilityStages } = require('../../lib/enquiries/staff-visibility-pipeline.ts');
const model = file => require(`../../models/${file}.ts`).default;
const Targets = model('eq_enquiry_targets.model'), Eq = model('eq_enquiries.model'), Users = model('users.model');
const Businesses = model('business.model'), Countries = model('eq_countries.model'), Regions = model('eq_region.model');
const EqUsers = model('eq_enquiry_users.model'), Access = model('eq_enquiry_access.model'), Histories = model('eq_enquiry_histories');
const Admins = model('admin_assign_business.model'), Roles = model('roles.model'), UserRoles = model('user_roles.model');
let proc, directory, business, foreign, country, region, staff, other, adminUser, enquiries, input, admin;
const delay = ms => new Promise(r => setTimeout(r, ms));
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'enquiry-progress-'));
  const port = await new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  proc = spawn('mongod', ['--port', String(port), '--bind_ip', '127.0.0.1', '--dbpath', directory, '--replSet', 'targetTests', '--quiet'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await mongoose.connect(`mongodb://127.0.0.1:${port}/progress?directConnection=true`, { serverSelectionTimeoutMS: 200 }); break; } catch (e) { if (i === 59) throw e; await delay(100); } }
  await mongoose.connection.db.admin().command({ replSetInitiate: { _id: 'targetTests', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  for (let i = 0; i < 100; i++) { if ((await mongoose.connection.db.admin().command({ hello: 1 })).isWritablePrimary) break; await delay(100); }
  for (const m of [Targets, Eq, Users, Businesses, Countries, Regions, EqUsers, Access, Histories, Admins, Roles, UserRoles]) { await m.createCollection(); await m.createIndexes(); }
  business = await Businesses.create({ business_name: 'Target business' }); foreign = await Businesses.create({ business_name: 'Other business' });
  country = await Countries.create({ country_name: 'Country' }); region = await Regions.create({ country_id: country._id, region_name: 'Region' });
  [staff, other, adminUser] = await Users.create([{ name: 'Staff' }, { name: 'Other' }, { name: 'Admin' }]);
  await EqUsers.create([{ business_id: business._id, user_id: staff._id }, { business_id: business._id, user_id: other._id }]);
  const role = await Roles.create({ role_name: 'BUSINESS_ADMIN' });
  await Admins.create({ business_id: business._id, user_id: adminUser._id, status: 1 });
  await UserRoles.create({ business_id: business._id, user_id: adminUser._id, role_id: role._id, status: 1 });
  enquiries = await Eq.create([1, 2].map(i => ({ business_id: business._id, country_id: country._id, region_id: region._id, createdBy: adminUser._id, enquiry_uuid: `TARGET-${i}`, is_active: true })));
  input = { business_id: String(business._id), country_id: String(country._id), region_id: String(region._id), month: '2026-10', week: 4, enquiry_ids: enquiries.map(e => String(e._id)), assigned_user_ids: [String(staff._id), String(other._id)] };
  admin = { actorId: String(adminUser._id), admin: true, adminBusinessIds: [String(business._id)] };
});
after(async () => { await mongoose.disconnect(); if (proc && proc.exitCode === null) await new Promise(r => { proc.once('exit', r); proc.kill('SIGTERM'); }); if (directory) await rm(directory, { recursive: true, force: true }); });
const actor = user => ({ actorId: String(user._id), admin: false });
const Workflow = model('eq_enquiry_workflow.model');
const progressServer = require('../../lib/enquiries/workflow-progress-server.ts');
const { workflowProgress, validateSetup } = require('../../lib/enquiries/workflow-progress.ts');
const { enquiryHistoryPage } = require('../../lib/enquiries/history-page.ts');
const transitionRoute = require('../../app/api/enquiries/workflow/transition/route.ts');
const oid = () => new mongoose.Types.ObjectId().toString();
let config;
async function configuration() {
  if (config) return config;
  const now = new Date().toISOString(); const role = { _id: oid(), subname: 'AM', name: 'Account Manager', color_code: '#ff0000', createdAt: now, updatedAt: now };
  const doc = await Workflow.create({ client_id: business._id, revision: 1, roles: [role], stages: [1, 2, 3].map(n => ({ _id: oid(), name: `Stage ${n}`, role_id: role._id, createdAt: now, updatedAt: now })) });
  config = JSON.parse(JSON.stringify(doc)); return config;
}
async function enquiryWithRoles() {
  const c = await configuration();
  const e = await Eq.create({ business_id: business._id, createdBy: adminUser._id, camp_id: new mongoose.Types.ObjectId(), is_active: true });
  const setup = { assignments: [{ role_id: c.roles[0]._id, user_ids: [String(staff._id), String(other._id)] }], current_stage: 1, expected_revision: 0, configuration_revision: c.revision };
  await progressServer.saveWorkflowEdit(e, setup, admin);
  return e;
}
async function move(e, operation, number, who = actor(staff), overrides = {}) {
  const current = await Eq.findById(e._id).lean();
  return progressServer.transitionWorkflow({ enquiry_id: String(e._id), operation, stage_number: number, expected_revision: current.workflow_revision, configuration_revision: config.revision, ...overrides }, who);
}
test('derived progress follows live positions and grants only matching workflow actions', async () => {
  const e = await enquiryWithRoles();
  let p = workflowProgress(e, config, String(staff._id), false);
  assert.equal(p.current_stage, 1); assert.equal(p.stages[0].can_complete, true); assert.equal(p.stages[1].can_complete, false);
  p = workflowProgress({ ...e.toObject(), workflow_current_stage: 99 }, config, String(staff._id), false);
  assert.equal(p.completed, 3); assert.equal(p.stages[2].can_reopen, true); assert.equal(p.stages[1].can_reopen, false);
  assert.equal(workflowProgress({}, config, '', false).current_stage, 1);
  assert.equal(workflowProgress({}, undefined, '', false).available, false);
  const setup = { assignments: [{ role_id: config.roles[0]._id, user_ids: [String(staff._id), String(staff._id)] }], current_stage: 1, configuration_revision: config.revision };
  assert.throws(() => validateSetup(config, setup), { status: 400 });
  assert.throws(() => validateSetup(config, { ...setup, assignments: [{ role_id: oid(), user_ids: [] }] }), { status: 400 });
});
test('configuration validates admin ownership, active business users, and assignment uniqueness', async () => {
  const e = await enquiryWithRoles();
  const setup = { assignments: [], current_stage: 1, expected_revision: 1, configuration_revision: config.revision };
  await assert.rejects(progressServer.validateWorkflowSetup(e, setup, actor(staff)), { status: 403 });
  await assert.rejects(progressServer.validateWorkflowSetup(e, { ...setup, assignments: [{ role_id: config.roles[0]._id, user_ids: [oid()] }] }, admin), { status: 400 });
  await assert.rejects(progressServer.validateWorkflowSetup(e, { ...setup, expected_revision: 0 }, admin), { status: 409 });
  await assert.rejects(progressServer.validateWorkflowSetup(e, { ...setup, configuration_revision: 0 }, admin), { status: 409 });
});
test('completion, reopening and skip persist independent progress with durable history', async () => {
  const e = await enquiryWithRoles();
  await move(e, 'complete', 1);
  await move(e, 'complete', 2, actor(other));
  await assert.rejects(move(e, 'reopen', 1), { status: 403 });
  await move(e, 'reopen', 2, actor(other));
  assert.equal((await Eq.findById(e._id)).workflow_current_stage, 2);
  await assert.rejects(move(e, 'skip', 2), { status: 403 });
  await move(e, 'skip', 2, admin); await move(e, 'complete', 3);
  assert.equal((await Eq.findById(e._id)).workflow_current_stage, 4);
  await move(e, 'reopen', 1, admin);
  const histories = await Histories.find({ enquiry_id: e._id }).lean();
  const completed = histories.find(h => h.change_type === 'WORKFLOW_COMPLETED' && h.workflow_event.number === 1);
  assert.equal(completed.workflow_event.stage_name, 'Stage 1'); assert.equal(completed.workflow_event.role_name, 'Account Manager'); assert.equal(String(completed.changed_by), String(staff._id));
  assert.ok(completed.createdAt); assert.equal(histories.filter(h => h.change_type === 'WORKFLOW_SKIPPED').length, 1);
  assert.equal((await Eq.findById(e._id)).is_completed, false);
});
test('concurrent completions advance once, stale configuration is rejected, and audit failures roll back', async () => {
  const e = await enquiryWithRoles();
  const writes = await Promise.allSettled([move(e, 'complete', 1), move(e, 'complete', 1, actor(other))]);
  assert.equal(writes.filter(w => w.status === 'fulfilled').length, 1);
  assert.equal((await Eq.findById(e._id)).workflow_current_stage, 2);
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id, change_type: 'WORKFLOW_COMPLETED' }), 1);
  await assert.rejects(move(e, 'complete', 2, actor(staff), { configuration_revision: 0 }), { status: 409 });
  const original = Histories.create;
  Histories.create = async () => { throw new Error('Injected audit failure'); };
  try { await assert.rejects(move(e, 'complete', 2), /Injected audit failure/); } finally { Histories.create = original; }
  assert.equal((await Eq.findById(e._id)).workflow_current_stage, 2);
});
test('assignment grants removable read/list/history access without ordinary edit or action privileges', async () => {
  const e = await enquiryWithRoles();
  assert.equal(await access.canReadEnquiry(e, actor(staff)), true);
  assert.equal(await access.canEditEnquiry(e, actor(staff)), false);
  assert.equal(await access.canScheduleAction(e, actor(staff)), false);
  const visible = await Eq.aggregate(staffEnquiryVisibilityStages(staff._id, { _id: e._id })); assert.equal(visible.length, 1);
  const h = await enquiryHistoryPage(String(e._id), new URLSearchParams('kind=workflow'), String(staff._id)); assert.equal(h.histories.length, 1);
  const enriched = (await enrichEnquiries([e.toObject()], actor(staff)))[0]; assert.equal(enriched.workflow.stages[0].can_complete, true);
  await progressServer.saveWorkflowEdit(e, { assignments: [], current_stage: 1, expected_revision: 1, configuration_revision: config.revision }, admin);
  const removed = await Eq.findById(e._id);
  assert.equal(await access.canReadEnquiry(removed, actor(staff)), false);
  assert.equal((await Eq.aggregate(staffEnquiryVisibilityStages(staff._id, { _id: e._id }))).length, 0);
  assert.equal((await enquiryHistoryPage(String(e._id), new URLSearchParams('kind=workflow'), String(staff._id))).histories.length, 0);
});
test('transition endpoint rejects unauthenticated and unrelated users', async () => {
  const e = await enquiryWithRoles();
  const req = () => new NextRequest('http://localhost/api/enquiries/workflow/transition', { method: 'POST', body: JSON.stringify({ enquiry_id: String(e._id), operation: 'complete', stage_number: 1, expected_revision: 1, configuration_revision: config.revision }) });
  global.enquiryTestSession = null; assert.equal((await transitionRoute.POST(req())).status, 401);
  global.enquiryTestSession = { user: { id: oid() } }; assert.equal((await transitionRoute.POST(req())).status, 403);
});
test('live configuration changes reinterpret positions but preserve historical snapshots', async () => {
  const e = await enquiryWithRoles();
  await move(e, 'complete', 1);
  const reversed = [...config.stages].reverse();
  try {
    await Workflow.updateOne({ client_id: business._id }, { $set: { stages: reversed, roles: [{ ...config.roles[0], name: 'Renamed role' }], revision: 2 } });
    const current = await Eq.findById(e._id).lean();
    const loaded = (await enrichEnquiries([current], actor(staff)))[0];
    assert.equal(loaded.workflow.current_stage, 2); assert.equal(loaded.workflow.stages[0].name, 'Stage 3');
    await assert.rejects(move(e, 'complete', 2), { status: 409 });
    const event = await Histories.findOne({ enquiry_id: e._id, change_type: 'WORKFLOW_COMPLETED' }).lean();
    assert.equal(event.workflow_event.stage_name, 'Stage 1'); assert.equal(event.workflow_event.role_name, 'Account Manager');
    assert.equal((await enquiryHistoryPage(String(e._id), new URLSearchParams('kind=forwards'))).histories.length, 0);
  } finally { await Workflow.updateOne({ client_id: business._id }, { $set: { stages: config.stages, roles: config.roles, revision: 1 } }); }
});
