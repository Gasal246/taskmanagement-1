const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const statusSource = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../app/api/helpers/activity-status-access.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const statusExports = {};
vm.runInNewContext(statusSource, { exports: statusExports });

// Exercise the real route with isolated database/session fixtures.
function fixture({ userId = 'participant', active = true, project = false, admin = false, supervised = [], teamHead = false } = {}) {
  const task = { _id: 'task', business_id: 'business', assigned_to: 'owner', creator: 'creator', is_project_task: project };
  const activities = [
    { _id: 'assigned', task_id: 'task', assigned_to: 'participant' },
    { _id: 'forwarded', task_id: 'task', assigned_to: 'other', forwarded_to: 'participant' },
    { _id: 'private', task_id: 'task', assigned_to: 'other' },
    { _id: 'different-task', task_id: 'another-task', assigned_to: 'participant' },
  ];
  const matches = (row, query) => Object.entries(query).every(([key, value]) => key === '$or'
    ? value.some(condition => matches(row, condition)) : value && typeof value === 'object' && '$in' in value ? value.$in.includes(row[key]) : row[key] === value);
  const chain = value => ({ populate() { return this; }, select() { return Promise.resolve(value); }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
  const mocks = {
    '@/app/api/helpers/activity-status-access': statusExports,
    '@/app/api/helpers/head-reassignment-scope': {
      resolveSelectedHeadContext: async () => active && supervised.length ? {} : null,
      getSelectedHeadDirectStaffIds: async () => supervised,
    },
    '@/auth': { auth: async () => ({ user: { id: userId } }) },
    '@/lib/mongo': { default: async () => {} },
    '@/lib/utils': { resolveSessionUserId: session => session.user.id },
    '@/models/business_tasks.model': { default: { findById: async () => ({ ...task, toObject: () => ({ ...task }) }) } },
    '@/models/task_activities.model': { default: {
      exists: async query => activities.some(row => matches(row, query)),
      find: query => chain(activities.filter(row => matches(row, query))),
    } },
    '@/models/business_staffs.model': { default: { exists: async query => active && query.business_id === task.business_id && query.user_id === userId && query.status === 1 } },
    '@/models/admin_assign_business.model': { default: { exists: async () => admin } },
    '@/models/users.model': { default: { findById: () => chain({ name: 'User' }) } },
    '@/models/business_project.model': { default: { findById: () => chain({}) } },
    '@/models/project_team.model': { default: { find: () => ({ select: () => chain([]) }) } },
    '@/models/business_skills.model': {},
    '@/app/api/helpers/activity-comments': { addUnreadCommentCounts: async rows => rows },
    '@/app/api/helpers/staff-task-access': { hasStaffTaskAccess: async () => active && ['owner', 'creator'].includes(userId) },
    '@/app/api/helpers/project-task-teams': { normalizeProjectTaskTeamIds: () => [], resolveProjectTaskStaffAccess: async () => ({ canViewTask: teamHead, canViewAllActivities: teamHead, canAssignActivities: teamHead }) },
    'next/server': { NextResponse },
  };
  const filename = path.resolve(__dirname, '../../app/api/task/getid/[taskid]/route.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, URL, console, require: name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } }, { filename });
  return async (assigned = true) => exports.GET(new NextRequest(`http://localhost/api/task/getid/task${assigned ? '?activityScope=assigned' : ''}`), { params: Promise.resolve({ taskid: 'task' }) });
}

test('activity assignees and forwarding recipients see only their task activities, without management permissions', async () => {
  const response = await fixture()();
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(data.activities.map(row => row._id), ['assigned', 'forwarded']);
  assert.deepEqual(data.permissions, { canManageActivities: false, canAssignActivities: false, canViewAllActivities: false });
});

test('task owner and creator retain full activity access', async () => {
  for (const userId of ['owner', 'creator']) {
    const response = await fixture({ userId })();
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.activities.length, 3);
    assert.equal(data.permissions.canManageActivities, true);
    assert.equal(data.permissions.canViewAllActivities, true);
  }
});

test('unrelated staff, inactive participants and project-task denials remain forbidden', async () => {
  for (const options of [{ userId: 'unrelated' }, { active: false }, { project: true }]) {
    assert.equal((await fixture(options)()).status, 403);
  }
});

test('activity participation does not grant admin scope', async () => {
  assert.equal((await fixture()(false)).status, 403);
  const response = await fixture({ admin: true })(false);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.activities.length, 3);
});


test('head can read direct staff activities but cannot complete them or see unrelated activities', async () => {
  const response = await fixture({ userId: 'head', supervised: ['participant'] })();
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(data.activities.map(row => row._id), ['assigned', 'forwarded']);
  assert.ok(data.activities.every(row => row.canChangeStatus === false));
  assert.equal(data.permissions.canManageActivities, false);
});

test('head can open a direct staff task and team head can view a team project task without completion rights', async () => {
  for (const options of [{ userId: 'head', supervised: ['owner'] }, { userId: 'head', project: true, teamHead: true }]) {
    const response = await fixture(options)();
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.activities.length, 3);
    assert.ok(data.activities.every(row => row.canChangeStatus === false));
  }
});

test('supervision does not grant access outside scope or when inactive', async () => {
  for (const options of [{ userId: 'head', supervised: ['unrelated'] }, { userId: 'head', supervised: ['participant'], active: false }]) {
    assert.equal((await fixture(options)()).status, 403);
  }
});

test('completion permission handles populated IDs and never grants rights solely for head roles', () => {
  const canChange = statusExports.canChangeActivityStatus;
  const task = { creator: 'creator', assigned_to: 'owner' };
  const activity = { assigned_to: { _id: 'staff' }, forwarded_to: { _id: 'recipient' } };
  for (const userId of ['creator', 'owner', 'staff', 'recipient']) assert.equal(canChange(task, activity, userId), true);
  for (const userId of ['head', 'team-head', '', 'unrelated']) assert.equal(canChange(task, activity, userId), false);
});

test('status API rejects supervisory viewers before writing, while allowing actual assignees', async () => {
  const filename = path.resolve(__dirname, '../../app/api/task/project-task/edit-activity/route.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const project of [false, true]) {
    for (const userId of ['head', 'team-head', 'staff', 'recipient']) {
      let writes = 0;
      const task = { business_id: 'business', creator: 'creator', assigned_to: 'owner', is_project_task: project };
      const activity = { task_id: 'task', assigned_to: 'staff', forwarded_to: 'recipient', is_done: false };
      const mocks = {
        '@/auth': { auth: async () => ({ user: { id: userId } }) },
        '@/lib/mongo': { default: async () => {} },
        '@/models/users.model': { default: { findById: () => ({ select: async () => ({ status: 1 }) }) } },
        '@/models/business_tasks.model': { default: { findById: () => ({ select: () => ({ lean: async () => task }) }) } },
        '@/models/task_activities.model': { default: { findById: async () => activity, findByIdAndUpdate: async () => { writes++; return activity; } } },
        '@/models/admin_assign_business.model': { default: { exists: async () => false } },
        '@/models/business_staffs.model': { default: { exists: async () => true } },
        '@/app/api/helpers/activity-status-access': statusExports,
        '@/models/Flow_Log.model': {},
        '@/app/api/helpers/task-activity-notifications': {},
        '@/app/api/helpers/head-reassignment-scope': {},
        '@/app/api/helpers/project-task-teams': {},
        'next/server': { NextResponse },
      };
      const exports = {};
      vm.runInNewContext(compiled, { exports, console, require: name => { assert.ok(name in mocks); return mocks[name]; } });
      const response = await exports.PUT(new NextRequest('http://localhost/api/task/project-task/edit-activity', {
        method: 'PUT', body: JSON.stringify({ activity_id: 'activity', is_status: true, is_done: false }),
      }));
      const participant = ['staff', 'recipient'].includes(userId);
      assert.equal(response.status, participant ? 200 : 403);
      assert.equal(writes, participant ? 1 : 0);
    }
  }
});
