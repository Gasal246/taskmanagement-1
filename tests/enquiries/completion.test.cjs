require('./register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const mongoose = require('mongoose');
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
const { NextRequest } = require('next/server');
const rules = require('../../lib/enquiries/completion.ts');
const { periodBounds } = require('../../lib/enquiries/period.ts');
const service = require('../../lib/enquiries/completion-server.ts');
const Eq = require('../../models/eq_enquiries.model.ts').default;
const Histories = require('../../models/eq_enquiry_histories.ts').default;
const Access = require('../../models/eq_enquiry_access.model.ts').default;
const Users = require('../../models/users.model.ts').default;
const { filteredAdminEnquiries } = require('../../lib/enquiries/admin-list.ts');
let mongoProcess, directory;
const creator = new mongoose.Types.ObjectId();
const assignee = new mongoose.Types.ObjectId();
const viewer = new mongoose.Types.ObjectId();
const admin = { actorId: String(new mongoose.Types.ObjectId()), admin: true };
const actor = { actorId: String(creator), admin: false };
const delay = ms => new Promise(r => setTimeout(r, ms));

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'enquiry-completion-test-'));
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  mongoProcess = spawn('mongod', ['--port', String(port), '--bind_ip', '127.0.0.1', '--dbpath', directory, '--replSet', 'enquiryTests', '--quiet'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let startupError = '';
  mongoProcess.stderr.on('data', data => { startupError += data; });
  const uri = `mongodb://127.0.0.1:${port}/enquiry_tests?directConnection=true`;
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 200 }); ready = true; break; } catch { await delay(100); }
  }
  if (!ready) throw new Error(`Test MongoDB failed to start: ${startupError}`);
  await mongoose.connection.db.admin().command({ replSetInitiate: { _id: 'enquiryTests', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  for (let i = 0; i < 100; i++) { if ((await mongoose.connection.db.admin().command({ hello: 1 })).isWritablePrimary) break; await delay(100); }
  process.env.MONGO_URI = uri;
  await Promise.all(Object.values(mongoose.models).map(model => model.createCollection()));
  await Users.collection.insertMany([creator, assignee, viewer, new mongoose.Types.ObjectId(admin.actorId)].map((_id, i) => ({ _id, name: `Test user ${i}`, email: `enquiry-test-${i}@example.invalid`, status: 1 })));
});
after(async () => {
  await mongoose.disconnect();
  if (mongoProcess && mongoProcess.exitCode === null) {
    await new Promise(resolve => { mongoProcess.once('exit', resolve); mongoProcess.kill('SIGTERM'); });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function fixture(options = {}) {
  const enquiry = await Eq.create({ createdBy: creator, is_active: true, status: 'Lead Received', ...options });
  return enquiry;
}
const payload = (enquiry, forward = null) => ({ enquiry_id: String(enquiry._id), source_forward_id: forward ? String(forward._id) : null, expected_updated_at: enquiry.updatedAt.toISOString(), action: 'Call', notes: 'Confirmed the final outcome.' });
const fails = (fn, status) => assert.rejects(fn, err => err.status === status);

test('approval, creator, latest assignee and administrator permission boundaries', async () => {
  const e = await fixture();
  assert.equal(rules.completionPermissions(e, null, actor.actorId, false).canComplete, true);
  assert.equal(rules.completionPermissions(e, { assigned_to: [assignee] }, String(assignee), false).canComplete, true);
  assert.equal(rules.completionPermissions(e, null, String(viewer), false).canComplete, false);
  assert.equal(rules.completionPermissions(e, null, admin.actorId, true).canComplete, true);
  e.is_active = false; await e.save();
  await fails(() => service.transitionEnquiry(payload(e), actor), 403);
  await fails(() => service.transitionEnquiry(payload(e), admin), 403);
  await fails(() => service.transitionEnquiry(payload(e), { actorId: String(viewer), admin: false }), 403);
});
test('completion with no forward preserves status and grants creator history access', async () => {
  const e = await fixture();
  await service.transitionEnquiry(payload(e), actor);
  const saved = await Eq.findById(e._id).lean();
  assert.equal(saved.is_completed, true); assert.equal(saved.status, 'Lead Received');
  assert.equal(String(saved.completed_by), actor.actorId); assert.equal(saved.completion_action, 'Call');
  const h = await Histories.findOne({ enquiry_id: e._id }).lean();
  assert.equal(h.change_type, 'ENQUIRY_COMPLETED'); assert.equal(h.source_forward_id, null);
  assert.equal(String(h.changed_by), actor.actorId);
  assert.ok(await Access.exists({ enquiry_id: e._id, history_id: h._id, user_id: creator }));
  await fails(() => service.transitionEnquiry(payload(e), actor), 409);
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id }), 1);
});
test('latest forward ignores edits, preserves source and records changed action plus all viewers', async () => {
  const e = await fixture();
  const forward = await Histories.create({ enquiry_id: e._id, action: 'Visit', step_number: 1, assigned_to: [assignee], feedback: 'Arrange site visit', forwarded_by: creator });
  await Histories.create({ enquiry_id: e._id, change_type: 'ENQUIRY_EDIT', step_number: 2, action: 'Enquiry Edited', assigned_to: [viewer] });
  await Access.create({ enquiry_id: e._id, user_id: viewer, history_id: forward._id });
  const [enriched] = await service.enrichEnquiries([e.toObject()], { actorId: String(assignee), admin: false });
  assert.equal(String(enriched.latest_forward._id), String(forward._id)); assert.equal(enriched.canComplete, true);
  await service.transitionEnquiry(payload(e, forward), { actorId: String(assignee), admin: false });
  const h = await Histories.findOne({ enquiry_id: e._id, change_type: 'ENQUIRY_COMPLETED' }).lean();
  assert.equal(h.previous_action, 'Visit'); assert.equal(h.action, 'Call'); assert.equal(h.step_number, 3);
  assert.equal((await Histories.findById(forward._id)).action, 'Visit');
  const viewers = await Access.find({ history_id: h._id }).distinct('user_id');
  assert.deepEqual(viewers.map(String).sort(), [creator, assignee, viewer].map(String).sort());
});
test('unchanged action and required notes, invalid actions, stale forward and stale enquiry', async () => {
  const e = await fixture();
  const f = await Histories.create({ enquiry_id: e._id, action: 'Call', assigned_to: [assignee], step_number: 1 });
  for (const invalid of [{ notes: '   ' }, { notes: 'a'.repeat(5001) }, { action: 'Finished' }, { expected_updated_at: null }]) await fails(() => service.transitionEnquiry({ ...payload(e, f), ...invalid }, actor), 400);
  await fails(() => service.transitionEnquiry(payload(e), actor), 409);
  await fails(() => service.transitionEnquiry({ ...payload(e, f), expected_updated_at: '2020-01-01' }, actor), 409);
  await service.transitionEnquiry(payload(e, f), actor);
  const h = await Histories.findOne({ enquiry_id: e._id, change_type: 'ENQUIRY_COMPLETED' });
  assert.equal(h.action, 'Call'); assert.equal(h.previous_action, 'Call');
});
test('concurrent completion requests create exactly one event', async () => {
  const e = await fixture();
  const result = await Promise.allSettled([service.transitionEnquiry(payload(e), actor), service.transitionEnquiry(payload(e), actor)]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id }), 1);
});
test('failed history write rolls back completion and access', async () => {
  const e = await fixture();
  await mongoose.connection.db.command({ collMod: Histories.collection.name, validator: { action: { $ne: 'Call' } }, validationLevel: 'strict' });
  try { await assert.rejects(() => service.transitionEnquiry(payload(e), actor)); }
  finally { await mongoose.connection.db.command({ collMod: Histories.collection.name, validator: {} }); }
  assert.equal((await Eq.findById(e._id)).is_completed, false);
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id }), 0);
  assert.equal(await Access.countDocuments({ enquiry_id: e._id }), 0);
});
test('admin reopening, lifecycle history, recompletion, and legacy status restoration', async () => {
  const e = await fixture(); await service.transitionEnquiry(payload(e), actor);
  const completed = await Eq.findById(e._id);
  await fails(() => service.transitionEnquiry(payload(completed), actor, true), 403);
  await service.transitionEnquiry({ ...payload(completed), notes: 'Client requested another visit.' }, admin, true);
  const reopened = await Eq.findById(e._id);
  assert.equal(rules.isCompleted(reopened), false); assert.equal(reopened.completed_at, undefined);
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id, change_type: 'ENQUIRY_REOPENED' }), 1);
  await service.transitionEnquiry(payload(reopened), actor);
  const legacy = await fixture({ status: 'Closed' });
  await Histories.create({ enquiry_id: legacy._id, change_type: 'ENQUIRY_EDIT', changed_fields: [{ field: 'status', from_value: 'On Hold', to_value: 'Closed' }] });
  await service.transitionEnquiry(payload(legacy), admin, true);
  assert.equal((await Eq.findById(legacy._id)).status, 'On Hold');
  const noHistory = await fixture({ status: 'Closed' }); await service.transitionEnquiry(payload(noHistory), admin, true);
  assert.equal((await Eq.findById(noHistory._id)).status, 'Lead Received');
});
test('awarded and converted records stay complete, cannot reopen, preserve completion date', async () => {
  for (const attrs of [{ status: 'Project Awarded' }, { is_converted: true }, { completion_source: 'awarded', is_completed: true }]) {
    const e = await fixture(attrs);
    assert.equal(rules.isCompleted(e), true); assert.equal(rules.isManuallyClosed(e), false);
    await fails(() => service.transitionEnquiry(payload(e), admin, true), 403);
  }
  const e = await fixture();
  await service.stampAutomaticCompletion(e._id, actor.actorId, 'awarded');
  const first = await Eq.findById(e._id);
  await delay(5); await service.stampAutomaticCompletion(e._id, admin.actorId, 'converted');
  const second = await Eq.findById(e._id);
  assert.equal(first.completed_at.getTime(), second.completed_at.getTime());
});
test('completion filters and counts apply before pagination and compose with other filters', async () => {
  const tag = `FILTER-${Date.now()}`;
  const older = new Date('2026-06-27T12:00:00Z'), recent = new Date('2026-06-29T12:00:00Z');
  const rows = [
    { status: 'Lead Received', is_completed: true, completed_at: older, updatedAt: recent },
    { status: 'Project Awarded', completed_at: older, updatedAt: recent },
    { status: 'Closed', updatedAt: older },
    { status: 'Lead Received', updatedAt: recent },
    { status: 'Lead Received', updatedAt: older },
  ];
  await Eq.collection.insertMany(rows.map((row, i) => ({ ...row, enquiry_uuid: tag, priority: String(i+1), createdAt: older })));
  const params = { enquiry_uuid: tag, completion_state: 'completed', period_from: '2026-06-27T00:00:00Z', period_to: '2026-06-28T00:00:00Z', limit: '1' };
  const first = await filteredAdminEnquiries(new URLSearchParams(params));
  assert.equal(first.pagination.totalRecords, 3); assert.equal(first.data.length, 1);
  const all = await filteredAdminEnquiries(new URLSearchParams({ ...params, limit: '200' }));
  assert.equal(all.data.length, 3);
  const open = await filteredAdminEnquiries(new URLSearchParams({ ...params, completion_state: 'non_completed', period_from: '2026-06-29T00:00:00Z', period_to: '2026-06-30T00:00:00Z' }));
  assert.equal(open.pagination.totalRecords, 1);
  for (const row of rows) assert.equal(rules.matchesCompletionPeriod(row, params), rules.isCompleted(row));
  const mixed = await filteredAdminEnquiries(new URLSearchParams({ ...params, completion_state: 'all' }));
  assert.equal(mixed.pagination.totalRecords, 4);
  await assert.rejects(() => filteredAdminEnquiries(new URLSearchParams({ period_from: 'invalid' })), /Invalid period/);
});
test('period boundaries include end day, exclude next midnight, and use local calendars', () => {
  const bounds = periodBounds('custom', '2026-06-27', '2026-06-29');
  assert.equal(new Date(bounds.period_from).getDate(), 27); assert.equal(new Date(bounds.period_to).getDate(), 30);
  assert.equal(rules.matchesCompletionPeriod({ updatedAt: new Date(new Date(bounds.period_to).getTime() - 1) }, bounds), true);
  assert.equal(rules.matchesCompletionPeriod({ updatedAt: bounds.period_to }, bounds), false);
  const now = new Date(2026, 8, 8, 14);
  assert.equal(new Date(periodBounds('week', '', '', now).period_from).getDay(), 1);
  assert.equal(new Date(periodBounds('month', '', '', now).period_from).getDate(), 1);
  assert.deepEqual(periodBounds('all'), { period_from: '', period_to: '' });
});
test('legacy migration recovers history, labels estimates, and is idempotent', async () => {
  const { recoverLegacyCompletion } = await import('../../lib/enquiries/legacy-completion.mjs');
  const e = { status: 'Closed', updatedAt: new Date('2026-06-29') };
  const exact = recoverLegacyCompletion(e, [{ action: 'Closed', forwarded_by: creator, createdAt: new Date('2026-06-27'), feedback: 'Done' }]);
  assert.equal(exact.completion_date_estimated, false); assert.equal(String(exact.completed_by), String(creator));
  const estimated = recoverLegacyCompletion(e, []);
  assert.equal(estimated.completion_date_estimated, true); assert.equal(estimated.completed_by, undefined);
  assert.equal(estimated.completed_at.getTime(), e.updatedAt.getTime());
  assert.equal(recoverLegacyCompletion({ ...e, ...exact }, []), null);
});
test('HTTP endpoints reject unauthenticated and old closure bypass requests', async () => {
  const { PUT } = require('../../app/api/enquiries/update/enquiry/complete/route.ts');
  const close = require('../../app/api/enquiries/update/enquiry/close-enquiry/route.ts');
  const request = body => new NextRequest('http://localhost/api/enquiries/update/enquiry/complete', { method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  global.enquiryTestSession = null;
  assert.equal((await PUT(request({}))).status, 401);
  const e = await fixture(); global.enquiryTestSession = { user: { id: actor.actorId } };
  assert.equal((await close.PUT(request({ enquiry_id: String(e._id), feedback: 'Old close request' }))).status, 400);
  assert.equal((await PUT(request(payload(e)))).status, 200);
  global.enquiryTestSession = null;
});
test('both forward APIs enforce completion, approval, action rules and restored assignment', async () => {
  const staffRoute = require('../../app/api/enquiries/staff-side/post/forward-enquiry/route.ts');
  const adminRoute = require('../../app/api/enquiries/post/forward-history/route.ts');
  const e = await fixture(); await service.transitionEnquiry(payload(e), actor);
  global.enquiryTestSession = { user: { id: actor.actorId } };
  const forwardBody = { enquiry_id: String(e._id), assigned_to: [String(assignee)], action: 'Visit', priority: 5, feedback: 'A follow-up', next_date: null };
  const request = body => new NextRequest('http://localhost/api/enquiries/post/forward-history', { method: 'POST', body: JSON.stringify(body) });
  for (const route of [staffRoute, adminRoute]) {
    assert.equal((await route.POST(request(forwardBody))).status, 409);
    assert.equal((await route.POST(request({ ...forwardBody, action: 'Finished' }))).status, 400);
    assert.equal((await route.POST(request({ ...forwardBody, is_finished: true }))).status, 400);
  }
  await service.transitionEnquiry(payload(await Eq.findById(e._id)), admin, true);
  assert.equal((await staffRoute.POST(request(forwardBody))).status, 201);
  assert.equal((await Histories.findOne({ enquiry_id: e._id }).sort(rules.historyOrder)).action, 'Visit');
  const pending = await fixture({ is_active: false });
  assert.equal((await staffRoute.POST(request({ ...forwardBody, enquiry_id: String(pending._id) }))).status, 403);
  const awarded = await fixture({ status: 'Project Awarded' });
  assert.equal((await staffRoute.POST(request({ ...forwardBody, enquiry_id: String(awarded._id) }))).status, 201);
  global.enquiryTestSession = null;
});
test('staff history includes completion and context rejects unrelated users', async () => {
  const e = await fixture(); await service.transitionEnquiry(payload(e), actor);
  const history = require('../../app/api/enquiries/staff-side/get/history/get-all/route.ts');
  const context = require('../../app/api/enquiries/update/enquiry/complete/route.ts');
  const request = new NextRequest(`http://localhost/api/enquiries?enquiry_id=${e._id}`);
  global.enquiryTestSession = { user: { id: actor.actorId } };
  const response = await history.GET(request); const data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.histories[0].history_id.change_type, 'ENQUIRY_COMPLETED');
  assert.equal(data.histories[0].history_id.changed_by.name, 'Test user 0');
  global.enquiryTestSession = { user: { id: String(viewer) } };
  assert.equal((await context.GET(request)).status, 403);
  global.enquiryTestSession = null;
});
test('migration dry run and apply preserve timestamps and avoid duplicate writes', async () => {
  const { promisify } = require('node:util');
  const execFile = promisify(require('node:child_process').execFile);
  const e = await fixture({ status: 'Closed' });
  await Histories.create({ enquiry_id: e._id, action: 'Closed', feedback: 'Legacy closure', forwarded_by: creator });
  const run = async args => {
    const { stdout } = await execFile(process.execPath, ['scripts/migrate-enquiry-completion.mjs', ...args], { cwd: join(__dirname, '../..'), env: { ...process.env, MONGO_URI: process.env.MONGO_URI } });
    return JSON.parse(stdout.slice(stdout.indexOf('{')));
  };
  const dry = await run([]); assert.equal(dry.mode, 'dry-run'); assert.equal(dry.written, 0);
  assert.equal((await Eq.findById(e._id)).completed_at, undefined);
  const applied = await run(['--apply']); assert.ok(applied.written > 0);
  const migrated = await Eq.findById(e._id);
  assert.equal(migrated.updatedAt.getTime(), e.updatedAt.getTime());
  assert.equal(migrated.createdAt.getTime(), e.createdAt.getTime());
  assert.equal(migrated.completion_date_estimated, false);
  assert.equal((await run(['--apply'])).written, 0);
});
test('admin list, staff list and filtered export agree on completion periods', async () => {
  const tag = `API-FILTER-${Date.now()}`;
  const date = new Date('2026-06-27T12:00:00Z');
  const next = new Date('2026-06-29T12:00:00Z');
  await Eq.collection.insertMany([
    { createdBy: creator, enquiry_uuid: tag, is_completed: true, completed_at: date, status: 'On Hold', createdAt: date, updatedAt: next },
    { createdBy: creator, enquiry_uuid: tag, status: 'Closed', createdAt: date, updatedAt: date },
    { createdBy: creator, enquiry_uuid: tag, status: 'Lead Received', createdAt: date, updatedAt: next },
  ]);
  const filters = { enquiry_uuid: tag, completion_state: 'completed', period_from: '2026-06-27T00:00:00Z', period_to: '2026-06-28T00:00:00Z' };
  const request = new NextRequest(`http://localhost/api/enquiries?${new URLSearchParams(filters)}`);
  global.enquiryTestSession = { user: { id: actor.actorId } };
  const staffList = require('../../app/api/enquiries/staff-side/get/user-enquiries/route.ts');
  const staff = await (await staffList.GET(request)).json();
  assert.equal(staff.pagination.totalRecords, 2);
  global.enquiryTestSession = { user: { id: admin.actorId, is_super: true } };
  const adminList = require('../../app/api/enquiries/get/enquiries/filtered/route.ts');
  const admins = await (await adminList.GET(request)).json();
  const exportRoute = require('../../app/api/enquiries/get/enquiries/export/route.ts');
  const exported = await (await exportRoute.POST(new NextRequest('http://localhost/api/enquiries/export', { method: 'POST', body: JSON.stringify({ filters }) }))).json();
  const ids = rows => rows.map(row => String(row._id)).sort();
  assert.deepEqual(ids(staff.data), ids(admins.data)); assert.deepEqual(ids(exported.data), ids(admins.data));
  global.enquiryTestSession = null;
});
test('a completed enquiry remains editable by its latest assignee', async () => {
  const e = await fixture();
  const forward = await Histories.create({ enquiry_id: e._id, action: 'Visit', step_number: 1, assigned_to: [assignee] });
  await service.transitionEnquiry(payload(e, forward), { actorId: String(assignee), admin: false });
  global.enquiryTestSession = { user: { id: String(assignee) } };
  const details = require('../../app/api/enquiries/staff-side/get/enquiry-by-id/route.ts');
  const response = await details.GET(new NextRequest(`http://localhost/api/enquiries?enquiry_id=${e._id}`));
  const data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.canEdit, true); assert.equal(data.canForward, false);
  global.enquiryTestSession = null;
});
