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
const service = require('../../lib/enquiries/head-office-requests.ts');
const routes = require('../../app/api/enquiries/head-office-requests/route.ts');
const Eq = require('../../models/eq_enquiries.model.ts').default;
const Camps = require('../../models/eq_camps.model.ts').default;
const Offices = require('../../models/eq_camp_headoffice.model.ts').default;
const Requests = require('../../models/eq_head_office_request.model.ts').default;
const Users = require('../../models/users.model.ts').default;
const Business = require('../../models/business.model.ts').default;
const Staff = require('../../models/business_staffs.model.ts').default;
let mongoProcess, directory;
const oid = () => new mongoose.Types.ObjectId();
const creator = oid(), assignee = oid(), viewer = oid();
const admin = { actorId: String(oid()), admin: true, isSuper: true };
const actor = { actorId: String(creator), admin: false };
const delay = ms => new Promise(r => setTimeout(r, ms));
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'head-office-test-'));
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
  await Requests.createIndexes();
  await Users.collection.insertMany([creator, assignee, viewer, new mongoose.Types.ObjectId(admin.actorId)].map((_id, i) => ({ _id, name: `Test user ${i}`, email: `enquiry-test-${i}@example.invalid`, status: 1 })));
});
after(async () => {
  await mongoose.disconnect();
  if (mongoProcess && mongoProcess.exitCode === null) {
    await new Promise(resolve => { mongoProcess.once('exit', resolve); mongoProcess.kill('SIGTERM'); });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const business = await Business.create({ business_name: 'Office test', status: 1 });
  await Staff.create({ business_id: business._id, user_id: creator, status: 1 });
  const office = await Offices.create({ business_id: business._id, address: 'Original', phone: '100' });
  const camp = await Camps.create({ business_id: business._id, camp_name: 'Facility A', headoffice_id: office._id, is_active: true });
  const enquiry = await Eq.create({ business_id: business._id, camp_id: camp._id, createdBy: creator, is_active: true });
  return { business, office, camp, enquiry };
}
const proposed = { address: 'Proposed', phone: '200', geo_location: 'City', other_details: 'Notes' };
async function submit(f, values = {}) {
  return service.submitOfficeRequest(actor, String(f.business._id), { operation: 'edit', office_id: f.office._id, proposed, camp_ids: [f.camp._id], enquiry_id: f.enquiry._id, ...values });
}
async function review(request, values = {}, who = admin) {
  return mongoose.connection.transaction(session => service.reviewOfficeRequest(who, String(request._id), { decision: 'approve', revision: request.revision, resolution: 'shared', ...values }, session));
}
const fails = (fn, status) => assert.rejects(fn, err => err.status === status);

test('staff proposals never modify approved office or facility; shared approval changes all linked views', async () => {
  const f = await fixture(); const second = await Camps.create({ business_id: f.business._id, camp_name: 'Facility B', headoffice_id: f.office._id });
  const request = await submit(f);
  assert.equal((await Offices.findById(f.office._id)).address, 'Original');
  assert.equal(String((await Camps.findById(f.camp._id)).headoffice_id), String(f.office._id));
  await review(request);
  assert.equal((await Offices.findById(f.office._id)).address, 'Proposed');
  assert.equal(String((await Camps.findById(second._id)).headoffice_id), String(f.office._id));
  assert.equal((await Requests.findById(request._id)).status, 'approved');
  await fails(() => review(request), 409);
});
test('separate approval preserves the other facilities and original office', async () => {
  const f = await fixture(); const second = await Camps.create({ business_id: f.business._id, headoffice_id: f.office._id });
  await review(await submit(f), { resolution: 'separate' });
  const updated = await Camps.findById(f.camp._id);
  assert.notEqual(String(updated.headoffice_id), String(f.office._id));
  assert.equal((await Offices.findById(updated.headoffice_id)).address, 'Proposed');
  assert.equal((await Offices.findById(f.office._id)).address, 'Original');
  assert.equal(String((await Camps.findById(second._id)).headoffice_id), String(f.office._id));
});
test('new office can be matched to an approved office without creating duplicates', async () => {
  const f = await fixture(); const target = await Offices.create({ business_id: f.business._id, address: 'Existing' });
  const request = await submit(f, { operation: 'create' }); const count = await Offices.countDocuments();
  await review(request, { match_office_id: String(target._id) });
  assert.equal(await Offices.countDocuments(), count);
  assert.equal(String((await Camps.findById(f.camp._id)).headoffice_id), String(target._id));
});
test('link and removal both require review; removal retains office record', async () => {
  const f = await fixture(); const target = await Offices.create({ business_id: f.business._id, address: 'Existing' });
  const request = await submit(f, { operation: 'link', selected_office_id: target._id });
  assert.equal(String((await Camps.findById(f.camp._id)).headoffice_id), String(f.office._id));
  await review(request);
  const remove = await submit(f, { operation: 'remove' }); await review(remove);
  assert.equal((await Camps.findById(f.camp._id)).headoffice_id, null);
  assert.ok(await Offices.findById(target._id));
});
test('rejection requires a reason and preserves approved values', async () => {
  const f = await fixture(); const request = await submit(f);
  await fails(() => review(request, { decision: 'reject', note: '' }), 400);
  await review(request, { decision: 'reject', note: 'Please verify the contact' });
  assert.equal((await Offices.findById(f.office._id)).address, 'Original');
  assert.equal((await Requests.findById(request._id)).review_note, 'Please verify the contact');
});
test('revision keeps history, prevents stale approvals and cannot be hijacked by another staff', async () => {
  const f = await fixture(); const request = await submit(f);
  await fails(() => submit(f), 409);
  await fails(() => service.submitOfficeRequest({ ...actor, actorId: String(viewer) }, String(f.business._id), { operation: 'edit', office_id: f.office._id, proposed, enquiry_id: f.enquiry._id, camp_ids: [f.camp._id], request_id: request._id, revision: 1 }), 409);
  const revised = await submit(f, { request_id: request._id, revision: 1, proposed: { ...proposed, address: 'Revised' } });
  assert.equal(revised.revision, 2); assert.equal(revised.revisions.length, 1);
  await fails(() => review(request), 409); await review(revised);
  assert.equal((await Offices.findById(f.office._id)).address, 'Revised');
});
test('changed approved details or facility links prevent stale approval', async () => {
  const f = await fixture(); const request = await submit(f);
  await Offices.updateOne({ _id: f.office._id }, { address: 'Someone changed this' });
  await fails(() => review(request), 409);
  assert.equal((await Requests.findById(request._id)).status, 'pending');
  const f2 = await fixture(); const r2 = await submit(f2, { operation: 'create' });
  await Camps.updateOne({ _id: f2.camp._id }, { headoffice_id: null });
  await fails(() => review(r2), 409);
});
test('business boundaries apply to targets, offices, shared offices and reviewers', async () => {
  const f = await fixture(), foreign = await fixture();
  await fails(() => submit(f, { selected_office_id: foreign.office._id, operation: 'link' }), 403);
  await fails(() => submit(f, { camp_ids: [foreign.camp._id] }), 403);
  const request = await submit(f);
  await fails(() => review(request, {}, { actorId: String(viewer), admin: true, adminBusinessIds: [String(foreign.business._id)] }), 403);
  await fails(() => review(request, {}, actor), 403);
  await Camps.create({ business_id: foreign.business._id, headoffice_id: f.office._id });
  await fails(() => review(request), 403);
});
test('legacy office with unambiguous facility ownership remains usable without migration', async () => {
  const f = await fixture(); await Offices.updateOne({ _id: f.office._id }, { $unset: { business_id: 1 } });
  assert.ok(await service.officeInBusiness(f.office._id, String(f.business._id)));
  await review(await submit(f)); assert.equal((await Offices.findById(f.office._id)).address, 'Proposed');
});
test('API withdrawal is owner-only and cannot withdraw an already decided request', async () => {
  const f = await fixture(); const request = await submit(f);
  const payload = { request_id: String(request._id), revision: 1, decision: 'withdraw' };
  const call = () => routes.PATCH(new NextRequest('http://local/api/enquiries/head-office-requests', { method: 'PATCH', body: JSON.stringify(payload) }));
  global.enquiryTestSession = { user: { id: String(viewer) } }; assert.equal((await call()).status, 409);
  global.enquiryTestSession = { user: { id: String(creator) } }; assert.equal((await call()).status, 200);
  assert.equal((await Requests.findById(request._id)).status, 'withdrawn');
  assert.equal((await call()).status, 409);
});
test('standalone staff create route saves a request, not an office or live link', async () => {
  const f = await fixture(); global.enquiryTestSession = { user: { id: String(creator) } };
  const route = require('../../app/api/enquiries/staff-side/post/add-head-office/route.ts');
  const count = await Offices.countDocuments();
  const response = await route.POST(new NextRequest('http://local/api/enquiries/staff-side/post/add-head-office', { method: 'POST', body: JSON.stringify({ business_id: String(f.business._id), ...proposed, camp_ids: [String(f.camp._id)] }) }));
  assert.equal(response.status, 201, JSON.stringify(await response.json()));
  assert.equal(await Offices.countDocuments(), count);
  assert.equal(String((await Camps.findById(f.camp._id)).headoffice_id), String(f.office._id));
});
test('staff cannot bypass requests through admin head office update route', async () => {
  const f = await fixture(); global.enquiryTestSession = { user: { id: String(creator) } };
  const route = require('../../app/api/enquiries/update/head-office/route.ts');
  const response = await route.PUT(new NextRequest('http://local/api/enquiries/update/head-office', { method: 'PUT', body: JSON.stringify({ business_id: String(f.business._id), head_office_id: String(f.office._id), address: 'Bypass' }) }));
  assert.equal(response.status, 403); assert.equal((await Offices.findById(f.office._id)).address, 'Original');
});
test('unchanged legacy form fields do not create approval requests', async () => {
  const f = await fixture(); const input = service.enquiryOfficeInput({ head_office_address: 'Original', head_office_contact: '100' }, f.camp, f.office);
  assert.equal(input, null);
  assert.equal(service.enquiryOfficeInput({ head_office_request: { operation: 'keep' }, head_office_address: 'Old snapshot' }, f.camp, f.office), null);
});
test('concurrent duplicate request submissions produce only one pending request', async () => {
  const f = await fixture(); const results = await Promise.allSettled([submit(f), submit(f)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(await Requests.countDocuments({ enquiry_id: f.enquiry._id, status: 'pending' }), 1);
});
test('combined approval rolls back head office changes when facility validation fails', async () => {
  const f = await fixture(); const request = await submit(f, { operation: 'create' });
  await Eq.updateOne({ _id: f.enquiry._id }, { is_active: false });
  await Camps.updateOne({ _id: f.camp._id }, { is_active: false });
  global.enquiryTestSession = { user: { id: admin.actorId, is_super: true } };
  const count = await Offices.countDocuments();
  const response = await routes.PATCH(new NextRequest('http://local/api/enquiries/head-office-requests', { method: 'PATCH', body: JSON.stringify({ request_id: String(request._id), revision: 1, decision: 'approve', approve_facility: true }) }));
  assert.equal(response.status, 400, JSON.stringify(await response.json()));
  assert.equal((await Requests.findById(request._id)).status, 'pending');
  assert.equal(await Offices.countDocuments(), count);
  assert.equal(String((await Camps.findById(f.camp._id)).headoffice_id), String(f.office._id));
});
test('combined approval approves office, facility and enquiry in one transaction', async () => {
  require('./catalogue-fixture.cjs').installCatalogueFixture();
  const f = await fixture(); const request = await submit(f, { operation: 'create' });
  await Eq.updateOne({ _id: f.enquiry._id }, { is_active: false });
  await Camps.updateOne({ _id: f.camp._id }, { is_active: false, project_sector: 'WFA', facility_type: 'WFA-01' });
  global.enquiryTestSession = { user: { id: admin.actorId, is_super: true } };
  const response = await routes.PATCH(new NextRequest('http://local/api/enquiries/head-office-requests', { method: 'PATCH', body: JSON.stringify({ request_id: String(request._id), revision: 1, decision: 'approve', approve_facility: true }) }));
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  assert.equal((await Requests.findById(request._id)).status, 'approved');
  assert.equal((await Camps.findById(f.camp._id)).is_active, true);
  assert.equal((await Eq.findById(f.enquiry._id)).is_active, true);
});
test('adding a staff enquiry stores its new facility and head office proposal atomically', async () => {
  const f = await fixture(); global.enquiryTestSession = { user: { id: String(creator) } };
  const route = require('../../app/api/enquiries/agent-side/post/add-new-enquiry/route.ts');
  const body = { business_id: String(f.business._id), country: String(oid()), region: String(oid()), area: String(oid()), area_input_mode: 'existing', camp_input_mode: 'new', camp_name_request: 'Requested facility', project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: [], followup_status: 'Lead Received', head_office_request: { operation: 'create', proposed } };
  const response = await route.POST(new NextRequest('http://local/api/enquiries/agent-side/post/add-new-enquiry', { method: 'POST', body: JSON.stringify(body) }));
  const result = await response.json(); assert.equal(response.status, 201, JSON.stringify(result));
  const enquiry = await Eq.findById(result.enquiry_id), camp = await Camps.findById(enquiry.camp_id);
  assert.equal(camp.headoffice_id, null); assert.equal(camp.is_active, false);
  const request = await Requests.findOne({ enquiry_id: enquiry._id }); assert.equal(request.status, 'pending'); assert.equal(request.proposed.address, 'Proposed');
  const before = await Eq.countDocuments();
  const denied = await route.POST(new NextRequest('http://local/api/enquiries/agent-side/post/add-new-enquiry', { method: 'POST', body: JSON.stringify({ ...body, head_office_request: { operation: 'link', selected_office_id: String(oid()) } }) }));
  assert.equal(denied.status, 404); assert.equal(await Eq.countDocuments(), before);
});
test('staff enquiry edit with legacy head office fields submits a proposal without changing live details', async () => {
  const f = await fixture(); global.enquiryTestSession = { user: { id: String(creator) } };
  const route = require('../../app/api/enquiries/update/enquiry/route.ts');
  const body = { enquiry_id: String(f.enquiry._id), area_input_mode: 'existing', camp_input_mode: 'existing', camp: String(f.camp._id), camp_name_request: 'Facility A', project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: [], followup_status: 'Lead Received', head_office_address: 'Request via enquiry edit', head_office_contact: '200', contacts: [] };
  const response = await route.PUT(new NextRequest('http://local/api/enquiries/update/enquiry', { method: 'PUT', body: JSON.stringify(body) }));
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  assert.equal((await Offices.findById(f.office._id)).address, 'Original');
  assert.equal((await Requests.findOne({ enquiry_id: f.enquiry._id })).proposed.address, 'Request via enquiry edit');
});
