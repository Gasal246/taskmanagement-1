export function normalizeEnquirySectorCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatEnquiryUuid(prefix: string, projectSectorKey: unknown, date: Date, sequence: number) {
  const datePart = `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}${date.getFullYear()}`;
  const sectorCode = normalizeEnquirySectorCode(projectSectorKey);
  return [prefix, sectorCode, datePart, String(sequence)].filter(Boolean).join("-");
}
