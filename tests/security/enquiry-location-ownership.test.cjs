require('../enquiries/register.cjs');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const model = name => require(`../../models/${name}.model.ts`).default;
const Business = model('business'), Users = model('users'), Admins = model('admin_assign_business');
const Roles = model('roles'), UserRoles = model('user_roles');
const kinds = [
  ['countries', 'eq_countries', 'country_name'], ['regions', 'eq_region', 'region_name'],
  ['provinces', 'eq_province', 'province_name'], ['cities', 'eq_city', 'city_name'],
  ['area', 'eq_area', 'area_name'], ['camps', 'eq_camps', 'camp_name'],
].map(([path, name, field]) => ({ path, model: model(name), field, get: require(`../../app/api/enquiries/get/${path}/filtered/route.ts`).GET }));
const addCountry = require('../../app/api/enquiries/post/add-country/route.ts').POST;
const addRegion = require('../../app/api/enquiries/post/add-region/route.ts').POST;
const selectCountries = require('../../app/api/enquiries/agent-side/get/get-countries/route.ts').GET;
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = () => Object.values(mongoose.models);
before(async () => {
  if (!uri) return;
  await mongoose.connect(uri, { dbName: `location_scope_${randomUUID().replaceAll('-', '')}` });
  await Promise.all(models().map(m => m.init()));
});
beforeEach(async () => {
  if (uri) await Promise.all(models().map(m => m.deleteMany({})));
  global.enquiryTestSession = null;
});
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const request = (path, params = {}) => new NextRequest(`http://localhost/api/enquiries/${path}?${new URLSearchParams(params)}`);
async function fixture() {
  const [business, foreign] = await Business.create([{ business_name: 'Home', business_email: 'home@example.com' }, { business_name: 'Foreign' }]);
  const user = await Users.create({ name: 'Business administrator' });
  const role = await Roles.create({ role_name: 'BUSINESS_ADMIN' });
  await Admins.create({ user_id: user._id, business_id: business._id, status: 1 });
  await UserRoles.create({ user_id: user._id, business_id: business._id, role_id: role._id, status: 1 });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  for (const entry of kinds) await entry.model.create([
    { [entry.field]: 'Home', business_id: business._id, is_active: true },
    { [entry.field]: 'Foreign', business_id: foreign._id, is_active: true },
    { [entry.field]: 'Unowned', is_active: true },
  ]);
  return { business, foreign };
}
mongoTest('all six directory lists and dropdowns exclude foreign and unowned records', async () => {
  const f = await fixture();
  for (const entry of kinds) {
    for (const params of [{}, { search: 'Foreign' }]) {
      const response = await entry.get(request(`get/${entry.path}/filtered`, params));
      const body = await response.json();
      assert.equal(response.status, 200, JSON.stringify(body));
      assert.equal(body.pagination.totalRecords, params.search ? 0 : 1, entry.path);
      const rows = body[entry.path === 'area' ? 'areas' : entry.path];
      assert.ok(rows.every(row => row.business_id === String(f.business._id)));
    }
    const forged = await entry.get(request(`get/${entry.path}/filtered`, { business_id: String(f.foreign._id) }));
    assert.equal(forged.status, 403, entry.path);
  }
  const selects = await selectCountries(request('agent-side/get/get-countries'));
  assert.deepEqual((await selects.json()).countries.map(c => c.country_name), ['Home']);
  global.enquiryTestSession = null;
  assert.equal((await kinds[0].get(request('get/countries/filtered'))).status, 401);
});
mongoTest('new locations inherit the authorized business and reject foreign parents', async () => {
  const f = await fixture();
  const post = body => new NextRequest('http://localhost/api/enquiries/post/add-country', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await addCountry(post({ country_name: 'New' }))).status, 201);
  const saved = await kinds[0].model.findOne({ country_name: 'New' }).lean();
  assert.equal(String(saved.business_id), String(f.business._id));
  assert.equal((await addCountry(post({ country_name: 'Forged', business_id: String(f.foreign._id) }))).status, 403);
  const country = await kinds[0].model.findOne({ business_id: f.foreign._id }).lean();
  assert.equal((await addRegion(post({ region_name: 'Foreign child', country: String(country._id) }))).status, 400);
  assert.equal(await kinds[1].model.countDocuments({ region_name: 'Foreign child' }), 0);
});
mongoTest('ownership backfill is idempotent and preserves existing business ownership', async () => {
  const f = await fixture();
  const { migrateLocationOwnership, locationCollections } = await import('../../scripts/migrate-enquiry-location-ownership.mjs');
  const dry = await migrateLocationOwnership(mongoose.connection.db, 'home@example.com');
  assert.ok(dry.collections.every(c => c.unowned === 1 && c.modified === 0));
  const applied = await migrateLocationOwnership(mongoose.connection.db, 'home@example.com', true);
  assert.ok(applied.collections.every(c => c.modified === 1 && c.otherOwned === 1));
  const again = await migrateLocationOwnership(mongoose.connection.db, 'home@example.com', true);
  assert.ok(again.collections.every(c => c.modified === 0));
  for (const collection of locationCollections) assert.equal(await mongoose.connection.db.collection(collection).countDocuments({ business_id: f.foreign._id }), 1);
});

const createRoutes = ['country', 'region', 'province', 'city', 'area', 'camp'].map((kind, i) => ({
  kind, model: kinds[i].model, field: kinds[i].field,
  post: require(`../../app/api/enquiries/post/add-${kind}/route.ts`).POST,
}));
const writeRequest = (path, body, method = 'POST') => new NextRequest(`http://localhost/api/enquiries/${path}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
require('../enquiries/catalogue-fixture.cjs').installCatalogueFixture();
const createEnquiry = require('../../app/api/enquiries/agent-side/post/add-new-enquiry/route.ts').POST;
const editEnquiry = require('../../app/api/enquiries/update/enquiry/route.ts').PUT;
const Enquiries = model('eq_enquiries');

mongoTest('all six add APIs save the authenticated business and reject unauthorized ownership without writes', async () => {
  const f = await fixture();
  const parents = {};
  for (const entry of createRoutes) {
    const body = { ...parents, [entry.field]: `Created ${entry.kind}` };
    if (entry.kind === 'camp') Object.assign(body, {
      country_id: parents.country, region_id: parents.region, province_id: parents.province,
      city_id: parents.city, area_id: parents.area,
      project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: [],
    });
    const before = await entry.model.countDocuments();
    const denied = await entry.post(writeRequest(`post/add-${entry.kind}`, { ...body, business_id: String(f.foreign._id) }));
    assert.equal(denied.status, 403, `${entry.kind}: ${await denied.clone().text()}`);
    assert.equal(await entry.model.countDocuments(), before);
    const response = await entry.post(writeRequest(`post/add-${entry.kind}`, body));
    assert.equal(response.status, 201, `${entry.kind}: ${await response.clone().text()}`);
    const saved = await entry.model.findOne({ [entry.field]: body[entry.field] }).lean();
    assert.equal(String(saved.business_id), String(f.business._id), entry.kind);
    assert.equal(await entry.model.countDocuments(), before + 1);
    parents[entry.kind] = String(saved._id);
  }
});

mongoTest('all six add APIs reject unauthenticated and non-admin writes', async () => {
  const f = await fixture();
  const staff = await Users.create({ name: 'Directory staff' });
  await model('business_staffs').create({ user_id: staff._id, business_id: f.business._id, status: 1 });
  for (const session of [null, { user: { id: String(staff._id) } }]) {
    global.enquiryTestSession = session;
    for (const entry of createRoutes) {
      const before = await entry.model.countDocuments();
      const response = await entry.post(writeRequest(`post/add-${entry.kind}`, { business_id: String(f.business._id) }));
      assert.equal(response.status, session ? 403 : 401, entry.kind);
      assert.equal(await entry.model.countDocuments(), before);
    }
  }
});

mongoTest('enquiry creation and editing assign requested areas and facilities to the verified enquiry business', async () => {
  const f = await fixture();
  const body = {
    business_id: String(f.business._id), country: String(new mongoose.Types.ObjectId()), region: String(new mongoose.Types.ObjectId()),
    area_input_mode: 'new', camp_input_mode: 'new', area_name_request: 'Requested area', camp_name_request: 'Requested facility',
    project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: [], commercial_model: 'To Be Determined', followup_status: 'Lead Received',
  };
  const created = await createEnquiry(writeRequest('agent-side/post/add-new-enquiry', body));
  assert.equal(created.status, 201, await created.clone().text());
  const { enquiry_id } = await created.json();
  const first = await Enquiries.findById(enquiry_id).lean();
  for (const [model, id] of [[kinds[4].model, first.area_id], [kinds[5].model, first.camp_id]]) {
    assert.equal(String((await model.findById(id).lean()).business_id), String(f.business._id));
  }
  // A body cannot transfer ownership while requesting replacement records.
  const edited = await editEnquiry(writeRequest('update/enquiry', {
    ...body, enquiry_id, business_id: String(f.foreign._id), area_name_request: 'Replacement area', camp_name_request: 'Replacement facility',
  }, 'PUT'));
  assert.equal(edited.status, 200, await edited.clone().text());
  const saved = await Enquiries.findById(enquiry_id).lean();
  assert.equal(String(saved.business_id), String(f.business._id));
  assert.notEqual(String(saved.area_id), String(first.area_id));
  assert.notEqual(String(saved.camp_id), String(first.camp_id));
  for (const [model, id] of [[kinds[4].model, saved.area_id], [kinds[5].model, saved.camp_id]]) {
    assert.equal(String((await model.findById(id).lean()).business_id), String(f.business._id));
  }
});
