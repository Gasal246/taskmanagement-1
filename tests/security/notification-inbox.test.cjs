require('../enquiries/register.cjs');
global.testRealJobs = true;
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const Inbox = require('../../models/notifications.model.ts').default;
const Jobs = require('../../models/background_jobs.model.ts').default;
const Users = require('../../models/users.model.ts').default;
const Tokens = require('../../models/fcm_tokens.model.ts').default;
const Preferences = require('../../models/notification_preferences.model.ts').default;
const Tasks = require('../../models/business_tasks.model.ts').default;
const Requests = require('../../models/eq_head_office_request.model.ts').default;
const { enqueueNotifications, enqueueJob } = require('../../lib/jobs/enqueue.ts');
const { inTransaction } = require('../../lib/jobs/transaction.ts');
const { changeNotificationState } = require('../../lib/notifications/inbox.ts');
const { scheduleNotificationReminders } = require('../../lib/notifications/reminders.ts');
const { claimJob, processJob } = require('../../lib/jobs/worker.ts');
const { GET: list } = require('../../app/api/notifications/route.ts');
const { GET: detail } = require('../../app/api/notifications/[notificationId]/route.ts');
const { POST: send } = require('../../app/api/notifications/send/route.ts');
const { POST: register, DELETE: detach } = require('../../app/api/notifications/fcm-token/route.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = [Inbox, Jobs, Users, Tokens, Preferences, Tasks, Requests];
before(async () => { if (uri) { await mongoose.connect(uri, { dbName: `inbox_${randomUUID().replaceAll('-', '')}` }); await Promise.all(models.map(m => m.init())); } });
beforeEach(async () => { if (uri) await Promise.all(models.map(m => m.deleteMany({}))); global.enquiryTestSession = null; });
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const id = () => new mongoose.Types.ObjectId();
const req = (method, body, query = '') => new Request(`http://localhost/api/notifications${query}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
const login = user => { global.enquiryTestSession = { user: { id: String(user), is_super: true } }; };
const record = user => ({ recipient_id: user, sender_id: null, kind: 'task', title: 'Assigned', body: 'Review this task', data: { event: 'assigned' }, meta: {}, read_at: null });
const push = { notification: { title: 'Assigned', body: 'Review this task' }, data: {} };
const providers = send => ({ messaging: () => ({ sendEachForMulticast: send }), storage: () => { throw Error('unexpected storage provider'); } });

mongoTest('opening paginated inbox preserves old unread items and never changes read state', async () => {
  const user = id(); login(user);
  await Inbox.insertMany(Array.from({ length: 65 }, () => ({ ...record(user), createdAt: new Date('2025-01-01') })));
  await Inbox.create(record(id()));
  let cursor = '', seen = [];
  do {
    const response = await list(req('GET', null, `?filter=unread&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.unreadCount, 65);
    seen.push(...data.notifications.map(n => n.id)); cursor = data.nextCursor;
  } while (cursor);
  assert.equal(new Set(seen).size, 65);
  assert.equal(await Inbox.countDocuments({ recipient_id: user, read_at: null }), 65);
  assert.ok(!Inbox.schema.indexes().some(([keys, options]) => keys.createdAt && options.expireAfterSeconds !== undefined));
});

mongoTest('read, mark-all snapshot, unread and archive isolate recipients and protect newer arrivals', async () => {
  const user = id(), other = id();
  const [first, foreign, newer] = await Inbox.create([{ ...record(user), createdAt: new Date('2026-01-01') }, record(other), { ...record(user), createdAt: new Date('2026-01-03') }]);
  await changeNotificationState(String(user), { ids: [String(first._id), String(foreign._id)], operation: 'read' });
  assert.equal((await Inbox.findById(foreign._id)).read_at, null);
  assert.ok((await Inbox.findById(first._id)).expires_at);
  await changeNotificationState(String(user), { ids: [String(first._id)], operation: 'unread' });
  assert.equal((await Inbox.findById(first._id)).expires_at, null);
  await changeNotificationState(String(user), { all: true, before: '2026-01-02', operation: 'read' });
  assert.equal((await Inbox.findById(newer._id)).read_at, null);
  await assert.rejects(changeNotificationState(String(user), { all: true }), /timestamp/);
  login(user);
  assert.equal((await detail(req('GET'), { params: Promise.resolve({ notificationId: String(foreign._id) }) })).status, 404);
  await changeNotificationState(String(user), { ids: [String(newer._id)], operation: 'archive' });
  assert.equal((await (await list(req('GET'))).json()).notifications.length, 1);
});

mongoTest('inbox and outbox persist atomically before delivery, deduplicate and work without tokens', async () => {
  const user = id();
  await assert.rejects(inTransaction(async session => { await enqueueNotifications([record(user)], push, 'abort', session); throw Error('abort'); }));
  assert.equal(await Inbox.countDocuments(), 0); assert.equal(await Jobs.countDocuments(), 0);
  await enqueueNotifications([record(user)], push, 'stable');
  const item = await Inbox.findOne();
  await changeNotificationState(String(user), { ids: [String(item._id)], operation: 'read' });
  await enqueueNotifications([record(user)], push, 'stable');
  assert.equal(await Inbox.countDocuments(), 1); assert.ok((await Inbox.findOne()).read_at);
  login(user);
  const response = await send(req('POST', { recipientIds: [String(user)], title: 'Saved without devices' }));
  assert.equal(response.status, 202); assert.equal(await Inbox.countDocuments(), 2);
});

mongoTest('device registration reassigns shared browsers and logout cannot remove another account token', async () => {
  const first = id(), second = id(); login(first);
  assert.equal((await register(req('POST', { token: 'shared-browser' }))).status, 200);
  login(second); await register(req('POST', { token: 'shared-browser' }));
  login(first); await detach(req('DELETE', { token: 'shared-browser' }));
  assert.equal(String((await Tokens.findOne()).user_id), String(second));
  login(second); await detach(req('DELETE', { token: 'shared-browser' }));
  assert.equal(await Tokens.countDocuments(), 0);
});

mongoTest('reminders deduplicate concurrently, do not add inbox rows and stop after read or snooze', async () => {
  const user = await Users.create({ email: 'reminder@example.com', status: 1 });
  await Tokens.create({ user_id: user._id, token: 'reminder-device' });
  const now = new Date();
  const item = await Inbox.create({ ...record(user._id), action_required: true, createdAt: new Date(now - 2 * 86400000), next_reminder_at: new Date(now - 1000) });
  await Promise.all([scheduleNotificationReminders(now), scheduleNotificationReminders(now)]);
  assert.equal(await Jobs.countDocuments({ kind: 'push' }), 1); assert.equal(await Inbox.countDocuments(), 1);
  assert.equal((await Inbox.findById(item._id)).reminder_count, 1);
  await changeNotificationState(String(user._id), { ids: [String(item._id)], operation: 'read' });
  let sends = 0;
  await processJob(await claimJob(), providers(async () => { sends++; }));
  assert.equal(sends, 0);
  await changeNotificationState(String(user._id), { ids: [String(item._id)], operation: 'unread' });
  await changeNotificationState(String(user._id), { ids: [String(item._id)], operation: 'snooze', hours: 24 });
  await scheduleNotificationReminders(now);
  assert.equal(await Jobs.countDocuments(), 1);
});

mongoTest('disabled preferences, completed tasks and devices not yet enabled suppress reminders', async () => {
  const user = await Users.create({ email: 'preferences@example.com', status: 1 });
  const now = new Date(), old = new Date(now - 3 * 86400000);
  const item = await Inbox.create({ ...record(user._id), action_required: true, createdAt: old, next_reminder_at: old });
  await scheduleNotificationReminders(now);
  assert.equal((await Inbox.findById(item._id)).reminder_count, 0);
  await Preferences.create({ user_id: user._id, reminders_enabled: false });
  await Inbox.updateOne({}, { $set: { next_reminder_at: old } });
  await scheduleNotificationReminders(now); assert.equal((await Inbox.findById(item._id)).next_reminder_at, null);
  await Preferences.updateOne({}, { $set: { reminders_enabled: true } });
  const task = await Tasks.create({ business_id: id(), task_name: 'Done', status: 'Completed' });
  await Inbox.updateOne({}, { $set: { next_reminder_at: old, 'data.taskId': String(task._id) } });
  await scheduleNotificationReminders(now);
  assert.equal((await Inbox.findById(item._id)).action_required, false); assert.equal(await Jobs.countDocuments(), 0);
});

mongoTest('mixed permanent and transient push errors preserve independent retries and data-only links', async () => {
  const user = id();
  const devices = await Tokens.create(['success', 'temporary', 'permanent'].map(token => ({ user_id: user, token })));
  await enqueueJob('push', 'mixed', { devices: devices.map(d => ({ id: String(d._id), userId: String(user), token: d.token })), push: { ...push, data: { notificationId: String(id()), link: '/notifications/test' } } });
  await processJob(await claimJob(), providers(async message => {
    assert.equal(message.notification, undefined); assert.equal(message.data.title, 'Assigned'); assert.equal(message.data.link, '/notifications/test');
    return { responses: [{ success: true }, { success: false, error: { code: 'messaging/server-unavailable' } }, { success: false, error: { code: 'messaging/invalid-argument' } }] };
  }));
  assert.deepEqual((await Jobs.findOne({ status: 'pending' })).payload.devices.map(d => d.token), ['temporary']);
  assert.deepEqual((await Jobs.findOne({ status: 'failed' })).payload.devices.map(d => d.token), ['permanent']);
});
