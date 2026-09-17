const sectorsSeed = require('../../lib/enquiries/project-sectors.json');
const solutionsSeed = require('../../lib/enquiries/solution-catalogue.json');

const hotelOptions = ["Ultra-Luxury (6/7-Star)", "5-Star Deluxe", "5-Star", "4-Star", "3-Star", "2-Star", "1-Star", "Unrated / Under Classification"];
const query = rows => ({ sort() { return this; }, lean: async () => rows });

function installCatalogueFixture() {
  const Sector = require('../../models/eq_project_sector.model.ts').default;
  const FacilityType = require('../../models/eq_facility_type.model.ts').default;
  const SectorField = require('../../models/eq_project_sector_field.model.ts').default;
  const FieldOption = require('../../models/eq_project_sector_field_option.model.ts').default;
  const Category = require('../../models/eq_solution_category.model.ts').default;
  const Service = require('../../models/eq_solution_service.model.ts').default;
  const sectors = sectorsSeed.map((item, index) => ({ _id: `sector-${item.code}`, key: item.code, name: item.label, is_active: true, sort_order: index * 10 }));
  const facilityTypes = sectorsSeed.flatMap(sector => sector.facilities.map((item, index) => ({ _id: `facility-${item.code}`, project_sector_id: `sector-${sector.code}`, key: item.code, name: item.label, is_active: true, sort_order: index * 10, requires_custom_detail: item.code.endsWith('-99') })));
  const fields = [{ _id: 'field-hotel', project_sector_id: 'sector-HOS', key: 'HOS-HOTEL-CLASSIFICATION', name: 'Hotel Classification', input_type: 'select', is_required: true, is_active: true, sort_order: 10 }];
  const options = hotelOptions.map((name, index) => ({ _id: `hotel-${index}`, field_id: 'field-hotel', key: `HOS-HOTEL-${String(index + 1).padStart(2, '0')}`, name, is_active: true, sort_order: index * 10 }));
  const categories = solutionsSeed.map((item, index) => ({ _id: `category-${item.code}`, key: item.code, name: item.label, is_active: true, sort_order: index * 10 }));
  const services = solutionsSeed.flatMap(category => category.solutions.map((item, index) => ({ _id: `service-${item.code}`, solution_category_id: `category-${category.code}`, key: item.code, name: item.label, is_active: true, sort_order: index * 10, requires_custom_detail: item.code === 'OTH-01' })));
  Sector.find = () => query(sectors); FacilityType.find = () => query(facilityTypes); SectorField.find = () => query(fields);
  FieldOption.find = () => query(options); Category.find = () => query(categories); Service.find = () => query(services);
  return { sectors, facilityTypes, fields, options, categories, services };
}

module.exports = { installCatalogueFixture, sectorsSeed, solutionsSeed, hotelOptions };
