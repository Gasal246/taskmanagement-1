require('../enquiries/register.cjs');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { NextRequest } = require('next/server');
const model = name => require(`../../models/${name}.ts`).default;
const Camps = model('eq_camps.model'), Country = model('eq_countries.model'), Regions = model('eq_region.model'), Cities = model('eq_city.model');
const Users = model('users.model'), Business = model('business.model'), Staff = model('business_staffs.model'), Admins = model('admin_assign_business.model');
const Tasks = model('business_tasks.model'), Teams = model('project_team.model'), Members = model('project_team_members.model'), Events = model('calendar_events.model');
const Enquiries = model('eq_enquiries.model'), Histories = model('eq_enquiry_histories');
const mapRoute = require('../../app/api/enquiries/get/camps/map/route.ts').GET;
const calendarRoute = require('../../app/api/calendar/feed/route.ts').GET;
let migrateCampMapPoints;
const { mapPoint } = require('../../lib/maps/coordinates.mjs');
const { normalizeCampVisitedStatusForMap } = require('../../lib/enquiries/camp-visited-status.ts');
const uri = process.env.SECURITY_TEST_MONGO_URI;
const models = Object.values(mongoose.models);
before(async () => { ({ migrateCampMapPoints } = await import('../../scripts/migrate-camp-map-points.mjs')); if (uri) { await mongoose.connect(uri, { dbName: `large_views_${randomUUID().replaceAll('-', '')}` }); await Promise.all(models.map(model => model.init())); } });
beforeEach(async () => { if (uri) await Promise.all(models.map(model => model.deleteMany({}))); global.enquiryTestSession = null; });
after(async () => { if (uri) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });
const mongoTest = (name, fn) => test(name, { skip: !uri }, fn);
const id = () => new mongoose.Types.ObjectId();
const mapRequest = params => new NextRequest(`http://localhost/api/enquiries/get/camps/map?${new URLSearchParams(params)}`);
const begin = new Date('2030-01-01T08:00:00.000Z'), end = new Date('2030-01-02T08:00:00.000Z');
const calendarRequest = params => new NextRequest(`http://localhost/api/calendar/feed?${new URLSearchParams({ start_date: begin.toISOString(), end_date: end.toISOString(), ...params })}`);
async function fixture(admin = true) {
  const business = await Business.create({ business_name: 'Large view business', status: 1 });
  const [user, colleague] = await Users.create(['Viewer', 'Search Person'].map((name, i) => ({ email: `large-${i}@fixture.test`, name, status: 1 })));
  await Staff.create([user, colleague].map(user => ({ business_id: business._id, user_id: user._id, status: 1 })));
  if (admin) await Admins.create({ business_id: business._id, user_id: user._id, status: 1 });
  global.enquiryTestSession = { user: { id: String(user._id) } };
  return { business, user, colleague };
}
const scheduled = (f, name, extra = {}) => ({ business_id: f.business._id, creator: f.user._id, task_name: name, start_date: begin, end_date: end, status: 'To Do', ...extra });
mongoTest('facility map points follow saves, handle zero and clear invalid coordinates; backfill is dry-run/idempotent', async () => {
  await fixture();
  assert.deepEqual(mapPoint('0', '0'), [0, 0]);
  assert.equal(mapPoint('', '45'), undefined);
  assert.equal(mapPoint('91', '0'), undefined);
  const camp = await Camps.create({ latitude: '24.4', longitude: '54.2', is_active: true });
  assert.deepEqual([...camp.map_point], [54.2, 24.4]);
  camp.latitude = '25'; await camp.save();
  assert.deepEqual((await Camps.findById(camp._id)).map_point, [54.2, 25]);
  const projected = await Camps.findById(camp._id).select('camp_name');
  projected.camp_name = 'Updated without coordinates'; await projected.save();
  assert.deepEqual((await Camps.findById(camp._id)).map_point, [54.2, 25]);
  await assert.rejects(Camps.updateOne({ _id: camp._id }, { $set: { latitude: '30' } }), /document.save/);
  camp.longitude = ''; await camp.save();
  assert.equal((await Camps.findById(camp._id)).map_point, undefined);
  const legacyId = id();
  await Camps.collection.insertOne({ _id: legacyId, latitude: '0', longitude: '0', is_active: true });
  const dry = await migrateCampMapPoints(mongoose.connection.db, false);
  assert.equal(dry.changed, 1); assert.equal(dry.updated, 0);
  assert.equal((await Camps.findById(legacyId)).map_point, undefined);
  const applied = await migrateCampMapPoints(mongoose.connection.db, true);
  assert.equal(applied.updated, 1);
  assert.deepEqual((await Camps.findById(legacyId)).map_point, [0, 0]);
  assert.equal((await migrateCampMapPoints(mongoose.connection.db, true)).changed, 0);
});
mongoTest('map geography, date-line bounds, summary totals and paged location-name searches stay accurate', async () => {
  await fixture();
  const country = await Country.create({ country_name: 'Fixture country' });
  const region = await Regions.create({ country_id: country._id, region_name: 'Search Region' });
  const city = await Cities.create({ city_name: 'Special [City]' });
  const rows = await Camps.create([
    { camp_name: 'East', longitude: '179.5', latitude: '10', country_id: country._id, region_id: region._id, city_id: city._id, visited_status: 'Visited', is_active: true },
    { camp_name: 'West', longitude: '-179.5', latitude: '10', country_id: country._id, visited_status: 'Awarded', is_active: true },
    { camp_name: 'Middle', longitude: '0', latitude: '10', country_id: country._id, is_active: true },
    { camp_name: 'Inactive', longitude: '0', latitude: '10', country_id: country._id, is_active: false },
  ]);
  const overview = await (await mapRoute(mapRequest({ mode: 'overview', country_id: String(country._id) }))).json();
  assert.deepEqual(overview.summary, { total: 3, visited: 1, awarded: 1, toVisit: 0, cancelled: 0, justAdded: 1 });
  const viewport = await (await mapRoute(mapRequest({ mode: 'viewport', country_id: String(country._id), south: '9', north: '11', west: '179', east: '-179', zoom: '10' }))).json();
  assert.equal(viewport.visibleTotal, 2);
  assert.equal(viewport.camps.length + viewport.clusters.reduce((sum, row) => sum + row.count, 0), 2);
  const names = await (await mapRoute(mapRequest({ mode: 'list', country_id: String(country._id), search: '[City]', limit: '1' }))).json();
  assert.deepEqual(names.camps.map(row => row._id), [String(rows[0]._id)]);
  assert.equal(names.pagination.total, 1);
  const page = await (await mapRoute(mapRequest({ mode: 'list', country_id: String(country._id), page: '2', limit: '1' }))).json();
  assert.equal(page.camps.length, 1); assert.equal(page.pagination.total, 3);
  const explain = await Camps.find({ map_point: { $geoWithin: { $box: [[179, 9], [180, 11]] } } }).explain('queryPlanner');
  assert.match(JSON.stringify(explain.queryPlanner.winningPlan), /map_point_2d/);
  for (const params of [{ mode: 'viewport' }, { mode: 'viewport', south: '0', north: '91', west: '0', east: '1' }, { country_id: 'invalid' }, { mode: 'list', limit: '101' }]) assert.equal((await mapRoute(mapRequest(params))).status, 400);
  global.enquiryTestSession = null;
  assert.equal((await mapRoute(mapRequest({}))).status, 401);
});
mongoTest('calendar keyset pages preserve every source, stable ties, full counts and legacy initial deduplication', async () => {
  const f = await fixture();
  await Tasks.create(Array.from({ length: 13 }, (_, i) => scheduled(f, `Task ${i}`)));
  await Tasks.create([scheduled(f, 'No dates', { start_date: null, end_date: null }), scheduled(f, 'Partial dates', { end_date: null })]);
  await Events.create(Array.from({ length: 8 }, (_, i) => ({ business_id: f.business._id, created_by: f.user._id, attendee_ids: [f.colleague._id], title: `Meeting ${i}`, start_date: begin, end_date: end })));
  const [legacy, modern] = await Enquiries.create([{ createdBy: f.user._id, next_action: 'Visit', next_action_due: end, createdAt: begin }, { createdBy: f.user._id, next_action: 'Call', next_action_due: end, createdAt: begin }]);
  await Histories.create({ enquiry_id: modern._id, action: 'Call', action_origin: 'initial', assigned_to: [f.user._id], action_assignments: [{ user_id: f.user._id, status: 'pending' }], next_step_date: end, createdAt: begin });
  let cursor, all = [], expectedSummary;
  do {
    const response = await calendarRoute(calendarRequest({ limit: '7', ...(cursor ? { cursor } : {}) }));
    assert.equal(response.status, 200, await response.clone().text());
    const data = await response.json();
    assert.ok(data.items.length <= 7);
    if (!expectedSummary) expectedSummary = data.summary; else assert.deepEqual(data.summary, expectedSummary);
    all.push(...data.items); cursor = data.pagination.nextCursor;
  } while (cursor);
  assert.equal(all.length, 23); assert.equal(new Set(all.map(row => row.id)).size, 23);
  assert.deepEqual(expectedSummary, { total: 23, tasks: 13, customEvents: 8, enquiries: 2, pending: 23 });
  assert.equal(all.filter(row => row.sourceId === String(legacy._id)).length, 1);
  assert.equal(all.filter(row => row.sourceId === String(modern._id)).length, 1);
  const task = all.find(row => row.type === 'task');
  assert.equal(task.start, begin.toISOString()); assert.equal(task.end, end.toISOString());
  for (const params of [{ cursor: 'bad' }, { limit: '201' }, { search: 'x'.repeat(101) }, { start_date: 'bad' }]) assert.equal((await calendarRoute(calendarRequest(params))).status, 400);
});
mongoTest('calendar search runs before pagination and respects business, staff, team and event scopes', async () => {
  const f = await fixture(false);
  const team = await Teams.create({ team_name: 'Special [Team]', project_id: id(), project_dept_id: id(), team_head: f.colleague._id });
  await Members.create({ project_team_id: team._id, user_id: f.user._id });
  await Tasks.create([
    ...Array.from({ length: 5 }, (_, i) => scheduled(f, `Own ${i}`)),
    scheduled(f, 'Person match', { assigned_to: f.colleague._id }),
    scheduled(f, 'Team match', { creator: f.colleague._id, assigned_teams: [team._id] }),
    scheduled(f, 'Hidden colleague', { creator: f.colleague._id }),
    scheduled(f, 'Foreign business', { business_id: id() }),
  ]);
  await Events.create({ business_id: f.business._id, created_by: f.colleague._id, attendee_ids: [], title: 'Hidden meeting', start_date: begin, end_date: end });
  const people = await (await calendarRoute(calendarRequest({ search: 'Search Person', limit: '1' }))).json();
  assert.equal(people.summary.total, 2, 'matches assignee and team task creator; not unrelated colleague task');
  const teams = await (await calendarRoute(calendarRequest({ search: '[Team]', limit: '1' }))).json();
  assert.equal(teams.summary.total, 1); assert.equal(teams.items[0].title, 'Team match');
  const all = await (await calendarRoute(calendarRequest({}))).json();
  assert.equal(all.summary.total, 7); assert.equal(all.summary.customEvents, 0);
  await Admins.create({ business_id: f.business._id, user_id: f.user._id, status: 1 });
  assert.equal((await (await calendarRoute(calendarRequest({}))).json()).summary.tasks, 8);
});
mongoTest('large fixture bounds map markers and calendar payloads; reports response-size and query measurements', async () => {
  const f = await fixture();
  const country = await Country.create({ country_name: 'Large fixture country' });
  const facilities = Array.from({ length: 10000 }, (_, i) => ({ country_id: country._id, camp_name: `Facility ${i}`, latitude: String(24 + (i % 100) * 0.01), longitude: String(54 + Math.floor(i / 100) * 0.01), is_active: true }));
  await Camps.insertMany(facilities);
  const oldStart = performance.now();
  const oldRows = await Camps.find({ is_active: true, country_id: country._id }).populate('country_id', 'country_name').populate('region_id', 'region_name').populate('province_id', 'province_name').populate('city_id', 'city_name').populate('area_id', 'area_name').sort({ camp_name: 1 }).lean();
  const oldMap = oldRows.map(camp => ({ _id: String(camp._id), camp_name: camp.camp_name, camp_type: '', camp_capacity: '', camp_occupancy: null, visited_status: normalizeCampVisitedStatusForMap(camp.visited_status), latitude: Number(camp.latitude), longitude: Number(camp.longitude), country: camp.country_id.country_name, region: '', province: '', city: '', area: '' }));
  const oldMapMs = performance.now() - oldStart;
  const mapStart = performance.now();
  const mapResponse = await mapRoute(mapRequest({ mode: 'viewport', country_id: String(country._id), south: '23', north: '26', west: '53', east: '56', zoom: '8' }));
  const map = await mapResponse.json();
  const mapMs = performance.now() - mapStart;
  assert.equal(map.visibleTotal, 10000);
  assert.ok(map.camps.length + map.clusters.length <= 500);
  assert.equal(map.camps.length + map.clusters.reduce((sum, group) => sum + group.count, 0), 10000);
  await Tasks.insertMany(Array.from({ length: 1500 }, (_, i) => scheduled(f, `Load task ${i}`, { task_description: 'Description '.repeat(40), assigned_to: f.colleague._id })));
  const oldCalendarStart = performance.now();
  const oldTasks = await Tasks.find({ business_id: f.business._id, start_date: { $ne: null, $lte: end }, end_date: { $ne: null, $gte: begin } }).populate('assigned_to', 'name avatar_url').populate('creator', 'name avatar_url').populate('assigned_teams', 'team_name').sort({ start_date: 1, createdAt: -1 }).lean();
  const oldCalendar = oldTasks.map(task => ({ id: `task-${task._id}`, type: 'task', sourceId: String(task._id), title: task.task_name, description: task.task_description, start: task.start_date.toISOString(), end: task.end_date.toISOString(), status: task.status, assignedLabel: task.assigned_to?.name || 'Unassigned', createdBy: task.creator?.name || '', isProjectTask: Boolean(task.is_project_task) }));
  const oldCalendarMs = performance.now() - oldCalendarStart;
  const calendarStart = performance.now();
  const calendar = await (await calendarRoute(calendarRequest({ limit: '100', includeEnquiries: 'false', includeCustomEvents: 'false' }))).json();
  const calendarMs = performance.now() - calendarStart;
  assert.equal(calendar.summary.total, 1500); assert.equal(calendar.items.length, 100); assert.ok(calendar.pagination.nextCursor);
  const metrics = { fixtures: { facilities: 10000, scheduledTasks: 1500 }, map: { oldMarkers: oldMap.length, newMarkers: map.camps.length + map.clusters.length, oldBytes: Buffer.byteLength(JSON.stringify(oldMap)), newBytes: Buffer.byteLength(JSON.stringify(map)), oldQueryMs: Math.round(oldMapMs), newRouteMs: Math.round(mapMs) }, calendar: { oldItems: oldCalendar.length, newItems: calendar.items.length, oldBytes: Buffer.byteLength(JSON.stringify(oldCalendar)), newBytes: Buffer.byteLength(JSON.stringify(calendar)), oldQueryMs: Math.round(oldCalendarMs), newRouteMs: Math.round(calendarMs) } };
  assert.ok(metrics.map.newBytes < metrics.map.oldBytes / 10);
  assert.ok(metrics.calendar.newBytes < metrics.calendar.oldBytes / 10);
  console.log('LARGE_VIEW_FIXTURE_METRICS ' + JSON.stringify(metrics));
});
