const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Date, URL, console, require: name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/lib/')) return load(`${name.slice(2)}.ts`, mocks);
    if (name.startsWith('@/')) throw new Error(`Missing mock: ${name}`);
    return require(name);
  } }, { filename });
  return exports;
}

const { getScheduleChange, scheduleTimestamp } = load('lib/activity-deadline.ts');
const now = new Date('2030-01-01T12:00:00Z');
const currentPeriod = { start_date: '2030-01-01T08:00:00Z', end_date: '2030-01-01T16:00:00Z', is_done: false };

test('deadline rules distinguish extensions, shortening, rescheduling, initialization and no-op', () => {
  const cases = [
    [currentPeriod, { ...currentPeriod, end_date: '2030-01-01T17:00:00Z' }, 'deadline_extended'],
    [currentPeriod, { ...currentPeriod, end_date: '2030-01-01T14:00:00Z' }, 'deadline_shortened'],
    [currentPeriod, { ...currentPeriod, start_date: '2030-01-01T09:00:00Z' }, 'schedule_updated'],
    [{ start_date: null, end_date: null }, currentPeriod, 'schedule_set'],
    [currentPeriod, currentPeriod, null],
    [{ ...currentPeriod, end_date: '2030-01-01T10:00:00Z' }, currentPeriod, 'deadline_extended'],
    [{ ...currentPeriod, is_done: true }, currentPeriod, null],
  ];
  for (const [current, next, action] of cases) {
    const result = getScheduleChange(current, next, now);
    assert.equal(result.error, undefined);
    assert.equal(result.action, action);
  }
});

test('deadline rules reject past/equal-now deadlines, invalid ranges, shortening overdue and completed changes', () => {
  for (const [current, next] of [
    [currentPeriod, { ...currentPeriod, end_date: now }],
    [currentPeriod, { ...currentPeriod, end_date: '2030-01-01T11:00:00Z' }],
    [{ ...currentPeriod, end_date: '2030-01-01T10:00:00Z' }, { ...currentPeriod, end_date: '2030-01-01T11:00:00Z' }],
    [{ ...currentPeriod, end_date: '2030-01-01T10:00:00Z' }, { ...currentPeriod, end_date: '2030-01-01T09:00:00Z' }],
    [currentPeriod, { start_date: '2030-01-02T08:00:00Z', end_date: currentPeriod.end_date }],
    [currentPeriod, { ...currentPeriod, end_date: 'invalid' }],
    [currentPeriod, { ...currentPeriod, end_date: null }],
    [{ ...currentPeriod, is_done: true }, { ...currentPeriod, end_date: '2030-01-01T17:00:00Z' }],
    [{ ...currentPeriod, is_done: true }, { ...currentPeriod, start_date: '2030-01-01T09:00:00Z' }],
  ]) assert.ok(getScheduleChange(current, next, now).error);
});

const activityId = '111111111111111111111111';
const actorId = '222222222222222222222222';
const future = { start_date: '2099-01-01T08:00:00.000Z', end_date: '2099-01-01T16:00:00.000Z' };
const query = value => ({ select() { return this; }, lean: async () => structuredClone(value), then: (resolve, reject) => Promise.resolve(structuredClone(value)).then(resolve, reject) });

function fixture({ allowed = true, project = false, admin = true, creator = false, head = false, staffAccess = false } = {}) {
  const state = {
    current: { _id: activityId, task_id: 'task', ...future, is_done: false, schedule_history: [] },
    actor: { _id: actorId, name: 'Original Editor', status: 1 },
    task: { _id: 'task', business_id: 'business', is_project_task: project, creator: creator ? actorId : 'creator' },
    writes: 0, recalculations: 0, conflict: false, completeDuringSave: false,
  };
  const mocks = {
    '@/lib/mongo': { default: async () => {} },
    '@/auth': { auth: async () => ({ user: { id: actorId } }) },
    '@/models/users.model': { default: { findById: () => query(state.actor) } },
    '@/models/business_tasks.model': { default: { findById: () => query(state.task) } },
    '@/models/task_activities.model': { default: {
      findById: () => query(state.current),
      findByIdAndUpdate: async (_, update) => { state.writes++; Object.assign(state.current, update.$set); return state.current; },
      findOneAndUpdate: async (filter, update) => {
        if (state.completeDuringSave) state.current.is_done = true;
        if (state.conflict || filter.is_done !== state.current.is_done ||
          scheduleTimestamp(filter.start_date) !== scheduleTimestamp(state.current.start_date) ||
          scheduleTimestamp(filter.end_date) !== scheduleTimestamp(state.current.end_date)) return null;
        state.writes++;
        Object.assign(state.current, update.$set);
        if (update.$push) state.current.schedule_history.push(update.$push.schedule_history);
        return structuredClone(state.current);
      },
    } },
    '@/models/admin_assign_business.model': { default: { exists: async () => allowed && admin } },
    '@/models/business_staffs.model': {},
    '@/models/Flow_Log.model': {},
    '@/app/api/helpers/activity-status-access': {},
    '@/app/api/helpers/head-reassignment-scope': { resolveSelectedHeadContext: async () => head ? {} : null },
    '@/app/api/helpers/staff-task-access': { hasStaffTaskAccess: async () => staffAccess },
    '@/app/api/helpers/project-task-teams': { canManageProjectTaskActivities: async () => allowed, canAssignProjectTaskActivities: async () => allowed },
    '@/app/api/helpers/task-timeline': { recalculateTaskTimeline: async () => state.recalculations++ },
    '@/app/api/helpers/task-activity-notifications': {},
  };
  mocks['@/app/api/helpers/activity-schedule-access'] = load('app/api/helpers/activity-schedule-access.ts', mocks);
  mocks['@/app/api/helpers/activity-schedule-update'] = load('app/api/helpers/activity-schedule-update.ts', mocks);
  const route = load('app/api/task/activities/[activityId]/deadline/route.ts', mocks);
  const edit = load('app/api/task/project-task/edit-activity/route.ts', mocks);
  const expected = () => ({ expected_start_date: state.current.start_date, expected_end_date: state.current.end_date });
  return {
    state, mocks, expected,
    send: body => route.PUT(new NextRequest('http://localhost/api/task/activities/111111111111111111111111/deadline', { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ activityId }) }),
    edit: body => edit.PUT(new NextRequest('http://localhost/api/task/project-task/edit-activity', { method: 'PUT', body: JSON.stringify({ activity_id: activityId, ...body }) })),
  };
}

test('deadline endpoint records trusted actor, exact previous/new period and server time', async () => {
  const f = fixture();
  const before = Date.now();
  const response = await f.send({ ...f.expected(), end_date: '2099-01-01T18:00:00.000Z', actor_id: 'forged', actor_name: 'Forged', createdAt: '1900-01-01' });
  assert.equal(response.status, 200);
  assert.equal(f.state.writes, 1);
  assert.equal(f.state.recalculations, 1);
  const entry = f.state.current.schedule_history[0];
  assert.equal(entry.action, 'deadline_extended');
  assert.equal(entry.actor_id, actorId);
  assert.equal(entry.actor_name, 'Original Editor');
  assert.equal(entry.previous_start_date, future.start_date);
  assert.equal(entry.previous_end_date, future.end_date);
  assert.equal(entry.new_start_date.toISOString(), future.start_date);
  assert.equal(entry.new_end_date.toISOString(), '2099-01-01T18:00:00.000Z');
  assert.ok(entry.createdAt.getTime() >= before && entry.createdAt.getTime() <= Date.now());
});

test('both deadline and regular edit endpoints audit shortening, extension and start-only edits', async () => {
  for (const regular of [false, true]) {
    const f = fixture();
    const send = body => regular ? f.edit({ ...body, start_date: future.start_date }) : f.send(body);
    assert.equal((await send({ ...f.expected(), end_date: '2099-01-01T14:00:00.000Z' })).status, 200);
    assert.equal((await send({ ...f.expected(), end_date: '2099-01-01T19:00:00.000Z' })).status, 200);
    assert.deepEqual(f.state.current.schedule_history.map(entry => entry.action), ['deadline_shortened', 'deadline_extended']);
    assert.equal((await f.edit({ ...f.expected(), start_date: '2099-01-01T09:00:00.000Z', end_date: '2099-01-01T19:00:00.000Z' })).status, 200);
    assert.equal(f.state.current.schedule_history[2].action, 'schedule_updated');
  }
});

test('completed activities require reopening, but unchanged schedules allow content edits without history', async () => {
  const f = fixture();
  f.state.current.is_done = true;
  const body = { ...f.expected(), end_date: '2099-01-01T18:00:00.000Z' };
  assert.equal((await f.send(body)).status, 400);
  assert.equal((await f.edit({ ...body, start_date: future.start_date })).status, 400);
  assert.equal(f.state.writes, 0);
  assert.equal((await f.edit({ ...future, description: 'Content edit only' })).status, 200);
  assert.equal(f.state.current.description, 'Content edit only');
  assert.equal(f.state.current.schedule_history.length, 0);
  f.state.current.is_done = false;
  assert.equal((await f.send(body)).status, 200);
  assert.equal(f.state.current.schedule_history.length, 1);
});

test('overdue unchanged schedules remain editable; legacy schedules must be initialized in Edit Activity', async () => {
  const f = fixture();
  f.state.current.start_date = '2020-01-01T08:00:00.000Z';
  f.state.current.end_date = '2020-01-01T16:00:00.000Z';
  assert.equal((await f.edit({ start_date: f.state.current.start_date, end_date: f.state.current.end_date, description: 'Overdue content edit' })).status, 200);
  assert.equal(f.state.current.schedule_history.length, 0);
  f.state.current.start_date = null;
  f.state.current.end_date = null;
  assert.equal((await f.send({ ...f.expected(), end_date: future.end_date })).status, 400);
  assert.equal((await f.edit({ ...f.expected(), ...future })).status, 200);
  assert.equal(f.state.current.schedule_history[0].action, 'schedule_set');
  assert.equal(f.state.current.schedule_history[0].previous_start_date, null);
});

test('permissions remain limited to existing editors on both write paths', async () => {
  for (const options of [{ allowed: false }, { project: true, allowed: false },
    { admin: false, head: false, staffAccess: true }]) {
    const f = fixture(options);
    const body = { ...f.expected(), end_date: '2099-01-01T18:00:00.000Z' };
    assert.equal((await f.send(body)).status, 403);
    assert.equal((await f.edit({ ...body, start_date: future.start_date })).status, 403);
    assert.equal(f.state.writes, 0);
  }
  for (const options of [{ admin: false, creator: true }, { admin: false, head: true, staffAccess: true }, { project: true }]) {
    const f = fixture(options);
    assert.equal((await f.send({ ...f.expected(), end_date: '2099-01-01T18:00:00.000Z' })).status, 200);
  }
});

test('stale expectations, concurrent edits and completion races cannot overwrite schedules or audit entries', async () => {
  const f = fixture();
  const expected = f.expected();
  const responses = await Promise.all([
    f.send({ ...expected, end_date: '2099-01-01T18:00:00.000Z' }),
    f.edit({ ...expected, start_date: future.start_date, end_date: '2099-01-01T19:00:00.000Z' }),
  ]);
  assert.deepEqual(responses.map(res => res.status).sort(), [200, 409]);
  assert.equal(f.state.current.schedule_history.length, 1);
  assert.equal(f.state.writes, 1);
  assert.equal((await f.send({ ...expected, end_date: '2099-01-01T20:00:00.000Z' })).status, 409);
  const race = fixture();
  race.state.completeDuringSave = true;
  assert.equal((await race.send({ ...race.expected(), end_date: '2099-01-01T18:00:00.000Z' })).status, 409);
  assert.equal(race.state.current.schedule_history.length, 0);
});

test('no-op creates no history, and invalid or missing expected timestamps are rejected', async () => {
  const f = fixture();
  assert.equal((await f.send({ ...f.expected(), end_date: future.end_date })).status, 200);
  assert.equal(f.state.writes, 0);
  for (const body of [{ end_date: '2099-01-01T18:00:00.000Z' }, { ...f.expected(), end_date: 'bad' },
    { ...f.expected(), end_date: '2020-01-01T10:00:00Z' }, { ...f.expected(), expected_end_date: 'bad', end_date: future.end_date }]) {
    assert.equal((await f.send(body)).status, 400);
  }
  assert.equal(f.state.writes, 0);
});

test('history merges existing events and schedule events, preserving actor snapshots after deletion', () => {
  const { buildActivityHistory } = load('lib/activity-history.ts');
  const activity = { _id: activityId, createdAt: '2030-01-01', assigned_to: { _id: 'staff', name: 'Staff' },
    reassignment_history: [{ _id: 'reassigned', action: 'reassigned', createdAt: '2030-01-02', recipient_id: { _id: 'recipient' } }],
    schedule_history: [{ _id: 'schedule', action: 'deadline_extended', actor_id: null, actor_name: 'Deleted Editor', createdAt: '2030-01-03', previous_start_date: '2030-01-01', previous_end_date: '2030-01-02', new_start_date: '2030-01-01', new_end_date: '2030-01-04' }],
  };
  const result = buildActivityHistory(activity, { _id: 'creator', name: 'Creator' });
  assert.equal(result.length, 4);
  assert.equal(result[0].event_label, 'Deadline extended');
  assert.equal(result[0].event_user.name, 'Deleted Editor');
  assert.equal(result[1].event_type, 'reassigned');
  assert.equal(result[2].event_type, 'assigned');
  assert.equal(result[3].event_type, 'created');
  assert.equal(buildActivityHistory({ _id: 'legacy' }, null).length, 0);
  activity.schedule_history.push({ ...activity.schedule_history[0], _id: 'new', createdAt: '2030-01-05' });
  assert.equal(buildActivityHistory(activity, null)[0]._id, 'new');
});

test('MongoDB: schedule and audit commit together; competing writes cannot lose history', { skip: !process.env.TASK_TIMELINE_TEST_MONGO_URI }, async () => {
  const mongoose = require('mongoose');
  const dbName = `activity_deadline_test_${require('node:crypto').randomUUID().replaceAll('-', '')}`;
  const connection = await mongoose.createConnection(process.env.TASK_TIMELINE_TEST_MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const Activities = connection.model('task_activities', load('models/task_activities.model.ts').default.schema);
    const Tasks = connection.model('business_tasks', load('models/business_tasks.model.ts').default.schema);
    const mocks = { '@/models/task_activities.model': { default: Activities }, '@/models/business_tasks.model': { default: Tasks } };
    mocks['@/app/api/helpers/task-timeline'] = load('app/api/helpers/task-timeline.ts', mocks);
    const { updateActivitySchedule } = load('app/api/helpers/activity-schedule-update.ts', mocks);
    const task = await Tasks.create({ business_id: new mongoose.Types.ObjectId() });
    const first = await Activities.create({ task_id: task._id, ...future, is_done: false, createdAt: new Date('2030-01-01') });
    const last = await Activities.create({ task_id: task._id, ...future, is_done: false, createdAt: new Date('2030-01-02') });
    const body = { ...future, end_date: '2099-01-01T18:00:00.000Z', expected_start_date: future.start_date, expected_end_date: future.end_date };
    const actor = { _id: actorId, name: 'Database Editor' };
    const responses = await Promise.all([
      updateActivitySchedule({ current: last.toObject(), body, actor }),
      updateActivitySchedule({ current: last.toObject(), body: { ...body, end_date: '2099-01-01T19:00:00.000Z' }, actor }),
    ]);
    assert.deepEqual(responses.map(res => res.status).sort(), [200, 409]);
    let stored = await Activities.findById(last._id).lean();
    assert.equal(stored.schedule_history.length, 1);
    assert.equal(stored.schedule_history[0].actor_name, actor.name);
    assert.equal(stored.schedule_history[0].actor_id.toString(), actorId);
    assert.equal(stored.createdAt.toISOString(), '2030-01-02T00:00:00.000Z');
    const taskEnd = (await Tasks.findById(task._id).lean()).end_date.toISOString();
    assert.equal(taskEnd, stored.end_date.toISOString());
    await updateActivitySchedule({ current: first.toObject(), body: { ...body, end_date: '2099-02-01T18:00:00.000Z' }, actor });
    assert.equal((await Tasks.findById(task._id).lean()).end_date.toISOString(), taskEnd);
    await updateActivitySchedule({ current: stored, body: { ...body, expected_end_date: stored.end_date.toISOString(), end_date: '2099-01-01T14:00:00.000Z' }, actor });
    stored = await Activities.findById(last._id).lean();
    assert.equal(stored.schedule_history.length, 2);
    assert.equal(stored.schedule_history[1].action, 'deadline_shortened');
    assert.equal((await Tasks.findById(task._id).lean()).end_date.toISOString(), '2099-01-01T14:00:00.000Z');
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
});
