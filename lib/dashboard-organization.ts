import Regions from "@/models/business_regions.model";
import Areas from "@/models/business_areas.model";
import Locations from "@/models/business_locations.model";

// The selected organization was already read and authorized by resolveDashboardScope.
// Read only ancestors; use their actual parent chain for dashboard breadcrumbs.
export async function dashboardOrganizationLabels(role: string, resource: any) {
  const labels: Record<string, string | undefined> = {};
  let region: any, area: any, location: any;
  if (role.includes("_DEP_")) labels.dep_name = resource.dep_name;
  if (role.startsWith("LOCATION")) {
    location = role.includes("_DEP_")
      ? await Locations.findById(resource.location_id).select("location_name area_id").lean() : resource;
    labels.location_name = location?.location_name;
    area = location?.area_id ? await Areas.findById(location.area_id).select("area_name region_id").lean() : null;
  } else if (role.startsWith("AREA")) {
    area = role.includes("_DEP_")
      ? await Areas.findById(resource.area_id).select("area_name region_id").lean() : resource;
  } else {
    region = role.includes("_DEP_")
      ? await Regions.findById(resource.region_id).select("region_name").lean() : resource;
  }
  if (area) {
    labels.area_name = area.area_name;
    region = area.region_id ? await Regions.findById(area.region_id).select("region_name").lean() : null;
  }
  labels.region_name = region?.region_name;
  return labels;
}
