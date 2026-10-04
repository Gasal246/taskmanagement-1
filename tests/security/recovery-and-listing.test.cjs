require('../enquiries/register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { compare } = require('bcrypt-ts');

let mail;
const originalLoad = Module._load;
Module._load = function(request, parent, ...rest) {
  if (request === 'next-auth') return { __esModule: true, default: () => ({}) };
  if (request === 'next-auth/providers/credentials') return { __esModule: true, default: options => options };
  if (request === '@/lib/pusher/server') return { getPusherInstance: () => ({ authorizeChannel: (socket, channel) => ({ auth: `test:${socket}:${channel}` }) }) };
  if (request === '@/lib/nodemailer') return { transporter: { sendMail: async message => { mail = message; } } };
  return originalLoad.call(this, request, parent, ...rest);
};
const Users = require('../../models/users.model.ts').default;
const Resets = require('../../models/password_reset.model.ts').default;
const RateLimits = require('../../models/auth_rate_limit.model.ts').default;
const Enquiries = require('../../models/eq_enquiries.model.ts').default;
const Histories = require('../../models/eq_enquiry_histories.ts').default;
const Camps = require('../../models/eq_camps.model.ts').default;
const { issuePasswordReset, completePasswordReset, verifyPasswordReset, resetTokenHash } = require('../../lib/password-reset.ts');
const { actionFilterStages } = require('../../lib/enquiries/action-filter-pipeline.ts');
const { matchesActionFilters } = require('../../lib/enquiries/completion.ts');
const { actionsForEnquiries } = require('../../lib/enquiries/completion-server.ts');
const { filteredAdminEnquiries } = require('../../lib/enquiries/admin-list.ts');
const { allowAuthAttempt } = require('../../lib/auth-rate-limit.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
before(async () => {
  if (!uri) return;
  await mongoose.connect(uri, { dbName: `security_tests_${randomUUID().replaceAll('-', '')}` });
  await Promise.all([Users.init(), Resets.init(), RateLimits.init(), Enquiries.init(), Histories.init(), Camps.init()]);
});
after(async () => {
  if (!uri) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);


async function grantBusinessAdmin(userId, businessId) {
  const Roles = require('../../models/roles.model.ts').default;
  const UserRoles = require('../../models/user_roles.model.ts').default;
  const role = await Roles.findOneAndUpdate({ role_name: 'BUSINESS_ADMIN' }, { $setOnInsert: { role_name: 'BUSINESS_ADMIN' } }, { upsert: true, new: true });
  await UserRoles.updateOne({ user_id: userId, role_id: role._id, business_id: businessId }, { $set: { status: 1 } }, { upsert: true });
}

mongoTest('reset rejects missing proof, wrong account, expired tokens and replay; secrets stay out of user reads', async () => {
  const email = 'reset-test@example.com';
  const user = await Users.create({ email, name: 'Recovery', password: 'old-hash' });
  const token = 'a'.repeat(64);
  await Resets.create({ user_id: user._id, token_hash: resetTokenHash(token), kind: 'link', expires_at: new Date(Date.now() + 60_000) });
  assert.equal((await completePasswordReset({ email, password: 'new-password' })).status, 400);
  assert.equal((await completePasswordReset({ email: 'another@example.com', token, password: 'new-password' })).status, 400);
  assert.equal((await completePasswordReset({ email, token: 'b'.repeat(64), password: 'new-password' })).status, 400);
  const response = await completePasswordReset({ email, token, password: 'new-password' });
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()).sort(), ['message', 'status']);
  const secured = await Users.findById(user._id).select('+password +session_version').lean();
  assert.equal(await compare('new-password', secured.password), true);
  assert.equal(secured.session_version, 1);
  const publicUser = await Users.findById(user._id).lean();
  assert.equal(publicUser.password, undefined);
  assert.equal(publicUser.otp, undefined);
  assert.equal(publicUser.session_version, undefined);
  assert.equal((await completePasswordReset({ email, token, password: 'another-password' })).status, 400);
  await Resets.create({ user_id: user._id, token_hash: resetTokenHash(token), kind: 'link', expires_at: new Date(Date.now() - 1_000) });
  assert.equal((await completePasswordReset({ email, token, password: 'another-password' })).status, 400);
});

mongoTest('OTP verification issues a strong grant and enforces attempts; blocked accounts cannot reset', async () => {
  const user = await Users.create({ email: 'otp-test@example.com', status: 1 });
  assert.equal((await issuePasswordReset(user.email, 'otp')).status, 200);
  const code = mail.text.match(/code is (\d{6})/)[1];
  const stored = await Resets.findOne({ user_id: user._id }).select('+token_hash').lean();
  assert.notEqual(stored.token_hash, code);
  assert.equal((await completePasswordReset({ email: user.email, token: code, password: 'new-password' })).status, 400);
  const verification = await verifyPasswordReset(user.email, code);
  assert.equal(verification.status, 200);
  const { resetToken } = await verification.json();
  assert.match(resetToken, /^[a-f0-9]{64}$/);
  assert.equal((await verifyPasswordReset(user.email, code)).status, 400);
  await Users.updateOne({ _id: user._id }, { status: 0 });
  assert.equal((await completePasswordReset({ email: user.email, token: resetToken, password: 'new-password' })).status, 400);
  const other = await Users.create({ email: 'attempts@example.com' });
  await Resets.create({ user_id: other._id, token_hash: resetTokenHash('123456'), kind: 'otp', expires_at: new Date(Date.now() + 60_000) });
  for (let i = 0; i < 5; i++) assert.equal((await verifyPasswordReset(other.email, '654321')).status, 400);
  assert.equal((await verifyPasswordReset(other.email, '123456')).status, 400);
});

mongoTest('concurrent reset attempts consume one token exactly once', async () => {
  const user = await Users.create({ email: 'race@example.com' });
  const token = 'c'.repeat(64);
  await Resets.create({ user_id: user._id, token_hash: resetTokenHash(token), kind: 'link', expires_at: new Date(Date.now() + 60_000) });
  const responses = await Promise.all([1, 2].map(() => completePasswordReset({ email: user.email, token, password: 'new-password' })));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
});

mongoTest('shared rate limits remain bounded under concurrent callers', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => allowAuthAttempt('concurrent-rate-test', 5, 60_000)));
  assert.equal(results.filter(Boolean).length, 5);
});

mongoTest('database action filtering preserves canonical assignment, initial-action and period semantics', async () => {
  const actor = await Users.create({ email: 'actor@example.com' });
  const other = await Users.create({ email: 'other@example.com' });
  const now = new Date('2026-10-01T12:00:00Z');
  const beforeDate = new Date('2026-09-29T10:00:00Z');
  const later = new Date('2026-10-03T10:00:00Z');
  const entries = await Enquiries.create([
    { createdBy: actor._id, next_action: 'Call', next_action_due: beforeDate },
    { createdBy: other._id, next_action: 'Visit', next_action_due: later },
    { createdBy: actor._id }, { createdBy: other._id }, { createdBy: actor._id, next_action: 'Call' },
  ]);
  await Histories.create([
    { enquiry_id: entries[0]._id, action: 'Call', action_origin: 'initial', change_type: 'ACTION_SCHEDULED', assigned_to: [actor._id], next_step_date: beforeDate, action_assignments: [{ user_id: actor._id, status: 'completed', completed_at: beforeDate }] },
    { enquiry_id: entries[2]._id, action: 'Visit', change_type: 'FORWARD', assigned_to: [actor._id, other._id], next_step_date: beforeDate, action_assignments: [{ user_id: actor._id, status: 'cancelled', cancelled_at: beforeDate }, { user_id: other._id, status: 'pending' }] },
    { enquiry_id: entries[3]._id, action: 'Call', change_type: 'FORWARD', assigned_to: [], next_step_date: later },
  ]);
  const plain = entries.map(entry => entry.toObject());
  const actions = await actionsForEnquiries(plain);
  for (const action_state of ['all', 'pending', 'completed', 'cancelled', 'overdue', 'no_action']) {
    for (const action_scope of ['all', 'mine']) for (const next_action of ['all', 'Call', 'Visit']) for (const period of [false, true]) {
      const params = { action_state, action_scope, next_action, ...(period ? { period_from: '2026-09-29T00:00:00Z', period_to: '2026-10-02T00:00:00Z' } : {}) };
      const expected = plain.filter(entry => matchesActionFilters(actions.filter(action => String(action.enquiry_id) === String(entry._id)), params, String(actor._id), now)).map(entry => String(entry._id)).sort();
      const actual = await Enquiries.aggregate([{ $match: { _id: { $in: entries.map(entry => entry._id) } } }, ...actionFilterStages(params, String(actor._id), now)]);
      assert.deepEqual(actual.map(entry => String(entry._id)).sort(), expected, JSON.stringify(params));
    }
  }
});

mongoTest('approval filtering finds matches beyond the first page and preserves full badge counts', async () => {
  const user = await Users.create({ email: 'list-owner@example.com' });
  for (let i = 0; i < 25; i++) await Enquiries.create({ createdBy: user._id, is_active: i < 22, enquiry_uuid: `approval-${i}`, createdAt: new Date(2026, 8, i + 1) });
  const params = new URLSearchParams({ created_by: String(user._id), is_active: 'false', page: '1', limit: '2' });
  const first = await filteredAdminEnquiries(params, String(user._id));
  assert.equal(first.data.length, 2);
  assert.equal(first.pagination.totalRecords, 3);
  assert.deepEqual(first.badges, { all: 25, waitingApproval: 3 });
  params.set('page', '2');
  const second = await filteredAdminEnquiries(params, String(user._id));
  assert.equal(second.data.length, 1);
  assert.ok(!first.data.some(entry => String(entry._id) === String(second.data[0]._id)));
});

mongoTest('organization mutations require persisted scope and reject forged hints; historical IDs and multipart bodies still work', async () => {
  const { authorizeOrganizationMutation, authorizeOrganizationRead } = require('../../lib/organization-access.ts');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Regions = require('../../models/business_regions.model.ts').default;
  const Departments = require('../../models/business_departments.model.ts').default;
  const DepRegions = require('../../models/department_regions.model.ts').default;
  const DepHeads = require('../../models/region_dep_heads.model.ts').default;
  const RegionDeps = require('../../models/region_departments.model.ts').default;
  const [owned, other] = await Business.create([{ business_name: 'Owned' }, { business_name: 'Other' }]);
  const admin = await Users.create({ email: 'scope-admin@example.com' });
  const staff = await Users.create({ email: 'scope-staff@example.com' });
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await Staff.create({ user_id: staff._id, business_id: owned._id });
  const foreignRegion = await Regions.create({ business_id: other._id });
  const region = await Regions.create({ business_id: owned._id });
  const department = await Departments.create({ business_id: owned._id });
  const depRegion = await DepRegions.create({ department_id: department._id, business_region_id: region._id });
  const regDep = await RegionDeps.create({ region_id: region._id });
  const head = await DepHeads.create({ reg_dep_id: regDep._id, user_id: staff._id });
  const request = body => new Request('http://localhost/api/business/regions/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  global.enquiryTestSession = null;
  assert.equal((await authorizeOrganizationMutation(request({ business_id: owned._id }))).status, 401);
  global.enquiryTestSession = { user: { id: String(staff._id) } };
  assert.equal((await authorizeOrganizationMutation(request({ business_id: owned._id }))).status, 403);
  assert.equal(await authorizeOrganizationRead(new Request(`http://localhost/api/business/regions/get-complete?region_id=${region._id}`)), null);
  assert.equal((await authorizeOrganizationRead(new Request(`http://localhost/api/business/regions/get-complete?region_id=${foreignRegion._id}`))).status, 403);
  assert.equal((await authorizeOrganizationRead(new Request(`http://localhost/api/business/regions/get/areas?region_ids=${region._id},${foreignRegion._id}`))).status, 403);
  assert.equal((await authorizeOrganizationRead(new Request('http://localhost/api/business/regions/get/areas?region_ids=invalid'))).status, 400);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  assert.equal(await authorizeOrganizationMutation(request({ business_id: owned._id, user_id: staff._id })), null);
  assert.equal((await authorizeOrganizationMutation(request({ business_id: owned._id, region_id: foreignRegion._id }))).status, 403);
  assert.equal(await authorizeOrganizationMutation(request({ DepRegionId: depRegion._id })), null);
  assert.equal(await authorizeOrganizationMutation(new Request(`http://localhost/api/business/regions/remove/department/head?head_id=${head._id}`, { method: 'DELETE' })), null);
  const multipart = new FormData(); multipart.set('body', JSON.stringify({ business_id: String(owned._id) }));
  const formRequest = new Request('http://localhost/api/business/clients/add', { method: 'POST', body: multipart });
  assert.equal(await authorizeOrganizationMutation(formRequest), null);
  assert.equal(JSON.parse((await formRequest.formData()).get('body')).business_id, String(owned._id));
  await Admins.create({ user_id: admin._id, business_id: other._id });
  assert.equal((await authorizeOrganizationMutation(request({ business_id: owned._id, region_id: foreignRegion._id }))).status, 403);
  await Admins.updateMany({ user_id: admin._id }, { status: 0 });
  assert.equal((await authorizeOrganizationMutation(request({ business_id: owned._id }))).status, 403);
});

mongoTest('transactional enquiry counters seed from legacy suffixes and remain unique with concurrent transactions', async () => {
  const { reserveEnquiryUuid } = require('../../lib/enquiries/sequence.ts');
  const Counter = require('../../models/enquiry_counter.model.ts').default;
  await Counter.init();
  const now = new Date('2026-10-01T12:00:00Z');
  const { formatEnquiryUuid } = require('../../lib/enquiries/enquiry-uuid.ts');
  await Enquiries.create({ enquiry_uuid: formatEnquiryUuid('TEST', 'it', now, 10) });
  async function create(prefix) {
    const session = await mongoose.startSession();
    let uuid;
    try {
      await session.withTransaction(async () => {
        uuid = await reserveEnquiryUuid(prefix, 'it', now, session);
        await Enquiries.create([{ enquiry_uuid: uuid }], { session });
      });
      return uuid;
    } finally { await session.endSession(); }
  }
  assert.equal(await create('TEST'), formatEnquiryUuid('TEST', 'it', now, 11));
  const results = await Promise.all(Array.from({ length: 10 }, () => create('TEST')));
  assert.equal(new Set(results).size, 10);
  const initialRace = await Promise.all(Array.from({ length: 5 }, () => create('NEW')));
  assert.equal(new Set(initialRace).size, 5);
});

mongoTest('profile password changes retain hidden-hash verification, validate length and invalidate previous sessions', async () => {
  const { hash } = require('bcrypt-ts');
  const { PUT } = require('../../app/api/users/update/staff-profile/route.ts');
  const user = await Users.create({ email: 'change-password@example.com', password: await hash('previous-password', 10) });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const request = (old_password, new_password) => new Request('http://localhost/api/users/update/staff-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_password: true, old_password, new_password }) });
  assert.equal((await PUT(request('wrong-password', 'updated-password'))).status, 401);
  assert.equal((await PUT(request('previous-password', 'short'))).status, 400);
  assert.equal((await PUT(request('previous-password', '🦄'.repeat(25)))).status, 400);
  assert.equal((await PUT(request('previous-password', 'updated-password'))).status, 201);
  const updated = await Users.findById(user._id).select('+password +session_version').lean();
  assert.equal(updated.session_version, 1);
  assert.equal(await compare('updated-password', updated.password), true);
  assert.equal((await PUT(request('previous-password', 'second-password'))).status, 401);
});

mongoTest('business summary excludes expensive plan/docs reads and rejects unrelated users', async () => {
  const { NextRequest } = require('next/server');
  const { GET } = require('../../app/api/business/get-id/[id]/route.ts');
  const Business = require('../../models/business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Plans = require('../../models/business_assigned_plan.model.ts').default;
  const Docs = require('../../models/business_docs.model.ts').default;
  const business = await Business.create({ business_name: 'Summary test' });
  const user = await Users.create({ email: 'summary-member@example.com' });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const req = () => new NextRequest(`http://localhost/api/business/get-id/${business._id}?summary=true`);
  const context = { params: Promise.resolve({ id: String(business._id) }) };
  assert.equal((await GET(req(), context)).status, 403);
  await Staff.create({ user_id: user._id, business_id: business._id });
  const originalPlan = Plans.findOne, originalDocs = Docs.find;
  Plans.findOne = () => { throw new Error('Summary must not read plans'); };
  Docs.find = () => { throw new Error('Summary must not read documents'); };
  try {
    const response = await GET(req(), context);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.info.business_name, 'Summary test');
    assert.equal(body.data.plan, undefined);
    assert.equal(body.data.docs, undefined);
  } finally { Plans.findOne = originalPlan; Docs.find = originalDocs; }
});

mongoTest('calendar includes modern pending assignments and legacy initial actions, excludes completed parts and applies exact bounds', async () => {
  const { NextRequest } = require('next/server');
  const { GET } = require('../../app/api/calendar/feed/route.ts');
  const Business = require('../../models/business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const business = await Business.create({ business_name: 'Calendar fixture' });
  const user = await Users.create({ email: 'calendar-member@example.com' });
  await Staff.create({ user_id: user._id, business_id: business._id });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const begin = new Date('2026-10-01T00:00:00Z'), due = new Date('2026-10-02T00:00:00Z');
  const [legacy, modern, done] = await Enquiries.create([
    { createdBy: user._id, next_action: 'Visit', next_action_due: due, createdAt: begin },
    { createdBy: user._id, enquiry_uuid: 'calendar-modern', createdAt: begin },
    { createdBy: user._id, enquiry_uuid: 'calendar-done', createdAt: begin },
  ]);
  const [pending, completed] = await Histories.create([
    { enquiry_id: modern._id, action: 'Call', change_type: 'ACTION_SCHEDULED', assigned_to: [user._id], next_step_date: due, createdAt: begin, action_assignments: [{ user_id: user._id, status: 'pending' }] },
    { enquiry_id: done._id, action: 'Visit', change_type: 'FORWARD', assigned_to: [user._id], next_step_date: due, createdAt: begin, action_assignments: [{ user_id: user._id, status: 'completed', completed_at: due }] },
  ]);
  const response = await GET(new NextRequest('http://localhost/api/calendar/feed?includeTasks=false&includeCustomEvents=false&start_date=2026-10-01T00%3A00%3A00Z&end_date=2026-10-07T23%3A59%3A59Z'));
  assert.equal(response.status, 200, await response.clone().text());
  const { items } = await response.json();
  assert.equal(items.some(item => item.historyId === String(pending._id)), true);
  assert.equal(items.some(item => item.sourceId === String(legacy._id)), true);
  assert.equal(items.some(item => item.historyId === String(completed._id)), false);
  assert.equal((await GET(new NextRequest('http://localhost/api/calendar/feed?start_date=2026-01-01&end_date=2026-12-31'))).status, 400);
});

mongoTest('concurrent conversion creates one project and atomically records its enquiry reference; retries return that project', async () => {
  // Catalogue fixture affects only classification reads; transaction and access checks use real MongoDB.
  require('../enquiries/catalogue-fixture.cjs').installCatalogueFixture();
  const { POST } = require('../../app/api/enquiries/post/enquiry/convert-to-project/route.ts');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Projects = require('../../models/business_project.model.ts').default;
  await Projects.init();
  const business = await Business.create({ business_name: 'Conversion fixture' });
  const user = await Users.create({ email: 'conversion-admin@example.com' });
  const camp = await Camps.create({ camp_name: 'Conversion camp', project_sector: 'WFA', facility_type: 'WFA-01' });
  const enquiry = await Enquiries.create({ business_id: business._id, createdBy: user._id, camp_id: camp._id, enquiry_uuid: 'conversion-fixture', is_active: true, priority: '8' });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const body = { enquiry_id: String(enquiry._id), business_id: String(business._id), type: 'it', start_date: '2026-10-02T12:00:00Z' };
  const request = data => new Request('http://localhost/api/enquiries/post/enquiry/convert-to-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  assert.equal((await POST(request(body))).status, 403);
  await Admins.create({ user_id: user._id, business_id: business._id });
  await grantBusinessAdmin(user._id, business._id);
  assert.equal((await POST(request({ ...body, type: 'invalid-type' }))).status, 400);
  const responses = await Promise.all([POST(request(body)), POST(request(body))]);
  const values = await Promise.all(responses.map(response => response.json()));
  assert.deepEqual(responses.map(response => response.status), [200, 200], JSON.stringify(values));
  assert.equal(values[0].project_id, values[1].project_id);
  assert.equal(await Projects.countDocuments({ enquiry_id: enquiry._id }), 1);
  const updated = await Enquiries.findById(enquiry._id).lean();
  assert.equal(updated.is_converted, true);
  assert.equal(updated.status, 'Closed');
  assert.equal(String(updated.converted_project_id), values[0].project_id);
  const project = await Projects.findById(values[0].project_id).lean();
  assert.equal(project.priority, 'high');
  assert.equal(project.facility_type, camp.facility_type);
  const retry = await POST(request(body));
  assert.equal((await retry.json()).project_id, values[0].project_id);
});

mongoTest('task search applies authorized task scope first and never exposes hidden activity matches', async () => {
  const { taskActivityFilterStages } = require('../../lib/tasks/filter-pipeline.ts');
  const Tasks = require('../../models/business_tasks.model.ts').default;
  const Activities = require('../../models/task_activities.model.ts').default;
  const userId = new mongoose.Types.ObjectId(), otherId = new mongoose.Types.ObjectId();
  const businessId = new mongoose.Types.ObjectId(), foreignId = new mongoose.Types.ObjectId();
  const [named, ownActivity, hiddenActivity, foreign, direct] = await Tasks.create([
    { task_name: 'literal [needle]', business_id: businessId, creator: userId },
    { task_name: 'Own activity', business_id: businessId, creator: userId },
    { task_name: 'Hidden activity', business_id: businessId, creator: otherId },
    { task_name: 'Foreign', business_id: foreignId, creator: otherId },
    { task_name: 'Direct', business_id: businessId, creator: otherId, assigned_to: userId },
  ]);
  await Activities.create([
    { task_id: ownActivity._id, activity: 'literal [needle]', assigned_to: userId },
    { task_id: hiddenActivity._id, activity: 'literal [needle]', assigned_to: otherId },
    { task_id: foreign._id, activity: 'literal [needle]', assigned_to: userId },
  ]);
  const regex = /\[needle\]/i;
  const admin = await Tasks.aggregate([{ $match: { business_id: businessId } }, ...taskActivityFilterStages(regex, null)]);
  assert.deepEqual(admin.map(row => String(row._id)).sort(), [named, ownActivity, hiddenActivity].map(row => String(row._id)).sort());
  const staff = await Tasks.aggregate([{ $match: { business_id: businessId } }, ...taskActivityFilterStages(regex, null, { assigned_to: userId })]);
  assert.deepEqual(staff.map(row => String(row._id)).sort(), [named, ownActivity].map(row => String(row._id)).sort());
  const assignee = await Tasks.aggregate([{ $match: { business_id: businessId } }, ...taskActivityFilterStages(null, userId)]);
  assert.deepEqual(assignee.map(row => String(row._id)).sort(), [ownActivity, direct].map(row => String(row._id)).sort());
  await Users.create({ _id: userId, email: 'task-filter-user@example.com' });
  await Tasks.updateMany({ _id: { $in: [named, ownActivity, hiddenActivity, foreign, direct].map(row => row._id) } }, { is_project_task: false });
  global.enquiryTestSession = { user: { id: String(userId) } };
  const { NextRequest } = require('next/server');
  const { GET: staffGet } = require('../../app/api/task/staff-task/get-filtered/route.ts');
  const staffResponse = await staffGet(new NextRequest('http://localhost/api/task/staff-task/get-filtered?taskType=all&nameQuery=Own%20activity'));
  assert.equal(staffResponse.status, 200, await staffResponse.clone().text());
  const staffData = await staffResponse.json();
  assert.deepEqual(staffData.data.map(row => row._id), [String(ownActivity._id)]);
  const { GET: adminGet } = require('../../app/api/task/admin-task/get-filtered/route.ts');
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  await Admins.create({ user_id: userId, business_id: businessId });
  const adminResponse = await adminGet(new NextRequest(`http://localhost/api/task/admin-task/get-filtered?business_id=${businessId}&nameQuery=%5Bneedle%5D`));
  assert.equal(adminResponse.status, 200, await adminResponse.clone().text());
  const adminData = await adminResponse.json();
  assert.equal(adminData.pagination.total, 3);
  assert.equal(adminData.data.find(row => row._id === String(ownActivity._id)).match.nameMatched, true);

});

mongoTest('realtime authentication validates fields and denies other users and unauthorized project channels', async () => {
  const { POST } = require('../../app/api/pusher/auth/route.ts');
  const user = await Users.create({ email: 'realtime-member@example.com' });
  const other = new mongoose.Types.ObjectId();
  const request = (channel, socket = '123.456') => new Request('http://localhost/api/pusher/auth', { method: 'POST', body: new URLSearchParams({ channel_name: channel, socket_id: socket }) });
  global.enquiryTestSession = null;
  assert.equal((await POST(request(`private-user-${user._id}`))).status, 401);
  global.enquiryTestSession = { user: { id: String(user._id) } };
  assert.equal((await POST(request(`private-user-${user._id}`))).status, 200);
  assert.equal((await POST(request(`private-user-${other}`))).status, 403);
  assert.equal((await POST(request(`private-project-${other}`))).status, 403);
  assert.equal((await POST(request(`private-user-${user._id}`, 'invalid'))).status, 400);
  assert.equal((await POST(request('unknown-channel'))).status, 403);
});

mongoTest('nested user aggregation lookups exclude password, legacy OTP and session metadata', async () => {
  const { NextRequest } = require('next/server');
  const { GET } = require('../../app/api/business/regions/get-complete/route.ts');
  const Regions = require('../../models/business_regions.model.ts').default;
  const Heads = require('../../models/region_heads.model.ts').default;
  const user = await Users.create({ email: 'credential-projection-member@example.com', password: 'must-remain-secret', otp: '123456', session_version: 5 });
  const businessId = new mongoose.Types.ObjectId();
  const Staff = require('../../models/business_staffs.model.ts').default;
  await Staff.create({ user_id: user._id, business_id: businessId });
  const region = await Regions.create({ business_id: businessId, region_name: 'Credential projection' });
  await Heads.create({ region_id: region._id, user_id: user._id });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const response = await GET(new NextRequest(`http://localhost/api/business/regions/get-complete?region_id=${region._id}&mode=section&section=heads`));
  assert.equal(response.status, 200);
  const serialized = await response.text();
  assert.match(serialized, /credential-projection-member/);
  assert.doesNotMatch(serialized, /must-remain-secret|"password"|"otp"|"session_version"/);
});

mongoTest('index rollout reuses model declarations, preserves unrelated indexes and does not rewrite records', async () => {
  const { promisify } = require('node:util');
  const { execFile } = require('node:child_process');
  const exec = promisify(execFile);
  await Users.collection.createIndex({ name: 1 }, { name: 'test_custom_preserved' });
  const user = await Users.findOne({ email: 'reset-test@example.com' }).lean();
  const databaseUri = new URL(uri); databaseUri.pathname = `/${mongoose.connection.name}`;
  const result = await exec(process.execPath, ['scripts/create-performance-indexes.mjs', '--apply'], { cwd: require('node:path').resolve(__dirname, '../..'), env: { ...process.env, MONGO_URI: databaseUri.toString() } });
  assert.match(result.stdout, /Ensured declared indexes/);
  assert.equal((await Users.collection.indexes()).some(index => index.name === 'test_custom_preserved'), true);
  assert.equal((await Resets.collection.indexes()).some(index => index.expireAfterSeconds === 0), true);
  assert.deepEqual(await Users.findById(user._id).lean(), user);
});

mongoTest('authentication activity timestamps are written by server events rather than client page lifecycle', async () => {
  const { recordAuthActivity } = require('../../lib/auth-activity.ts');
  const { POST } = require('../../app/api/users/activity/route.ts');
  const user = await Users.create({ email: 'auth-activity@example.com' });
  await recordAuthActivity(String(user._id), false, 'login');
  const loggedIn = await Users.findById(user._id).lean();
  assert.ok(loggedIn.last_login instanceof Date);
  assert.equal(loggedIn.last_logout, null);
  const legacyRequest = new Request('http://localhost/api/users/activity', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
  assert.equal((await POST(legacyRequest)).status, 410);
  assert.equal((await Users.findById(user._id).lean()).last_logout, null);
  await recordAuthActivity(String(user._id), false, 'logout');
  assert.ok((await Users.findById(user._id).lean()).last_logout instanceof Date);
  await recordAuthActivity(String(user._id), true, 'login');
  assert.deepEqual((await Users.findById(user._id).lean()).last_login, loggedIn.last_login);
});

test('spreadsheet dependency preserves enquiry and history export round trips', () => {
  const XLSX = require('xlsx');
  const rows = [{ Enquiry: 'UAE-WFA-01102026-1', 'Action notes': 'Call completed', Priority: 8, Client: 'خطط' }];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Enquiries');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const reopened = XLSX.read(buffer, { type: 'buffer' });
  assert.deepEqual(XLSX.utils.sheet_to_json(reopened.Sheets.Enquiries), rows);
});

test('updated mailer composes the recovery mail format without external delivery', async () => {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const response = await transport.sendMail({ from: 'taskmanager@example.com', to: 'recovery@example.com', subject: 'Password recovery', text: 'Your password recovery code is 123456. It expires in 10 minutes.' });
  assert.match(response.message.toString(), /123456/);
  assert.match(response.message.toString(), /recovery@example.com/);
});

mongoTest('credentials and JWT callbacks reject blocked, deleted and password-revoked sessions; session responses contain no secrets', async () => {
  const { authConfig } = require('../../auth.ts');
  const { hash } = require('bcrypt-ts');
  const user = await Users.create({ email: 'session-member@example.com', password: await hash('safe-password', 10) });
  const provider = authConfig.providers[0];
  const credentials = { email: ' SESSION-MEMBER@example.com ', password: 'safe-password', isSuper: 'false' };
  assert.equal(await provider.authorize({ ...credentials, password: 'wrong-password' }), null);
  const authorized = await provider.authorize(credentials);
  assert.equal(String(authorized._id), String(user._id));
  const token = await authConfig.callbacks.jwt({ token: {}, user: authorized });
  assert.equal(token.user.userid, String(user._id));
  const session = await authConfig.callbacks.session({ session: { user: {} }, token });
  assert.equal(session.user.id, String(user._id));
  assert.equal(session.user.password, undefined);
  assert.equal(session.user.session_version, undefined);
  assert.ok(await authConfig.callbacks.jwt({ token, user: null }));
  await Users.updateOne({ _id: user._id }, { $inc: { session_version: 1 } });
  assert.equal(await authConfig.callbacks.jwt({ token, user: null }), null);
  const refreshed = await Users.findById(user._id).select('+session_version');
  const currentToken = await authConfig.callbacks.jwt({ token: {}, user: refreshed });
  await Users.updateOne({ _id: user._id }, { status: 0 });
  assert.equal(await authConfig.callbacks.jwt({ token: currentToken, user: null }), null);
  assert.equal(await provider.authorize(credentials), null);
  await Users.deleteOne({ _id: user._id });
  assert.equal(await authConfig.callbacks.jwt({ token: currentToken, user: null }), null);
});

mongoTest('staff assignments enforce persisted resource ownership and preserve legitimate multipart updates', async () => {
  const { POST: addArea } = require('../../app/api/users/area/add/route.ts');
  const { POST: removeArea } = require('../../app/api/users/area/remove/route.ts');
  const { authorizeOrganizationMutation } = require('../../lib/organization-access.ts');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Areas = require('../../models/business_areas.model.ts').default;
  const UserAreas = require('../../models/user_areas.model.ts').default;
  const RegionDepartments = require('../../models/region_departments.model.ts').default;
  const Regions = require('../../models/business_regions.model.ts').default;
  const DepartmentStaff = require('../../models/department_staffs.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Assignment owned' }, { business_name: 'Assignment foreign' }]);
  const [admin, coworker, outsider] = await Users.create([{ email: 'assignment-admin@example.com' }, { email: 'assignment-staff@example.com' }, { email: 'assignment-outsider@example.com' }]);
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await Staff.create({ user_id: coworker._id, business_id: owned._id });
  await Staff.create({ user_id: outsider._id, business_id: foreign._id });
  const [area, foreignArea] = await Areas.create([{ business_id: owned._id }, { business_id: foreign._id }]);
  const formRequest = (userId, areaId) => {
    const form = new FormData(); form.set('body', JSON.stringify({ user_id: String(userId), area_id: String(areaId) }));
    return new Request('http://localhost/api/users/area/add', { method: 'POST', body: form });
  };
  const removeRequest = id => new Request('http://localhost/api/users/area/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ UAreaId: String(id) }) });
  global.enquiryTestSession = { user: { id: String(coworker._id) } };
  assert.equal((await addArea(formRequest(coworker._id, area._id))).status, 403);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  assert.equal((await addArea(formRequest(outsider._id, area._id))).status, 403);
  assert.equal((await addArea(formRequest(coworker._id, foreignArea._id))).status, 403);
  assert.equal((await addArea(formRequest(coworker._id, area._id))).status, 200);
  const assignment = await UserAreas.findOne({ user_id: coworker._id, area_id: area._id });
  const foreignAssignment = await UserAreas.create({ user_id: outsider._id, area_id: foreignArea._id });
  assert.equal((await removeArea(removeRequest(foreignAssignment._id))).status, 403);
  assert.equal((await removeArea(removeRequest(assignment._id))).status, 200);
  assert.equal((await UserAreas.findById(assignment._id)).status, 0);
  assert.equal((await UserAreas.findById(foreignAssignment._id)).status, 1);
  const [region, foreignRegion] = await Regions.create([{ business_id: owned._id }, { business_id: foreign._id }]);
  const [department, foreignDepartment] = await RegionDepartments.create([{ region_id: region._id }, { region_id: foreignRegion._id }]);
  const [legacy, foreignLegacy] = await DepartmentStaff.create([{ dep_id: department._id, staff_id: coworker._id }, { dep_id: foreignDepartment._id, staff_id: outsider._id }]);
  const departmentRequest = id => new Request('http://localhost/api/users/department/permanent-remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentId: String(id), assignmentModel: 'dep_staffs' }) });
  assert.equal(await authorizeOrganizationMutation(departmentRequest(legacy._id)), null);
  assert.equal((await authorizeOrganizationMutation(departmentRequest(foreignLegacy._id))).status, 403);
});

mongoTest('personal records and documents require self or a persisted manager, including business agents', async () => {
  const { POST: addDocument } = require('../../app/api/users/docs/add/route.ts');
  const { POST: removeDocument } = require('../../app/api/users/docs/remove/route.ts');
  const { GET: getUser } = require('../../app/api/users/get-user/id/[id]/route.ts');
  const { POST: getMeta } = require('../../app/api/users/get-user/id-with-meta/route.ts');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Roles = require('../../models/roles.model.ts').default;
  const UserRoles = require('../../models/user_roles.model.ts').default;
  const Docs = require('../../models/user_docs.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Docs owned' }, { business_name: 'Docs foreign' }]);
  const [admin, staff, agent, otherAgent] = await Users.create([{ email: 'docs-manager@example.com' }, { email: 'docs-staff@example.com' }, { email: 'docs-agent@example.com' }, { email: 'docs-other-agent@example.com' }]);
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await Staff.create({ user_id: staff._id, business_id: owned._id });
  const agentRole = await Roles.findOneAndUpdate({ role_name: 'AGENT' }, { $setOnInsert: { role_name: 'AGENT' } }, { upsert: true, new: true });
  await UserRoles.create([{ user_id: agent._id, role_id: agentRole._id, business_id: owned._id }, { user_id: otherAgent._id, role_id: agentRole._id, business_id: foreign._id }]);
  const documentRequest = userId => {
    const form = new FormData(); form.set('body', JSON.stringify({ user_id: String(userId), doc_name: 'contract', doc_url: 'https://example.com/contract.pdf' }));
    return new Request('http://localhost/api/users/docs/add', { method: 'POST', body: form });
  };
  const jsonRequest = body => new Request('http://localhost/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const params = id => ({ params: Promise.resolve({ id: String(id) }) });
  global.enquiryTestSession = { user: { id: String(staff._id) } };
  assert.equal((await addDocument(documentRequest(agent._id))).status, 403);
  assert.equal((await getUser(new Request('http://localhost'), params(agent._id))).status, 403);
  assert.equal((await getMeta(jsonRequest({ user_id: String(agent._id) }))).status, 403);
  assert.equal((await addDocument(documentRequest(staff._id))).status, 200);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  assert.equal((await addDocument(documentRequest(agent._id))).status, 200);
  assert.equal((await getUser(new Request('http://localhost'), params(agent._id))).status, 200);
  assert.equal((await addDocument(documentRequest(otherAgent._id))).status, 403);
  const ownAgentDoc = await Docs.findOne({ user_id: agent._id });
  const otherDoc = await Docs.create({ user_id: otherAgent._id, doc_name: 'contract' });
  assert.equal((await removeDocument(jsonRequest({ UDocId: String(otherDoc._id) }))).status, 403);
  assert.equal((await removeDocument(jsonRequest({ UDocId: String(ownAgentDoc._id) }))).status, 200);
  assert.ok(await Docs.findById(otherDoc._id));
});

mongoTest('enquiry reads and mutations enforce owning business while explicit sharing stays read-only', async () => {
  const access = require('../../lib/enquiries/access.ts');
  const { GET: getComments } = require('../../app/api/enquiries/comments/get/route.ts');
  const { POST: addComment } = require('../../app/api/enquiries/comments/add/route.ts');
  const { GET: getHistory } = require('../../app/api/enquiries/get/enquiries/history/by-id/route.ts');
  const { DELETE: deleteEnquiry } = require('../../app/api/enquiries/delete/enquiry/route.ts');
  const { GET: list } = require('../../app/api/enquiries/get/enquiries/filtered/route.ts');
  const { POST: exportEnquiries } = require('../../app/api/enquiries/get/enquiries/export/route.ts');
  const { NextRequest } = require('next/server');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Sharing = require('../../models/eq_enquiry_access.model.ts').default;
  const Comments = require('../../models/eq_enquiry_comments.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Private owned' }, { business_name: 'Private foreign' }]);
  const [admin, other, reader] = await Users.create([{ email: 'private-admin@example.com' }, { email: 'private-owner@example.com' }, { email: 'private-reader@example.com' }]);
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await grantBusinessAdmin(admin._id, owned._id);
  const [mine, theirs] = await Enquiries.create([{ business_id: owned._id, createdBy: other._id, enquiry_uuid: 'private-owned', is_active: true }, { business_id: foreign._id, createdBy: other._id, enquiry_uuid: 'private-foreign', comments: 'Private legacy comment', is_active: true }]);
  const history = await Histories.create({ enquiry_id: theirs._id, change_type: 'FORWARD', action: 'Visit', assigned_to: [other._id] });
  const get = id => new NextRequest(`http://localhost/api/enquiries/comments/get?enquiry_id=${id}`);
  const post = body => new NextRequest('http://localhost/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  global.enquiryTestSession = null;
  assert.equal((await getComments(get(theirs._id))).status, 401);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  const actor = await access.enquiryActor();
  assert.equal(access.canAdministerEnquiry(mine, actor), true);
  assert.equal(access.canAdministerEnquiry(theirs, actor), false);
  assert.equal((await getComments(get(theirs._id))).status, 403);
  assert.equal(await Comments.countDocuments({ enquiry_id: theirs._id }), 0, 'forbidden GET must not migrate legacy comments');
  assert.equal((await addComment(post({ enquiry_id: String(theirs._id), comment: 'forbidden write' }))).status, 403);
  assert.equal((await getHistory(new NextRequest(`http://localhost/api/enquiries/get/enquiries/history/by-id?history_id=${history._id}`))).status, 403);
  assert.equal((await deleteEnquiry(new NextRequest(`http://localhost/api/enquiries/delete/enquiry?enquiry_id=${theirs._id}`, { method: 'DELETE' }))).status, 403);
  const listed = await list(new NextRequest('http://localhost/api/enquiries/get/enquiries/filtered?enquiry_uuid=private-'));
  assert.equal(listed.status, 200);
  assert.deepEqual((await listed.json()).data.map(row => row._id), [String(mine._id)]);
  assert.equal((await exportEnquiries(post({ enquiry_ids: [String(mine._id), String(theirs._id)] }))).status, 403);
  await Sharing.create({ enquiry_id: theirs._id, user_id: reader._id });
  global.enquiryTestSession = { user: { id: String(reader._id) } };
  assert.equal((await getComments(get(theirs._id))).status, 200);
  assert.equal((await addComment(post({ enquiry_id: String(theirs._id), comment: 'shared reader comment' }))).status, 201);
  const sharedActor = await access.enquiryActor();
  assert.equal(await access.canEditEnquiry(theirs, sharedActor), false);
  assert.equal(await access.canScheduleAction(theirs, sharedActor), false);
  await Sharing.create({ enquiry_id: theirs._id, user_id: admin._id });
  assert.equal(await access.canReadEnquiry(theirs, actor), true);
  assert.equal(access.canAdministerEnquiry(theirs, actor), false);
  assert.equal(await access.canScheduleAction(theirs, actor), false);
  await Histories.create({ enquiry_id: theirs._id, change_type: 'FORWARD', action: 'Call', assigned_to: [reader._id] });
  assert.equal(await access.canScheduleAction(theirs, sharedActor), true);
  await Admins.updateOne({ user_id: admin._id, business_id: owned._id }, { $set: { status: 0 } });
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  assert.equal(access.canAdministerEnquiry(mine, await access.enquiryActor()), false);
});

mongoTest('foreign admins cannot approve, match, accept edits, convert or reopen another business enquiry', async () => {
  const { PUT: approve } = require('../../app/api/enquiries/update/activate-camp/route.ts');
  const { PUT: match } = require('../../app/api/enquiries/update/assign-camp-to-enquiry/route.ts');
  const { PUT: accept } = require('../../app/api/enquiries/update/enquiry/accept-edits/route.ts');
  const { POST: convert } = require('../../app/api/enquiries/post/enquiry/convert-to-project/route.ts');
  const { transitionAction } = require('../../lib/enquiries/completion-server.ts');
  const { enquiryActor } = require('../../lib/enquiries/access.ts');
  const { NextRequest } = require('next/server');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Action owned' }, { business_name: 'Action foreign' }]);
  const admin = await Users.create({ email: 'action-foreign-admin@example.com' });
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await grantBusinessAdmin(admin._id, owned._id);
  const camp = await Camps.create({ camp_name: 'Unapproved private facility' });
  const enquiry = await Enquiries.create({ business_id: foreign._id, camp_id: camp._id, is_active: false });
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  const request = (body, method = 'PUT') => new NextRequest('http://localhost/api/enquiries', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const ids = { enquiry_id: String(enquiry._id), camp_id: String(camp._id) };
  assert.equal((await approve(request(ids))).status, 403);
  assert.equal((await match(request(ids))).status, 403);
  assert.equal((await accept(request(ids))).status, 403);
  assert.equal((await convert(request({ ...ids, business_id: String(owned._id), type: 'it', start_date: '2026-10-02T12:00:00Z' }, 'POST'))).status, 403);
  const action = await Histories.create({ enquiry_id: enquiry._id, change_type: 'FORWARD', action: 'Call', assigned_to: [admin._id], action_assignments: [{ user_id: admin._id, status: 'cancelled', revision: 1 }] });
  await assert.rejects(() => transitionAction({ enquiry_id: String(enquiry._id), action_id: String(action._id), operation: 'reopen', expected_revision: 1, notes: 'forged admin', assignee_id: String(admin._id) }, awaitActor()), error => error.status === 403);
  function awaitActor() { return { actorId: String(admin._id), admin: true, adminBusinessIds: [String(owned._id)] }; }
  assert.equal((await Enquiries.findById(enquiry._id)).is_active, false);
  assert.equal((await Camps.findById(camp._id)).is_active, false);
});

mongoTest('dashboard and profile verify all twelve role assignments and reject forged or inactive selections', async () => {
  const { GET: dashboard } = require('../../app/api/users/get-user/all-details/route.ts');
  const { GET: profile } = require('../../app/api/users/get/staff/get-profile/route.ts');
  const { resolveDashboardScope } = require('../../lib/dashboard-access.ts');
  const { NextRequest } = require('next/server');
  const Business = require('../../models/business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Roles = require('../../models/roles.model.ts').default;
  const UserRoles = require('../../models/user_roles.model.ts').default;
  const Regions = require('../../models/business_regions.model.ts').default;
  const Areas = require('../../models/business_areas.model.ts').default;
  const Locations = require('../../models/business_locations.model.ts').default;
  const business = await Business.create({ business_name: 'Dashboard secured' });
  const user = await Users.create({ email: 'dashboard-role@example.com' });
  const membership = await Staff.create({ user_id: user._id, business_id: business._id });
  const region = await Regions.create({ business_id: business._id, region_name: 'Assigned region' });
  const area = await Areas.create({ business_id: business._id, region_id: region._id, area_name: 'Assigned area' });
  const location = await Locations.create({ business_id: business._id, region_id: region._id, area_id: area._id, location_name: 'Assigned location' });
  const deps = await Promise.all(['region', 'area', 'location'].map(level => require(`../../models/${level}_departments.model.ts`).default.create({ region_id: region._id, area_id: area._id, location_id: location._id, type: 'sales', dep_name: level })));
  const cases = [
    ['REGION_HEAD', 'region_heads', 'user_id', 'region_id', region], ['REGION_STAFF', 'region_staffs', 'staff_id', 'region_id', region],
    ['AREA_HEAD', 'area_heads', 'user_id', 'area_id', area], ['AREA_STAFF', 'area_staffs', 'staff_id', 'area_id', area],
    ['LOCATION_HEAD', 'location_heads', 'user_id', 'location_id', location], ['LOCATION_STAFF', 'location_staffs', 'user_id', 'location_id', location],
    ['REGION_DEP_HEAD', 'region_dep_heads', 'user_id', 'reg_dep_id', deps[0]], ['REGION_DEP_STAFF', 'region_dep_staffs', 'user_id', 'region_dep_id', deps[0]],
    ['AREA_DEP_HEAD', 'area_dep_heads', 'user_id', 'area_dep_id', deps[1]], ['AREA_DEP_STAFF', 'area_dep_staffs', 'user_id', 'area_dep_id', deps[1]],
    ['LOCATION_DEP_HEAD', 'location_dep_heads', 'user_id', 'location_dep_id', deps[2]], ['LOCATION_DEP_STAFF', 'location_dep_staffs', 'user_id', 'location_dep_id', deps[2]],
  ];
  global.enquiryTestSession = { user: { id: String(user._id) } };
  for (const [name, modelFile, userField, parentField, org] of cases) {
    const role = await Roles.findOneAndUpdate({ role_name: name }, { $setOnInsert: { role_name: name } }, { upsert: true, new: true });
    const request = () => new NextRequest(`http://localhost/api/users/get-user/all-details?role_id=${role._id}&org_id=${org._id}`);
    assert.equal((await dashboard(request())).status, 403, `unassigned ${name}`);
    const userRole = await UserRoles.create({ user_id: user._id, role_id: role._id, business_id: business._id });
    const model = require(`../../models/${modelFile}.model.ts`).default;
    const assignment = await model.create({ [userField]: user._id, [parentField]: org._id, status: 1 });
    assert.equal((await dashboard(request())).status, 200, name);
    assert.equal((await profile(request())).status, 200, name);
    await model.updateOne({ _id: assignment._id }, { $set: { status: 0 } });
    assert.equal((await dashboard(request())).status, 403, `inactive assignment ${name}`);
    await model.updateOne({ _id: assignment._id }, { $set: { status: 1 } });
    await UserRoles.updateOne({ _id: userRole._id }, { $set: { status: 0 } });
    assert.equal((await profile(request())).status, 403, `inactive role ${name}`);
  }
  assert.equal((await dashboard(new NextRequest('http://localhost/api/users/get-user/all-details?role_id=invalid&org_id=invalid'))).status, 400);
  const regionRole = await Roles.findOne({ role_name: 'REGION_HEAD' });
  await UserRoles.updateMany({ user_id: user._id, role_id: regionRole._id }, { $set: { status: 1 } });
  await Business.updateOne({ _id: business._id }, { $set: { status: 0 } });
  await assert.rejects(() => resolveDashboardScope(String(user._id), String(regionRole._id), String(region._id)), error => error.status === 403);
  await Business.updateOne({ _id: business._id }, { $set: { status: 1 } });
  await Staff.updateOne({ _id: membership._id }, { $set: { status: 0 } });
  await assert.rejects(() => resolveDashboardScope(String(user._id), String(regionRole._id), String(region._id)), error => error.status === 403);
});

mongoTest('ownership migration requires reviewed mappings, preserves pinned ownership and is repeatable', async () => {
  const { ownershipReport, applyOwnershipMapping } = await import('../../scripts/migrate-enquiry-ownership.mjs');
  const Business = require('../../models/business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Migration owned' }, { business_name: 'Migration foreign' }]);
  const user = await Users.create({ email: 'migration-owner@example.com' });
  await Staff.create([{ user_id: user._id, business_id: owned._id }, { user_id: user._id, business_id: foreign._id }]);
  const legacy = await Enquiries.create({ createdBy: user._id, enquiry_uuid: 'review-owner', comments: 'Keep this content' });
  const pinned = await Enquiries.create({ business_id: owned._id, createdBy: user._id });
  const db = mongoose.connection.db;
  const report = await ownershipReport(db);
  const row = report.records.find(entry => entry.enquiry_id === String(legacy._id));
  assert.equal(row.requires_review, true);
  assert.equal(row.suggested_business_id, null);
  assert.equal(row.candidate_business_ids.length, 2);
  assert.equal((await Enquiries.findById(legacy._id)).business_id, undefined);
  await assert.rejects(() => applyOwnershipMapping(db, { [pinned._id]: String(foreign._id), [legacy._id]: String(owned._id) }), /different ownership/);
  assert.equal((await Enquiries.findById(legacy._id)).business_id, undefined);
  assert.equal((await applyOwnershipMapping(db, { [legacy._id]: String(owned._id) })).modified, 1);
  assert.equal((await applyOwnershipMapping(db, { [legacy._id]: String(owned._id) })).modified, 0);
  assert.equal((await Enquiries.findById(legacy._id)).comments, 'Keep this content');
  await Enquiries.updateOne({ _id: legacy._id }, { $set: { business_id: foreign._id } });
  assert.equal(String((await Enquiries.findById(legacy._id)).business_id), String(owned._id), 'API model cannot reassign pinned ownership');
});

mongoTest('facility reads hide private enquiry contacts, counts honor sharing and cascade deletes cannot cross businesses', async () => {
  const { PUT: approveCamp } = require('../../app/api/enquiries/update/activate-camp/route.ts');
  const { PUT: edit } = require('../../app/api/enquiries/update/enquiry/route.ts');
  const { PUT: requestEdit } = require('../../app/api/enquiries/agent-side/update/enquiry/route.ts');
  const { PUT: matchCamp } = require('../../app/api/enquiries/update/assign-camp-to-enquiry/route.ts');
  const { GET: getCamp } = require('../../app/api/enquiries/get/camps/by-id/route.ts');
  const { DELETE: deleteCamp } = require('../../app/api/enquiries/delete/camp/route.ts');
  const { DELETE: deleteArea } = require('../../app/api/enquiries/delete/area/route.ts');
  const { countReadableEnquiries, enquiryActor, authorizeCampMutation } = require('../../lib/enquiries/access.ts');
  const { NextRequest } = require('next/server');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Contacts = require('../../models/eq_camp_contacts.model.ts').default;
  const Sharing = require('../../models/eq_enquiry_access.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Facility owned' }, { business_name: 'Facility foreign' }]);
  const [admin, outsider] = await Users.create([{ email: 'facility-manager@example.com' }, { email: 'facility-outsider@example.com' }]);
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await grantBusinessAdmin(admin._id, owned._id);
  const camp = await Camps.create({ camp_name: 'Shared catalogue facility', business_id: owned._id });
  const [mine, theirs] = await Enquiries.create([{ business_id: owned._id, camp_id: camp._id }, { business_id: foreign._id, camp_id: camp._id, createdBy: outsider._id }]);
  const [common, ownContact, privateContact] = await Contacts.create([{ camp_id: camp._id, contact_name: 'Common directory' }, { camp_id: camp._id, enquiry_id: mine._id, contact_name: 'Owned enquiry' }, { camp_id: camp._id, enquiry_id: theirs._id, contact_name: 'Foreign private enquiry' }]);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  const read = await getCamp(new NextRequest(`http://localhost/api/enquiries/get/camps/by-id?camp_id=${camp._id}`));
  assert.equal(read.status, 200);
  assert.deepEqual((await read.json()).contacts.map(row => row._id).sort(), [String(common._id), String(ownContact._id)].sort());
  assert.equal(await countReadableEnquiries({ camp_id: String(camp._id) }, await enquiryActor()), 1);
  assert.equal((await authorizeCampMutation(String(camp._id))).status, 403);
  assert.equal((await deleteCamp(new NextRequest(`http://localhost/api/enquiries/delete/camp?camp_id=${camp._id}`, { method: 'DELETE' }))).status, 403);
  assert.equal((await deleteArea(new NextRequest(`http://localhost/api/enquiries/delete/area?area_id=${new mongoose.Types.ObjectId()}`, { method: 'DELETE' }))).status, 403);
  assert.ok(await Enquiries.findById(theirs._id));
  assert.ok(await Contacts.findById(privateContact._id));
  await Sharing.create({ enquiry_id: theirs._id, user_id: admin._id });
  assert.equal(await countReadableEnquiries({ camp_id: String(camp._id) }, await enquiryActor()), 2);
  assert.equal((await authorizeCampMutation(String(camp._id))).status, 403, 'sharing does not grant facility administration');
  const write = body => new NextRequest('http://localhost/api/enquiries', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = { enquiry_id: String(mine._id), camp_id: String(camp._id) };
  assert.equal((await approveCamp(write(payload))).status, 403, 'own enquiry cannot approve a facility used by another business');
  assert.equal((await edit(write(payload))).status, 403);
  assert.equal((await requestEdit(write(payload))).status, 403);
  assert.equal((await Camps.findById(camp._id)).is_active, false);
  assert.equal(await Histories.countDocuments({ enquiry_id: mine._id }), 0, 'denied edits have no history side effects');
  const selected = await Camps.create({ camp_name: 'Match target', is_active: true });
  assert.equal((await matchCamp(write({ enquiry_id: String(mine._id), camp_id: String(selected._id) }))).status, 200);
  assert.ok(await Camps.findById(camp._id), 'matching an owned duplicate preserves the shared facility');
  assert.ok(await Enquiries.findById(theirs._id));
  assert.ok(await Contacts.findById(privateContact._id));
  assert.equal(await Enquiries.findById(mine._id), null);
});

mongoTest('creation business selection is persisted, explicit and never inferred from a forged cookie', async () => {
  const { enquiryActor, resolveEnquiryCreationBusiness } = require('../../lib/enquiries/access.ts');
  const Business = require('../../models/business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const UserRoles = require('../../models/user_roles.model.ts').default;
  const [owned, second, foreign] = await Business.create([{ business_name: 'Create own' }, { business_name: 'Create second' }, { business_name: 'Create foreign' }]);
  const user = await Users.create({ email: 'creation-context@example.com' });
  await Staff.create({ user_id: user._id, business_id: owned._id });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  let actor = await enquiryActor();
  assert.equal(await resolveEnquiryCreationBusiness(new Request('http://localhost'), actor), String(owned._id));
  const cookie = business => new Request('http://localhost', { headers: { Cookie: `user_domain=${encodeURIComponent(JSON.stringify({ business_id: String(business) }))}` } });
  assert.equal(await resolveEnquiryCreationBusiness(cookie(foreign._id), actor), null);
  await Staff.create({ user_id: user._id, business_id: second._id });
  assert.equal(await resolveEnquiryCreationBusiness(new Request('http://localhost'), actor), null);
  assert.equal(await resolveEnquiryCreationBusiness(cookie(second._id), actor), String(second._id));
  await Admins.create({ user_id: user._id, business_id: owned._id });
  await grantBusinessAdmin(user._id, owned._id);
  actor = await enquiryActor();
  assert.equal(actor.admin, true);
  await UserRoles.updateMany({ user_id: user._id }, { $set: { status: 0 } });
  assert.equal((await enquiryActor()).admin, false, 'revoked role must not inherit a stale admin assignment');
});

mongoTest('agent administration cannot delete or block another business account; shared identities survive scoped removal', async () => {
  const { DELETE: remove } = require('../../app/api/enquiries/agents/delete/route.ts');
  const { PUT: status } = require('../../app/api/enquiries/update/agents/activate-deactivate/route.ts');
  const { NextRequest } = require('next/server');
  const Business = require('../../models/business.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Roles = require('../../models/roles.model.ts').default;
  const UserRoles = require('../../models/user_roles.model.ts').default;
  const [owned, foreign] = await Business.create([{ business_name: 'Agent own' }, { business_name: 'Agent foreign' }]);
  const [admin, agent, other, shared] = await Users.create([{ email: 'agent-manager@example.com' }, { email: 'agent-only-owned@example.com' }, { email: 'agent-only-foreign@example.com' }, { email: 'agent-multiple-businesses@example.com' }]);
  await Admins.create({ user_id: admin._id, business_id: owned._id });
  await grantBusinessAdmin(admin._id, owned._id);
  const role = await Roles.findOneAndUpdate({ role_name: 'AGENT' }, { $setOnInsert: { role_name: 'AGENT' } }, { upsert: true, new: true });
  await UserRoles.create([{ user_id: agent._id, role_id: role._id, business_id: owned._id }, { user_id: other._id, role_id: role._id, business_id: foreign._id }, { user_id: shared._id, role_id: role._id, business_id: owned._id }, { user_id: shared._id, role_id: role._id, business_id: foreign._id }]);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  const request = (id, method, key = 'user_id') => new NextRequest(`http://localhost/api/enquiries?${key}=${id}&business_id=${owned._id}`, { method });
  assert.equal((await remove(request(other._id, 'DELETE', 'agent_id'))).status, 403);
  assert.equal((await status(request(other._id, 'PUT'))).status, 403);
  assert.equal((await status(request(shared._id, 'PUT'))).status, 403);
  assert.equal((await status(request(agent._id, 'PUT'))).status, 200);
  assert.equal((await Users.findById(agent._id)).status, 0);
  assert.equal((await status(request(agent._id, 'PUT'))).status, 200, 'same owning admin can reactivate an inactive agent');
  assert.equal((await Users.findById(agent._id).select('+session_version')).session_version, 2);
  assert.equal((await remove(request(shared._id, 'DELETE', 'agent_id'))).status, 200);
  assert.ok(await Users.findById(shared._id));
  assert.equal(await UserRoles.countDocuments({ user_id: shared._id, business_id: owned._id }), 0);
  assert.equal(await UserRoles.countDocuments({ user_id: shared._id, business_id: foreign._id }), 1);
  assert.ok(await Users.findById(other._id));
});

mongoTest('enquiry creation persists verified ownership on the enquiry and requested facility and area', async () => {
  require('../enquiries/catalogue-fixture.cjs').installCatalogueFixture();
  const { POST: create } = require('../../app/api/enquiries/agent-side/post/add-new-enquiry/route.ts');
  const { PUT: approveArea } = require('../../app/api/enquiries/update/area/route.ts');
  const Business = require('../../models/business.model.ts').default;
  const Staff = require('../../models/business_staffs.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const Areas = require('../../models/eq_area.model.ts').default;
  const { NextRequest } = require('next/server');
  const [owned, foreign] = await Business.create([{ business_name: 'Persisted create owner' }, { business_name: 'Rejected create owner' }]);
  const [user, admin, foreignAdmin] = await Users.create([{ email: 'persist-enquiry-owner@example.com' }, { email: 'approve-area-own@example.com' }, { email: 'approve-area-foreign@example.com' }]);
  await Staff.create({ user_id: user._id, business_id: owned._id });
  await Admins.create([{ user_id: admin._id, business_id: owned._id }, { user_id: foreignAdmin._id, business_id: foreign._id }]);
  await grantBusinessAdmin(admin._id, owned._id);
  await grantBusinessAdmin(foreignAdmin._id, foreign._id);
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const request = (body, method = 'POST') => new NextRequest('http://localhost/api/enquiries', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const body = { business_id: String(owned._id), area_input_mode: 'new', camp_input_mode: 'new', area_name_request: 'Pending private area', camp_name_request: 'Pending private facility', country: String(new mongoose.Types.ObjectId()), region: String(new mongoose.Types.ObjectId()), project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: [], commercial_model: 'To Be Determined', followup_status: 'Lead Received' };
  const denied = await create(request({ ...body, business_id: String(foreign._id) }));
  assert.equal(denied.status, 403, await denied.clone().text());
  assert.equal(await Enquiries.countDocuments({ createdBy: user._id }), 0);
  const result = await create(request(body));
  assert.equal(result.status, 201, await result.clone().text());
  const data = await result.json();
  const enquiry = await Enquiries.findById(data.enquiry_id);
  assert.equal(String(enquiry.business_id), String(owned._id));
  assert.equal(String((await Camps.findById(enquiry.camp_id)).business_id), String(owned._id));
  assert.equal(String((await Areas.findById(enquiry.area_id)).business_id), String(owned._id));
  global.enquiryTestSession = { user: { id: String(foreignAdmin._id) } };
  assert.equal((await approveArea(request({ area_id: String(enquiry.area_id), area_name: 'forbidden area edit' }, 'PUT'))).status, 403);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  assert.equal((await approveArea(request({ area_id: String(enquiry.area_id), area_name: 'Approved owned area' }, 'PUT'))).status, 200);
  assert.equal((await Areas.findById(enquiry.area_id)).area_name, 'Approved owned area');
  const { PUT: edit } = require('../../app/api/enquiries/update/enquiry/route.ts');
  const { PUT: approveCamp } = require('../../app/api/enquiries/update/activate-camp/route.ts');
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const edited = await edit(request({ ...body, enquiry_id: String(enquiry._id), area_input_mode: 'existing', camp_input_mode: 'existing', area: String(enquiry.area_id), camp: String(enquiry.camp_id) }, 'PUT'));
  assert.equal(edited.status, 200, await edited.clone().text());
  assert.equal((await Enquiries.findById(enquiry._id)).is_active, false, 'editing a pending enquiry cannot approve it');
  assert.equal((await approveCamp(request({ enquiry_id: String(enquiry._id), camp_id: String(enquiry.camp_id) }, 'PUT'))).status, 403);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  const approved = await approveCamp(request({ enquiry_id: String(enquiry._id), camp_id: String(enquiry.camp_id) }, 'PUT'));
  assert.equal(approved.status, 200, await approved.clone().text());
  assert.equal((await Enquiries.findById(enquiry._id)).is_active, true);
});
