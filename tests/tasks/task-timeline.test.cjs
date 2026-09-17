const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load(sourcePath, mocks = {}) {
  const filename = path.resolve(__dirname, '../..', sourcePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Date, URL, console, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/lib/')) return load(`${name.slice(2)}.ts`, mocks);
    if (name.startsWith('@/')) throw new Error(`Missing mock: ${name}`);
    return require(name);
  } }, { filename });
  return exports;
}

const schedule = load('lib/activity-schedule.ts');
const d = value => new Date(value);
const pair = { start_date: '2026-09-15T08:00:00.000Z', end_date: '2026-09-15T09:00:00.000Z' };
const plain = value => JSON.parse(JSON.stringify(value));
const chain = value => ({ select() { return this; }, lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });

test('activity schedules require two valid offset timestamps and permit equal endpoints', () => {
  for (const value of [pair, { ...pair, end_date: pair.start_date }, {
    start_date: '2026-09-15T12:00:00+04:00', end_date: '2026-09-15T09:00:00Z',
  }]) assert.equal(schedule.activityScheduleSchema.safeParse(value).success, true);
  for (const value of [{}, { start_date: pair.start_date }, { ...pair, start_date: null },
    { ...pair, start_date: '' }, { ...pair, start_date: 'garbage' },
    { ...pair, start_date: '2026-02-30T08:00:00Z' },
    { ...pair, start_date: '2026-09-15T08:00' },
    { ...pair, end_date: '2026-09-15T07:59:59Z' },
  ]) assert.equal(schedule.activityScheduleSchema.safeParse(value).success, false, JSON.stringify(value));
});

test('local input round trips preserve timestamps, including inherited seconds and milliseconds', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['Asia/Dubai', 'America/New_York', 'UTC']) {
      process.env.TZ = zone;
      for (const timestamp of [pair.start_date, '2026-12-10T13:14:15.123Z']) {
        assert.equal(new Date(schedule.toLocalDateTimeInput(timestamp)).toISOString(), timestamp);
      }
    }
    assert.equal(schedule.toLocalDateTimeInput(null), '');
    assert.equal(schedule.formatScheduleDate(null), 'Not scheduled');
    assert.equal(schedule.formatScheduleDate('bad'), 'Not scheduled');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

function timelineFixture(initial = []) {
  const state = { rows: initial, task: { _id: 'task', __v: 0 }, conflict: false, queries: [] };
  const api = load('app/api/helpers/task-timeline.ts', {
    '@/models/business_tasks.model': { default: {
      findById: () => chain({ ...state.task }),
      updateOne: async (filter, update) => {
        if (state.conflict) {
          state.conflict = false;
          state.task.__v++;
          state.rows[0].start_date = d('2026-10-01T08:00:00Z');
          return { matchedCount: 0 };
        }
        assert.equal(filter.__v, state.task.__v);
        Object.assign(state.task, update.$set);
        state.task.__v++;
        return { matchedCount: 1 };
      },
    } },
    '@/models/task_activities.model': { default: {
      findOne: filter => {
        state.queries.push(filter);
        return { sort: order => {
          const rows = state.rows.filter(row => row.task_id === filter.task_id).slice().sort((a, b) =>
            order.createdAt * (a.createdAt - b.createdAt) || order._id * a._id.localeCompare(b._id));
          return chain(rows[0] ? { ...rows[0] } : null);
        } };
      },
    } },
  });
  return { state, recalculate: () => api.recalculateTaskTimeline('task') };
}
const activity = (id, created, start, end) => ({ _id: id, task_id: 'task', createdAt: d(created), start_date: d(start), end_date: d(end) });

test('timeline follows creation order, edits/deletions and empty tasks, including hidden activities', async () => {
  const { state, recalculate } = timelineFixture();
  await recalculate();
  assert.equal(state.task.start_date, null);
  assert.equal(state.task.end_date, null);
  const first = activity('a', '2026-01-01', pair.start_date, pair.end_date);
  state.rows.push(first);
  await recalculate();
  assert.equal(state.task.start_date, first.start_date);
  assert.equal(state.task.end_date, first.end_date);
  const middle = activity('b', '2026-01-02', '2026-09-01T08:00Z', '2026-12-30T09:00Z');
  const last = activity('c', '2026-01-03', '2026-09-10T08:00Z', '2026-09-10T09:00Z');
  state.rows.push(last, middle, { ...first, _id: 'other', task_id: 'other-task' });
  await recalculate();
  assert.equal(state.task.start_date, first.start_date);
  assert.equal(state.task.end_date, last.end_date); // Not the minimum/maximum scheduled dates.
  last.end_date = d('2026-11-01T10:00Z');
  first.start_date = d('2026-09-16T08:00Z');
  await recalculate();
  assert.equal(state.task.start_date, first.start_date);
  assert.equal(state.task.end_date, last.end_date);
  state.rows = [middle, last];
  await recalculate();
  assert.equal(state.task.start_date, middle.start_date);
  state.rows = [middle];
  await recalculate();
  assert.equal(state.task.end_date, middle.end_date);
  state.rows = [];
  await recalculate();
  assert.equal(state.task.end_date, null);
  assert.ok(state.queries.every(query => Object.keys(query).join() === 'task_id'));
});

test('creation-time ties use IDs; concurrent recalculations retry fresh data', async () => {
  const first = activity('a', '2026-01-01', pair.start_date, pair.end_date);
  const last = activity('z', '2026-01-01', '2026-09-20', '2026-09-21');
  const { state, recalculate } = timelineFixture([last, first]);
  await recalculate();
  assert.equal(state.task.start_date, first.start_date);
  assert.equal(state.task.end_date, last.end_date);
  state.rows = [first];
  state.conflict = true;
  await recalculate();
  assert.equal(state.task.start_date.toISOString(), '2026-10-01T08:00:00.000Z');
});

function routeFixture({ project = false, manager = true, admin = true } = {}) {
  const state = { writes: [], recalculated: [], task: { _id: 'task', business_id: 'business', is_project_task: project, creator: 'creator', assigned_to: 'owner', activity_count: 1, completed_activity: 0 } };
  const current = { _id: 'activity', task_id: 'task', activity: 'Example', is_done: false };
  const mocks = {
    '@/auth': { auth: async () => ({ user: { id: 'actor' } }) },
    '@/lib/mongo': { default: () => {} },
    '@/lib/activity-schedule': schedule,
    '@/app/api/helpers/task-timeline': { recalculateTaskTimeline: async id => state.recalculated.push(id) },
    '@/models/users.model': { default: { findById: () => chain({ _id: 'actor', name: 'Actor', status: 1 }) } },
    '@/models/business_tasks.model': { default: {
      findById: () => chain(state.task),
      findByIdAndUpdate: async (_, update) => { state.writes.push(update); return state.task; },
    } },
    '@/models/task_activities.model': { default: Object.assign(class {
      constructor(value) { Object.assign(this, value); }
      async save() { state.writes.push(this); return { ...this, _id: 'activity' }; }
    }, {
      findById: () => chain(current),
      findByIdAndUpdate: async (_, update) => { state.writes.push(update); return current; },
      findOneAndUpdate: async (_, update) => { state.writes.push(update); return current; },
      findByIdAndDelete: async () => { state.writes.push('deleted'); },
    }) },
    '@/models/admin_assign_business.model': { default: { exists: async () => admin } },
    '@/models/business_staffs.model': { default: { exists: async () => false } },
    '@/models/Flow_Log.model': {},
    '@/app/api/helpers/head-reassignment-scope': { resolveSelectedHeadContext: async () => null },
    '@/app/api/helpers/staff-task-access': { hasStaffTaskAccess: async () => false },
    '@/app/api/helpers/project-task-teams': {
      canManageProjectTaskActivities: async () => manager,
      canAssignProjectTaskActivities: async () => true,
    },
    '@/app/api/helpers/activity-status-access': { canChangeActivityStatus: () => true },
    '@/app/api/helpers/task-activity-notifications': { notifyTaskActivityChange: async () => {} },
    '@/models/activity_comments.model': { default: { find: () => chain([]), deleteMany: async () => {} } },
    '@/models/activity_comment_reads.model': { default: { deleteMany: async () => {} } },
    '@/app/api/helpers/activity-comment-attachments': { deleteActivityCommentAttachments: async () => {} },
    'next/server': { NextResponse },
  };
  mocks['@/app/api/helpers/activity-schedule-access'] = load('app/api/helpers/activity-schedule-access.ts', mocks);
  mocks['@/app/api/helpers/activity-schedule-update'] = load('app/api/helpers/activity-schedule-update.ts', mocks);
  return { state, mocks, request: async (route, method, body) => {
    const api = load(`app/api/task/project-task/${route}/route.ts`, mocks);
    return api[method](new NextRequest('http://localhost/api/task?activity_id=activity', {
      method, ...(body ? { body: JSON.stringify(body) } : {}),
    }));
  } };
}

test('activity add validates before writing and recalculates after success', async () => {
  for (const dates of [{}, { ...pair, end_date: 'bad' }, pair]) {
    const f = routeFixture();
    const res = await f.request('add-activity', 'POST', { task_id: 'task', activity: 'Example', ...dates });
    assert.equal(res.status, dates === pair ? 201 : 400);
    assert.equal(f.state.recalculated.length, dates === pair ? 1 : 0);
    if (dates !== pair) assert.equal(f.state.writes.length, 0);
  }
});

test('schedule-only edits enforce management permission and validate both dates', async () => {
  for (const project of [false, true]) {
    for (const allowed of [false, true]) {
      const f = routeFixture({ project, manager: allowed, admin: allowed });
      const res = await f.request('edit-activity', 'PUT', { activity_id: 'activity', start_date: '2099-01-01T08:00:00.000Z', end_date: '2099-01-01T09:00:00.000Z', expected_start_date: null, expected_end_date: null });
      assert.equal(res.status, allowed ? 200 : 403);
      assert.equal(f.state.writes.length, allowed ? 1 : 0);
      assert.equal(f.state.recalculated.length, allowed ? 1 : 0);
    }
  }
  const f = routeFixture();
  const invalid = await f.request('edit-activity', 'PUT', { activity_id: 'activity', start_date: pair.start_date });
  assert.equal(invalid.status, 400);
  assert.equal(f.state.writes.length, 0);
});

test('assignment/status-only changes need no dates and do not recalculate', async () => {
  for (const change of [{ assigned_skill: null }, { is_status: true, is_done: false }]) {
    const f = routeFixture();
    const res = await f.request('edit-activity', 'PUT', { activity_id: 'activity', ...change });
    assert.equal(res.status, 200);
    assert.equal(f.state.recalculated.length, 0);
  }
});

test('activity deletion recalculates the owning task', async () => {
  const f = routeFixture();
  const res = await f.request('delete-activity', 'DELETE');
  assert.equal(res.status, 203);
  assert.deepEqual(f.state.recalculated, ['task']);
});

test('task editing ignores manually supplied task dates', async () => {
  const f = routeFixture();
  const res = await f.request('edit-task', 'PUT', { task_id: 'task', task_name: 'Updated', ...pair });
  assert.equal(res.status, 200);
  const fields = f.state.writes[0].$set;
  assert.equal(Object.hasOwn(fields, 'start_date'), false);
  assert.equal(Object.hasOwn(fields, 'end_date'), false);
});

test('calendar feed excludes unscheduled tasks and keeps exact calculated timestamps', async () => {
  const taskRows = [
    { _id: 'scheduled', start_date: d(pair.start_date), end_date: d(pair.end_date) },
    { _id: 'empty', createdAt: d(pair.start_date), start_date: null, end_date: null },
    { _id: 'partial', createdAt: d(pair.start_date), start_date: d(pair.start_date), end_date: null },
  ];
  const mocks = {
    '@/auth': { auth: async () => ({ user: { id: 'actor' } }) },
    '@/lib/mongo': { default: () => {} },
    '@/app/api/helpers/resolve-user-business': { resolveActiveBusinessIdForUser: async () => 'business' },
    '@/lib/constants': { HEAD_ROLES: [] },
    '@/models/business_tasks.model': { default: { find: () => ({
      populate() { return this; }, sort() { return this; }, lean: async () => taskRows,
    }) } },
  };
  for (const model of ['calendar_events.model', 'eq_enquiry_histories', 'project_team.model',
    'project_team_members.model', 'region_staffs.model', 'area_staffs.model', 'location_staffs.model',
    'region_dep_staffs.model', 'area_dep_staffs.model', 'location_dep_staffs.model',
    'eq_enquiries.model', 'eq_camps.model', 'eq_camp_headoffice.model']) mocks[`@/models/${model}`] = {};
  const api = load('app/api/calendar/feed/route.ts', mocks);
  const response = await api.GET(new NextRequest('http://localhost/api/calendar/feed?includeEnquiries=false&includeCustomEvents=false', {
    headers: { cookie: `user_role=${JSON.stringify({ role_name: 'BUSINESS_ADMIN' })}` },
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.items.map(item => item.sourceId), ['scheduled']);
  assert.equal(body.items[0].start, pair.start_date);
  assert.equal(body.items[0].end, pair.end_date);
});

test('both task creation APIs initialize dates to null without requiring a schedule', async () => {
  for (const includeDates of [false, true]) {
    const f = routeFixture();
    let saved;
    f.mocks['@/models/business_tasks.model'] = { default: Object.assign(class {
      constructor(value) { Object.assign(this, value); }
      async save() { saved = this; return { ...this, _id: 'new-task' }; }
    }, { create: async value => { saved = value; return { ...value, _id: 'new-task' }; } }) };
    Object.assign(f.mocks, {
      '@/models/fcm_tokens.model': {},
      '@/models/notifications.model': {},
      '@/lib/firebaseAdmin': {},
      '@/app/api/helpers/project-access': { authorizeProjectRequest: async () => ({
        ok: true, userId: 'actor', access: { canCreateTasks: true, canViewAllTeams: true, project: { business_id: 'business' } },
      }) },
      '@/models/project_team.model': { default: { find: () => chain([{ _id: '111111111111111111111111' }]) } },
      '@/models/project_team_members.model': {},
      '@/models/Flow_Log.model': { default: { create: async () => {} } },
      '@/app/api/helpers/task-assignment-summary': {},
      '@/app/api/helpers/task-filter-scope': {},
      '@/app/api/helpers/task-list-status': {},
    });
    const dates = includeDates ? pair : {};
    const res = await f.request('add-task', 'POST', { task_name: 'New task', is_project_task: false, ...dates });
    assert.equal(res.status, 201);
    assert.equal(saved.start_date, null);
    assert.equal(saved.end_date, null);
    const project = load('app/api/project/tasks/[projectid]/route.ts', f.mocks);
    const response = await project.POST(new NextRequest('http://localhost/api/project/tasks/111111111111111111111111', {
      method: 'POST', body: JSON.stringify({ task_name: 'New project task', priority: 'normal', team_ids: ['111111111111111111111111'], ...dates }),
    }), { params: Promise.resolve({ projectid: '111111111111111111111111' }) });
    assert.equal(response.status, 201);
    assert.equal(saved.start_date, null);
    assert.equal(saved.end_date, null);
  }
});

test('MongoDB integration: stored boundaries, overdue precision, and migration', {
  skip: !process.env.TASK_TIMELINE_TEST_MONGO_URI,
}, async () => {
  const mongoose = require('mongoose');
  const { randomUUID } = require('node:crypto');
  const dbName = `task_timeline_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await mongoose.createConnection(process.env.TASK_TIMELINE_TEST_MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const taskSchema = load('models/business_tasks.model.ts').default.schema;
    const activitySchema = load('models/task_activities.model.ts').default.schema;
    const Tasks = connection.model('business_tasks', taskSchema);
    const Activities = connection.model('task_activities', activitySchema);
    const timeline = load('app/api/helpers/task-timeline.ts', {
      '@/models/business_tasks.model': { default: Tasks },
      '@/models/task_activities.model': { default: Activities },
    });
    const task = await Tasks.create({ business_id: new mongoose.Types.ObjectId(), activity_count: 2, status: 'To Do' });
    const first = await Activities.create({ task_id: task._id, ...pair, createdAt: d('2026-01-01') });
    const last = await Activities.create({ task_id: task._id, start_date: d('2026-09-10'), end_date: d('2026-09-11'), createdAt: d('2026-01-02') });
    await timeline.recalculateTaskTimeline(task._id);
    let stored = await Tasks.findById(task._id).lean();
    assert.equal(stored.start_date.toISOString(), pair.start_date);
    assert.equal(stored.end_date.toISOString(), last.end_date.toISOString());
    const { getTaskStatusAggregationStages } = load('app/api/helpers/task-list-status.ts');
    const statusAt = async now => (await Tasks.aggregate([
      { $match: { _id: task._id } }, ...getTaskStatusAggregationStages(now),
    ]))[0].__displayStatus;
    assert.equal(await statusAt(new Date(last.end_date.getTime() - 1)), 'To Do');
    assert.equal(await statusAt(last.end_date), 'To Do');
    assert.equal(await statusAt(new Date(last.end_date.getTime() + 1)), 'Pending');
    await Tasks.updateOne({ _id: task._id }, { $set: { completed_activity: 2 } });
    assert.equal(await statusAt(d('2027-01-01')), 'Completed');
    await Tasks.updateOne({ _id: task._id }, { $set: { status: 'Cancelled' } });
    assert.equal(await statusAt(d('2027-01-01')), 'Cancelled');
    await Activities.deleteOne({ _id: last._id });
    await timeline.recalculateTaskTimeline(task._id);
    stored = await Tasks.findById(task._id).lean();
    assert.equal(stored.end_date.toISOString(), first.end_date.toISOString());
    await Activities.deleteOne({ _id: first._id });
    await timeline.recalculateTaskTimeline(task._id);
    await Tasks.updateOne({ _id: task._id }, { $set: { completed_activity: 0, status: 'To Do' } });
    assert.equal(await statusAt(d('2027-01-01')), 'To Do');
    stored = await Tasks.findById(task._id).lean();
    assert.equal(stored.start_date, null);
    assert.equal(stored.end_date, null);

    const { migrateTaskActivityTimelines } = await import('../../scripts/migrate-task-activity-timelines.mjs');
    await Tasks.updateOne({ _id: task._id }, { $set: { start_date: d(pair.start_date), end_date: d(pair.end_date) } });
    await Activities.collection.insertOne({ task_id: task._id, createdAt: d('2026-01-01') });
    await migrateTaskActivityTimelines(connection, false);
    assert.equal(await Activities.collection.countDocuments({ start_date: { $exists: false } }), 1);
    await migrateTaskActivityTimelines(connection, true);
    const inherited = await Activities.collection.findOne({ task_id: task._id });
    assert.equal(inherited.start_date.toISOString(), pair.start_date);
    assert.equal(inherited.end_date.toISOString(), pair.end_date);
    await migrateTaskActivityTimelines(connection, true);
    assert.equal((await Activities.collection.findOne({ task_id: task._id })).createdAt.toISOString(), '2026-01-01T00:00:00.000Z');
  } finally {
    // Only the randomly named database created by this test is removed.
    await connection.dropDatabase();
    await connection.close();
  }
});

test('legacy migration copies exact timestamps, preserves existing schedules, and is safe to repeat', async () => {
  const { planTaskTimelineMigration } = await import('../../scripts/migrate-task-activity-timelines.mjs');
  const task = { start_date: d('2026-09-15T08:01:02.123Z'), end_date: d(pair.end_date) };
  const rows = [{ _id: 'a', createdAt: d('2026-01-01') }, { _id: 'b', createdAt: d('2026-01-02'), start_date: d('2026-09-17'), end_date: d('2026-09-18') }];
  const plan = planTaskTimelineMigration(task, rows);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].fields.start_date, task.start_date);
  assert.equal(plan.timeline.start_date, task.start_date);
  assert.equal(plan.timeline.end_date, rows[1].end_date);
  Object.assign(rows[0], plan.updates[0].fields);
  const rerun = planTaskTimelineMigration(plan.timeline, rows);
  assert.equal(rerun.updates.length, 0);
  assert.deepEqual(rerun.timeline, plan.timeline);
  assert.deepEqual(planTaskTimelineMigration(task, []).timeline, { start_date: null, end_date: null });
  const missing = planTaskTimelineMigration({ start_date: null, end_date: 'invalid' }, [{ _id: 'legacy' }]);
  assert.deepEqual(missing.timeline, { start_date: null, end_date: null });
  assert.equal(missing.missingLegacyDates, true);
  const explicitNull = planTaskTimelineMigration(task, [{ _id: 'a', start_date: null, end_date: null }]);
  assert.equal(explicitNull.updates.length, 0);
});

test('migration dry run makes no writes and apply preserves creation timestamps', async () => {
  const { migrateTaskActivityTimelines } = await import('../../scripts/migrate-task-activity-timelines.mjs');
  const task = { _id: 'task', start_date: d(pair.start_date), end_date: d(pair.end_date), createdAt: d('2026-01-01') };
  const row = { _id: 'activity', task_id: 'task', createdAt: d('2026-02-01'), updatedAt: d('2026-03-01') };
  let writes = 0;
  const db = { collection: name => name === 'business_tasks' ? {
    find: async function* () { yield task; },
    updateOne: async (_, update) => { writes++; Object.assign(task, update.$set); },
  } : {
    find: () => ({ toArray: async () => [row] }),
    bulkWrite: async updates => { writes++; Object.assign(row, updates[0].updateOne.update.$set); },
  } };
  const before = plain({ task, row });
  await migrateTaskActivityTimelines(db);
  assert.equal(writes, 0);
  assert.deepEqual(plain({ task, row }), before);
  await migrateTaskActivityTimelines(db, true);
  assert.equal(row.start_date, task.start_date);
  assert.equal(row.end_date, task.end_date);
  assert.equal(row.createdAt.toISOString(), before.row.createdAt);
  assert.equal(row.updatedAt.toISOString(), before.row.updatedAt);
  const after = plain({ task, row });
  await migrateTaskActivityTimelines(db, true);
  assert.deepEqual(plain({ task, row }), after);
});
