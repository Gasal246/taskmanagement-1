require('./register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const mongoose = require('mongoose');
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
const { NextRequest } = require('next/server');
const Eq = require('../../models/eq_enquiries.model.ts').default;
const Camps = require('../../models/eq_camps.model.ts').default;
const Users = require('../../models/users.model.ts').default;
const Business = require('../../models/business.model.ts').default;
const Staff = require('../../models/business_staffs.model.ts').default;
let mongoProcess, directory;
const oid = () => new mongoose.Types.ObjectId();
const creator = oid(), assignee = oid(), viewer = oid();
const admin = { actorId: String(oid()), admin: true, isSuper: true };
const delay = ms => new Promise(r => setTimeout(r, ms));
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'enquiry-status-test-'));
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  mongoProcess = spawn('mongod', ['--port', String(port), '--bind_ip', '127.0.0.1', '--dbpath', directory, '--replSet', 'enquiryTests', '--quiet'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let startupError = '';
  mongoProcess.stderr.on('data', data => { startupError += data; });
  const uri = `mongodb://127.0.0.1:${port}/enquiry_tests?directConnection=true`;
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 200 }); ready = true; break; } catch { await delay(100); }
  }
  if (!ready) throw new Error(`Test MongoDB failed to start: ${startupError}`);
  await mongoose.connection.db.admin().command({ replSetInitiate: { _id: 'enquiryTests', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  for (let i = 0; i < 100; i++) { if ((await mongoose.connection.db.admin().command({ hello: 1 })).isWritablePrimary) break; await delay(100); }
  process.env.MONGO_URI = uri;
  await Promise.all(Object.values(mongoose.models).map(model => model.createCollection()));
  await Users.collection.insertMany([creator, assignee, viewer, new mongoose.Types.ObjectId(admin.actorId)].map((_id, i) => ({ _id, name: `Test user ${i}`, email: `enquiry-test-${i}@example.invalid`, status: 1 })));
});
after(async () => {
  await mongoose.disconnect();
  if (mongoProcess && mongoProcess.exitCode === null) {
    await new Promise(resolve => { mongoProcess.once('exit', resolve); mongoProcess.kill('SIGTERM'); });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

require('./catalogue-fixture.cjs').installCatalogueFixture();
const { ENQUIRY_STATUS_OPTIONS } = require('../../lib/enquiries/status.ts');
const { getCampVisitedStatusFromEnquiryStatus } = require('../../lib/enquiries/camp-visited-status.ts');
const createEnquiry = require('../../app/api/enquiries/agent-side/post/add-new-enquiry/route.ts').POST;
const updateEnquiry = require('../../app/api/enquiries/update/enquiry/route.ts').PUT;
const adminMap = require('../../app/api/enquiries/get/camps/map/route.ts').GET;
const staffMap = require('../../app/api/enquiries/staff-side/get/camps/map/route.ts').GET;
const adminList = require('../../app/api/enquiries/get/enquiries/filtered/route.ts').GET;
const staffList = require('../../app/api/enquiries/staff-side/get/user-enquiries/route.ts').GET;
const Country = require('../../models/eq_countries.model.ts').default;
const Region = require('../../models/eq_region.model.ts').default;
const Area = require('../../models/eq_area.model.ts').default;
const contractStatuses = ['Draft Contract Submitted', 'Client Contract Review', 'Ready for Contract Signing'];
const request = (path, method = 'GET', body) => new NextRequest(`http://local${path}`, {
  method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
});

async function read(response, status = 200) {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}

test('contract statuses follow client response and map to Visited', () => {
  const index = ENQUIRY_STATUS_OPTIONS.indexOf('Waiting For Client Response');
  assert.deepEqual(ENQUIRY_STATUS_OPTIONS.slice(index + 1, index + 4), contractStatuses);
  for (const status of contractStatuses) assert.equal(getCampVisitedStatusFromEnquiryStatus(status), 'Visited');
});

for (const audience of ['admin', 'staff']) {
  test(`${audience} can create, edit, filter and map every contract status`, async () => {
    const userId = audience === 'admin' ? admin.actorId : String(creator);
    global.enquiryTestSession = { user: { id: userId, ...(audience === 'admin' ? { is_super: true } : {}) } };
    const business = await Business.create({ business_name: `Contract ${audience}`, status: 1 });
    await Staff.create({ business_id: business._id, user_id: userId, status: 1 });
    const country = await Country.create({ country_name: `Contract ${audience}`, country_code: 'AE' });
    const region = await Region.create({ country_id: country._id, region_name: 'Contract region' });
    const area = await Area.create({ business_id: business._id, country_id: country._id, region_id: region._id, area_name: 'Contract area', is_active: true });
    const ids = [];
    for (const status of contractStatuses) {
      const camp = await Camps.create({ business_id: business._id, country_id: country._id, region_id: region._id, area_id: area._id,
        camp_name: status, is_active: true, project_sector: 'WFA', facility_type: 'WFA-01', latitude: '25', longitude: '55' });
      const payload = { business_id: String(business._id), country: String(country._id), region: String(region._id), area: String(area._id),
        area_input_mode: 'existing', camp_input_mode: 'existing', camp: String(camp._id), followup_status: status,
        project_sector: 'WFA', facility_type: 'WFA-01', latitude: '25', longitude: '55', solutions_required: [], contacts: [] };
      const created = await read(await createEnquiry(request('/api/enquiries/agent-side/post/add-new-enquiry', 'POST', payload)), 201);
      ids.push(created.enquiry_id);
      assert.equal((await Eq.findById(created.enquiry_id)).status, status);
      // Force a real change, then restore the new status through the edit API.
      for (const followup_status of ['Lead Received', status]) {
        await read(await updateEnquiry(request('/api/enquiries/update/enquiry', 'PUT', { ...payload, enquiry_id: created.enquiry_id, followup_status })));
        assert.equal((await Eq.findById(created.enquiry_id)).status, followup_status);
      }
      const listPath = audience === 'admin' ? '/api/enquiries/get/enquiries/filtered' : '/api/enquiries/staff-side/get/user-enquiries';
      const listing = await read(await (audience === 'admin' ? adminList : staffList)(request(`${listPath}?status=${encodeURIComponent(status)}&limit=100`)));
      assert.ok(listing.data.some(row => row._id === created.enquiry_id));
      assert.ok(listing.data.every(row => row.status === status));
    }
    const map = audience === 'admin' ? adminMap : staffMap;
    const mapPath = audience === 'admin' ? '/api/enquiries/get/camps/map' : '/api/enquiries/staff-side/get/camps/map';
    const query = `country_id=${country._id}`;
    const overview = await read(await map(request(`${mapPath}?${query}&mode=overview`)));
    assert.equal(overview.summary.visited, 3);
    const listing = await read(await map(request(`${mapPath}?${query}&mode=list`)));
    assert.deepEqual(listing.camps.map(camp => camp.enquiry_id).sort(), ids.sort());
    assert.ok(listing.camps.every(camp => camp.visited_status === 'Visited'));
    for (const camp of listing.camps) assert.equal(camp.enquiry_status, (await Eq.findById(camp.enquiry_id)).status);
    // A viewport with one individual pin must carry both statuses as well.
    await Eq.updateOne({ _id: ids[0] }, { latitude: '26', longitude: '55' });
    const viewport = await read(await map(request(`${mapPath}?${query}&mode=viewport&south=25.9&north=26.1&west=54.9&east=55.1&zoom=18`)));
    assert.equal(viewport.camps.length, 1);
    assert.equal(viewport.camps[0].enquiry_status, (await Eq.findById(ids[0])).status);
    assert.equal(viewport.camps[0].visited_status, 'Visited');
    await Eq.updateOne({ _id: ids[0] }, { is_active: false });
    const inactive = await read(await map(request(`${mapPath}?${query}&mode=list`)));
    assert.equal(inactive.camps.find(camp => camp.enquiry_id === ids[0]).visited_status, 'Just Added');
    assert.equal(inactive.camps.find(camp => camp.enquiry_id === ids[0]).enquiry_status, (await Eq.findById(ids[0])).status);
    await Eq.updateOne({ _id: ids[0] }, { $unset: { status: 1 } });
    const missing = await read(await map(request(`${mapPath}?${query}&mode=list`)));
    assert.equal(missing.camps.find(camp => camp.enquiry_id === ids[0]).enquiry_status, null);
  });
}
