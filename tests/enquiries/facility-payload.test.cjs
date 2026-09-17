require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./catalogue-fixture.cjs').installCatalogueFixture();
const { validateEnquiryFacilityPayload } = require('../../lib/enquiries/facility-payload.ts');

const newFacility = { area_input_mode: 'existing', camp_input_mode: 'new', camp_name_request: 'New Facility', project_sector: 'WFA', facility_type: 'WFA-01', solutions_required: ['CON-01'], primary_solution: 'CON-01', commercial_model: 'To Be Determined' };

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
