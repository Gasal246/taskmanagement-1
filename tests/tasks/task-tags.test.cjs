require('../enquiries/register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const { parseTaskTags, validateTaskTags, taskTagSearchFilter } = require('../../lib/task-tags.ts');

test('hashtag parsing preserves phrases and removes empty and duplicate tags', () => {
  assert.deepEqual(parseTaskTags('#Gasal #Muhammed Gasal #Something #Hello there'), ['Gasal', 'Muhammed Gasal', 'Something', 'Hello there']);
  assert.deepEqual(parseTaskTags('## Gasal  #gasal # Muhammed   Gasal #'), ['Gasal', 'Muhammed Gasal']);
  assert.deepEqual(validateTaskTags(undefined), []);
  for (const value of [null, '#Gasal', [42], Array.from({ length: 101 }, (_, i) => `tag ${i}`)]) {
    assert.throws(() => validateTaskTags(value), /Invalid tags/);
  }
});

test('tag searches require every exact phrase, ignore case and treat regex characters literally', () => {
  const filter = taskTagSearchFilter('#Gasal #Muhammed Gasal');
  assert.equal(filter.tags.$all.length, 2);
  assert.equal(filter.tags.$all[0].test('gAsAl'), true);
  assert.equal(filter.tags.$all[0].test('Muhammed Gasal'), false);
  assert.equal(filter.tags.$all[1].test('Muhammed Gasal extra'), false);
  const literal = taskTagSearchFilter('#[hello].*').tags.$all[0];
  assert.equal(literal.test('[hello].*'), true);
  assert.equal(literal.test('hello'), false);
  assert.deepEqual(taskTagSearchFilter('###'), { _id: { $in: [] } });
  assert.equal(taskTagSearchFilter('ordinary task'), null);
  assert.throws(() => taskTagSearchFilter('#' + 'a'.repeat(200)), /Invalid search/);
});

const uri = process.env.SECURITY_TEST_MONGO_URI;
before(async () => {
  if (uri) await mongoose.connect(uri, { dbName: `task_tags_${randomUUID().replaceAll('-', '')}` });
});
after(async () => {
  if (!uri) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('admin and staff tag search filters before pagination and edit persists additions and removals', { skip: !uri }, async () => {
  const Tasks = require('../../models/business_tasks.model.ts').default;
  const Users = require('../../models/users.model.ts').default;
  const Admins = require('../../models/admin_assign_business.model.ts').default;
  const { GET: adminGet } = require('../../app/api/task/admin-task/get-filtered/route.ts');
  const { GET: staffGet } = require('../../app/api/task/staff-task/get-filtered/route.ts');
  const { PUT: edit } = require('../../app/api/task/project-task/edit-task/route.ts');
  const user = await Users.create({ name: 'Tag tester', email: 'tags@example.com' });
  const businessId = new mongoose.Types.ObjectId();
  await Admins.create({ business_id: businessId, user_id: user._id });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const common = { business_id: businessId, creator: user._id, assigned_to: user._id, is_project_task: false, status: 'To Do' };
  const rows = await Tasks.create([
    { ...common, task_name: 'Both tags', tags: ['Gasal', 'Muhammed Gasal'] },
    { ...common, task_name: 'Case insensitive', tags: ['gasal', 'MUHAMMED GASAL'] },
    { ...common, task_name: 'One tag', tags: ['Gasal'] },
    { ...common, task_name: 'Partial only', tags: ['Gasal extra', 'Muhammed Gasal'] },
    { ...common, task_name: 'Legacy task' },
    { ...common, task_name: 'Hidden from staff', assigned_to: new mongoose.Types.ObjectId(), creator: new mongoose.Types.ObjectId(), tags: ['Gasal', 'Muhammed Gasal'] },
    { ...common, business_id: new mongoose.Types.ObjectId(), task_name: 'Other business', tags: ['Gasal', 'Muhammed Gasal'] },
  ]);
  assert.deepEqual(rows[4].tags, []);
  for (const [get, params, total] of [
    [adminGet, { business_id: String(businessId) }, 3],
    [staffGet, { taskType: 'all' }, 3], // The actor also owns the other-business task.
  ]) {
    const query = new URLSearchParams({ ...params, nameQuery: '#Gasal #Muhammed Gasal', limit: '1', page: '2' });
    const response = await get(new NextRequest(`http://localhost/tasks?${query}`));
    assert.equal(response.status, 200, await response.clone().text());
    const body = await response.json();
    assert.equal(body.pagination.total, total);
    assert.equal(body.pagination.totalPages, total);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].tags.length, 2);
    assert.equal(body.summary.toDo, total);
  }
  const update = tags => edit(new NextRequest('http://localhost/edit-task', {
    method: 'PUT', body: JSON.stringify({ task_id: String(rows[0]._id), task_name: 'Both tags', tags }),
  }));
  assert.equal((await update(['#Edited phrase', 'edited PHRASE'])).status, 200);
  assert.deepEqual((await Tasks.findById(rows[0]._id).lean()).tags, ['Edited phrase']);
  assert.equal((await update([])).status, 200);
  assert.deepEqual((await Tasks.findById(rows[0]._id).lean()).tags, []);
  assert.equal((await update('invalid')).status, 400);
  const unchanged = await edit(new NextRequest('http://localhost/edit-task', { method: 'PUT', body: JSON.stringify({ task_id: String(rows[1]._id), task_name: 'Updated title' }) }));
  assert.equal(unchanged.status, 200);
  assert.deepEqual((await Tasks.findById(rows[1]._id).lean()).tags, ['gasal', 'MUHAMMED GASAL']);
});
