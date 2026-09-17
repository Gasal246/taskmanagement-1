require('./register.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { installCatalogueFixture } = require('./catalogue-fixture.cjs');

installCatalogueFixture();

const {
  projectCatalogueInputFromFacility,
  projectConversionMetadata,
  validateProjectCapacity,
  validateProjectCatalogue,
} = require('../../lib/projects/catalogue.ts');
const {
  compactProjectSolutionKeys,
  hasProjectCatalogueDetails,
  projectCardTimeline,
} = require('../../lib/projects/catalogue-display.ts');
const { applyProjectCatalogueFilters } = require('../../lib/projects/list-filters.ts');

const validProjectCatalogue = {
  project_sector: 'WFA',
  facility_type: 'WFA-01',
  sector_field_values: {},
  solutions_required: ['CON-01'],
  solution_details: {},
  primary_solution: 'CON-01',
  commercial_model: 'To Be Determined',
};

test('project catalogue fields are validated and normalized for storage', async () => {
  const result = await validateProjectCatalogue(validProjectCatalogue);

  assert.equal(result.project_sector, 'WFA');
  assert.equal(result.facility_type, 'WFA-01');
  assert.equal(result.facility_type_detail, '');
  assert.deepEqual(result.sector_field_values, []);
  assert.deepEqual(result.solutions_required, ['CON-01']);
  assert.equal(result.primary_solution, 'CON-01');
  assert.equal(result.commercial_model, 'To Be Determined');
});

test('project catalogue rejects a Facility Type from a different Project Sector', async () => {
  await assert.rejects(
    validateProjectCatalogue({ ...validProjectCatalogue, facility_type: 'HOS-01' }),
    /active facility type belonging to this project sector/i,
  );
});

test('project catalogue enforces sector-specific required fields', async () => {
  await assert.rejects(
    validateProjectCatalogue({
      ...validProjectCatalogue,
      project_sector: 'HOS',
      facility_type: 'HOS-01',
    }),
    /Hotel Classification is required/i,
  );
});

test('project catalogue requires the primary solution to be selected', async () => {
  await assert.rejects(
    validateProjectCatalogue({ ...validProjectCatalogue, primary_solution: 'CON-02' }),
    /primary solution from the selected services/i,
  );
});

test('project capacity and occupancy accept empty or non-negative numeric values', () => {
  assert.deepEqual(
    validateProjectCapacity({ facility_capacity: '500', facility_occupancy: '450' }),
    { facility_capacity: '500', facility_occupancy: 450 },
  );
  assert.deepEqual(
    validateProjectCapacity({ facility_capacity: '', facility_occupancy: null }),
    { facility_capacity: null, facility_occupancy: null },
  );
  assert.throws(
    () => validateProjectCapacity({ facility_capacity: '-1', facility_occupancy: '0' }),
    /Capacity must be a positive number, range, or limit/i,
  );
  assert.deepEqual(
    validateProjectCapacity({ facility_capacity: '500-1000', facility_occupancy: '600' }),
    { facility_capacity: '500-1000', facility_occupancy: 600 },
  );
});

test('project conversion copies Facility classification and enquiry solution snapshot', () => {
  const result = projectCatalogueInputFromFacility(
    {
      project_sector: 'WFA',
      facility_type: 'WFA-02',
      sector_field_values: [{ field_key: 'EXAMPLE', text_value: 'Stored value' }],
    },
    {
      solutions_required: ['CON-02'],
      primary_solution: 'CON-02',
      commercial_model: 'Subscription / SaaS',
    },
    {
      solutions_required: ['CON-01'],
      primary_solution: 'CON-01',
    },
  );

  assert.equal(result.project_sector, 'WFA');
  assert.equal(result.facility_type, 'WFA-02');
  assert.deepEqual(result.solutions_required, ['CON-02']);
  assert.equal(result.primary_solution, 'CON-02');
});

test('project conversion falls back to Facility solutions for legacy enquiries without a snapshot', () => {
  const result = projectCatalogueInputFromFacility(
    { project_sector: 'WFA', facility_type: 'WFA-01' },
    null,
    { solutions_required: ['CON-01'], primary_solution: 'CON-01' },
  );

  assert.deepEqual(result.solutions_required, ['CON-01']);
  assert.equal(result.primary_solution, 'CON-01');
});

test('project conversion snapshots the enquiry reference and Facility card details', () => {
  const result = projectConversionMetadata(
    {
      _id: 'enquiry-id',
      enquiry_uuid: 'WFA-REF-100',
      region_id: 'enquiry-region',
      area_id: 'enquiry-area',
      city_id: 'enquiry-city',
    },
    {
      _id: 'facility-id',
      region_id: 'facility-region',
      area_id: 'facility-area',
      city_id: 'facility-city',
      client_company_id: 'facility-client',
      camp_capacity: '500',
      camp_occupancy: 450,
    },
  );

  assert.equal(result.enquiry_uuid, 'WFA-REF-100');
  assert.equal(result.facility_region_id, 'facility-region');
  assert.equal(result.facility_area_id, 'facility-area');
  assert.equal(result.facility_city_id, 'facility-city');
  assert.equal(result.facility_client_company_id, 'facility-client');
  assert.equal(result.facility_capacity, '500');
  assert.equal(result.facility_occupancy, 450);
});

test('project catalogue details are hidden for legacy projects without catalogue fields', () => {
  assert.equal(hasProjectCatalogueDetails({ project_name: 'Legacy project' }), false);
  assert.equal(hasProjectCatalogueDetails({ solutions_required: [] }), false);
});

test('project catalogue details are shown when classification or solutions exist', () => {
  assert.equal(hasProjectCatalogueDetails({ project_sector: 'WFA' }), true);
  assert.equal(hasProjectCatalogueDetails({ facility_type: 'WFA-01' }), true);
  assert.equal(hasProjectCatalogueDetails({ solutions_required: ['CON-01'] }), true);
});

test('project list cards put the primary solution first and collapse the remainder', () => {
  const result = compactProjectSolutionKeys({
    solutions_required: ['CON-01', 'CON-02', 'SWP-01', 'OPS-01', 'CON-01'],
    primary_solution: 'SWP-01',
  });

  assert.deepEqual(result.visible, ['SWP-01', 'CON-01', 'CON-02']);
  assert.equal(result.remaining, 1);
  assert.equal(result.total, 4);
});

test('project list catalogue filters use dependent classification and any-solution matching', () => {
  const query = applyProjectCatalogueFilters({ business_id: 'business-id' }, {
    project_sector: 'WFA',
    facility_type: 'WFA-01',
    solutions_required: ['CON-01', 'SWP-01'],
  });

  assert.equal(query.project_sector, 'WFA');
  assert.equal(query.facility_type, 'WFA-01');
  assert.deepEqual(query.solutions_required, { $in: ['CON-01', 'SWP-01'] });
});

test('project cards leave missing timeline boundaries empty', () => {
  const createdAt = '2026-09-17T08:00:00.000Z';
  assert.deepEqual(projectCardTimeline({ createdAt }), { start: null, end: null });
  assert.deepEqual(
    projectCardTimeline({ createdAt, start_date: '2026-09-18T08:00:00.000Z' }),
    { start: '2026-09-18T08:00:00.000Z', end: null },
  );
});
