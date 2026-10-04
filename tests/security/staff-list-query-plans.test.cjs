require('../enquiries/register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const Enquiries = require('../../models/eq_enquiries.model.ts').default;
const Access = require('../../models/eq_enquiry_access.model.ts').default;
const Users = require('../../models/users.model.ts').default;
const Camps = require('../../models/eq_camps.model.ts').default;
const Histories = require('../../models/eq_enquiry_histories.ts').default;
const { staffEnquiryVisibilityStages } = require('../../lib/enquiries/staff-visibility-pipeline.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
before(async () => {
  if (!uri) return;
  await mongoose.connect(uri, { dbName: `staff_list_tests_${randomUUID().replaceAll('-', '')}` });
  await Promise.all([Enquiries, Access, Users, Camps, Histories].map(m => m.init()));
});
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);

mongoTest('owned and explicitly shared enquiries retain cross-business sharing, deduplicate access rows and exclude private records', async () => {
  const user = new mongoose.Types.ObjectId(), other = new mongoose.Types.ObjectId();
  const business = new mongoose.Types.ObjectId(), foreign = new mongoose.Types.ObjectId();
  const [own, shared, privateRow] = await Enquiries.create([
    { createdBy: user, business_id: business, status: 'Open' },
    { createdBy: other, business_id: foreign, status: 'Open' },
    { createdBy: other, business_id: business, status: 'Open' },
  ]);
  await Access.create([
    { user_id: user, enquiry_id: own._id }, { user_id: user, enquiry_id: shared._id },
    { user_id: user, enquiry_id: shared._id }, { user_id: user, enquiry_id: new mongoose.Types.ObjectId() },
    { user_id: other, enquiry_id: privateRow._id },
  ]);
  const query = filter => Enquiries.aggregate(staffEnquiryVisibilityStages(user, filter));
  assert.deepEqual((await query({})).map(r => String(r._id)).sort(), [own, shared].map(r => String(r._id)).sort());
  assert.deepEqual((await query({ business_id: foreign })).map(r => String(r._id)), [String(shared._id)]);
  assert.equal((await query({ status: 'Closed' })).length, 0);
  assert.deepEqual((await query({ createdBy: other })).map(r => String(r._id)), [String(shared._id)]);
  await Access.deleteMany({ user_id: user, enquiry_id: shared._id });
  assert.deepEqual((await query({})).map(r => String(r._id)), [String(own._id)]);
});

mongoTest('staff enquiry route retains search, action filtering, full counts and stable pages after visibility selection', async () => {
  const { GET } = require('../../app/api/enquiries/staff-side/get/user-enquiries/route.ts');
  const user = await Users.create({ name: 'List owner' });
  const other = new mongoose.Types.ObjectId();
  const camp = await Camps.create({ camp_name: 'Search target', is_active: true });
  const rows = await Enquiries.create(Array.from({ length: 5 }, (_, i) => ({
    createdBy: i < 3 ? user._id : other, camp_id: camp._id, enquiry_uuid: `scope-${i}`,
    status: 'Open', next_action: 'Call', next_action_due: new Date('2026-10-20'),
    createdAt: new Date(2026, 8, i + 1),
  })));
  await Access.create([{ user_id: user._id, enquiry_id: rows[3]._id }, { user_id: user._id, enquiry_id: rows[3]._id }]);
  global.enquiryTestSession = { user: { id: String(user._id) } };
  const request = page => new NextRequest(`http://localhost/api/enquiries/staff-side/get/user-enquiries?search=Search%20target&next_action=Call&page=${page}&limit=2`);
  const first = await (await GET(request(1))).json(), second = await (await GET(request(2))).json();
  assert.equal(first.status, 200);
  assert.equal(first.pagination.totalRecords, 4);
  assert.equal(second.pagination.totalRecords, 4);
  assert.equal(first.data.length, 2); assert.equal(second.data.length, 2);
  assert.deepEqual([...first.data, ...second.data].map(r => r._id), rows.slice(0, 4).reverse().map(r => String(r._id)));
  assert.ok(![...first.data, ...second.data].some(r => r._id === String(rows[4]._id)));
});

mongoTest('indexed visibility examines owned/shared candidates rather than the full enquiry collection', async () => {
  const user = new mongoose.Types.ObjectId(), other = new mongoose.Types.ObjectId();
  await Enquiries.insertMany(Array.from({ length: 1500 }, () => ({ createdBy: other })));
  const own = await Enquiries.create({ createdBy: user });
  const shared = await Enquiries.create({ createdBy: other });
  await Access.create({ user_id: user, enquiry_id: shared._id });
  const explain = await Enquiries.aggregate([...staffEnquiryVisibilityStages(user, {}), { $count: 'total' }]).explain('executionStats');
  const cursor = explain.stages.find(s => s.$cursor).$cursor.executionStats;
  assert.ok(cursor.totalDocsExamined <= 2, JSON.stringify(cursor));
  const union = explain.stages.find(s => s.$unionWith).$unionWith.pipeline;
  const accessStats = union.find(s => s.$cursor).$cursor.executionStats;
  assert.ok(accessStats.totalDocsExamined <= 2);
  const lookup = union.find(s => s.$lookup);
  assert.equal(lookup.collectionScans, 0);
  assert.ok(lookup.totalDocsExamined <= 2);
  assert.equal((await Enquiries.aggregate(staffEnquiryVisibilityStages(user, {}))).length, 2);
});
