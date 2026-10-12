const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const chain = value => ({
  select() { return this; },
  session() { return this; },
  lean: async () => value,
});

test('assignment notifications go to activity members but not admins or the actor', async () => {
  const filename = path.resolve(__dirname, '../../app/api/helpers/task-activity-notifications.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const enqueued = [];
  const mocks = {
    '@/models/admin_assign_business.model': { default: { find: () => chain([{ user_id: 'admin' }]) } },
    '@/models/business_tasks.model': { default: { findById: () => chain({ task_name: 'Task', business_id: 'business', is_project_task: false }) } },
    '@/models/business_project.model': { default: {} },
    '@/models/project_team.model': { default: {} },
    '@/lib/jobs/enqueue': { enqueueNotifications: async notifications => enqueued.push(...notifications) },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, require: name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } });

  await exports.notifyTaskActivityAssignmentChange({
    taskId: 'task', activityId: 'activity', activityTitle: 'Inspect site', action: 'assigned',
    targetName: 'New Member', participantIds: ['admin', 'actor', 'existing', 'new-member'], actorId: 'actor',
  });

  assert.deepEqual(enqueued.map(row => row.recipient_id), ['existing', 'new-member']);
  assert.ok(enqueued.every(row => row.title === 'Activity member added'));
  assert.ok(enqueued.every(row => row.data.action === 'assigned'));

  enqueued.length = 0;
  await exports.notifyTaskActivityAssignmentChange({
    taskId: 'task', activityId: 'activity', activityTitle: 'Inspect site', action: 'removed',
    targetName: 'Former Member', participantIds: ['admin', 'actor', 'existing', 'former-member'], actorId: 'actor',
  });
  assert.deepEqual(enqueued.map(row => row.recipient_id), ['existing', 'former-member']);
  assert.ok(enqueued.every(row => row.title === 'Activity member removed'));
  assert.ok(enqueued.every(row => row.data.action === 'removed'));
});
