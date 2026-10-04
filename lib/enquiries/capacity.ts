import { EQ_CAPACITY_LIMITS } from "@/lib/constants";

export class EnquiryCapacityError extends Error {}

export function enquiryCapacity(input: { camp_capacity?: unknown; camp_occupancy?: unknown }, existing?: any) {
  const rawCapacity = input.camp_capacity === undefined ? existing?.camp_capacity : input.camp_capacity;
  const rawOccupancy = input.camp_occupancy === undefined ? existing?.camp_occupancy : input.camp_occupancy;
  const camp_capacity = rawCapacity == null || rawCapacity === "" ? null : String(rawCapacity).trim();
  const camp_occupancy = rawOccupancy == null || String(rawOccupancy).trim() === "" ? null : Number(rawOccupancy);
  if (camp_occupancy !== null && (!Number.isSafeInteger(camp_occupancy) || camp_occupancy < 0)) throw new EnquiryCapacityError("Occupancy must be a non-negative whole number");
  const limit = camp_capacity ? EQ_CAPACITY_LIMITS[camp_capacity] : undefined;
  if (camp_occupancy !== null && limit && camp_occupancy > limit) throw new EnquiryCapacityError("Occupancy cannot exceed capacity");
  return { camp_capacity, camp_occupancy };
}
