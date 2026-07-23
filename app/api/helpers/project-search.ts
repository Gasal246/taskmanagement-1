import { DEPARTMENT_TYPES } from "@/lib/constants";
import Business_regions from "@/models/business_regions.model";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export async function buildProjectSearchClause(
  search: string | null,
  businessId?: string | null
) {
  const term = search?.trim();
  if (!term) return null;

  const regex = new RegExp(escapeRegex(term), "i");
  const normalizedTerm = normalizeSearchText(term);
  const matchingDomainTypes = DEPARTMENT_TYPES.filter((domain) => {
    const searchableText = normalizeSearchText(`${domain.label} ${domain.value}`);
    return Boolean(normalizedTerm) && searchableText.includes(normalizedTerm);
  }).map((domain) => domain.value);

  const regionQuery: Record<string, any> = { region_name: regex };
  if (businessId) regionQuery.business_id = businessId;
  const matchingRegions = await Business_regions.find(regionQuery)
    .select("_id")
    .lean();
  const matchingRegionIds = matchingRegions.map((region: any) => region._id);

  const conditions: Record<string, any>[] = [
    { project_name: regex },
  ];
  if (matchingDomainTypes.length) {
    conditions.push({ type: { $in: matchingDomainTypes } });
  }
  if (matchingRegionIds.length) {
    conditions.push({ region_id: { $in: matchingRegionIds } });
  }

  return { $or: conditions };
}
