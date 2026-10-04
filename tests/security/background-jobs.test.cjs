require('../enquiries/register.cjs');
global.testRealJobs = true;
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const Jobs = require('../../models/background_jobs.model.ts').default;
const Inbox = require('../../models/notifications.model.ts').default;
const Tokens = require('../../models/fcm_tokens.model.ts').default;
const Activities = require('../../models/task_activities.model.ts').default;
const Comments = require('../../models/activity_comments.model.ts').default;
const Reads = require('../../models/activity_comment_reads.model.ts').default;
const Tasks = require('../../models/business_tasks.model.ts').default;
const Users = require('../../models/users.model.ts').default;
const Admins = require('../../models/admin_assign_business.model.ts').default;
const Enquiries = require('../../models/eq_enquiries.model.ts').default;
const Histories = require('../../models/eq_enquiry_histories.ts').default;
const Access = require('../../models/eq_enquiry_access.model.ts').default;
const Business = require('../../models/business.model.ts').default;
const Roles = require('../../models/user_roles.model.ts').default;
const { enqueueJob, enqueueNotifications, enqueueFileCleanup, assertUploadNotRetired, MAX_ATTEMPTS } = require('../../lib/jobs/enqueue.ts');
const { inTransaction } = require('../../lib/jobs/transaction.ts');
const { claimJob, processJob, finishJob, failJob, runJobBatch, JobError } = require('../../lib/jobs/worker.ts');
const { authorizedJobRunner } = require('../../lib/jobs/secret.ts');
const { POST: addActivity } = require('../../app/api/task/project-task/add-activity/route.ts');
const { PUT: editActivity } = require('../../app/api/task/project-task/edit-activity/route.ts');
const { DELETE: deleteActivity } = require('../../app/api/task/project-task/delete-activity/route.ts');
const { DELETE: deleteTask } = require('../../app/api/task/delete/[taskid]/route.ts');
const { POST: addComment } = require('../../app/api/task/activities/[activityId]/comments/route.ts');
const { DELETE: deleteComment } = require('../../app/api/task/activities/comments/[commentId]/route.ts');
const { POST: forward } = require('../../app/api/enquiries/staff-side/post/forward-enquiry/route.ts');
const { GET: listJobs, POST: retryJob } = require('../../app/api/superadmin/jobs/route.ts');
const { POST: runEndpoint } = require('../../app/api/internal/jobs/run/route.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = [Jobs, Inbox, Tokens, Activities, Comments, Reads, Tasks, Users, Admins, Enquiries, Histories, Access, Business, Roles];
before(async () => {
  if (!uri) return;
  await mongoose.connect(uri, { dbName: `jobs_${randomUUID().replaceAll('-', '')}` });
  await Promise.all(models.map(model => model.init()));
});
beforeEach(async () => {
  if (uri) await Promise.all(models.map(model => model.deleteMany({})));
  global.enquiryTestSession = null;
});
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const id = () => new mongoose.Types.ObjectId();
const request = (method, body, path = '/api/test') => new NextRequest(`http://localhost${path}`, {
  method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const storagePath = () => `task-activity-documents/${id()}/${id()}/${randomUUID()}-file.pdf`;
const providers = (send = async message => ({ responses: message.tokens.map(() => ({ success: true })) }), remove = async () => {}) => ({
  messaging: () => ({ sendEachForMulticast: send }),
  storage: () => ({ file: path => ({ getMetadata: async () => [{ generation: '123' }], delete: options => remove(path, options) }) }),
});
async function fixture() {
  const user = await Users.create({ email: 'jobs@example.com', name: 'Job User', status: 1 });
  const business = await Business.create({ business_name: 'Jobs business' });
  await Admins.create({ user_id: user._id, business_id: business._id, status: 1 });
  const task = await Tasks.create({ business_id: business._id, creator: user._id, assigned_to: user._id,
    task_name: 'Test task', is_project_task: false, status: 'In Progress', activity_count: 1 });
  const activity = await Activities.create({ task_id: task._id, activity: 'Test activity', assigned_to: user._id, is_done: false });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  return { user, business, task, activity };
}

mongoTest('business data and jobs commit or abort together; repeated enqueue is deduplicated', async () => {
  const { task } = await fixture();
  await assert.rejects(inTransaction(async session => {
    await Tasks.updateOne({ _id: task._id }, { $set: { task_name: 'Aborted' } }, { session });
    await enqueueJob('storage-delete', 'abort', { path: storagePath() }, session);
    throw new Error('rollback');
  }));
  assert.equal((await Tasks.findById(task._id)).task_name, 'Test task');
  assert.equal(await Jobs.countDocuments({}), 0);
  await inTransaction(async session => {
    await enqueueJob('storage-delete', 'committed', { path: storagePath() }, session);
    await enqueueJob('storage-delete', 'committed', { path: storagePath() }, session);
    return true;
  });
  assert.equal(await Jobs.countDocuments({}), 1);
});

mongoTest('competing workers claim once, recover expired leases and fence stale acknowledgements', async () => {
  await enqueueJob('storage-delete', 'lease', { path: storagePath() });
  const claimed = (await Promise.all(Array.from({ length: 10 }, () => claimJob()))).filter(Boolean);
  assert.equal(claimed.length, 1);
  const first = claimed[0];
  await Jobs.updateOne({ _id: first._id }, { $set: { lease_until: new Date(0) } });
  const second = await claimJob();
  assert.notEqual(first.lease_token, second.lease_token);
  assert.equal((await finishJob(first)).matchedCount, 0);
  assert.equal((await failJob(first, new Error('stale'))).matchedCount, 0);
  assert.equal((await Jobs.findById(first._id)).status, 'processing');
  await finishJob(second);
  assert.equal((await Jobs.findById(first._id)).status, 'completed');
});

mongoTest('retries are delayed and bounded, abandoned last leases fail, and provider secrets stay out of errors', async () => {
  await enqueueJob('storage-delete', 'failure', { path: storagePath() });
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const job = await claimJob();
    assert.equal(job.attempts, attempt);
    await failJob(job, new Error('private-token-and-secret-url'));
    const stored = await Jobs.findById(job._id);
    assert.equal(stored.last_error, 'job/provider-or-database-error');
    if (attempt < MAX_ATTEMPTS) {
      assert.equal(stored.status, 'pending');
      assert.ok(stored.available_at.getTime() > Date.now());
      assert.equal(await claimJob(), null);
      await Jobs.updateOne({ _id: job._id }, { $set: { available_at: new Date(0) } });
    } else assert.equal(stored.status, 'failed');
  }
  assert.equal(await claimJob(), null);
  await Jobs.updateOne({}, { $set: { status: 'processing', lease_until: new Date(0) } });
  assert.equal(await claimJob(), null);
  assert.equal((await Jobs.findOne()).last_error, 'job/lease-expired');
});

mongoTest('notification retries preserve read state and create bounded durable push children', async () => {
  const user = id();
  await Tokens.insertMany(Array.from({ length: 205 }, (_, index) => ({ user_id: user, token: `device-${index}` })));
  await enqueueNotifications([{ recipient_id: user, sender_id: id(), kind: 'test', title: 'Title', body: 'Body', data: {}, meta: {}, read_at: null }],
    { notification: { title: 'Title', body: 'Body' }, data: {} }, 'event');
  const job = await claimJob();
  let sends = 0;
  await processJob(job, providers(async () => { sends++; throw new Error('should not send parent'); }));
  assert.equal(sends, 0);
  assert.equal(await Inbox.countDocuments({}), 1);
  const children = await Jobs.find({ kind: 'push' }).lean();
  assert.deepEqual(children.map(child => child.payload.devices.length).sort((a, b) => a - b), [5, 100, 100]);
  await Inbox.updateOne({}, { $set: { read_at: new Date('2026-01-01') } });
  // Replay the same captured parent, simulating an interrupted older worker.
  await Jobs.updateOne({ _id: job._id }, { $set: { status: 'processing', lease_token: job.lease_token, lease_until: new Date(Date.now() + 120000), payload: job.payload } });
  await processJob(job, providers());
  assert.equal(await Inbox.countDocuments({}), 1);
  assert.equal((await Inbox.findOne()).read_at.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(await Jobs.countDocuments({ kind: 'push' }), 3);
});

mongoTest('partial push retries exclude successful and invalid devices and recheck token ownership', async () => {
  const user = id();
  const tokens = await Tokens.create(['ok', 'retry', 'invalid', 'reassigned'].map(token => ({ user_id: user, token })));
  await enqueueJob('push', 'partial', { devices: tokens.map(doc => ({ id: String(doc._id), userId: String(user), token: doc.token })),
    push: { notification: { title: 'Hello', body: 'Body' }, data: {} } });
  await Tokens.updateOne({ token: 'reassigned' }, { $set: { user_id: id() } });
  let sent;
  await processJob(await claimJob(), providers(async message => {
    sent = message.tokens;
    return { responses: [{ success: true }, { success: false, error: { code: 'messaging/server-unavailable' } },
      { success: false, error: { code: 'messaging/registration-token-not-registered' } }] };
  }));
  assert.deepEqual(sent, ['ok', 'retry', 'invalid']);
  const stored = await Jobs.findOne();
  assert.equal(stored.status, 'pending');
  assert.deepEqual(stored.payload.devices.map(device => device.token), ['retry']);
  assert.equal(await Tokens.countDocuments({ token: 'invalid' }), 0);
  await Jobs.updateOne({}, { $set: { available_at: new Date(0) } });
  await processJob(await claimJob(), providers(async message => { assert.deepEqual(message.tokens, ['retry']); return { responses: [{ success: true }] }; }));
  assert.equal((await Jobs.findOne()).status, 'completed');
  assert.deepEqual((await Jobs.findOne()).payload, {});
});

mongoTest('permanent push failures remain visible and manual retries retain only unconfirmed recipients', async () => {
  const token = await Tokens.create({ user_id: id(), token: 'bad-payload' });
  await enqueueJob('push', 'permanent', { devices: [{ id: String(token._id), userId: String(token.user_id), token: token.token }],
    push: { notification: { title: 'Hello', body: 'Body' }, data: {} } });
  await processJob(await claimJob(), providers(async () => ({ responses: [{ success: false, error: { code: 'messaging/invalid-argument' } }] })));
  const stored = await Jobs.findOne();
  assert.equal(stored.status, 'failed');
  assert.equal(stored.last_error, 'messaging/invalid-argument');
  assert.equal(stored.purge_at, null);
});

mongoTest('file cleanup skips referenced files, rejects unsafe paths and deletes with generation preconditions', async () => {
  const path = storagePath();
  const { activity } = await fixture();
  await Activities.updateOne({ _id: activity._id }, { $set: { documents: [{ storagePath: path, url: 'https://example.com', name: 'file.pdf', mimeType: 'application/pdf', extension: 'pdf', size: 1 }] } });
  await enqueueFileCleanup([path, path]);
  assert.equal(await Jobs.countDocuments({}), 1);
  let deletes = 0;
  await processJob(await claimJob(), providers(undefined, async () => { deletes++; }));
  assert.equal(deletes, 0);
  await assert.rejects(assertUploadNotRetired(path), /retired/);
  await assert.rejects(enqueueFileCleanup(['../../credentials.json']), /Unsafe/);
  const another = storagePath();
  await enqueueFileCleanup([another]);
  await processJob(await claimJob(), providers(undefined, async (path, options) => { deletes++; assert.equal(path, another); assert.equal(options.ifGenerationMatch, '123'); }));
  assert.equal(deletes, 1);
  await enqueueFileCleanup([storagePath()]);
  await processJob(await claimJob(), providers(undefined, async () => { throw { code: 404 }; }));
  assert.equal(await Jobs.countDocuments({ status: 'failed' }), 0);
  await enqueueFileCleanup([storagePath()]);
  await processJob(await claimJob(), providers(undefined, async () => { throw { code: 412 }; }));
  assert.equal((await Jobs.findOne({ status: 'failed' })).last_error, 'job/file-generation-changed');
});

mongoTest('job runner rejects missing/wrong credentials and admin endpoints never expose payloads', async () => {
  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await runEndpoint(request('POST'))).status, 503);
    process.env.CRON_SECRET = 'a'.repeat(32);
    assert.equal(authorizedJobRunner(request('POST')), false);
    assert.equal(authorizedJobRunner(new Request('http://localhost', { headers: { authorization: `Bearer ${'b'.repeat(32)}` } })), false);
    assert.equal((await runEndpoint(request('POST'))).status, 401);
    const valid = new Request('http://localhost', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    assert.equal((await runEndpoint(valid)).status, 200);
    await enqueueJob('push', 'private', { token: 'do-not-expose' });
    assert.equal((await listJobs(request('GET'))).status, 401);
    global.enquiryTestSession = { user: { id: String(id()), is_super: false } };
    assert.equal((await listJobs(request('GET'))).status, 403);
    const superId = String(id());
    global.enquiryTestSession = { user: { id: superId, is_super: true } };
    const job = await Jobs.findOne();
    const response = await listJobs(request('GET', undefined, '/api/superadmin/jobs?status=pending'));
    const data = await response.json();
    assert.equal(data.jobs.length, 1);
    assert.equal('payload' in data.jobs[0], false);
    assert.ok(!JSON.stringify(data).includes('do-not-expose'));
    assert.equal((await retryJob(request('POST', { jobId: String(job._id) }))).status, 409);
    await Jobs.updateOne({ _id: job._id }, { $set: { status: 'failed' } });
    assert.equal((await retryJob(request('POST', { jobId: String(job._id) }))).status, 200);
    assert.equal((await retryJob(request('POST', { jobId: String(job._id) }))).status, 409);
    const retried = await Jobs.findById(job._id);
    assert.equal(retried.retry_count, 1);
    assert.equal(String(retried.last_retry_by), superId);
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
});

mongoTest('activity routes atomically queue notification events and serialize concurrent completion counters', async () => {
  const { task, activity } = await fixture();
  const responses = await Promise.all(Array.from({ length: 6 }, () => editActivity(request('PUT', {
    activity_id: String(activity._id), is_status: true, is_done: true,
  }))));
  assert.ok(responses.every(response => response.status === 200));
  assert.equal((await Tasks.findById(task._id)).completed_activity, 1);
  assert.equal(await Jobs.countDocuments({ kind: 'notification' }), 1);
  assert.equal(await Inbox.countDocuments({}), 0, 'no synchronous provider/inbox work');
  const reopened = await editActivity(request('PUT', { activity_id: String(activity._id), is_status: true, is_done: false }));
  assert.equal(reopened.status, 200);
  assert.equal((await Tasks.findById(task._id)).completed_activity, 0);
  assert.equal((await addActivity(request('POST', { task_id: String(task._id), activity: 'New', start_date: '2099-01-01T08:00:00Z', end_date: '2099-01-01T09:00:00Z' }))).status, 201);
  assert.equal((await Tasks.findById(task._id)).activity_count, 2);
  assert.equal(await Jobs.countDocuments({ kind: 'notification' }), 2);
});

mongoTest('outbox write failure rolls back activity deletion and keeps attachment references intact', async () => {
  const { task, activity } = await fixture();
  const path = storagePath();
  await Activities.updateOne({ _id: activity._id }, { $set: { documents: [{ storagePath: path, url: 'https://example.com', name: 'file.pdf', mimeType: 'application/pdf', extension: 'pdf', size: 1 }] } });
  const original = Jobs.updateOne;
  Jobs.updateOne = () => { throw new Error('simulated outbox outage'); };
  try { assert.equal((await deleteActivity(request('DELETE', undefined, `/api/task?activity_id=${activity._id}`))).status, 500); }
  finally { Jobs.updateOne = original; }
  assert.ok(await Activities.findById(activity._id));
  assert.equal((await Tasks.findById(task._id)).activity_count, 1);
  assert.equal(await Jobs.countDocuments({}), 0);
  const results = await Promise.all(Array.from({ length: 4 }, () => deleteActivity(request('DELETE', undefined, `/api/task?activity_id=${activity._id}`))));
  assert.ok(results.every(response => [203, 404].includes(response.status)));
  assert.equal((await Tasks.findById(task._id)).activity_count, 0);
  assert.equal(await Jobs.countDocuments({ kind: 'storage-delete' }), 1);
  assert.equal(await Jobs.countDocuments({ kind: 'notification' }), 1);
});

mongoTest('comment creation queues inbox work; comment and task deletion preserve durable cleanup', async () => {
  const { user, task, activity } = await fixture();
  const other = await Users.create({ email: 'other-jobs@example.com', status: 1 });
  await Admins.create({ user_id: other._id, business_id: task.business_id, status: 1 });
  const added = await addComment(request('POST', { body: 'A comment' }), { params: Promise.resolve({ activityId: String(activity._id) }) });
  assert.equal(added.status, 201);
  assert.equal(await Jobs.countDocuments({ kind: 'notification' }), 1);
  const comment = await Comments.findOne();
  const path = `task-activity-comments/${task._id}/${activity._id}/${user._id}/${randomUUID()}-file.pdf`;
  await Comments.updateOne({ _id: comment._id }, { $set: { attachment: {
    storage_path: path, url: 'https://example.com', name: 'file.pdf', mime_type: 'application/pdf', extension: 'pdf', size: 1,
  } } });
  const removed = await deleteComment(request('DELETE'), { params: Promise.resolve({ commentId: String(comment._id) }) });
  assert.equal(removed.status, 200);
  const deletedAt = (await removed.json()).deletedAt;
  assert.equal((await (await deleteComment(request('DELETE'), { params: Promise.resolve({ commentId: String(comment._id) }) })).json()).deletedAt, deletedAt);
  assert.equal(await Jobs.countDocuments({ kind: 'storage-delete' }), 1);
  assert.equal((await Comments.findById(comment._id)).attachment, null);
  const documentPath = storagePath();
  await Activities.updateOne({ _id: activity._id }, { $set: { documents: [{ storagePath: documentPath, url: 'https://example.com', name: 'file.pdf', mimeType: 'application/pdf', extension: 'pdf', size: 1 }] } });
  assert.equal((await deleteTask(request('DELETE'), { params: Promise.resolve({ taskid: String(task._id) }) })).status, 200);
  assert.equal(await Tasks.countDocuments({}), 0);
  assert.equal(await Comments.countDocuments({}), 0);
  assert.equal(await Activities.countDocuments({}), 0);
  assert.equal(await Jobs.countDocuments({ kind: 'storage-delete' }), 2);
});

mongoTest('worker batch bounds total work even while more jobs remain', async () => {
  for (let i = 0; i < 5; i++) await enqueueFileCleanup([storagePath()]);
  const result = await runJobBatch({ maxJobs: 2, providers: providers() });
  assert.equal(result.processed, 2);
  assert.equal(await Jobs.countDocuments({ status: 'pending' }), 3);
});


mongoTest('enquiry forwarding records its notification job inside the business transaction', async () => {
  const { user } = await fixture();
  const recipient = await Users.create({ email: 'forward-jobs@example.com', status: 1 });
  const enquiry = await Enquiries.create({ createdBy: user._id, is_active: true, status: 'Lead Received' });
  const body = { enquiry_id: String(enquiry._id), assigned_to: [String(recipient._id)], action: 'Call', priority: 5, next_date: null };
  const original = Jobs.updateOne;
  Jobs.updateOne = () => { throw new Error('outbox unavailable'); };
  try { assert.equal((await forward(request('POST', body))).status, 500); }
  finally { Jobs.updateOne = original; }
  assert.equal(await Histories.countDocuments({ enquiry_id: enquiry._id }), 0);
  assert.equal(await Access.countDocuments({ enquiry_id: enquiry._id }), 0);
  assert.equal(await Jobs.countDocuments({}), 0);
  assert.equal((await forward(request('POST', body))).status, 201);
  assert.equal(await Histories.countDocuments({ enquiry_id: enquiry._id, action_origin: 'forward' }), 1);
  assert.equal(await Jobs.countDocuments({ kind: 'notification' }), 1);
  assert.equal(await Inbox.countDocuments({}), 0);
  const job = await Jobs.findOne();
  assert.equal(job.payload.records.length, 4, 'view and action notifications for both recipients');
  await processJob(await claimJob(), providers());
  assert.equal(await Inbox.countDocuments({}), 4);
});

mongoTest('document removal queues cleanup atomically and an outbox error cannot leave a partial edit', async () => {
  const { activity } = await fixture();
  const path = storagePath();
  await Activities.updateOne({ _id: activity._id }, { $set: { documents: [{ storagePath: path, url: 'https://example.com', name: 'file.pdf', mimeType: 'application/pdf', extension: 'pdf', size: 1 }] } });
  const body = { activity_id: String(activity._id), documents: [], description: 'Changed' };
  const original = Jobs.bulkWrite;
  Jobs.bulkWrite = () => { throw new Error('outbox unavailable'); };
  try { assert.equal((await editActivity(request('PUT', body))).status, 500); }
  finally { Jobs.bulkWrite = original; }
  const rolledBack = await Activities.findById(activity._id);
  assert.equal(rolledBack.documents.length, 1);
  assert.notEqual(rolledBack.description, 'Changed');
  assert.equal((await editActivity(request('PUT', body))).status, 200);
  assert.equal((await Activities.findById(activity._id)).documents.length, 0);
  assert.equal(await Jobs.countDocuments({ kind: 'storage-delete' }), 1);
  assert.equal((await editActivity(request('PUT', body))).status, 200);
  assert.equal(await Jobs.countDocuments({ kind: 'storage-delete' }), 1);
});

mongoTest('a stale worker cannot send provider work after another worker has reclaimed the job', async () => {
  const token = await Tokens.create({ user_id: id(), token: 'fenced-token' });
  await enqueueJob('push', 'fenced', { devices: [{ id: String(token._id), userId: String(token.user_id), token: token.token }],
    push: { notification: { title: 'Title', body: 'Body' }, data: {} } });
  const first = await claimJob();
  await Jobs.updateOne({ _id: first._id }, { $set: { lease_until: new Date(0) } });
  const second = await claimJob();
  let sends = 0;
  await processJob(first, providers(async () => { sends++; throw new Error('stale'); }));
  assert.equal(sends, 0);
  await processJob(second, providers(async () => { sends++; return { responses: [{ success: true }] }; }));
  assert.equal(sends, 1);
});


mongoTest('dedicated worker CLI processes an isolated queue and exits cleanly without provider credentials', async () => {
  const { promisify } = require('node:util');
  const { execFile } = require('node:child_process');
  const recipient = id();
  await enqueueNotifications([{ recipient_id: recipient, sender_id: id(), kind: 'test', title: 'CLI', body: 'Body', data: {}, meta: {}, read_at: null }],
    { notification: { title: 'CLI', body: 'Body' }, data: {} }, 'cli');
  const targetUri = uri.replace('/?', `/${mongoose.connection.name}?`);
  assert.ok(targetUri.includes(mongoose.connection.name));
  const result = await promisify(execFile)(process.execPath, ['scripts/run-background-jobs.mjs', '--once'], {
    cwd: require('node:path').resolve(__dirname, '../..'),
    env: { ...process.env, MONGO_URI: targetUri, NODE_ENV: 'production', MONGO_AUTO_INDEX: 'false' }, timeout: 30000,
  });
  assert.ok(result.stdout.includes('"processed":1'));
  assert.equal(await Inbox.countDocuments({}), 1);
  assert.equal((await Jobs.findOne()).status, 'completed');
});
