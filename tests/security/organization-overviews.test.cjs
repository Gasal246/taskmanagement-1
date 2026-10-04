require('../enquiries/register.cjs');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const { performance } = require('node:perf_hooks');
const model = name => require(`../../models/${name}.model.ts`).default;
const { organizationOverview } = require('../../lib/organization-overview.ts');
const dashboard = require('../../app/api/users/get-user/all-details/route.ts').GET;
const profile = require('../../app/api/users/get/staff/get-profile/route.ts').GET;
const Users = model('users'), Business = model('business'), Staff = model('business_staffs');
const Regions = model('business_regions'), Areas = model('business_areas'), Locations = model('business_locations');
const RegionDeps = model('region_departments'), AreaDeps = model('area_departments'), LocationDeps = model('location_departments'), Departments = model('business_departments');
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = Object.values(mongoose.models);
before(async () => { if (uri) { await mongoose.connect(uri, { dbName: `overview_${randomUUID().replaceAll('-', '')}` }); await Promise.all(models.map(model => model.init())); } });
beforeEach(async () => { if (uri) await Promise.all(models.map(model => model.deleteMany({}))); global.enquiryTestSession = null; });
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const newId = () => new mongoose.Types.ObjectId();
const ids = { region: 'region_id', area: 'area_id', location: 'loc_id', department: 'dep_id', 'region-department': 'region_dep_id', 'area-department': 'area_dep_id', 'location-department': 'location_dep_id' };
const request = (kind, id, params = {}) => new NextRequest(`http://localhost/api/business/test/get-complete?${new URLSearchParams({ [ids[kind]]: String(id), ...params })}`);
const read = async (kind, id, params = {}) => {
  const response = await organizationOverview(request(kind, id, params), kind);
  assert.equal(response.status, 200, await response.clone().text()); return response.json();
};
const section = (kind, id, name, params = {}) => read(kind, id, { mode: 'section', section: name, ...params });
async function fixture() {
  const business = await Business.create({ business_name: 'Overview business' });
  const user = await Users.create({ name: 'Viewer', email: 'viewer@overview.test', password: 'secret-password', otp: 'secret-otp', session_version: 4 });
  await Staff.create({ business_id: business._id, user_id: user._id, status: 1 });
  const region = await Regions.create({ business_id: business._id, region_name: 'Region' });
  const area = await Areas.create({ business_id: business._id, region_id: region._id, area_name: 'Area' });
  const location = await Locations.create({ business_id: business._id, region_id: region._id, area_id: area._id, location_name: 'Location' });
  const regionDep = await RegionDeps.create({ region_id: region._id, dep_name: 'Regional sales', type: 'sales' });
  const areaDep = await AreaDeps.create({ business_id: business._id, region_id: region._id, area_id: area._id, dep_name: 'Area sales', type: 'sales' });
  const locationDep = await LocationDeps.create({ region_id: region._id, area_id: area._id, location_id: location._id, dep_name: 'Location sales', type: 'sales' });
  const department = await Departments.create({ business_id: business._id, dep_name: 'Business department' });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  return { business, user, region, area, location, regionDep, areaDep, locationDep, department };
}

mongoTest('all seven overview summaries omit detail arrays; sections preserve relationships, totals and safe user projections', async () => {
  const f = await fixture();
  const cases = [
    ['region', f.region, 'region_heads', 'region_id', 'user_id', 'region_staffs', 'staff_id'],
    ['area', f.area, 'area_heads', 'area_id', 'user_id', 'area_staffs', 'staff_id'],
    ['location', f.location, 'location_heads', 'location_id', 'user_id', 'location_staffs', 'user_id'],
    ['region-department', f.regionDep, 'region_dep_heads', 'reg_dep_id', 'user_id', 'region_dep_staffs', 'user_id'],
    ['area-department', f.areaDep, 'area_dep_heads', 'area_dep_id', 'user_id', 'area_dep_staffs', 'user_id'],
    ['location-department', f.locationDep, 'location_dep_heads', 'location_dep_id', 'user_id', 'location_dep_staffs', 'user_id'],
    ['department', f.department, 'department_heads', 'dep_id', 'user_id', 'department_staffs', 'staff_id'],
  ];
  for (const [kind, org, headModel, parent, headUser, staffModel, staffUser] of cases) {
    await model(headModel).create({ [parent]: org._id, [headUser]: f.user._id, status: 1 });
    await model(staffModel).create({ [parent === 'reg_dep_id' ? 'region_dep_id' : parent]: org._id, [staffUser]: f.user._id, status: 1 });
    const summary = await read(kind, org._id);
    assert.equal(summary.data.counts.heads, 1, kind); assert.equal(summary.data.counts.staffs, 1, kind);
    assert.deepEqual(Object.keys(summary.data).sort(), ['counts', 'organization']);
    assert.equal(summary.data.counts.available_staffs, undefined);
    for (const name of ['heads', 'staffs']) {
      const page = await section(kind, org._id, name);
      assert.equal(page.data.length, 1); assert.equal(page.pagination.total, 1);
      const person = page.data[0][kind === 'department' ? name === 'heads' ? 'user_id' : 'staff_id' : 'user'];
      assert.equal(person.name, 'Viewer');
      assert.doesNotMatch(JSON.stringify(page), /secret-password|secret-otp|"password"|"otp"|"session_version"/);
    }
  }
  assert.equal((await read('region', f.region._id)).data.counts.areas, 1);
  assert.equal((await read('area', f.area._id)).data.counts.locations, 1);
  assert.equal((await section('region-department', f.regionDep._id, 'area_departments')).data[0].area.area_name, 'Area');
  assert.equal((await section('area-department', f.areaDep._id, 'subdeps')).data[0].location.location_name, 'Location');
});

mongoTest('overview pagination covers every active record; literal name/email searches apply before paging and counts', async () => {
  const f = await fixture();
  const people = await Users.insertMany(Array.from({ length: 61 }, (_, i) => ({ name: i === 60 ? 'Last [.*] Person' : `Person ${i}`, email: `person-${i}@overview.test`, status: 1 })));
  const rows = await model('region_staffs').insertMany(people.map(person => ({ region_id: f.region._id, staff_id: person._id, status: 1 })));
  await model('region_staffs').create({ region_id: f.region._id, staff_id: f.user._id, status: 0 });
  const summary = await read('region', f.region._id); assert.equal(summary.data.counts.staffs, 61);
  const pages = await Promise.all([1, 2, 3].map(page => section('region', f.region._id, 'staffs', { page: String(page) })));
  assert.deepEqual(pages.map(page => page.data.length), [25, 25, 11]);
  assert.equal(new Set(pages.flatMap(page => page.data.map(row => row._id))).size, 61);
  assert.deepEqual(pages.flatMap(page => page.data.map(row => row._id)), rows.map(row => String(row._id)).sort());
  const found = await section('region', f.region._id, 'staffs', { search: '[.*]' });
  assert.equal(found.pagination.total, 1); assert.equal(found.data[0].user.name, 'Last [.*] Person');
  assert.equal((await section('region', f.region._id, 'staffs', { search: 'PERSON-60@' })).pagination.total, 1);
  await Areas.insertMany(Array.from({ length: 31 }, (_, i) => ({ business_id: f.business._id, region_id: f.region._id, area_name: i === 30 ? 'Beyond [Area]' : `Area ${i}` })));
  const child = await section('region', f.region._id, 'areas', { search: '[Area]' });
  assert.equal(child.pagination.total, 1); assert.equal(child.data[0].area_name, 'Beyond [Area]');
  assert.equal((await section('region', f.region._id, 'staffs', { page: '9' })).data.length, 0);
});

mongoTest('all summary/detail/selector modes reject other businesses, invalid input, unauthenticated access and inactive organizations', async () => {
  const f = await fixture();
  const foreignBusiness = await Business.create({ business_name: 'Foreign' });
  const foreignRegion = await Regions.create({ business_id: foreignBusiness._id, region_name: 'Foreign' });
  const foreignArea = await Areas.create({ business_id: foreignBusiness._id, region_id: foreignRegion._id });
  const foreignLocation = await Locations.create({ business_id: foreignBusiness._id, region_id: foreignRegion._id, area_id: foreignArea._id });
  const foreignRegionDep = await RegionDeps.create({ region_id: foreignRegion._id, type: 'sales' });
  const foreignAreaDep = await AreaDeps.create({ business_id: foreignBusiness._id, region_id: foreignRegion._id, area_id: foreignArea._id, type: 'sales' });
  const foreignLocationDep = await LocationDeps.create({ region_id: foreignRegion._id, area_id: foreignArea._id, location_id: foreignLocation._id, type: 'sales' });
  const foreignDept = await Departments.create({ business_id: foreignBusiness._id });
  for (const [kind, org] of [['region', foreignRegion], ['area', foreignArea], ['location', foreignLocation], ['region-department', foreignRegionDep], ['area-department', foreignAreaDep], ['location-department', foreignLocationDep], ['department', foreignDept]]) {
    for (const params of [{}, { mode: 'section', section: 'heads' }, { mode: 'section', section: 'available_staffs' }]) {
      assert.equal((await organizationOverview(request(kind, org._id, params), kind)).status, 403, kind);
    }
  }
  for (const params of [{ mode: 'unknown' }, { mode: 'section', section: '__proto__' }, { page: '0' }, { page: '1.5' }, { limit: '101' }, { limit: '-1' }, { search: 'x'.repeat(101) }]) {
    assert.equal((await organizationOverview(request('region', f.region._id, params), 'region')).status, 400);
  }
  assert.equal((await organizationOverview(request('region', 'bad'), 'region')).status, 400);
  global.enquiryTestSession = null;
  assert.equal((await organizationOverview(request('region', f.region._id), 'region')).status, 401);
  global.enquiryTestSession = { user: { id: String(f.user._id), is_super: true } };
  await Regions.updateOne({ _id: f.region._id }, { status: 0 });
  assert.equal((await organizationOverview(request('region', f.region._id), 'region')).status, 404);
  const broken = await AreaDeps.create({ dep_name: 'No parent', type: 'sales' });
  assert.equal((await organizationOverview(request('area-department', broken._id), 'area-department')).status, 409);
});

mongoTest('subdepartment summaries and joined searches follow actual ancestry, including legacy records, and exclude inactive branches', async () => {
  const f = await fixture();
  const inactiveArea = await Areas.create({ business_id: f.business._id, region_id: f.region._id, area_name: 'Archived', status: 0 });
  const outside = await Areas.create({ region_id: newId(), area_name: 'Elsewhere' });
  await AreaDeps.create([
    { area_id: f.area._id, dep_name: 'Legacy without region', type: 'sales' },
    { area_id: inactiveArea._id, dep_name: 'Archived branch', type: 'sales' },
    { area_id: outside._id, dep_name: 'Foreign branch', type: 'sales' },
    { area_id: f.area._id, dep_name: 'Inactive', type: 'sales', status: 0 },
    { area_id: f.area._id, dep_name: 'Other type', type: 'it' },
  ]);
  assert.equal((await read('region-department', f.regionDep._id)).data.counts.area_departments, 2);
  const page = await section('region-department', f.regionDep._id, 'area_departments', { search: 'AREA', limit: '1', page: '2' });
  assert.equal(page.pagination.total, 2); assert.equal(page.data.length, 1); assert.equal(page.data[0].area._id, String(f.area._id));
  await LocationDeps.create({ area_id: f.area._id, location_id: f.location._id, dep_name: 'Inactive leaf', type: 'sales', status: 0 });
  assert.equal((await section('area-department', f.areaDep._id, 'subdeps', { search: 'Location' })).pagination.total, 1);
  await Locations.updateOne({ _id: f.location._id }, { status: 0 });
  assert.equal((await read('area-department', f.areaDep._id)).data.counts.subdeps, 0);
});

mongoTest('department selectors reach areas across all assigned regions, and active staff candidates preserve each role source', async () => {
  const f = await fixture();
  const regions = await Regions.insertMany(Array.from({ length: 28 }, (_, i) => ({ business_id: f.business._id, region_name: `Selectable region ${i}` })));
  await model('department_regions').insertMany(regions.map(region => ({ department_id: f.department._id, business_region_id: region._id, status: 1 })));
  const farArea = await Areas.create({ business_id: f.business._id, region_id: regions.at(-1)._id, area_name: 'Far assigned [area]' });
  const choices = await section('department', f.department._id, 'available_areas', { search: '[area]' });
  assert.deepEqual(choices.data.map(row => row._id), [String(farArea._id)]);
  const link = await model('department_areas').create({ dep_id: f.department._id, area_id: farArea._id, status: 1 });
  const links = await section('department', f.department._id, 'areas', { search: '[area]' });
  assert.equal(links.data[0]._id, String(link._id)); assert.equal(links.data[0].area_id.area_name, farArea.area_name);
  const regionLink = await section('department', f.department._id, 'regions', { search: 'region 27' });
  assert.equal(regionLink.pagination.total, 1); assert.equal(regionLink.data[0].business_region_id._id, String(regions.at(-1)._id));
  const disabled = await Users.create({ name: 'Disabled', email: 'disabled@overview.test', status: 0 });
  await Staff.create({ business_id: f.business._id, user_id: disabled._id, status: 1 });
  assert.equal((await section('region', f.region._id, 'available_staffs')).pagination.total, 1);
  await model('user_regions').create({ region_id: f.region._id, user_id: f.user._id, status: 1 });
  await model('user_locations').create({ location_id: f.location._id, user_id: f.user._id, status: 1 });
  assert.equal((await section('region-department', f.regionDep._id, 'available_staffs')).pagination.total, 1);
  assert.equal((await section('location-department', f.locationDep._id, 'available_staffs')).pagination.total, 1);
  await model('area_staffs').create({ area_id: f.area._id, staff_id: f.user._id, status: 1 });
  await model('area_heads').create([{ area_id: f.area._id, user_id: f.user._id, status: 1 }, { area_id: f.area._id, user_id: disabled._id, status: 1 }]);
  const areaCandidates = await section('area-department', f.areaDep._id, 'available_staffs', { search: 'VIEWER' });
  assert.equal(areaCandidates.pagination.total, 1, 'head+staff is offered once');
  assert.equal(areaCandidates.data[0].user_id._id, String(f.user._id));
});

mongoTest('dashboard counts unique scoped tasks, shares team reads, and keeps headed-team task visibility separate from staff project visibility', async () => {
  const f = await fixture();
  const role = await model('roles').create({ role_name: 'REGION_STAFF' });
  await model('user_roles').create({ user_id: f.user._id, role_id: role._id, business_id: f.business._id });
  await model('region_staffs').create({ region_id: f.region._id, staff_id: f.user._id });
  const foreignId = newId();
  const projects = await model('business_project').create([
    ...Array.from({ length: 6 }, (_, i) => ({ business_id: f.business._id, region_id: f.region._id, project_name: `Owned ${i}`, type: "sales", creator: f.user._id, task_count: 10, completed_task_count: 3 })),
    { business_id: f.business._id, region_id: f.region._id, project_name: 'Member project', type: 'sales', creator: newId() },
    { business_id: f.business._id, region_id: f.region._id, project_name: 'Head only project', type: 'sales', creator: newId() },
    { business_id: foreignId, region_id: f.region._id, project_name: 'Foreign project', type: 'sales', creator: f.user._id },
  ]);
  const [memberTeam, headTeam] = await model('project_team').create([
    { team_name: 'Member team', project_id: projects[6]._id, project_dept_id: newId() },
    { team_name: 'Head team', project_id: projects[7]._id, project_dept_id: newId(), team_head: f.user._id },
  ]);
  await model('project_team_members').create({ user_id: f.user._id, project_team_id: memberTeam._id });
  await model('business_tasks').create([
    { business_id: f.business._id, assigned_to: f.user._id, creator: f.user._id, assigned_teams: [memberTeam._id], status: 'To Do' },
    { business_id: f.business._id, assigned_teams: [headTeam._id], status: 'In Progress' },
    { business_id: f.business._id, assigned_teams: [memberTeam._id], status: 'Completed' },
    { business_id: f.business._id, creator: f.user._id, status: 'Cancelled' },
    { business_id: foreignId, creator: f.user._id, status: 'Completed' },
    { business_id: f.business._id, creator: newId(), status: 'To Do' },
  ]);
  const commands = []; mongoose.set('debug', (collection, method) => commands.push({ collection, method }));
  let result;
  try { result = await (await dashboard(new NextRequest(`http://localhost/api/users/get-user/all-details?role_id=${role._id}&org_id=${f.region._id}`))).json(); }
  finally { mongoose.set('debug', false); }
  const data = result.data;
  assert.equal(data.region_name, 'Region'); assert.equal(data.user_name.name, 'Viewer');
  assert.equal(data.dashboard.pendingTasks, 2); assert.equal(data.dashboard.completedTasks, 1);
  assert.equal(data.dashboard.projectCount, 7); assert.equal(data.dashboard.projects.length, 4);
  assert.equal(commands.filter(row => row.collection === model('project_team_members').collection.name && row.method === 'find').length, 1);
  assert.equal(commands.filter(row => row.collection === model('business_tasks').collection.name && row.method === 'aggregate').length, 1);
  assert.equal(commands.filter(row => row.collection === model('business_tasks').collection.name && row.method === 'countDocuments').length, 0);
  assert.equal(commands.filter(row => row.collection === Regions.collection.name && row.method === 'findOne').length, 1, 'authorized region is reused');
  const headRole = await model('roles').create({ role_name: 'LOCATION_DEP_HEAD' });
  await model('user_roles').create({ user_id: f.user._id, role_id: headRole._id, business_id: f.business._id });
  await model('location_dep_heads').create({ location_dep_id: f.locationDep._id, user_id: f.user._id, status: 1 });
  const detailResponse = await dashboard(new NextRequest(`http://localhost/api/users/get-user/all-details?role_id=${headRole._id}&org_id=${f.locationDep._id}`));
  assert.equal(detailResponse.status, 200, await detailResponse.clone().text());
  const detail = await detailResponse.json();
  assert.deepEqual([detail.data.region_name, detail.data.area_name, detail.data.location_name, detail.data.dep_name], ['Region', 'Area', 'Location', 'Location sales']);
  const personal = await (await profile(new NextRequest(`http://localhost/api/users/get/staff/get-profile?role_id=${role._id}&org_id=${f.region._id}`))).json();
  assert.equal(personal.org_data.region.region_name, 'Region');
  assert.doesNotMatch(JSON.stringify(personal), /secret-password|secret-otp|"password"|"otp"|"session_version"/);
});

mongoTest('paged department workflows reject existing assignments server-side and reactivate the original row', async () => {
  const f = await fixture();
  await model('admin_assign_business').create({ user_id: f.user._id, business_id: f.business._id, status: 1 });
  // Existing generic-department routes refer to legacy role rows outside the current role enum.
  await model('roles').collection.insertMany(['DEPARTMENT_HEAD', 'DEPARTMENT_STAFF'].map(role_name => ({ role_name })));
  for (const role_name of ['AREA_DEP_HEAD', 'AREA_DEP_STAFF', 'LOCATION_DEP_HEAD', 'REGION_DEP_STAFF']) await model('roles').create({ role_name });
  const payload = extra => ({ dep_id: String(f.department._id), user_id: String(f.user._id), business_id: String(f.business._id), ...extra });
  const send = async (path, body) => {
    const form = new FormData(); form.set('body', JSON.stringify(body));
    const { POST } = require(`../../app/api/business/${path}/route.ts`);
    return POST(new NextRequest(`http://localhost/api/business/${path}`, { method: 'POST', body: form }));
  };
  const cases = [
    ['departments/add/head', 'department_heads', { dep_id: f.department._id, user_id: f.user._id }, payload({})],
    ['departments/add/staff', 'department_staffs', { dep_id: f.department._id, staff_id: f.user._id }, payload({})],
    ['departments/add/region', 'department_regions', { department_id: f.department._id, business_region_id: f.region._id }, payload({ region_id: String(f.region._id) })],
    ['departments/add/area', 'department_areas', { dep_id: f.department._id, area_id: f.area._id }, payload({ department_id: String(f.department._id), area_id: String(f.area._id), region_id: String(f.region._id) })],
    ['area-dep/add/head', 'area_dep_heads', { area_dep_id: f.areaDep._id, user_id: f.user._id }, { dep_id: String(f.areaDep._id), user_id: String(f.user._id) }],
    ['area-dep/add/staff', 'area_dep_staffs', { area_dep_id: f.areaDep._id, user_id: f.user._id }, { dep_id: String(f.areaDep._id), user_id: String(f.user._id) }],
  ];
  for (const [path, name, filter, body] of cases) {
    const row = await model(name).create({ ...filter, status: 1 });
    const duplicate = await send(path, body);
    assert.ok([400, 409].includes(duplicate.status), `${path}: ${await duplicate.clone().text()}`);
    assert.equal(await model(name).countDocuments(filter), 1);
    await model(name).updateOne({ _id: row._id }, { status: 0 });
    const activated = await send(path, body);
    assert.equal(activated.status, 200, `${path}: ${await activated.clone().text()}`);
    assert.equal(await model(name).countDocuments(filter), 1); assert.equal((await model(name).findById(row._id)).status, 1);
  }
  const foreignBusiness = await Business.create({ business_name: 'Foreign scope' });
  const foreignAreaDep = await AreaDeps.create({ business_id: foreignBusiness._id, area_id: newId(), type: 'sales' });
  assert.equal((await send('area-dep/add/head', { dep_id: String(foreignAreaDep._id), user_id: String(f.user._id) })).status, 403);
  const regionStaff = await model('region_dep_staffs').create({ region_dep_id: f.regionDep._id, user_id: f.user._id, status: 0 });
  assert.equal((await send('region-dep/add/staff', { region_dep_id: String(f.regionDep._id), user_id: String(f.user._id) })).status, 200);
  assert.equal((await model('region_dep_staffs').findById(regionStaff._id)).status, 1);
  const locationHead = await model('location_heads').create({ location_id: f.location._id, user_id: f.user._id, status: 1 });
  const departmentHead = await model('location_dep_heads').create({ location_dep_id: f.locationDep._id, user_id: f.user._id, status: 1 });
  const { authorizeOrganizationMutation } = require('../../lib/organization-access.ts');
  for (const [path, key, row] of [['locations/remove/head', 'LocHeadId', locationHead], ['location-dep/remove/head', 'LocationDepHeadId', departmentHead]]) {
    assert.equal(await authorizeOrganizationMutation(new NextRequest(`http://localhost/api/business/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ [key]: String(row._id) }) })), null);
  }
});

mongoTest('10,000 staff overview fixture bounds payloads and page population while retaining exact totals', async () => {
  const f = await fixture();
  const people = await Users.insertMany(Array.from({ length: 10000 }, (_, i) => ({ name: `Large person ${i}`, email: `large-${i}@overview.test`, phone: '12345678', avatar_url: `/avatars/${i}.png`, status: 1 })));
  await Staff.insertMany(people.map(person => ({ business_id: f.business._id, user_id: person._id, status: 1 })));
  await model('region_staffs').insertMany(people.map(person => ({ region_id: f.region._id, staff_id: person._id, status: 1 })));
  const oldStarted = performance.now();
  // Equivalent to the previous nested staff lookup, using the same public user fields.
  const oldRows = await model('region_staffs').find({ region_id: f.region._id, status: 1 }).populate('staff_id', 'name email phone avatar_url status admin_id last_login last_logout').lean();
  const oldMs = performance.now() - oldStarted;
  const oldBytes = Buffer.byteLength(JSON.stringify({ ...f.region.toObject(), staffs: oldRows }));
  const started = performance.now();
  let actualPipeline;
  mongoose.set('debug', (collection, method, pipeline) => {
    if (collection === model('region_staffs').collection.name && method === 'aggregate') actualPipeline = pipeline;
  });
  let summary, page;
  try { [summary, page] = await Promise.all([read('region', f.region._id), section('region', f.region._id, 'staffs')]); }
  finally { mongoose.set('debug', false); }
  const newMs = performance.now() - started;
  const newBytes = Buffer.byteLength(JSON.stringify(summary)) + Buffer.byteLength(JSON.stringify(page));
  assert.equal(summary.data.counts.staffs, 10000); assert.equal(page.pagination.total, 10000); assert.equal(page.data.length, 25);
  assert.ok(newBytes < oldBytes / 100, `payload ${oldBytes} → ${newBytes}`);
  assert.ok(actualPipeline, 'explain the pipeline actually issued by the section route');
  const explanation = await model('region_staffs').collection.aggregate(actualPipeline).explain('executionStats');
  const execution = explanation.stages?.find(stage => stage.$cursor)?.$cursor.executionStats || explanation.executionStats;
  assert.ok(execution.totalDocsExamined <= 25, JSON.stringify(execution));
  const userLookup = explanation.stages?.find(stage => stage.$lookup?.from === Users.collection.name);
  assert.ok(userLookup && userLookup.totalDocsExamined <= 25, 'only page users are populated');
  const membershipPlan = await mongoose.connection.db.command({ explain: { distinct: Staff.collection.name, key: 'business_id',
    query: { user_id: f.user._id, status: 1 } }, verbosity: 'executionStats' });
  // A distinct scan may also examine index boundary keys when advancing the range.
  assert.ok(membershipPlan.executionStats.totalKeysExamined <= 3 && membershipPlan.executionStats.totalDocsExamined <= 1,
    `authorization avoids scanning the full staff roster: ${JSON.stringify(membershipPlan.executionStats)}`);
  require('node:fs').writeFileSync(require('node:path').join(__dirname, '../load/organization-overview-fixture-results.json'), JSON.stringify({
    measuredAt: new Date().toISOString(), scope: 'Single isolated MongoDB replica-set run; not a production/concurrent-user benchmark',
    staffTotal: 10000, pageSize: 25, oldResponseBytes: oldBytes, summaryPlusPageBytes: newBytes,
    oldReadMs: Math.round(oldMs), summaryPlusPageReadMs: Math.round(newMs), pageDocumentsExamined: execution.totalDocsExamined, populatedUserDocumentsExamined: userLookup.totalDocsExamined,
    authorizationMembershipKeysExamined: membershipPlan.executionStats.totalKeysExamined,
  }, null, 2) + '\n');
});
