const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

const filename = path.resolve(__dirname, '../../app/api/business/tasks/assignment-options/route.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const id = n => n.toString(16).padStart(24, '0');
const business = id(1), otherBusiness = id(2), region = id(3), otherRegion = id(4);
const area = id(5), secondArea = id(6), otherArea = id(7), location = id(8), secondLocation = id(9);
const regionDep = id(10), areaDep = id(11), secondAreaDep = id(12), locationDep = id(13), secondLocationDep = id(14);
const staff = id(20), head = id(21), inactive = id(22), nonmember = id(23), removed = id(24), blocked = id(25);

function fixture({ authenticated = true, authorized = true } = {}) {
  const counts = [];
  const rows = {
    business_regions: [
      { _id: region, business_id: business, region_name: 'North', status: 1 },
      { _id: otherRegion, business_id: otherBusiness, region_name: 'Other business', status: 1 },
    ],
    business_areas: [
      { _id: area, region_id: region, area_name: 'City', status: 1 },
      { _id: secondArea, region_id: region, area_name: 'Rural', status: 1 },
      { _id: otherArea, region_id: otherRegion, area_name: 'Other', status: 1 },
    ],
    business_locations: [
      { _id: location, area_id: area, location_name: 'Office', status: 1 },
      { _id: secondLocation, area_id: secondArea, location_name: 'Depot', status: 1 },
    ],
    region_departments: [
      { _id: regionDep, region_id: region, dep_name: 'Regional sales', status: 1 },
      { _id: id(30), region_id: otherRegion, dep_name: 'Foreign sales', status: 1 },
      { _id: id(31), region_id: region, dep_name: 'Inactive sales', status: 0 },
    ],
    // Legacy rows intentionally omit region_id and business_id.
    area_departments: [
      { _id: areaDep, area_id: area, dep_name: 'City sales', status: 1 },
      { _id: secondAreaDep, area_id: secondArea, dep_name: 'Rural sales', status: 1 },
    ],
    location_departments: [
      { _id: locationDep, location_id: location, dep_name: 'Office sales', status: 1 },
      { _id: secondLocationDep, location_id: secondLocation, dep_name: 'Depot sales', status: 1 },
    ],
    region_dep_staffs: [{ region_dep_id: regionDep, user_id: staff, status: 1 }],
    region_dep_heads: [{ reg_dep_id: regionDep, user_id: head, status: 1 }],
    area_dep_staffs: [{ area_dep_id: areaDep, user_id: staff, status: 1 }],
    area_dep_heads: [{ area_dep_id: areaDep, user_id: head, status: 1 }],
    location_dep_staffs: [staff, head, inactive, nonmember, removed, blocked].map(user_id => ({
      location_dep_id: locationDep, user_id, status: user_id === removed ? 0 : 1,
    })),
    location_dep_heads: [{ location_dep_id: locationDep, user_id: head, status: 1 }],
    business_staffs: [staff, head, inactive, removed, blocked].map((user_id, i) => ({
      _id: id(50 + i), business_id: business, user_id, status: user_id === blocked ? 0 : 1,
    })),
  };
  function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => value?.$in ? value.$in.map(String).includes(String(row[key])) : String(row[key]) === String(value));
  }
  function model(name) {
    return { find(filter) {
      let selected = (rows[name] || []).filter(row => matches(row, filter)).map(row => ({ ...row }));
      return {
        select() { return this; }, sort() { return this; },
        populate() {
          selected = selected.map(row => ({ ...row, user_id: row.user_id === inactive ? null : {
            _id: row.user_id, name: row.user_id === head ? 'Department head' : 'Department staff', email: `${row.user_id}@example.com`,
          } }));
          return this;
        },
        lean: async () => selected,
        distinct: async field => selected.map(row => row[field]),
      };
    } };
  }
  const mocks = {
    '@/auth': { auth: async () => authenticated ? { user: { id: id(100) } } : null },
    '@/lib/mongo': { default: async () => {} },
    '@/lib/server-access': { canAdministerBusiness: async (_actor, selectedBusiness) => authorized && selectedBusiness === business },
    '@/lib/auth-availability': { temporaryDatabaseFailureResponse: () => null },
    'next/server': { NextResponse },
    '@/models/users.model': {},
    '@/models/business_tasks.model': { default: { aggregate: async pipeline => {
      counts.push(pipeline[0].$match.assigned_to.$in);
      return [{ _id: staff, count: 4 }];
    } } },
    '@/models/task_activities.model': { default: { aggregate: async () => [{ _id: head, count: 7 }] } },
  };
  for (const name of Object.keys(rows)) mocks[`@/models/${name}.model`] = { default: model(name) };
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, require: name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } }, { filename });
  return { counts, get: async (params = {}) => {
    const query = new URLSearchParams({ business_id: business, ...params });
    const response = await exports.GET(new NextRequest(`http://localhost/api/business/tasks/assignment-options?${query}`));
    return { status: response.status, body: await response.json() };
  } };
}

test('initial selection contains only the administered business regions and no departments', async () => {
  const { status, body } = await fixture().get();
  assert.equal(status, 200);
  assert.deepEqual(body.data.regions.map(row => row._id), [region]);
  assert.deepEqual(body.data.departments, []);
});

test('region alone includes active departments at every descendant level, including legacy rows', async () => {
  const { status, body } = await fixture().get({ region_id: region });
  assert.equal(status, 200);
  assert.deepEqual(new Set(body.data.departments.map(row => row._id)), new Set([regionDep, areaDep, secondAreaDep, locationDep, secondLocationDep]));
  assert.equal(body.data.departments.find(row => row._id === locationDep).scope, 'North > City > Office');
  assert.deepEqual(body.data.locations, []);
  assert.equal(body.data.areas.length, 2);
});

test('area and location are optional and progressively restrict department ancestry', async () => {
  const setup = fixture();
  const areaResult = await setup.get({ region_id: region, area_id: area });
  assert.equal(areaResult.status, 200);
  assert.deepEqual(new Set(areaResult.body.data.departments.map(row => row._id)), new Set([areaDep, locationDep]));
  assert.deepEqual(areaResult.body.data.locations.map(row => row._id), [location]);
  const locationResult = await setup.get({ region_id: region, area_id: area, location_id: location });
  assert.equal(locationResult.status, 200);
  assert.deepEqual(locationResult.body.data.departments.map(row => row._id), [locationDep]);
});

test('staff lookup works for every department level and retains workload counts', async () => {
  for (const [department_id, kind] of [[regionDep, 'region'], [areaDep, 'area'], [locationDep, 'location']]) {
    const setup = fixture();
    const { status, body } = await setup.get({ region_id: region, department_id, kind });
    assert.equal(status, 200);
    assert.deepEqual(new Set(body.data.map(row => row.user_id._id)), new Set([staff, head]));
    assert.equal(body.data.find(row => row.user_id._id === staff).task_count, 4);
    assert.equal(body.data.find(row => row.user_id._id === staff).activity_count, 0);
    assert.equal(body.data.find(row => row.user_id._id === head).activity_count, 7);
    assert.equal(body.data.length, 2, 'heads who are also staff appear once; inactive, removed and nonmember users are excluded');
    assert.equal(setup.counts[0].length, 2);
  }
});

test('invalid or unrelated hierarchy and department IDs cannot fetch assignment data', async () => {
  const setup = fixture();
  for (const [params, status] of [
    [{ business_id: 'invalid' }, 400],
    [{ area_id: area }, 400],
    [{ region_id: region, location_id: location }, 400],
    [{ department_id: regionDep, kind: 'region' }, 400],
    [{ region_id: region, department_id: regionDep, kind: 'unknown' }, 400],
    [{ region_id: otherRegion }, 404],
    [{ region_id: region, area_id: otherArea }, 404],
    [{ region_id: region, area_id: area, location_id: secondLocation }, 404],
    [{ region_id: region, area_id: secondArea, department_id: areaDep, kind: 'area' }, 404],
    [{ region_id: region, department_id: areaDep, kind: 'location' }, 404],
  ]) assert.equal((await setup.get(params)).status, status, JSON.stringify(params));
});

test('assignment data requires authentication and business administration access', async () => {
  assert.equal((await fixture({ authenticated: false }).get()).status, 401);
  assert.equal((await fixture({ authorized: false }).get()).status, 403);
});
