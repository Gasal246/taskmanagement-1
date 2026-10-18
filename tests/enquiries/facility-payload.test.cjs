require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./catalogue-fixture.cjs').installCatalogueFixture();
const { validateEnquiryFacilityPayload } = require('../../lib/enquiries/facility-payload.ts');

const newFacility = { area_input_mode: 'existing', area: '507f1f77bcf86cd799439011', camp_input_mode: 'new', camp_name_request: 'New Facility', project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: ['CON-01'], primary_solution: 'CON-01', commercial_model: 'To Be Determined' };

test('new Facilities require a valid selected area before database writes', async () => {
  for (const area of [undefined, '', '   ', 'invalid-area']) {
    await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, area }), error =>
      error.issues?.some(issue => issue.path[0] === 'area'));
  }
  assert.equal((await validateEnquiryFacilityPayload({ ...newFacility, area: ` ${newFacility.area} ` })).area, newFacility.area);
});

test('new area requests require a name and do not require an existing area ID', async () => {
  for (const area_name_request of [undefined, '', '   ']) {
    await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, area_input_mode: 'new', area: '', area_name_request }), error =>
      error.issues?.some(issue => issue.path[0] === 'area_name_request'));
  }
  const parsed = await validateEnquiryFacilityPayload({ ...newFacility, area_input_mode: 'new', area: '', area_name_request: ' New Area ' });
  assert.equal(parsed.area_name_request, 'New Area');
});

test('new Facility requests require dynamic classification and accept solution snapshots', async () => {
  assert.equal((await validateEnquiryFacilityPayload(newFacility)).project_sector, 'WFA');
  await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, project_sector: '' }), /project sector/i);
  await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, facility_type: 'HOS-01' }), /facility type/i);
  await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, primary_solution: '' }), /primary solution/i);
});

test('existing active Facilities need only an ID and keep enquiry solutions independent', async () => {
  const parsed = await validateEnquiryFacilityPayload({ area_input_mode: 'existing', camp_input_mode: 'existing', camp: 'facility-id', solutions_required: ['SWP-01'], primary_solution: 'SWP-01', commercial_model: 'Fixed Rent' });
  assert.equal(parsed.project_sector, ''); assert.deepEqual(parsed.solutions_required, ['SWP-01']);
  await assert.rejects(() => validateEnquiryFacilityPayload({ area_input_mode: 'existing', camp_input_mode: 'existing' }), /Select a Facility/);
});

test('coordinates and occupancy are validated without invented values', async () => {
  assert.equal((await validateEnquiryFacilityPayload({ ...newFacility, latitude: '', longitude: '', camp_occupancy: '' })).camp_occupancy, null);
  await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, latitude: '91' }), /latitude/i);
  await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, longitude: '-181' }), /longitude/i);
  await assert.rejects(() => validateEnquiryFacilityPayload({ ...newFacility, camp_occupancy: -1 }), /negative/i);
});
