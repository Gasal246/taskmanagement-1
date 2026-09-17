require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { installCatalogueFixture } = require('./catalogue-fixture.cjs');
const fixture = installCatalogueFixture();
const { cleanCatalogueKey, getEnquiryCatalogue, isValidCatalogueKey, validateDynamicClassification } = require('../../lib/enquiries/catalogue-server.ts');

test('administrator catalogue codes are normalized and validated', () => {
  assert.equal(cleanCatalogueKey(' hos-17 '), 'HOS-17');
  assert.equal(isValidCatalogueKey('HOS-17'), true);
  assert.equal(isValidCatalogueKey('hotel type'), false);
  assert.equal(isValidCatalogueKey('HOS_17'), false);
});

test('database catalogue exposes all seeded sectors and stable Facility Type keys', async () => {
  const catalogue = await getEnquiryCatalogue();
  assert.equal(catalogue.project_sectors.length, 16);
  const types = catalogue.project_sectors.flatMap(sector => sector.facility_types);
  assert.equal(types.length, fixture.facilityTypes.length);
  assert.equal(new Set(types.map(type => type.key)).size, types.length);
  assert.equal(catalogue.project_sectors.find(sector => sector.key === 'HOS').facility_types.find(type => type.key === 'HOS-03').name, 'Hotel Apartments');
});

test('dynamic classification rejects missing, unknown, and cross-sector keys', async () => {
  await assert.rejects(() => validateDynamicClassification({}), /project sector/i);
  await assert.rejects(() => validateDynamicClassification({ project_sector: 'BAD', facility_type: 'BAD-01' }), /project sector/i);
  await assert.rejects(() => validateDynamicClassification({ project_sector: 'HOS', facility_type: 'WFA-01' }), /facility type/i);
});

test('custom Facility Types and required select fields are validated dynamically', async () => {
  await assert.rejects(() => validateDynamicClassification({ project_sector: 'WFA', facility_type: 'WFA-99', facility_type_detail: ' ' }), /specify/i);
  const custom = await validateDynamicClassification({ project_sector: 'WFA', facility_type: 'WFA-99', facility_type_detail: '  Custom facility  ' });
  assert.equal(custom.facility_type_detail, 'Custom facility');
  await assert.rejects(() => validateDynamicClassification({ project_sector: 'HOS', facility_type: 'HOS-03' }), /Hotel Classification is required/i);
  const hotel = await validateDynamicClassification({ project_sector: 'HOS', facility_type: 'HOS-03', sector_field_values: { 'HOS-HOTEL-CLASSIFICATION': 'HOS-HOTEL-04' } });
  assert.equal(hotel.sector_field_values[0].option_key, 'HOS-HOTEL-04');
});

test('archived selections remain valid only when unchanged on an existing Facility', async () => {
  const type = fixture.facilityTypes.find(entry => entry.key === 'WFA-01');
  type.is_active = false;
  await assert.rejects(() => validateDynamicClassification({ project_sector: 'WFA', facility_type: 'WFA-01' }), /active facility type/i);
  assert.equal((await validateDynamicClassification({ project_sector: 'WFA', facility_type: 'WFA-01' }, { project_sector: 'WFA', facility_type: 'WFA-01' })).facility_type, 'WFA-01');
  type.is_active = true;
});
