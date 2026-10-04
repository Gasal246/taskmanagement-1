require('../enquiries/register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const Users = require('../../models/users.model.ts').default;
const Business = require('../../models/business.model.ts').default;
const Staff = require('../../models/business_staffs.model.ts').default;
const Admins = require('../../models/admin_assign_business.model.ts').default;
const Tasks = require('../../models/business_tasks.model.ts').default;
const Activities = require('../../models/task_activities.model.ts').default;
const Skills = require('../../models/business_skills.model.ts').default;
const Enquiries = require('../../models/eq_enquiries.model.ts').default;
const Histories = require('../../models/eq_enquiry_histories.ts').default;
const Access = require('../../models/eq_enquiry_access.model.ts').default;
const { GET: taskDetail } = require('../../app/api/task/getid/[taskid]/route.ts');
const { GET: adminHistory } = require('../../app/api/enquiries/get/enquiries/history/get-all/route.ts');
const { GET: staffHistory } = require('../../app/api/enquiries/staff-side/get/history/get-all/route.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
before(async () => { if (uri) await mongoose.connect(uri, { dbName: `pagination_${randomUUID().replaceAll('-', '')}` }); });
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);

mongoTest('task pages filter the entire authorized set, preserve summary counts and resolve notification anchors without leaking private rows', async () => {
  const business = await Business.create({ business_name: 'Pagination business' });
  const [owner, participant, privateUser, admin] = await Users.create([
    { email: 'page-owner@example.com', name: 'Owner' }, { email: 'page-participant@example.com', name: 'Visible [staff]' },
    { email: 'page-private@example.com', name: 'Private staff' }, { email: 'page-admin@example.com' },
  ]);
  await Staff.create([owner, participant, privateUser].map(user => ({ user_id: user._id, business_id: business._id })));
  await Admins.create({ user_id: admin._id, business_id: business._id });
  const task = await Tasks.create({ business_id: business._id, creator: owner._id, assigned_to: owner._id, task_name: 'Large task' });
  const skill = await Skills.create({ business_id: business._id, skill_name: 'Skill (literal)' });
  const date = new Date('2026-01-01T00:00:00Z');
  const activities = await Activities.insertMany(Array.from({ length: 83 }, (_, index) => ({
    task_id: task._id, activity: `Activity ${index}`, description: index === 6 ? 'needle [.*]' : 'Normal details',
    assigned_to: index % 2 === 0 ? participant._id : privateUser._id,
    assigned_skill: index === 6 ? skill._id : null, is_done: index % 3 === 0,
    createdAt: date, updatedAt: date,
  })), { timestamps: false });
  const request = params => taskDetail(new NextRequest(`http://localhost/api/task/getid/${task._id}?${new URLSearchParams(params)}`), { params: Promise.resolve({ taskid: String(task._id) }) });
  global.enquiryTestSession = { user: { id: String(participant._id) } };
  const first = await request({ activityScope: 'assigned', limit: '10' });
  assert.equal(first.status, 200, await first.clone().text());
  const data = (await first.json()).data;
  assert.equal(data.activities.length, 10);
  assert.deepEqual(data.activitySummary, { total: 42, completed: 14, pending: 28 });
  assert.deepEqual(data.activityPagination, { page: 1, limit: 10, total: 42, pages: 5 });
  assert.ok(data.activities.every(row => row.assigned_to._id === String(participant._id)));
  const ids = new Set(data.activities.map(row => row._id));
  for (let page = 2; page <= 5; page++) {
    const next = (await (await request({ activityScope: 'assigned', limit: '10', page: String(page) })).json()).data;
    for (const row of next.activities) { assert.ok(!ids.has(row._id), 'stable tie ordering across pages'); ids.add(row._id); }
  }
  assert.equal(ids.size, 42);
  for (const term of ['needle [.*]', 'Skill (literal)']) {
    const found = (await (await request({ activityScope: 'assigned', activitySearch: term })).json()).data;
    assert.equal(found.activities.length, 1);
    assert.equal(found.activities[0]._id, String(activities[6]._id));
    assert.equal(found.activitySummary.total, 42);
  }
  const byName = (await (await request({ activityScope: 'assigned', activitySearch: 'Visible [staff]', activityStatus: 'pending' })).json()).data;
  assert.equal(byName.activityPagination.total, 28);
  assert.ok(byName.activities.every(row => row.is_done === false));
  assert.equal((await (await request({ activityScope: 'assigned', activitySearch: 'Private staff' })).json()).data.activityPagination.total, 0);
  const anchor = (await (await request({ activityScope: 'assigned', limit: '10', activityId: String(activities[0]._id) })).json()).data;
  assert.equal(anchor.activityPagination.page, 5);
  assert.equal(anchor.activityPagination.focusFound, true);
  assert.ok(anchor.activities.some(row => row._id === String(activities[0]._id)));
  const privateAnchor = (await (await request({ activityScope: 'assigned', activityId: String(activities[1]._id) })).json()).data;
  assert.equal(privateAnchor.activityPagination.focusFound, false);
  assert.equal((await request({ activityScope: 'assigned', page: '0' })).status, 400);
  assert.equal((await request({ activityScope: 'assigned', activitySearch: 'a'.repeat(201) })).status, 400);
  assert.equal((await request({ activityScope: 'assigned', activityStatus: 'invalid' })).status, 400);
  const clamped = (await (await request({ activityScope: 'assigned', page: '999', limit: '10' })).json()).data;
  assert.equal(clamped.activityPagination.page, 5);
  assert.equal(clamped.activities.length, 2);
  global.enquiryTestSession = { user: { id: String(admin._id) } };
  const adminPage = (await (await request({})).json()).data;
  assert.equal(adminPage.activities.length, 25);
  assert.equal(adminPage.activitySummary.total, 83);
  assert.equal((await (await request({ limit: '1000' })).json()).data.activityPagination.limit, 100);
});

mongoTest('history pages paginate after visibility and type filters, deduplicate grants and exclude orphaned access records', async () => {
  const [creator, viewer, stranger] = await Users.create([
    { email: 'history-creator@example.com' }, { email: 'history-viewer@example.com' }, { email: 'history-stranger@example.com' },
  ]);
  const enquiry = await Enquiries.create({ createdBy: creator._id });
  const date = new Date('2026-01-01T00:00:00Z');
  const histories = await Histories.insertMany(Array.from({ length: 61 }, (_, index) => ({
    enquiry_id: enquiry._id, step_number: Math.floor(index / 2), createdAt: date,
    change_type: index % 3 === 0 ? 'ENQUIRY_EDIT' : index % 3 === 1 ? 'ACTION_COMPLETED' : 'FORWARD',
    changed_by: creator._id, action: 'Call',
  })), { timestamps: false });
  await Access.insertMany(histories.filter((_, index) => index % 2 === 0).flatMap(history => [
    { enquiry_id: enquiry._id, user_id: viewer._id, history_id: history._id },
    { enquiry_id: enquiry._id, user_id: viewer._id, history_id: history._id },
  ]));
  await Access.create({ enquiry_id: enquiry._id, user_id: viewer._id, history_id: new mongoose.Types.ObjectId() });
  const request = (get, params = {}) => get(new NextRequest(`http://localhost/api/enquiries/history?${new URLSearchParams({ enquiry_id: String(enquiry._id), ...params })}`));
  global.enquiryTestSession = { user: { id: String(creator._id) } };
  const first = await request(adminHistory);
  assert.equal(first.status, 200, await first.clone().text());
  const admin = await first.json();
  assert.equal(admin.histories.length, 25);
  assert.equal(admin.pagination.total, 61);
  const ids = new Set(admin.histories.map(row => row._id));
  for (let page = 2; page <= 3; page++) for (const row of (await (await request(adminHistory, { page: String(page) })).json()).histories) {
    assert.ok(!ids.has(row._id)); ids.add(row._id);
  }
  assert.equal(ids.size, 61);
  assert.equal((await (await request(adminHistory, { kind: 'updates' })).json()).pagination.total, 21);
  assert.equal((await request(adminHistory, { kind: 'invalid' })).status, 400);
  assert.equal((await request(adminHistory, { page: '-1' })).status, 400);
  assert.equal((await request(adminHistory, { asOf: 'not-a-date' })).status, 400);
  global.enquiryTestSession = { user: { id: String(viewer._id) } };
  const staff = await (await request(staffHistory, { page: '2', limit: '10' })).json();
  assert.equal(staff.histories.length, 10);
  assert.equal(staff.pagination.total, 31, 'duplicate grants and orphans never inflate counts');
  assert.ok(staff.histories.every(row => histories.findIndex(history => String(history._id) === row.history_id._id) % 2 === 0));
  const updates = await (await request(staffHistory, { kind: 'updates', limit: '5' })).json();
  assert.equal(updates.histories.length, 5);
  assert.equal(updates.pagination.total, 11);
  assert.ok(updates.histories.every(row => row.history_id.change_type === 'ENQUIRY_EDIT'));
  const frozen = await (await request(staffHistory, { asOf: new Date(date.getTime() - 1).toISOString() })).json();
  assert.equal(frozen.pagination.total, 0);
  global.enquiryTestSession = { user: { id: String(stranger._id) } };
  assert.equal((await request(staffHistory)).status, 403);
  assert.equal((await request(adminHistory)).status, 403);
});
