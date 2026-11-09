require('../enquiries/register.cjs');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const model = name => require(`../../models/${name}.ts`).default;
const Enquiries = model('eq_enquiries.model'), Camps = model('eq_camps.model');
const Access = model('eq_enquiry_access.model'), Targets = model('eq_enquiry_targets.model');
const Country = model('eq_countries.model'), Regions = model('eq_region.model');
const Users = model('users.model'), Business = model('business.model');
const Admins = model('admin_assign_business.model'), Roles = model('roles.model'), UserRoles = model('user_roles.model');
const staffMap = require('../../app/api/enquiries/staff-side/get/camps/map/route.ts').GET;
const staffList = require('../../app/api/enquiries/staff-side/get/user-enquiries/route.ts').GET;
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = Object.values(mongoose.models);
before(async () => {
  if (!uri) return;
  await mongoose.connect(uri, { dbName: `staff_map_${randomUUID().replaceAll('-', '')}` });
  await Promise.all(models.map(model => model.init()));
});
beforeEach(async () => {
  if (uri) await Promise.all(models.map(model => model.deleteMany({})));
  global.enquiryTestSession = null;
});
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const request = params => new NextRequest(`http://localhost/api/enquiries/staff-side/get/camps/map?${new URLSearchParams(params)}`);
const readMap = async params => {
  const response = await staffMap(request(params));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
};

async function fixture() {
  const [user, other] = await Users.create([{ name: 'Map viewer' }, { name: 'Other staff' }]);
  const [business, foreign] = await Business.create([{ business_name: 'Home', status: 1 }, { business_name: 'Foreign', status: 1 }]);
  const country = await Country.create({ country_name: 'Map country' });
  const region = await Regions.create({ country_id: country._id, region_name: 'Visible region' });
  const names = ['Own', 'Cross-business share', 'Target', 'Private', 'Wrong-business target', 'Unmapped', 'Directory only'];
  const camps = await Camps.create(names.map((camp_name, i) => ({
    camp_name, country_id: country._id, region_id: region._id, is_active: true,
    latitude: i === 5 ? '' : '25', longitude: i === 5 ? '' : '55',
  })));
  const rows = await Enquiries.create(camps.slice(0, 6).map((camp, i) => ({
    business_id: [1, 4].includes(i) ? foreign._id : business._id,
    createdBy: [0, 5].includes(i) ? user._id : other._id,
    camp_id: camp._id, country_id: country._id, region_id: region._id,
    is_active: true, status: ['Survey Completed', 'Project Awarded', 'Lead Received', 'Project Awarded', 'Project Awarded', 'Pending'][i],
    enquiry_uuid: `STAFF-MAP-${i}`, createdAt: new Date(2030, 0, i + 1),
  })));
  await Access.create([
    { user_id: user._id, enquiry_id: rows[0]._id },
    { user_id: user._id, enquiry_id: rows[1]._id },
    { user_id: user._id, enquiry_id: rows[1]._id },
    { user_id: other._id, enquiry_id: rows[3]._id },
  ]);
  await Targets.create({
    business_id: business._id, month: '2030-01', enquiry_ids: [rows[2]._id, rows[4]._id],
    assigned_user_ids: [user._id], created_by: other._id, updated_by: other._id,
  });
  // A newer private enquiry on a visible facility must never supply its pin data.
  const hiddenDuplicate = await Enquiries.create({
    business_id: foreign._id, createdBy: other._id, camp_id: camps[0]._id, country_id: country._id,
    status: 'Project Awarded', is_active: true, latitude: '80', longitude: '100', createdAt: new Date(2031, 0, 1),
  });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  return { user, other, business, foreign, country, region, camps, rows, hiddenDuplicate };
}

mongoTest('staff map matches list visibility for owned, shared and targeted enquiries in every map mode', async () => {
  const f = await fixture();
  const listResponse = await staffList(new NextRequest('http://localhost/api/enquiries/staff-side/get/user-enquiries?limit=100'));
  const list = await listResponse.json();
  assert.equal(listResponse.status, 200);
  const readableIds = list.data.map(row => row._id).sort();
  assert.deepEqual(readableIds, [0, 1, 2, 5].map(i => String(f.rows[i]._id)).sort());

  // Forged identity and business parameters cannot grant access.
  const filters = { country_id: String(f.country._id), user_id: String(f.other._id), business_id: String(f.foreign._id) };
  const overview = await readMap({ ...filters, mode: 'overview' });
  assert.deepEqual(overview.summary, { total: 3, visited: 1, toVisit: 1, awarded: 1, cancelled: 0, justAdded: 0 });
  assert.equal(overview.unmappedTotal, 1);
  assert.deepEqual(overview.bounds, { west: 55, east: 55, south: 25, north: 25 });

  const page1 = await readMap({ ...filters, mode: 'list', limit: '2' });
  const page2 = await readMap({ ...filters, mode: 'list', limit: '2', page: '2' });
  assert.equal(page1.pagination.total, 3);
  assert.equal(page1.camps.length, 2);
  assert.equal(page2.camps.length, 1);
  const markers = [...page1.camps, ...page2.camps];
  assert.deepEqual(markers.map(row => row._id).sort(), f.camps.slice(0, 3).map(camp => String(camp._id)).sort());
  assert.ok(markers.every(row => readableIds.includes(row.enquiry_id)));
  const own = markers.find(row => row._id === String(f.camps[0]._id));
  assert.equal(own.visited_status, 'Visited');
  assert.equal(own.latitude, 25);
  assert.equal(own.enquiry_id, String(f.rows[0]._id));

  const viewport = await readMap({ ...filters, mode: 'viewport', south: '24', north: '26', west: '54', east: '56', zoom: '10' });
  assert.equal(viewport.visibleTotal, 3);
  assert.equal(viewport.camps.length, 0);
  assert.equal(viewport.clusters.length, 1);
  assert.equal(viewport.clusters[0].count, 3);
  const clusterRows = await readMap({ ...filters, mode: 'list', south: '24.999999', north: '25.000001', west: '54.999999', east: '55.000001' });
  assert.equal(clusterRows.pagination.total, 3);
  assert.equal((await readMap({ ...filters, mode: 'list', search: 'Private' })).pagination.total, 0);
  assert.equal((await readMap({ ...filters, mode: 'list', search: 'Visible region' })).pagination.total, 3);
  assert.equal((await readMap({ mode: 'list', region_id: String(f.region._id) })).pagination.total, 3);
  assert.equal((await readMap({ mode: 'overview', country_id: String(new mongoose.Types.ObjectId()) })).summary.total, 0);
});

mongoTest('staff map follows revoked shares and target membership and returns no other staff records', async () => {
  const f = await fixture();
  await Access.deleteMany({ user_id: f.user._id, enquiry_id: f.rows[1]._id });
  await Targets.updateMany({}, { $set: { assigned_user_ids: [] } });
  const overview = await readMap({ mode: 'overview' });
  assert.equal(overview.summary.total, 1);
  assert.equal(overview.unmappedTotal, 1);
  assert.deepEqual((await readMap({ mode: 'list' })).camps.map(row => row.enquiry_id), [String(f.rows[0]._id)]);
  global.enquiryTestSession = { user: { id: String(new mongoose.Types.ObjectId()) } };
  const empty = await readMap({ mode: 'overview' });
  assert.equal(empty.summary.total, 0);
  assert.equal(empty.unmappedTotal, 0);
  assert.deepEqual((await readMap({ mode: 'list' })).camps, []);
});

mongoTest('staff map keeps list visibility for admin accounts and validates requests and authentication', async () => {
  const f = await fixture();
  const role = await Roles.create({ role_name: 'BUSINESS_ADMIN' });
  await Admins.create({ user_id: f.user._id, business_id: f.business._id, status: 1 });
  await UserRoles.create({ user_id: f.user._id, business_id: f.business._id, role_id: role._id, status: 1 });
  assert.equal((await readMap({ mode: 'overview' })).summary.total, 3);
  for (const params of [{ mode: 'invalid' }, { mode: 'viewport' }, { country_id: 'invalid' }, { mode: 'list', limit: '101' }]) {
    assert.equal((await staffMap(request(params))).status, 400);
  }
  global.enquiryTestSession = null;
  assert.equal((await staffMap(request({}))).status, 401);
});
