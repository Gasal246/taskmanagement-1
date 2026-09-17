import test from "node:test";
import assert from "node:assert/strict";
import { capacityOccupancyFromDescription } from "../../scripts/migrate-project-capacity-occupancy.mjs";

test("extracts plain description capacity and occupancy", () => {
  assert.deepEqual(
    capacityOccupancyFromDescription("CAMP CAPACITY - 4100\nCURRENT OCCUPANCY  - 3,558"),
    { facility_capacity: "4100", facility_occupancy: 3558 },
  );
});

test("preserves capacity bands and extracts markdown values", () => {
  assert.deepEqual(
    capacityOccupancyFromDescription("- **Camp Capacity:** 500-1000\n- **Camp Occupancy:** 600"),
    { facility_capacity: "500-1000", facility_occupancy: 600 },
  );
});

test("ignores blank, unspecified, and ambiguous occupancy values", () => {
  assert.deepEqual(
    capacityOccupancyFromDescription("CAMP CAPACITY -\nCURRENT OCCUPANCY - Not specified"),
    { facility_capacity: null, facility_occupancy: null },
  );
  assert.deepEqual(
    capacityOccupancyFromDescription("Camp Capacity: <500\nCamp Occupancy: 400-450"),
    { facility_capacity: "<500", facility_occupancy: null },
  );
});
