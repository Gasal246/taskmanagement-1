require('../enquiries/register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const reducer = require('../../redux/slices/application.ts').default;
const { loadAdminBusiness } = require('../../redux/slices/application.ts');

const business = { _id: '507f1f77bcf86cd799439011', business_name: 'Test Business' };
let lookup;
let savedPlan;
const originalLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (request === '@/lib/mongo') return { __esModule: true, default: async () => {} };
  if (request === '@/lib/server-access') return { requireSuperadmin: async () => null };
  if (request === '@/models/business.model') return { __esModule: true, default: {
    findOne: async filter => { lookup = filter; return filter._id === business._id ? business : null; },
  } };
  if (request === '@/models/super_admin_plans.model') return { __esModule: true, default: class {
    constructor(plan) { savedPlan = plan; }
    async save() { return { _id: '507f1f77bcf86cd799439012' }; }
  } };
  if (request === '@/models/business_assigned_plan.model') return { __esModule: true, default: class {
    async save() {}
  } };
  if (request === '@/models/admin_assign_business.model') return { __esModule: true, default: {
    find: () => ({ populate: async () => [] }),
  } };
  return originalLoad.call(this, request, parent, ...rest);
};
const { POST } = require('../../app/api/business/add-business/details/route.ts');
Module._load = originalLoad;

function request(body) {
  const form = new FormData();
  form.append('body', JSON.stringify(body));
  return { formData: async () => form };
}

test('creation stores the returned business so the details request includes its ID', async () => {
  // Execute the actual submit handler without mounting the unrelated form UI.
  const source = ts.createSourceFile('page.tsx', fs.readFileSync('app/(superadmin)/superadmin/admins/add-admin/page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'onSubmit') handler = node.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler);
  const compiled = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let state = reducer(undefined, { type: 'init' });
  let navigated;
  const submit = new Function('addNewBusiness', 'toast', 'dispatch', 'loadAdminBusiness', 'router', `${compiled}; return onSubmit;`)(
    async () => ({ data: business, status: 200 }),
    { success() {}, error(message) { assert.fail(message); } },
    action => { state = reducer(state, action); },
    loadAdminBusiness,
    { push(path) { navigated = path; } },
  );
  await submit({ business_name: business.business_name });
  assert.deepEqual(state.businessAdded, business);
  assert.equal(navigated, '/superadmin/admins/add-admin/business');
  assert.equal(JSON.parse(JSON.stringify({ business_id: state.businessAdded._id })).business_id, business._id);
});

test('details rejects missing or malformed IDs before looking up a business', async () => {
  for (const business_id of [undefined, '', 'invalid', 123]) {
    lookup = undefined;
    const response = await POST(request({ business_id }));
    assert.equal(response.status, 400);
    assert.match(await response.text(), /business_id/);
    assert.equal(lookup, undefined);
  }
});

test('details retains 404 for an unknown business', async () => {
  const response = await POST(request({ business_id: '507f1f77bcf86cd799439099' }));
  assert.equal(response.status, 404);
});

test('details accepts the created business and saves the custom region count', async () => {
  const response = await POST(request({
    business_id: business._id,
    business_plan: { plan_name: 'Test Plan 1', staff_count: '10', regions_count: '10', deps_count: '10', is_custom: true },
    business_admins: [],
    business_docs: [],
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(lookup, { _id: business._id, status: 1 });
  assert.equal(savedPlan.region_count, '10');
});
