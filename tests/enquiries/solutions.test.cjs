require('./register.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const mongoose = require('mongoose');
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
const fixture = require('./catalogue-fixture.cjs').installCatalogueFixture();
const { validateDynamicSolutions } = require('../../lib/enquiries/catalogue-server.ts');
const Camp = require('../../models/eq_camps.model.ts').default;
const Mapping = require('../../models/eq_camp_solutions.model.ts').default;
const EnquiryMapping = require('../../models/eq_enquiry_solutions.model.ts').default;
const SectorModel = require('../../models/eq_project_sector.model.ts').default;
const FacilityTypeModel = require('../../models/eq_facility_type.model.ts').default;
const CategoryModel = require('../../models/eq_solution_category.model.ts').default;
const ServiceModel = require('../../models/eq_solution_service.model.ts').default;
const { saveCampWithSolutions } = require('../../app/api/helpers/camp-solutions.ts');
const { saveEnquirySolutions, saveFacilitySolutions } = require('../../app/api/helpers/enquiry-solutions.ts');
let processHandle, directory;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'camp-solutions-test-'));
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  processHandle = spawn('mongod', ['--port', String(port), '--bind_ip', '127.0.0.1', '--dbpath', directory, '--replSet', 'solutionTests', '--quiet'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await mongoose.connect(`mongodb://127.0.0.1:${port}/camp_solutions_tests?directConnection=true`, { serverSelectionTimeoutMS: 200 }); break; } catch (err) { if (i === 49) throw err; await delay(100); }
  }
  await mongoose.connection.db.admin().command({ replSetInitiate: { _id: 'solutionTests', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  for (let i = 0; i < 100; i++) { if ((await mongoose.connection.db.admin().command({ hello: 1 })).isWritablePrimary) break; await delay(100); }
  await Camp.createCollection(); await Mapping.createCollection(); await Mapping.createIndexes();
  await EnquiryMapping.createCollection(); await EnquiryMapping.createIndexes();
  await SectorModel.createCollection(); await SectorModel.createIndexes();
  await FacilityTypeModel.createCollection(); await FacilityTypeModel.createIndexes();
  await CategoryModel.createCollection(); await CategoryModel.createIndexes();
  await ServiceModel.createCollection(); await ServiceModel.createIndexes();
});
after(async () => {
  await mongoose.disconnect();
  if (processHandle && processHandle.exitCode === null) await new Promise(resolve => { processHandle.once('exit', resolve); processHandle.kill('SIGTERM'); });
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('PDF services have stable unique codes across seven groups', () => {
  assert.equal(fixture.categories.length, 7);
  assert.equal(fixture.services.length, 35);
  assert.equal(new Set(fixture.services.map(s => s.key)).size, 35);
  assert.match(fixture.services.find(s => s.key === 'SWP-01').name, /SerchNGo/);
  assert.match(fixture.services.find(s => s.key === 'SWP-02').name, /Tekton FMS/);
});

test('catalogue database indexes reserve case-insensitive names, including archived items', async () => {
  const sector = await SectorModel.create({ key: 'test-sector-a', name: 'Test Sector', normalized_name: 'test sector', is_active: false });
  const attempts = await Promise.allSettled([
    SectorModel.create({ key: 'test-sector-b', name: 'TEST SECTOR', normalized_name: 'test sector' }),
    SectorModel.create({ key: 'test-sector-c', name: 'Different Sector', normalized_name: 'different sector' }),
  ]);
  assert.equal(attempts.filter(result => result.status === 'rejected').length, 1);
  const parent = sector._id;
  await FacilityTypeModel.create({ key: 'test-type-a', project_sector_id: parent, name: 'Village', normalized_name: 'village' });
  await assert.rejects(() => FacilityTypeModel.create({ key: 'test-type-b', project_sector_id: parent, name: 'VILLAGE', normalized_name: 'village' }), error => error.code === 11000);
});

test('solutions validate keys, primary membership, custom details, and commercial model', async () => {
  for (const body of [
    { solutions_required:['invalid'] },
    { solutions_required:['CON-01'], primary_solution:'SWP-01' },
    { solutions_required:['CON-01'] },
    { solutions_required:[], primary_solution:'CON-01' },
    { solutions_required:['OTH-01'], primary_solution:'OTH-01', solution_other:'  ' },
    { commercial_model:'invalid' },
  ]) await assert.rejects(() => validateDynamicSolutions(body));
  assert.equal((await validateDynamicSolutions({})).solutions_required.length, 0);
  const clean = await validateDynamicSolutions({solutions_required:['CON-01','CON-01'],primary_solution:'CON-01',solution_other:'stale'});
  assert.deepEqual(clean.solutions_required, ['CON-01']);
  assert.equal(clean.solution_other, '');
});

test('MongoDB saves separate service codes, supports any/all, edits without duplicates, and clears selections', async () => {
  const camp = new Camp({camp_name:'Solution test camp'});
  await saveCampWithSolutions(camp, await validateDynamicSolutions({solutions_required:['CON-01','SWP-01'],primary_solution:'SWP-01',commercial_model:'BOO / Revenue Share'}));
  assert.ok(await Camp.findById(camp._id));
  assert.equal(await Mapping.countDocuments({solutions_required:{$in:['SWP-01','SEC-01']}}), 1);
  assert.equal(await Mapping.countDocuments({solutions_required:{$all:['CON-01','SWP-01']}}), 1);
  assert.equal(await Mapping.countDocuments({solutions_required:{$all:['CON-01','SEC-01']}}), 0);
  await saveCampWithSolutions(camp, await validateDynamicSolutions({solutions_required:['OTH-01'],primary_solution:'OTH-01',solution_other:' Custom service '}));
  assert.equal(await Mapping.countDocuments({camp_id:camp._id}), 1);
  const saved = await Mapping.findOne({camp_id:camp._id}).lean();
  assert.equal(saved.solution_other, 'Custom service');
  await saveCampWithSolutions(camp, await validateDynamicSolutions({}));
  assert.equal((await Mapping.findOne({camp_id:camp._id})).solutions_required.length, 0);
});

test('MongoDB rolls back camp creation when solution mapping fails', async () => {
  const camp = new Camp({camp_name:'Must roll back'});
  await mongoose.connection.db.command({collMod:Mapping.collection.name, validator:{primary_solution:{$ne:'CON-01'}}});
  try {
    await assert.rejects(async () => saveCampWithSolutions(camp, await validateDynamicSolutions({solutions_required:['CON-01'],primary_solution:'CON-01'})));
    assert.equal(await Camp.findById(camp._id), null);
    assert.equal(await Mapping.findOne({camp_id:camp._id}), null);
  } finally { await mongoose.connection.db.command({collMod:Mapping.collection.name, validator:{}}); }
});

test('enquiry solution snapshots remain independent from Facility baselines', async () => {
  const campId = new mongoose.Types.ObjectId();
  const enquiryId = new mongoose.Types.ObjectId();
  await saveFacilitySolutions(campId, await validateDynamicSolutions({ solutions_required:['CON-01'], primary_solution:'CON-01' }));
  await saveEnquirySolutions(enquiryId, await validateDynamicSolutions({ solutions_required:['SWP-01'], primary_solution:'SWP-01', commercial_model:'Fixed Rent' }));
  await saveEnquirySolutions(enquiryId, await validateDynamicSolutions({ solutions_required:['SEC-01'], primary_solution:'SEC-01' }));
  const facility = await Mapping.findOne({ camp_id: campId }).lean();
  const enquiry = await EnquiryMapping.findOne({ enquiry_id: enquiryId }).lean();
  assert.deepEqual(facility.solutions_required, ['CON-01']);
  assert.deepEqual(enquiry.solutions_required, ['SEC-01']);
  assert.equal(await EnquiryMapping.countDocuments({ enquiry_id: enquiryId }), 1);
});

test('catalogue migration seeds, backfills generic values, preserves timestamps, and reruns safely', async () => {
  const { migrateEnquiryCatalogue } = await import(pathToFileURL(path.resolve(__dirname, '../../scripts/migrate-enquiry-catalogue.mjs')).href);
  const legacyCampId = new mongoose.Types.ObjectId();
  const legacyTime = new Date('2023-02-03T04:05:06.000Z');
  await mongoose.connection.db.collection('eq_camps').insertOne({ _id: legacyCampId, camp_name: 'Legacy Hotel', project_sector: 'HOS', facility_type: 'HOS-99', facility_type_other: 'Boutique concept', hotel_classification: '4-Star', createdAt: legacyTime, updatedAt: legacyTime });
  await mongoose.connection.db.collection('eq_camp_solutions').insertOne({ camp_id: legacyCampId, solutions_required: ['OTH-01'], solution_other: 'Legacy service', primary_solution: 'OTH-01' });
  await mongoose.connection.db.collection('eq_camps').insertOne({ camp_name: 'Unknown codes', project_sector: 'UNKNOWN-SECTOR', facility_type: 'UNKNOWN-TYPE' });

  const first = await migrateEnquiryCatalogue(mongoose.connection.db, true);
  assert.equal(first.sectors, 16); assert.equal(first.categories, 7); assert.equal(first.services, 35);
  assert.equal(first.unknownProjectSectors, 1); assert.equal(first.unknownFacilityTypes, 1);
  const migrated = await mongoose.connection.db.collection('eq_camps').findOne({ _id: legacyCampId });
  assert.equal(migrated.facility_type_detail, 'Boutique concept');
  assert.equal(migrated.sector_field_values[0].option_key, 'HOS-HOTEL-04');
  assert.equal(migrated.updatedAt.toISOString(), legacyTime.toISOString());
  const mapping = await mongoose.connection.db.collection('eq_camp_solutions').findOne({ camp_id: legacyCampId });
  assert.deepEqual(mapping.solution_details, [{ solution_key: 'OTH-01', value: 'Legacy service' }]);

  const second = await migrateEnquiryCatalogue(mongoose.connection.db, true);
  assert.equal(second.inserted, 0);
  assert.equal(second.facilityDetailsBackfilled, 0);
  assert.equal(second.sectorFieldsBackfilled, 0);
  assert.equal(second.solutionDetailsBackfilled, 0);
});
