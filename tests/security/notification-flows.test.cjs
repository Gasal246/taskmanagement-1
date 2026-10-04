require('../enquiries/register.cjs');
global.testRealJobs = true;
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const model = name => require(`../../models/${name}.ts`).default;
const Jobs = model('background_jobs.model'), Inbox = model('notifications.model'), Tokens = model('fcm_tokens.model');
const Users = model('users.model'), Business = model('business.model'), Staff = model('business_staffs.model'), Admins = model('admin_assign_business.model');
const Roles = model('roles.model'), UserRoles = model('user_roles.model');
const Regions = model('business_regions.model'), RegionHeads = model('region_heads.model'), RegionStaff = model('region_staffs.model');
const Projects = model('business_project.model'), Teams = model('project_team.model'), Members = model('project_team_members.model');
const Departments = model('project_departments.model'), Logs = model('Flow_Log.model'), Tasks = model('business_tasks.model'), Events = model('calendar_events.model');
const Camps = model('eq_camps.model'), Enquiries = model('eq_enquiries.model'), Histories = model('eq_enquiry_histories'), Access = model('eq_enquiry_access.model');
const Contacts = model('eq_camp_contacts.model'), Solutions = model('eq_enquiry_solutions.model');
const heads = require('../../app/api/project/heads/route.ts');
const supervisors = require('../../app/api/project/supervisors/route.ts');
const accounts = require('../../app/api/project/account-managers/route.ts');
const siteHeads = require('../../app/api/project/site-operational-heads/route.ts');
const approve = require('../../app/api/project/approve-project/route.ts').PUT;
const addTeam = require('../../app/api/project/teams/add-team/route.ts').POST;
const editTeam = require('../../app/api/project/teams/edit-team/route.ts').PUT;
const removeTeam = require('../../app/api/project/teams/remove-team/route.ts').DELETE;
const calendar = require('../../app/api/calendar/events/route.ts').POST;
const addTask = require('../../app/api/task/project-task/add-task/route.ts').POST;
const matchFacility = require('../../app/api/enquiries/update/assign-camp-to-enquiry/route.ts').PUT;
const addProject = require('../../app/api/project/add-project/route.ts').POST;
const { installCatalogueFixture } = require('../enquiries/catalogue-fixture.cjs');
installCatalogueFixture();
const firebase = require('../../lib/firebaseAdmin.ts');
let providerCalls = 0;
firebase.getAdminMessaging = () => { providerCalls++; throw new Error('Provider unavailable'); };
firebase.getAdminStorageBucket = () => { providerCalls++; throw new Error('Storage unavailable'); };
const { claimJob, processJob } = require('../../lib/jobs/worker.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = Object.values(mongoose.models);
before(async () => { if (uri) { await mongoose.connect(uri, { dbName: `notification_flows_${randomUUID().replaceAll('-', '')}` }); await Promise.all(models.map(value => value.init())); } });
beforeEach(async () => { if (uri) await Promise.all(models.map(value => value.deleteMany({}))); global.enquiryTestSession = null; providerCalls = 0; });
afterEach(() => assert.equal(providerCalls, 0, 'business routes never call notification/storage providers'));
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const id = () => new mongoose.Types.ObjectId();
const request = (method, body, path = '/api/test', cookies) => new NextRequest(`http://localhost${path}`, {
  method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...(cookies ? { headers: { cookie: cookies } } : {}),
});
async function fixture() {
  const business = await Business.create({ business_name: 'Notification business', status: 1 });
  const [admin, first, second] = await Users.create(['admin', 'first', 'second'].map(name => ({ email: `${name}@notification.test`, name, status: 1 })));
  await Admins.create({ user_id: admin._id, business_id: business._id, status: 1 });
  await Staff.create([first, second].map(user => ({ user_id: user._id, business_id: business._id, status: 1 })));
  const role = await Roles.create({ role_name: 'BUSINESS_ADMIN', role_number: 1 });
  await UserRoles.create({ user_id: admin._id, role_id: role._id, business_id: business._id });
  const project = await Projects.create({ project_name: 'Queue project', business_id: business._id, creator: admin._id, type: 'sales' });
  const department = await Departments.create({ project_id: project._id, department_id: id(), department_name: 'Sales' });
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  return { business, admin, first, second, role, project, department };
}
async function failQueue(work) {
  const original = Jobs.updateOne;
  Jobs.updateOne = () => { throw new Error('Simulated queue outage'); };
  try { assert.equal((await work()).status, 500); } finally { Jobs.updateOne = original; }
}
const teamBody = f => ({ team_name: 'Team', project_id: String(f.project._id), project_dept_id: String(f.department._id),
  department_id: String(f.department.department_id), team_lead_id: String(f.first._id), team_member_ids: [String(f.first._id), String(f.second._id), String(f.second._id)] });

for (const [name, route, field] of [['head', heads, 'project_heads'], ['supervisor', supervisors, 'project_supervisors'],
  ['account manager', accounts, 'account_managers'], ['site head', siteHeads, 'site_operational_heads']]) {
  mongoTest(`${name} assignments roll back on queue failure and concurrent/repeated changes notify once`, async () => {
    const f = await fixture();
    const body = { project_id: String(f.project._id), user_id: String(f.first._id) };
    await failQueue(() => route.POST(request('POST', body)));
    assert.equal((await Projects.findById(f.project._id))[field].length, 0);
    assert.equal(await Logs.countDocuments({}), 0);
    assert.equal(await Jobs.countDocuments({}), 0);
    const results = await Promise.all(Array.from({ length: 4 }, () => route.POST(request('POST', body))));
    assert.ok(results.every(result => result.status === 200));
    assert.equal((await Projects.findById(f.project._id))[field].length, 1);
    assert.equal(await Jobs.countDocuments({}), 1);
    assert.equal(await Logs.countDocuments({}), 1);
    const removals = await Promise.all(Array.from({ length: 3 }, () => route.DELETE(request('DELETE', undefined, `/api/test?project_id=${f.project._id}&user_id=${f.first._id}`))));
    assert.ok(removals.every(result => result.status === 200));
    assert.equal((await Projects.findById(f.project._id))[field].length, 0);
    assert.equal(await Jobs.countDocuments({}), 2);
    assert.equal(await Logs.countDocuments({}), 2);
    assert.equal(await Inbox.countDocuments({}), 0);
  });
}

mongoTest('concurrent assignment of different project users cannot lose either assignment', async () => {
  const f = await fixture();
  const results = await Promise.all([f.first, f.second].map(user => heads.POST(request('POST', { project_id: String(f.project._id), user_id: String(user._id) }))));
  assert.ok(results.every(result => result.status === 200));
  const project = await Projects.findById(f.project._id);
  assert.deepEqual(project.project_heads.map(String).sort(), [f.first, f.second].map(user => String(user._id)).sort());
  assert.equal(String(project.project_head), String(project.project_heads[0]));
  assert.equal(await Jobs.countDocuments({}), 2);
});

mongoTest('project assignments and teams reject invalid, inactive and foreign-business recipients', async () => {
  const f = await fixture();
  const foreignBusiness = await Business.create({ business_name: 'Other business', status: 1 });
  const foreign = await Users.create({ email: 'project-foreign@notification.test', status: 1 });
  await Staff.create({ user_id: foreign._id, business_id: foreignBusiness._id, status: 1 });
  await Users.updateOne({ _id: f.second._id }, { $set: { status: 0 } });
  for (const route of [heads, supervisors, accounts, siteHeads]) {
    for (const user_id of [String(foreign._id), String(f.second._id), 123, 'invalid']) {
      assert.equal((await route.POST(request('POST', { project_id: String(f.project._id), user_id }))).status, 400);
    }
    assert.equal((await route.POST(request('POST', null))).status, 400);
    assert.equal((await route.POST(new NextRequest('http://localhost/api/test', { method: 'POST', body: '{' }))).status, 400);
  }
  for (const memberId of [String(foreign._id), String(f.second._id)]) {
    assert.equal((await addTeam(request('POST', { ...teamBody(f), team_member_ids: [memberId] }))).status, 400);
  }
  assert.equal((await addTeam(request('POST', { ...teamBody(f), team_member_ids: Array(501).fill(String(f.first._id)) }))).status, 400);
  assert.equal(await Jobs.countDocuments({}), 0);
  assert.equal(await Teams.countDocuments({}), 0);
  assert.equal(await Logs.countDocuments({}), 0);
});

mongoTest('project approval and its notification are atomic and repeat approval does not resend', async () => {
  const f = await fixture();
  await Projects.updateOne({ _id: f.project._id }, { $set: { project_head: f.first._id, project_heads: [f.first._id] } });
  const url = `/api/test?project_id=${f.project._id}`;
  await failQueue(() => approve(request('PUT', undefined, url)));
  assert.equal((await Projects.findById(f.project._id)).is_approved, false);
  assert.equal(await Logs.countDocuments({}), 0);
  const results = await Promise.all(Array.from({ length: 4 }, () => approve(request('PUT', undefined, url))));
  assert.ok(results.every(result => result.status === 200));
  assert.equal((await Projects.findById(f.project._id)).is_approved, true);
  assert.equal(await Jobs.countDocuments({}), 1);
  assert.equal(await Logs.countDocuments({}), 1);
});

mongoTest('team creation deduplicates members and rolls back its team, members and audit with the outbox', async () => {
  const f = await fixture();
  await failQueue(() => addTeam(request('POST', teamBody(f))));
  assert.equal(await Teams.countDocuments({}), 0);
  assert.equal(await Members.countDocuments({}), 0);
  assert.equal(await Logs.countDocuments({}), 0);
  const result = await addTeam(request('POST', teamBody(f)));
  assert.equal(result.status, 201);
  assert.equal(await Members.countDocuments({}), 2);
  assert.equal((await Teams.findOne()).members_count, 2);
  const jobs = await Jobs.find().lean();
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs.map(job => job.payload.records[0].data.role).sort(), ['team-head', 'team-member']);
  assert.equal(jobs.find(job => job.payload.records[0].data.role === 'team-member').payload.records.length, 1, 'head receives only the head invitation');
});

mongoTest('team edits capture actual added/removed recipients; retries do not enqueue duplicate changes', async () => {
  const f = await fixture();
  await addTeam(request('POST', teamBody(f)));
  const team = await Teams.findOne();
  await Jobs.deleteMany({});
  await Logs.deleteMany({});
  const body = { _id: String(team._id), team_name: 'Updated team', team_head: String(f.second._id), team_members: [String(f.second._id)] };
  await failQueue(() => editTeam(request('PUT', body)));
  assert.equal((await Teams.findById(team._id)).team_name, 'Team');
  assert.equal(await Members.countDocuments({}), 2);
  assert.equal(await Logs.countDocuments({}), 0);
  assert.equal((await editTeam(request('PUT', body))).status, 200);
  assert.equal(await Jobs.countDocuments({}), 2, 'head removal/addition; former head does not receive duplicate member removal');
  assert.equal((await Teams.findById(team._id)).members_count, 1);
  assert.equal((await editTeam(request('PUT', body))).status, 200);
  assert.equal(await Jobs.countDocuments({}), 2);
  assert.equal(await Logs.countDocuments({}), 1, 'unchanged edit does not create another audit entry');
});

mongoTest('team deletion and notifications roll back together and task-linked teams remain protected', async () => {
  const f = await fixture();
  await addTeam(request('POST', teamBody(f)));
  const team = await Teams.findOne();
  await Jobs.deleteMany({});
  const url = `/api/test?team_id=${team._id}`;
  await failQueue(() => removeTeam(request('DELETE', undefined, url)));
  assert.ok(await Teams.findById(team._id));
  assert.equal(await Members.countDocuments({}), 2);
  const task = await Tasks.create({ business_id: f.business._id, is_project_task: true, assigned_teams: [team._id] });
  assert.equal((await removeTeam(request('DELETE', undefined, url))).status, 400);
  assert.equal(await Jobs.countDocuments({}), 0);
  await Tasks.deleteOne({ _id: task._id });
  assert.equal((await removeTeam(request('DELETE', undefined, url))).status, 200);
  assert.equal(await Teams.countDocuments({}), 0);
  assert.equal(await Members.countDocuments({}), 0);
  assert.equal(await Jobs.countDocuments({}), 2);
});

mongoTest('calendar event and invitations commit atomically and exclude the sender from notifications', async () => {
  const f = await fixture();
  const body = { title: 'Meeting', start_date: '2030-01-01T08:00:00Z', end_date: '2030-01-01T09:00:00Z', attendee_ids: [String(f.first._id), String(f.second._id), String(f.first._id)] };
  await failQueue(() => calendar(request('POST', body)));
  assert.equal(await Events.countDocuments({}), 0);
  assert.equal(await Jobs.countDocuments({}), 0);
  assert.equal((await calendar(request('POST', body))).status, 201);
  assert.equal((await Events.findOne()).attendee_ids.length, 3);
  const job = await Jobs.findOne();
  assert.equal(job.payload.records.length, 2);
  assert.ok(job.payload.records.every(record => String(record.recipient_id) !== String(f.admin._id)));
  await processJob(await claimJob());
  assert.equal(await Inbox.countDocuments({}), 2);
});

mongoTest('forged calendar roles, foreign/inactive attendees and oversized requests cannot send invitations', async () => {
  const f = await fixture();
  const other = await Users.create({ email: 'foreign@notification.test', status: 1 });
  const base = { title: 'Meeting', start_date: '2030-01-01T08:00:00Z', end_date: '2030-01-01T09:00:00Z' };
  assert.equal((await calendar(request('POST', { ...base, attendee_ids: [String(other._id)] }))).status, 400);
  await Users.updateOne({ _id: f.second._id }, { $set: { status: 0 } });
  assert.equal((await calendar(request('POST', { ...base, attendee_ids: [String(f.second._id)] }))).status, 400);
  global.enquiryTestSession = { user: { id: String(f.first._id) } };
  const cookies = `user_role=${JSON.stringify({ role_name: 'BUSINESS_ADMIN' })}`;
  assert.equal((await calendar(request('POST', { ...base, attendee_ids: [String(f.admin._id)] }, '/api/test', cookies))).status, 403);
  assert.equal((await calendar(request('POST', { ...base, attendee_ids: ['invalid'] }))).status, 400);
  assert.equal((await calendar(request('POST', { ...base, attendee_ids: Array(101).fill(String(f.first._id)) }))).status, 400);
  for (const start_date of [null, 0, 'invalid']) {
    assert.equal((await calendar(request('POST', { ...base, start_date }))).status, 400);
  }
  assert.equal((await calendar(request('POST', { ...base, end_date: '2029-01-01T08:00:00Z' }))).status, 400);
  assert.equal(await Jobs.countDocuments({}), 0);
  assert.equal((await calendar(request('POST', base))).status, 201, 'ordinary staff can still create self-only events');
  assert.equal(await Jobs.countDocuments({}), 0);
});

mongoTest('persisted region heads can invite and assign direct staff but cannot target staff outside their scope', async () => {
  const f = await fixture();
  const region = await Regions.create({ region_name: 'Selected region', business_id: f.business._id, status: 1 });
  const assignment = await RegionHeads.create({ user_id: f.first._id, region_id: region._id, status: 1 });
  await RegionStaff.create({ staff_id: f.second._id, region_id: region._id, status: 1 });
  const role = await Roles.create({ role_name: 'REGION_HEAD', role_number: 2 });
  await UserRoles.create({ user_id: f.first._id, role_id: role._id, business_id: f.business._id, status: 1 });
  const outside = await Users.create({ email: 'outside-region@notification.test', status: 1 });
  await Staff.create({ user_id: outside._id, business_id: f.business._id, status: 1 });
  global.enquiryTestSession = { user: { id: String(f.first._id) } };
  const cookies = `user_role=${JSON.stringify({ _id: String(role._id), role_name: 'REGION_HEAD' })}; user_domain=${JSON.stringify({ value: String(assignment._id), business_id: String(f.business._id), region_id: String(region._id) })}`;
  const eventBody = { title: 'Team meeting', start_date: '2030-01-01T08:00:00Z', end_date: '2030-01-01T09:00:00Z', attendee_ids: [String(f.second._id)] };
  assert.equal((await calendar(request('POST', eventBody, '/api/test', cookies))).status, 201);
  assert.equal((await calendar(request('POST', { ...eventBody, attendee_ids: [String(outside._id)] }, '/api/test', cookies))).status, 403);
  const taskBody = { business_id: String(f.business._id), is_project_task: false, assigned_to: String(f.second._id), task_name: 'Head assigned task', status: 'To Do' };
  assert.equal((await addTask(request('POST', taskBody, '/api/test', cookies))).status, 201);
  assert.equal((await addTask(request('POST', { ...taskBody, assigned_to: String(outside._id) }, '/api/test', cookies))).status, 403);
  await RegionHeads.updateOne({ _id: assignment._id }, { $set: { status: 0 } });
  assert.equal((await calendar(request('POST', eventBody, '/api/test', cookies))).status, 403);
  assert.equal((await addTask(request('POST', taskBody, '/api/test', cookies))).status, 403);
  assert.equal(await Events.countDocuments({}), 1);
  assert.equal(await Tasks.countDocuments({}), 1);
  assert.equal(await Jobs.countDocuments({}), 2);
});

mongoTest('task assignment saves atomically with its notification and rejects foreign assignees', async () => {
  const f = await fixture();
  const body = { business_id: String(f.business._id), project_id: null, is_project_task: false, assigned_to: String(f.first._id), task_name: 'Assigned task', task_description: 'Description', status: 'To Do' };
  await failQueue(() => addTask(request('POST', body)));
  assert.equal(await Tasks.countDocuments({}), 0);
  assert.equal((await addTask(request('POST', body))).status, 201);
  assert.equal(await Jobs.countDocuments({}), 1);
  const recipient = (await Jobs.findOne()).payload.records[0];
  assert.equal(String(recipient.recipient_id), String(f.first._id));
  const other = await Users.create({ email: 'task-foreign@notification.test', status: 1 });
  assert.equal((await addTask(request('POST', { ...body, assigned_to: String(other._id) }))).status, 400);
  global.enquiryTestSession = { user: { id: String(f.first._id) } };
  assert.equal((await addTask(request('POST', { ...body, assigned_to: String(f.second._id) }))).status, 403);
  assert.equal(await Tasks.countDocuments({}), 1);
});

mongoTest('facility matching cannot delete a duplicate or emit a notification if queue persistence fails', async () => {
  const f = await fixture();
  const old = await Camps.create({ camp_name: 'Requested site', is_active: false, business_id: f.business._id });
  const selected = await Camps.create({ camp_name: 'Existing site', is_active: true });
  const enquiry = await Enquiries.create({ business_id: f.business._id, camp_id: old._id, createdBy: f.first._id, enquiry_brought_by: [f.first._id, f.second._id] });
  await Histories.create({ enquiry_id: enquiry._id, step_number: 1 });
  await Access.create({ enquiry_id: enquiry._id, user_id: f.first._id });
  await Contacts.create({ enquiry_id: enquiry._id, camp_id: old._id, name: 'Contact' });
  await Solutions.create({ enquiry_id: enquiry._id, solutions_required: ['CON-01'] });
  const body = { camp_id: String(selected._id), enquiry_id: String(enquiry._id) };
  await failQueue(() => matchFacility(request('PUT', body)));
  assert.ok(await Enquiries.findById(enquiry._id));
  assert.ok(await Camps.findById(old._id));
  assert.equal(await Histories.countDocuments({ enquiry_id: enquiry._id }), 1);
  assert.equal((await matchFacility(request('PUT', body))).status, 200);
  assert.equal(await Enquiries.countDocuments({ _id: enquiry._id }), 0);
  assert.equal(await Camps.countDocuments({ _id: old._id }), 0);
  assert.equal(await Histories.countDocuments({ enquiry_id: enquiry._id }), 0);
  assert.equal(await Access.countDocuments({ enquiry_id: enquiry._id }), 0);
  assert.equal(await Contacts.countDocuments({ enquiry_id: enquiry._id }), 0);
  assert.equal(await Solutions.countDocuments({ enquiry_id: enquiry._id }), 0);
  const job = await Jobs.findOne();
  assert.equal(job.payload.records.length, 2);
  assert.equal((await matchFacility(request('PUT', body))).status, 404);
  assert.equal(await Jobs.countDocuments({}), 1);
});

mongoTest('approved project creation rolls back its project and audit if the head notification cannot be queued', async () => {
  const f = await fixture();
  const body = { project_name: 'New project', business_id: String(f.business._id), role_id: String(f.role._id),
    project_head: String(f.first._id), type: 'sales', priority: 'normal', project_sector: 'WFA', facility_type: 'WFA-01',
    sector_field_values: {}, solutions_required: ['CON-01'], solution_details: {}, primary_solution: 'CON-01', commercial_model: 'To Be Determined' };
  await failQueue(() => addProject(request('POST', body)));
  assert.equal(await Projects.countDocuments({}), 1, 'only the fixture project remains');
  assert.equal(await Logs.countDocuments({}), 0);
  assert.equal((await addProject(request('POST', body))).status, 201);
  assert.equal(await Projects.countDocuments({}), 2);
  assert.equal(await Jobs.countDocuments({}), 1);
});
