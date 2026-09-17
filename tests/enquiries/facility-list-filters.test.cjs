require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./catalogue-fixture.cjs').installCatalogueFixture();
const { parseFacilityCatalogueFilters } = require('../../lib/enquiries/facility-list-filters.ts');
const params = (values = {}) => new URLSearchParams(values);

test('Facility list filters parse valid dynamic keys and remove duplicate solutions', async () => {
  assert.deepEqual(await parseFacilityCatalogueFilters(params({ project_sector: 'HOS', facility_type: 'HOS-03', solutions_required: 'CON-01, SWP-01,CON-01' })), { project_sector: 'HOS', facility_type: 'HOS-03', solutions_required: ['CON-01', 'SWP-01'] });
});

test('Facility list filters allow empty catalogue filters', async () => {
  assert.deepEqual(await parseFacilityCatalogueFilters(params()), { project_sector: '', facility_type: '', solutions_required: [] });
});

test('Facility list filters reject invalid, cross-sector, and unknown keys', async () => {
  await assert.rejects(() => parseFacilityCatalogueFilters(params({ project_sector: 'BAD' })), /valid active project sector/i);
  await assert.rejects(() => parseFacilityCatalogueFilters(params({ facility_type: 'HOS-03' })), /project sector before/i);
  await assert.rejects(() => parseFacilityCatalogueFilters(params({ project_sector: 'WFA', facility_type: 'HOS-03' })), /belonging to the selected project sector/i);
  await assert.rejects(() => parseFacilityCatalogueFilters(params({ solutions_required: 'CON-01,UNKNOWN' })), /valid active solutions required/i);
});
