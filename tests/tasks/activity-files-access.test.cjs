const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const mongoose = require('mongoose');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '../..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, console, Buffer, Response, Uint8Array, URL, require: name => {
    assert.ok(name in mocks, `Unexpected dependency ${name}`);
    return mocks[name];
  } }, { filename });
  return exports;
}
const taskId = '6968016c4a13368c30eb7df0';
const activityId = '6968016c4a13368c30eb7dfd';
const commentId = '6968016c4a13368c30eb7df1';
const chain = value => ({ lean: async () => value });

function accessFixture({ userId = 'viewer', active = true, member = true, admin = false, project = false, fullProject = false, supervised = [], assigned = 'other', forwarded, owner = 'owner', creator = 'creator' } = {}) {
  const task = { _id: taskId, business_id: 'business', assigned_to: owner, creator, is_project_task: project };
  const activity = { _id: activityId, task_id: taskId, assigned_to: assigned, forwarded_to: forwarded };
  const blank = { default: {} };
  const helper = load('app/api/helpers/activity-comments.ts', {
    mongoose: { default: mongoose },
    '@/models/admin_assign_business.model': { default: { exists: async () => admin } },
    '@/models/business_staffs.model': { default: { exists: async () => member } },
    '@/models/users.model': { default: { exists: async () => active } },
    '@/models/business_tasks.model': { default: { findById: () => chain(task) } },
    '@/models/task_activities.model': { default: { findById: () => chain(activity) } },
    '@/models/activity_comment_reads.model': blank,
    '@/models/activity_comments.model': blank,
    '@/models/business_project.model': blank,
    '@/models/project_team.model': blank,
    '@/app/api/helpers/project-task-teams': { resolveProjectTaskStaffAccess: async () => ({ canViewAllActivities: fullProject }) },
    '@/app/api/helpers/head-reassignment-scope': {
      resolveSelectedHeadContext: async req => req.headers.get('cookie') === 'verified-head' ? {} : null,
      getSelectedHeadDirectStaffIds: async () => supervised,
    },
  });
  return () => helper.authorizeActivityViewer(userId, activityId, new Request('http://localhost', { headers: { cookie: 'verified-head' } }));
}

test('every supported activity viewer can access comments, including personal task owners and reporting heads', async () => {
  for (const options of [
    { admin: true }, { assigned: 'viewer' }, { forwarded: 'viewer' },
    { owner: 'viewer' }, { creator: 'viewer' }, { project: true, fullProject: true },
    { supervised: ['other'] }, { supervised: ['owner'] },
    { project: true, supervised: ['other'] },
  ]) assert.equal((await accessFixture(options)()).status, 200, JSON.stringify(options));
});

test('unrelated, inactive, out-of-scope and cross-business viewers cannot access comments', async () => {
  for (const options of [
    {}, { active: false, admin: true }, { member: false, assigned: 'viewer' },
    { supervised: ['unrelated'] }, { project: true, supervised: ['owner'] },
    { active: false, project: true, fullProject: true },
    { member: false, owner: 'viewer' },
  ]) assert.equal((await accessFixture(options)()).status, 403, JSON.stringify(options));
});

const documents = load('lib/activityDocuments.ts');
const attachments = load('lib/activityCommentAttachments.ts');
function filesFixture({ status = 200, editor = true, deleted = false, missing = false, userId = 'viewer', referenced = true, storageError = null } = {}) {
  const storagePath = `task-activity-documents/${taskId}/viewer/example.pdf`;
  const doc = { storagePath, name: 'Report résumé.pdf', mimeType: 'application/pdf' };
  let saves = [], downloads = [];
  const route = load('app/api/task/activity-files/route.ts', {
    'node:crypto': require('node:crypto'), mongoose: { default: mongoose }, 'next/server': { NextRequest, NextResponse },
    '@/auth': { auth: async () => ({ user: { id: userId } }) },
    '@/lib/utils': { resolveSessionUserId: session => session.user.id },
    '@/lib/mongo': { default: async () => {} },
    '@/lib/firebaseAdmin': { getAdminStorageBucket: () => ({ name: 'test-bucket', file: name => ({
      save: async (bytes, options) => saves.push({ name, bytes, options }),
      download: async () => { downloads.push(name); if (storageError) throw storageError; return [Buffer.from('file bytes')]; },
    }) }) },
    '@/models/business_tasks.model': { default: { findById: () => chain({ _id: taskId }) } },
    '@/models/users.model': { default: { findById: () => chain({ _id: userId, status: 1 }) } },
    '@/models/task_activities.model': { default: { find: () => chain(referenced ? [{ _id: activityId, documents: [doc] }] : []) } },
    '@/models/activity_comments.model': { default: { findById: () => chain(missing ? null : { activity_id: activityId, deleted_at: deleted, attachment: { storage_path: 'comment-file', name: 'report.pdf', mime_type: 'application/pdf' } }) } },
    '@/app/api/helpers/activity-comments': { authorizeActivityViewer: async () => ({ status, task: { _id: taskId } }) },
    '@/app/api/helpers/activity-schedule-access': { canEditActivitySchedule: async () => editor },
    '@/lib/activityDocuments': documents,
    '@/lib/activityCommentAttachments': attachments,
  });
  return { route, saves, downloads, storagePath };
}
const get = (route, query) => route.GET(new NextRequest(`http://localhost/api/task/activity-files?${query}`));
const upload = (route, { comment = false, name = 'report.pdf', bytes = 4, task = taskId } = {}) => {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), name);
  return route.POST(new NextRequest(`http://localhost/api/task/activity-files?taskId=${task}${comment ? `&activityId=${activityId}` : ''}`, { method: 'POST', body: form }));
};

test('activity and comment downloads return file bytes with safe download headers', async () => {
  const { route, storagePath, downloads } = filesFixture();
  for (const query of [`commentId=${commentId}`, `taskId=${taskId}&storagePath=${encodeURIComponent(storagePath)}&download=1`]) {
    const response = await get(route, query);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'file bytes');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    if (query.includes('download=1')) assert.match(response.headers.get('content-disposition'), /^attachment;.*filename\*=UTF-8''Report%20r%C3%A9sum%C3%A9.pdf$/);
  }
  assert.equal(downloads.length, 2);
});

test('denied and deleted attachments never reach storage', async () => {
  for (const options of [{ status: 403 }, { deleted: true }, { missing: true }, { userId: '' }]) {
    const { route, downloads } = filesFixture(options);
    assert.notEqual((await get(route, `commentId=${commentId}`)).status, 200);
    assert.equal(downloads.length, 0);
  }
  const { route, downloads, storagePath } = filesFixture({ status: 403 });
  assert.equal((await get(route, `taskId=${taskId}&storagePath=${encodeURIComponent(storagePath)}`)).status, 403);
  assert.equal(downloads.length, 0);
});

test('uploads use server metadata and retain existing validation-compatible payloads', async () => {
  for (const comment of [true, false]) {
    const { route, saves } = filesFixture();
    const response = await upload(route, { comment, name: 'report..final.pdf' });
    assert.equal(response.status, 201);
    const { file } = await response.json();
    assert.equal(file.mimeType, 'application/pdf');
    assert.equal(file.size, 4);
    assert.ok(file.storagePath.startsWith(comment ? `task-activity-comments/${taskId}/${activityId}/viewer/` : `task-activity-documents/${taskId}/viewer/`));
    const saved = saves[0];
    const metadata = { ...saved.options.metadata, size: saved.bytes.length };
    const storageMock = { getAdminStorageBucket: () => ({ name: 'test-bucket', file: () => ({ getMetadata: async () => [metadata] }) }) };
    if (comment) {
      const validator = load('app/api/helpers/activity-comment-attachments.ts', { '@/lib/firebaseAdmin': storageMock, '@/lib/activityCommentAttachments': attachments });
      assert.equal((await validator.validateActivityCommentAttachment(file, { taskId, activityId, userId: 'viewer' })).storagePath, file.storagePath);
    } else {
      const validator = load('app/api/helpers/activity-documents.ts', { '@/lib/firebaseAdmin': storageMock, '@/lib/activityDocuments': documents });
      assert.equal((await validator.validateActivityDocuments([file], { taskId }))[0].storagePath, file.storagePath);
    }
  }
});

test('uploads reject empty, unsupported, oversized and unauthorized files', async () => {
  for (const options of [{ bytes: 0 }, { name: 'evil.html' }, { name: 'evil.constructor' }, { comment: true, bytes: 5 * 1024 * 1024 }, { bytes: 10 * 1024 * 1024 + 1 }, { comment: true, task: '6968016c4a13368c30eb7dff' }]) {
    const { route, saves } = filesFixture();
    assert.equal((await upload(route, options)).status, 400, JSON.stringify(options));
    assert.equal(saves.length, 0);
  }
  for (const options of [{ editor: false }, { status: 403 }]) {
    const { route, saves } = filesFixture(options);
    assert.equal((await upload(route, { comment: options.status === 403 })).status, 403);
    assert.equal(saves.length, 0);
  }
});

test('document upload allows exactly 10MB and rejects an oversized request body', async () => {
  const { route } = filesFixture();
  assert.equal((await upload(route, { bytes: 10 * 1024 * 1024 })).status, 201);
  assert.equal((await upload(route, { bytes: 11 * 1024 * 1024 })).status, 413);
});

test('unsaved documents are available only to their uploader with current editing rights', async () => {
  for (const editor of [true, false]) {
    const { route, storagePath, downloads } = filesFixture({ referenced: false, editor });
    assert.equal((await get(route, `taskId=${taskId}&storagePath=${encodeURIComponent(storagePath)}`)).status, editor ? 200 : 403);
    assert.equal(downloads.length, editor ? 1 : 0);
  }
  const { route, storagePath, downloads } = filesFixture({ referenced: false, userId: 'another-user' });
  assert.equal((await get(route, `taskId=${taskId}&storagePath=${encodeURIComponent(storagePath)}`)).status, 403);
  assert.equal(downloads.length, 0);
});

test('comment list and posting pass the reporting context and return authenticated attachment URLs', async () => {
  const comment = { _id: commentId, activity_id: activityId, task_id: taskId, author_id: { _id: 'other-user', name: 'Other user' }, depth: 0, body: 'Comment', attachment: { url: 'old-token-url', name: 'report.pdf' } };
  const chain = value => ({ sort() { return this; }, populate() { return this; }, select() { return this; }, lean: async () => value });
  let authorized = [], created = 0;
  const route = load('app/api/task/activities/[activityId]/comments/route.ts', {
    mongoose: { default: mongoose }, 'next/server': { NextResponse },
    '@/auth': { auth: async () => ({ user: { id: 'viewer' } }) },
    '@/lib/utils': { resolveSessionUserId: s => s.user.id },
    '@/lib/mongo': { default: async () => {} },
    '@/lib/jobs/transaction': { inTransaction: async fn => fn({}) },
    '@/lib/jobs/enqueue': {},
    '@/models/business_tasks.model': { default: { updateOne: async () => ({ matchedCount: 1 }) } },
    '@/models/task_activities.model': { default: { exists: () => ({ session: async () => true }) } },
    '@/models/activity_comments.model': { default: { find: () => chain([comment]), findById: () => chain(comment), create: async rows => { created++; return rows; } } },
    '@/models/activity_comment_reads.model': { default: { find: () => chain([]) } },
    '@/models/users.model': { default: { findById: () => chain({ _id: 'viewer' }) } },
    '@/app/api/helpers/activity-comments': {
      authorizeActivityViewer: async (user, activity, req) => {
        authorized.push([user, activity, req.headers.get('cookie')]);
        return { status: 200, task: { _id: taskId }, activity: {} };
      }, getActivityViewerIds: async () => [],
    },
    '@/app/api/helpers/task-activity-comment-notifications': { notifyActivityComment: async () => {} },
    '@/app/api/helpers/activity-comment-attachments': {},
  });
  const context = { params: Promise.resolve({ activityId }) };
  const response = await route.GET(new Request('http://localhost', { headers: { cookie: 'verified-head' } }), context);
  assert.equal(response.status, 200);
  const { comments } = await response.json();
  assert.equal(comments[0].author.id, 'other-user');
  assert.equal(comments[0].attachment.url, `/api/task/activity-files?commentId=${commentId}`);
  const posted = await route.POST(new Request('http://localhost', { method: 'POST', headers: { cookie: 'verified-head' }, body: JSON.stringify({ body: 'Reply from viewer' }) }), context);
  assert.equal(posted.status, 201);
  assert.equal(created, 1);
  assert.deepEqual(authorized, [['viewer', activityId, 'verified-head'], ['viewer', activityId, 'verified-head']]);
});
