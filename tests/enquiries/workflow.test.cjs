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
const { applyWorkflowChange, workflowChangeSchema } = require('../../lib/enquiries/workflow.ts');
const route = require('../../app/api/enquiries/workflow/route.ts');
const model = name => require(`../../models/${name}.ts`).default;
const Workflow = model('eq_enquiry_workflow.model'), Business = model('business.model'), Users = model('users.model');
const Admins = model('admin_assign_business.model'), Roles = model('roles.model'), UserRoles = model('user_roles.model');
let proc, directory, business, foreign, admin, staff;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'enquiry-workflow-'));
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  proc = spawn('mongod', ['--port', String(port), '--bind_ip', '127.0.0.1', '--dbpath', directory, '--quiet'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { await mongoose.connect(`mongodb://127.0.0.1:${port}/workflow`, { serverSelectionTimeoutMS: 200 }); break; }
    catch (error) { if (i === 59) throw error; await delay(100); }
  }
  for (const m of [Workflow, Business, Users, Admins, Roles, UserRoles]) await m.createCollection();
  [business, foreign] = await Business.create([{ business_name: 'Workflow test' }, { business_name: 'Other' }]);
  [admin, staff] = await Users.create([{ name: 'Admin' }, { name: 'Staff' }]);
  const role = await Roles.create({ role_name: 'BUSINESS_ADMIN' });
  await Admins.create({ user_id: admin._id, business_id: business._id });
  await UserRoles.create({ user_id: admin._id, business_id: business._id, role_id: role._id });
});
after(async () => {
  await mongoose.disconnect();
  if (proc && proc.exitCode === null) await new Promise(resolve => { proc.once('exit', resolve); proc.kill('SIGTERM'); });
  if (directory) await rm(directory, { recursive: true, force: true });
});
const session = user => { global.enquiryTestSession = user ? { user: { id: String(user._id) } } : null; };
async function request(method, body, clientId = String(business._id)) {
  const response = await route[method](new NextRequest(`http://localhost/api/enquiries/workflow?client_id=${clientId}`, { method, ...(body ? { body: JSON.stringify({ client_id: clientId, ...body }), headers: { 'Content-Type': 'application/json' } } : {}) }));
  return { status: response.status, data: await response.json() };
}

test('validation normalizes subnames and rejects malformed input', () => {
  const input = { client_id: '1'.repeat(24), revision: 0, operation: 'add_role', subname: ' a m ', name: ' Account Manager ' };
  const parsed = workflowChangeSchema.parse(input);
  assert.equal(parsed.color_code, '#67e8f9');
  assert.equal(workflowChangeSchema.parse({ ...input, color_code: '#AABBCC' }).color_code, '#aabbcc');
  for (const color_code of ['', '#abc', '#gggggg', 'red', '123456', null]) assert.equal(workflowChangeSchema.safeParse({ ...input, color_code }).success, false);
  assert.equal(parsed.subname, 'AM'); assert.equal(parsed.name, 'Account Manager');
  for (const subname of ['', 'AM2', 'A-M', 'Ä', 'A'.repeat(33)]) assert.equal(workflowChangeSchema.safeParse({ ...input, subname }).success, false);
  for (const patch of [{ name: ' ' }, { name: 'a'.repeat(201) }, { revision: -1 }, { client_id: 'invalid' }, { extra: true }]) assert.equal(workflowChangeSchema.safeParse({ ...input, ...patch }).success, false);
});

test('transitions reject foreign tenants, missing records and invalid stage permutations without mutation', () => {
  const client_id = '1'.repeat(24), a = '2'.repeat(24), b = '3'.repeat(24), role_id = '4'.repeat(24);
  const now = new Date().toISOString();
  const current = { client_id, revision: 3, roles: [{ _id: role_id, subname: 'AM', name: 'Manager', createdAt: now, updatedAt: now }], stages: [a, b].map(_id => ({ _id, role_id, name: _id, createdAt: now, updatedAt: now })) };
  const original = JSON.stringify(current);
  for (const stage_ids of [[a], [a, a], [a, role_id], [a, b, role_id]]) assert.throws(() => applyWorkflowChange(current, { client_id, revision: 3, operation: 'reorder', stage_ids }, role_id, now), { status: 400 });
  assert.throws(() => applyWorkflowChange(current, { client_id: b, revision: 3, operation: 'delete_stage', id: a }, a, now), { status: 403 });
  assert.throws(() => applyWorkflowChange(current, { client_id, revision: 2, operation: 'delete_stage', id: a }, a, now), { status: 409 });
  assert.throws(() => applyWorkflowChange(current, { client_id, revision: 3, operation: 'edit_stage', id: role_id, name: 'Missing', role_id }, a, now), { status: 404 });
  assert.equal(JSON.stringify(current), original);
});

test('API enforces authentication, admin ownership and read-only initial load', async () => {
  session(null); assert.equal((await request('GET')).status, 401);
  session(staff); assert.equal((await request('GET')).status, 403);
  assert.equal((await request('POST', { revision: 0, operation: 'add_role', subname: 'AM', name: 'Manager' })).status, 403);
  session(admin); assert.equal((await request('GET', null, String(foreign._id))).status, 403);
  const response = await request('GET'); assert.equal(response.status, 200);
  assert.equal(response.data.revision, 0); assert.deepEqual(response.data.roles, []);
  assert.equal(await Workflow.countDocuments(), 0);
});

test('API persists CRUD, ordering and references, and rejects concurrent stale writes', async () => {
  session(admin);
  const create = await request('POST', { revision: 0, operation: 'add_role', subname: ' a m ', name: 'Account Manager', color_code: '#FBBF24' });
  assert.equal(create.status, 200); const role = create.data.roles[0]; assert.equal(role.subname, 'AM');
  assert.equal(role.color_code, '#fbbf24');
  assert.equal((await request('GET')).data.roles[0].color_code, '#fbbf24');
  assert.equal((await Workflow.findOne({ client_id: business._id }).lean()).roles[0].color_code, '#fbbf24');
  assert.equal((await request('POST', { revision: 1, operation: 'add_role', subname: 'am', name: 'Duplicate' })).status, 409);
  assert.equal((await request('POST', { revision: 1, operation: 'add_stage', role_id: String(foreign._id), name: 'Foreign role' })).status, 400);
  let response = await request('POST', { revision: 1, operation: 'add_stage', role_id: role._id, name: 'Review' });
  const first = response.data.stages[0];
  response = await request('POST', { revision: 2, operation: 'add_stage', role_id: role._id, name: 'Contact' });
  const second = response.data.stages[1];
  assert.deepEqual(response.data.stages.map(s => s.name), ['Review', 'Contact']);
  assert.equal((await request('DELETE', { revision: 3, operation: 'delete_role', id: role._id })).status, 409);
  response = await request('PATCH', { revision: 3, operation: 'reorder', stage_ids: [second._id, first._id] });
  assert.equal(response.status, 200);
  assert.deepEqual((await request('GET')).data.stages.map(s => s._id), [second._id, first._id]);
  response = await request('PATCH', { revision: 4, operation: 'edit_role', id: role._id, subname: 'CS', name: 'Customer Success', color_code: '#a78bfa' });
  assert.equal(response.data.roles[0]._id, role._id); assert.equal(response.data.stages[0].role_id, role._id);
  assert.equal(response.data.roles[0].createdAt, role.createdAt);
  assert.equal((await request('GET')).data.roles[0].color_code, '#a78bfa');
  response = await request('PATCH', { revision: 5, operation: 'edit_stage', id: first._id, name: 'Qualification', role_id: role._id });
  assert.equal(response.data.stages[1].name, 'Qualification');
  assert.equal(response.data.stages[1].createdAt, first.createdAt);
  const concurrent = await Promise.all(['A', 'B'].map(name => request('PATCH', { revision: 6, operation: 'edit_role', id: role._id, subname: 'CS', name })));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  assert.equal((await request('PATCH', { revision: 7, operation: 'reorder', stage_ids: [first._id, first._id] })).status, 400);
  assert.equal((await request('POST', { revision: 7, operation: 'edit_role', id: role._id, subname: 'CS', name: 'Wrong method' })).status, 405);
  assert.equal((await request('DELETE', { revision: 7, operation: 'delete_stage', id: first._id })).status, 200);
  assert.equal((await request('DELETE', { revision: 8, operation: 'delete_stage', id: second._id })).status, 200);
  assert.equal((await request('DELETE', { revision: 9, operation: 'delete_role', id: role._id })).status, 200);
  const final = (await request('GET')).data; assert.equal(final.revision, 10); assert.deepEqual(final.stages, []); assert.deepEqual(final.roles, []);
  // Same subname is valid in another tenant. First-write races are protected even with autoIndex disabled.
  global.enquiryTestSession = { user: { id: String(admin._id), is_super: true } };
  const initial = await Promise.all([1, 2].map(() => request('POST', { revision: 0, operation: 'add_role', subname: 'AM', name: 'Manager' }, String(foreign._id))));
  assert.deepEqual(initial.map(r => r.status).sort(), [200, 409]);
  assert.equal(await Workflow.countDocuments({ client_id: foreign._id }), 1);
});


test('legacy roles return a default color without mutating stored data', async () => {
  const tenant = await Business.create({ business_name: 'Legacy workflow' });
  const now = new Date();
  await Workflow.collection.insertOne({ client_id: tenant._id, revision: 1, roles: [{ _id: new mongoose.Types.ObjectId(), subname: 'AM', name: 'Manager', createdAt: now, updatedAt: now }], stages: [] });
  global.enquiryTestSession = { user: { id: String(admin._id), is_super: true } };
  const response = await request('GET', null, String(tenant._id));
  assert.equal(response.status, 200);
  assert.equal(response.data.roles[0].color_code, '#67e8f9');
  assert.equal((await Workflow.collection.findOne({ client_id: tenant._id })).roles[0].color_code, undefined);
});
