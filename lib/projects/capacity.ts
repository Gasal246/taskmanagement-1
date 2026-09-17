const NON_NEGATIVE_NUMBER = /^\d+(?:\.\d+)?$/;
const CAPACITY_RANGE = /^\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?$/;
const CAPACITY_LIMIT = /^(?:<|>|<=|>=|≤|≥)\s*\d+(?:\.\d+)?$/;

const normalized = (value: unknown) => String(value ?? "").trim().replace(/,/g, "");

export function isValidProjectCapacity(value: unknown) {
  const input = normalized(value);
  return input === ""
    || NON_NEGATIVE_NUMBER.test(input)
    || CAPACITY_RANGE.test(input)
    || CAPACITY_LIMIT.test(input);
}

export function isValidProjectOccupancy(value: unknown) {
  const input = normalized(value);
  return input === "" || NON_NEGATIVE_NUMBER.test(input);
}
