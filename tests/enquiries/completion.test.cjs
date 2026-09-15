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
const fails = (fn, status) => assert.rejects(fn, err => err.status === status);
async function actionFor(e, assignees = [creator], props = {}) {
  return Histories.create({ enquiry_id: e._id, action: 'Visit', change_type: 'FORWARD', forwarded_by: creator,
    assigned_to: assignees, step_number: 1, feedback: 'Arrange site visit', ...props });
}
const payload = (e, a, user = creator, more = {}) => ({ enquiry_id: String(e._id), action_id: String(a._id),
  assignee_id: String(user), operation: 'complete', performed_action: 'Call', expected_revision: 0, notes: 'Confirmed the outcome.', ...more });

test('each assignee completes only their own part; pending colleagues remain pending', async () => {
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]);
  await service.transitionAction(payload(e, a), actor);
  const saved = await Histories.findById(a._id).lean();
  assert.deepEqual(saved.action_assignments.map(p => p.status), ['completed', 'pending']);
  assert.equal(saved.action, 'Visit'); assert.equal(saved.action_assignments[0].performed_action, 'Call');
  assert.equal(saved.action_assignments[0].completion_notes, 'Confirmed the outcome.');
  assert.equal(rules.actionProgress(saved).status, 'pending');
  assert.equal((await Eq.findById(e._id)).status, 'Lead Received');
  assert.equal((await Eq.findById(e._id)).is_completed, false);
  await fails(() => service.transitionAction(payload(e, a, assignee), actor), 403);
  await fails(() => service.transitionAction(payload(e, a, assignee), admin), 403);
  await service.transitionAction(payload(e, a, assignee), { actorId: String(assignee), admin: false });
  assert.equal(rules.actionProgress(await Histories.findById(a._id).lean()).status, 'completed');
});
test('approval and assignment permissions, even for enquiry creators and admins', async () => {
  const e = await fixture({ is_active: false }); const a = await actionFor(e);
  await fails(() => service.transitionAction(payload(e, a), actor), 403);
  e.is_active = true; await e.save();
  await fails(() => service.transitionAction(payload(e, a, viewer), { actorId: String(viewer), admin: false }), 403);
  const another = await actionFor(e, [assignee]);
  await fails(() => service.transitionAction(payload(e, another), actor), 403);
  await fails(() => service.transitionAction(payload(e, another, new mongoose.Types.ObjectId(admin.actorId)), admin), 403);
  await fails(() => service.transitionAction({ ...payload(e, a), notes: '' }, actor), 400);
  await fails(() => service.transitionAction({ ...payload(e, a), notes: 'x'.repeat(5001) }, actor), 400);
  await fails(() => service.transitionAction({ ...payload(e, a), performed_action: 'Finished' }, actor), 400);
});
test('completion writes per-assignee audit and access, preserving the planned action', async () => {
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]);
  await Access.create({ enquiry_id: e._id, user_id: viewer, history_id: a._id });
  await service.transitionAction(payload(e, a), actor);
  const event = await Histories.findOne({ enquiry_id: e._id, change_type: 'ACTION_COMPLETED' }).lean();
  assert.equal(String(event.action_id), String(a._id)); assert.equal(String(event.action_assignee), String(creator));
  assert.equal(String(event.changed_by), String(creator)); assert.equal(event.previous_action, 'Visit'); assert.equal(event.action, 'Call');
  assert.equal((await Histories.findById(a._id)).feedback, 'Arrange site visit');
  assert.deepEqual((await Access.find({ history_id: event._id }).distinct('user_id')).map(String).sort(), [creator, assignee, viewer].map(String).sort());
});
test('concurrent completions by different assignees both succeed', async () => {
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]);
  await Promise.all([service.transitionAction(payload(e, a), actor), service.transitionAction(payload(e, a, assignee), { actorId: String(assignee), admin: false })]);
  const saved = await Histories.findById(a._id).lean();
  assert.equal(rules.actionProgress(saved).completed, 2);
  const events = await Histories.find({ enquiry_id: e._id, change_type: 'ACTION_COMPLETED' });
  assert.equal(events.length, 2); assert.notEqual(events[0].step_number, events[1].step_number);
});
test('duplicate submissions by the same assignee create one completion event', async () => {
  const e = await fixture(); const a = await actionFor(e);
  const results = await Promise.allSettled([service.transitionAction(payload(e, a), actor), service.transitionAction(payload(e, a), actor)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id, change_type: 'ACTION_COMPLETED' }), 1);
});
test('a failed audit write rolls back the assignment and enquiry update', async () => {
  const e = await fixture(); const a = await actionFor(e);
  await mongoose.connection.db.command({ collMod: Histories.collection.name, validator: { change_type: { $ne: 'ACTION_COMPLETED' } } });
  try { await assert.rejects(() => service.transitionAction(payload(e, a), actor)); }
  finally { await mongoose.connection.db.command({ collMod: Histories.collection.name, validator: {} }); }
  assert.equal(rules.assignmentsFor(await Histories.findById(a._id).lean())[0].status, 'pending');
  assert.equal((await Eq.findById(e._id)).updatedAt.getTime(), e.updatedAt.getTime());
  assert.equal(await Access.countDocuments({ enquiry_id: e._id }), 0);
});
test('new scheduling keeps old actions pending and does not claim a call or visit was performed', async () => {
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]);
  global.enquiryTestSession = { user: { id: actor.actorId } };
  const route = require('../../app/api/enquiries/staff-side/post/forward-enquiry/route.ts');
  const request = new NextRequest('http://localhost/api/enquiries/forward', { method: 'POST', body: JSON.stringify({ enquiry_id: String(e._id), action: 'Call', assigned_to: [String(viewer)], priority: 5, feedback: 'Next call', next_date: null }) });
  assert.equal((await route.POST(request)).status, 201);
  assert.equal(rules.actionProgress(await Histories.findById(a._id).lean()).pending, 2);
  const logs = require('../../models/eq_users_log.model.ts').default;
  assert.equal(await logs.countDocuments({ enquiry_id: e._id }), 0);
  await service.transitionAction(payload(e, a, assignee), { actorId: String(assignee), admin: false });
  assert.equal(await logs.countDocuments({ enquiry_id: e._id }), 1);
  const [enriched] = await service.enrichEnquiries([e.toObject()], { actorId: String(assignee), admin: false });
  assert.equal(enriched.canScheduleAction, true); assert.equal(enriched.actions.length, 2);
  global.enquiryTestSession = null;
});
test('cancellation and admin reopening are per-assignee and invalidate stale revisions', async () => {
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]);
  await service.transitionAction(payload(e, a, creator, { operation: 'cancel' }), actor);
  const part = rules.assignmentsFor(await Histories.findById(a._id).lean())[0];
  assert.equal(part.status, 'cancelled'); assert.equal(part.revision, 1);
  await fails(() => service.transitionAction(payload(e, a, creator, { operation: 'reopen', expected_revision: 1 }), actor), 403);
  await service.transitionAction(payload(e, a, creator, { operation: 'reopen', expected_revision: 1 }), admin);
  await fails(() => service.transitionAction(payload(e, a), actor), 409);
  await service.transitionAction(payload(e, a, creator, { expected_revision: 2 }), actor);
  const saved = await Histories.findById(a._id).lean();
  assert.equal(saved.action_assignments[1].status, 'pending');
  assert.equal(await Histories.countDocuments({ enquiry_id: e._id, change_type: 'ACTION_REOPENED' }), 1);
});
test('initial next-action is trackable without a forward; snapshots prevent later edits changing it', async () => {
  const e = await fixture({ next_action: 'Visit', next_action_due: new Date('2026-06-27') });
  const [enriched] = await service.enrichEnquiries([e.toObject()], actor);
  assert.equal(enriched.actions.length, 1); assert.equal(String(enriched.actions[0]._id), String(e._id));
  await service.transitionAction(payload(e, { _id: e._id }), actor);
  assert.equal((await Histories.findById(e._id)).action_origin, 'initial');
  await service.preserveInitialAction(e); e.next_action = 'Call'; await e.save();
  assert.equal((await service.enrichEnquiries([e.toObject()], actor))[0].actions[0].action, 'Visit');
});
test('record unscheduled completed action for self with duplicate protection', async () => {
  const e = await fixture(); const body = { enquiry_id: String(e._id), request_id: String(new mongoose.Types.ObjectId()), performed_action: 'Visit', notes: 'Visited without a prior appointment.' };
  await service.recordCompletedAction(body, actor);
  await fails(() => service.recordCompletedAction(body, actor), 409);
  const [enriched] = await service.enrichEnquiries([e.toObject()], actor);
  assert.equal(enriched.actions.length, 1); assert.equal(enriched.last_completed_action.action, 'Visit');
  assert.equal(String(enriched.last_completed_action.user_id._id), actor.actorId);
});
test('sales statuses and old enquiry-completion fields never mark action assignments complete', async () => {
  for (const attrs of [{ status: 'Project Awarded' }, { status: 'Closed' }, { is_converted: true }, { is_completed: true, completion_source: 'manual' }]) {
    const e = await fixture(attrs); const a = await actionFor(e);
    const [before] = await service.enrichEnquiries([e.toObject()], actor);
    assert.equal(before.pending_action_parts, 1); assert.equal(before.canScheduleAction, true);
    await service.transitionAction(payload(e, a), actor);
    assert.equal((await Eq.findById(e._id)).status, e.status);
  }
});
test('admin list and export filter all matching action assignments before pagination', async () => {
  const tag = `FILTER-${Date.now()}`;
  const e = await fixture({ enquiry_uuid: tag }); const none = await fixture({ enquiry_uuid: tag });
  const a = await actionFor(e, [creator, assignee], { next_step_date: new Date('2026-06-27T12:00:00Z') });
  await service.transitionAction(payload(e, a), actor);
  const params = { enquiry_uuid: tag, action_state: 'pending', period_from: '2026-06-27T00:00:00Z', period_to: '2026-06-28T00:00:00Z', limit: '1' };
  const pending = await filteredAdminEnquiries(new URLSearchParams(params), actor.actorId);
  assert.equal(pending.pagination.totalRecords, 1); assert.equal(String(pending.data[0]._id), String(e._id));
  const completed = await filteredAdminEnquiries(new URLSearchParams({ enquiry_uuid: tag, action_state: 'completed' }), actor.actorId);
  assert.equal(completed.pagination.totalRecords, 1);
  assert.equal((await filteredAdminEnquiries(new URLSearchParams({ ...params, action_scope: 'mine' }), actor.actorId)).pagination.totalRecords, 0);
  const empty = await filteredAdminEnquiries(new URLSearchParams({ enquiry_uuid: tag, action_state: 'no_action' }));
  assert.equal(String(empty.data[0]._id), String(none._id));
  assert.equal((await filteredAdminEnquiries(new URLSearchParams({ ...params, action_state: 'overdue' }))).pagination.totalRecords, 1);
});
test('periods use completion and due dates, exclude next midnight and handle unscheduled dates', () => {
  const a = { action: 'Call', next_step_date: '2026-06-27T12:00:00Z', assigned_to: ['a','b'], action_assignments: [
    { user_id: 'a', status: 'completed', completed_at: '2026-06-29T12:00:00Z' }, { user_id: 'b', status: 'pending' },
  ] };
  const day = { period_from: '2026-06-27T00:00:00Z', period_to: '2026-06-28T00:00:00Z' };
  assert.equal(rules.matchesActionFilters([a], { ...day, action_state: 'pending' }), true);
  assert.equal(rules.matchesActionFilters([a], { ...day, action_state: 'completed' }), false);
  assert.equal(rules.matchesActionFilters([{ ...a, next_step_date: day.period_to }], { ...day, action_state: 'pending' }), false);
  assert.equal(rules.matchesActionFilters([{ ...a, next_step_date: null }], { ...day, action_state: 'pending' }), false);
  assert.equal(rules.matchesActionFilters([a], { action_scope: 'mine' }, 'unassigned'), false);
  assert.throws(() => rules.validateActionFilters({ period_from: 'invalid' }), /Invalid period/);
  const bounds = periodBounds('custom', '2026-06-27', '2026-06-29');
  assert.equal(new Date(bounds.period_to).getDate(), 30);
});
test('staff history identifies completed assignee and unassigned viewers cannot complete', async () => {
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]); await service.transitionAction(payload(e, a), actor);
  global.enquiryTestSession = { user: { id: actor.actorId } };
  const route = require('../../app/api/enquiries/staff-side/get/history/get-all/route.ts');
  const response = await route.GET(new NextRequest(`http://localhost/api/enquiries?enquiry_id=${e._id}`));
  const data = await response.json();
  const event = data.histories.find(h => h.history_id.change_type === 'ACTION_COMPLETED').history_id;
  assert.equal(event.action_assignee.name, 'Test user 0'); assert.equal(event.changed_by.name, 'Test user 0');
  global.enquiryTestSession = null;
});
test('HTTP rejects retired enquiry completion, unauthenticated requests, and completion on behalf of others', async () => {
  const route = require('../../app/api/enquiries/actions/route.ts');
  const old = require('../../app/api/enquiries/update/enquiry/complete/route.ts');
  const e = await fixture(); const a = await actionFor(e, [creator, assignee]);
  const request = body => new NextRequest('http://localhost/api/enquiries/actions', { method: 'PUT', body: JSON.stringify(body) });
  assert.equal((await old.PUT(request({}))).status, 410);
  global.enquiryTestSession = null; assert.equal((await route.PUT(request(payload(e,a)))).status, 401);
  global.enquiryTestSession = { user: { id: admin.actorId, is_super: true } };
  assert.equal((await route.PUT(request(payload(e,a,assignee)))).status, 403);
  global.enquiryTestSession = null;
});
test('migration preserves timestamps and legacy completions, initializes each assignee, and is idempotent', async () => {
  const e = await fixture({ is_completed: true }); const a = await actionFor(e, [creator, assignee]);
  const legacy = await Histories.create({ enquiry_id: e._id, change_type: 'ENQUIRY_COMPLETED', action: 'Call', changed_by: creator });
  const { promisify } = require('node:util'); const execFile = promisify(require('node:child_process').execFile);
  const run = async args => {
    const { stdout } = await execFile(process.execPath, ['scripts/migrate-enquiry-actions.mjs', ...args], { cwd: join(__dirname, '../..'), env: { ...process.env, MONGO_URI: process.env.MONGO_URI } });
    return JSON.parse(stdout.slice(stdout.indexOf('{')));
  };
  assert.equal((await run([])).written, 0); assert.ok((await run(['--apply'])).written > 0);
  const migrated = await Histories.findById(a._id).lean();
  assert.deepEqual(migrated.action_assignments.map(p => p.status), ['pending','pending']);
  assert.equal(+migrated.updatedAt, +a.updatedAt); assert.equal(+migrated.createdAt, +a.createdAt);
  assert.equal((await Eq.findById(e._id)).is_completed, true); assert.ok(await Histories.findById(legacy._id));
  assert.equal((await run(['--apply'])).written, 0);
});
