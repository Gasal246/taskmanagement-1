const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mongoose = require('mongoose');
const { NextRequest, NextResponse } = require('next/server');

const filename = path.resolve(__dirname, '../../app/api/task/project-task/add-task/route.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const actorId = '000000000000000000000001';
const targetId = '000000000000000000000002';
const businessId = '000000000000000000000003';

function fixture({ headRole = null, admin = false, access = true, active = true, targetActive = true, targetMember = true, authenticated = true } = {}) {
  const saved = [];
  const notifications = [];
  const headChecks = [];
  const mocks = {
    '@/auth': { auth: async () => authenticated ? { user: { id: actorId } } : null },
    '@/lib/mongo': { default: async () => {} },
    '@/lib/jobs/transaction': { inTransaction: async work => work({}) },
    '@/lib/jobs/enqueue': { enqueueNotifications: async rows => notifications.push(...rows) },
    '@/lib/server-access': { canAccessBusiness: async () => access, canAdministerBusiness: async () => admin },
    '@/app/api/helpers/head-reassignment-scope': {
      resolveSelectedHeadContext: async (_req, userId, selectedBusinessId) => {
        headChecks.push({ userId, businessId: selectedBusinessId });
        return headRole ? { roleName: headRole, businessId: selectedBusinessId } : null;
      },
      // Cross-department targets deliberately fall outside the direct reporting scope.
      getSelectedHeadDirectStaffIds: async () => [],
    },
    '@/models/business_staffs.model': { default: { exists: async query => targetMember && query.business_id === businessId && query.status === 1 } },
    '@/models/users.model': { default: {
      findById: () => ({ select: async () => ({ name: 'Task creator', status: active ? 1 : 0 }) }),
      exists: async () => targetActive,
    } },
    '@/models/business_tasks.model': { default: class {
      constructor(data) { Object.assign(this, data); this._id = 'new-task'; }
      async save() { saved.push(this); return this; }
    } },
    '@/models/Flow_Log.model': {},
    '@/app/api/helpers/project-access': {},
    '@/models/project_team.model': {},
    mongoose: { default: mongoose },
    'next/server': { NextResponse },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, require: name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } }, { filename });
  return {
    saved, notifications, headChecks,
    create: (assignedTo = targetId) => exports.POST(new NextRequest('http://localhost/api/task/project-task/add-task', {
      method: 'POST', body: JSON.stringify({ task_name: 'Cross department task', task_description: 'Example', business_id: businessId, is_project_task: false, assigned_to: assignedTo, project_id: null }),
    })),
  };
}

test('all verified HEAD roles can create tasks for staff outside their direct reporting scope', async () => {
  for (const headRole of ['REGION_HEAD', 'REGION_DEP_HEAD', 'AREA_HEAD', 'AREA_DEP_HEAD', 'LOCATION_HEAD', 'LOCATION_DEP_HEAD']) {
    const setup = fixture({ headRole });
    const response = await setup.create();
    assert.equal(response.status, 201, headRole);
    assert.equal(setup.saved[0].assigned_to, targetId);
    assert.equal(setup.saved[0].creator, actorId);
    assert.equal(setup.notifications[0].recipient_id, targetId);
    assert.equal(setup.headChecks[0].businessId, businessId);
    assert.equal(setup.headChecks[0].userId, actorId);
  }
});

test('ordinary staff or an unverified head cannot assign tasks to other staff', async () => {
  const setup = fixture();
  assert.equal((await setup.create()).status, 403);
  assert.equal(setup.saved.length, 0);
  assert.equal(setup.notifications.length, 0);
});

test('business administrators, self assignments and unassigned tasks still work', async () => {
  for (const [options, assignee] of [[{ admin: true }, targetId], [{}, actorId], [{}, null]]) {
    const setup = fixture(options);
    assert.equal((await setup.create(assignee)).status, 201);
    assert.equal(setup.saved[0].assigned_to, assignee);
  }
});

test('HEAD assignment still requires authentication, active users and membership in the same business', async () => {
  for (const [options, status] of [
    [{ authenticated: false }, 401], [{ active: false }, 403], [{ access: false }, 403],
    [{ targetActive: false }, 400], [{ targetMember: false }, 400],
  ]) {
    const setup = fixture({ headRole: 'LOCATION_DEP_HEAD', ...options });
    assert.equal((await setup.create()).status, status);
    assert.equal(setup.saved.length, 0);
    assert.equal(setup.notifications.length, 0);
  }
});
