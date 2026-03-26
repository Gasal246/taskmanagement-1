import Eq_Area from "@/models/eq_area.model";
import Eq_Camps from "@/models/eq_camps.model";
import Eq_City from "@/models/eq_city.model";
import Eq_Countries from "@/models/eq_countries.model";
import Eq_Province from "@/models/eq_province.model";
import Eq_Region from "@/models/eq_region.model";
import Users from "@/models/users.model";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const FIELD_CONFIG = {
  country_id: {
    fetch: (ids: string[]) => Eq_Countries.find({ _id: { $in: ids } }).select("country_name").lean(),
    resolveLabel: (doc: any) => doc?.country_name || null,
  },
  region_id: {
    fetch: (ids: string[]) => Eq_Region.find({ _id: { $in: ids } }).select("region_name").lean(),
    resolveLabel: (doc: any) => doc?.region_name || null,
  },
  province_id: {
    fetch: (ids: string[]) => Eq_Province.find({ _id: { $in: ids } }).select("province_name").lean(),
    resolveLabel: (doc: any) => doc?.province_name || null,
  },
  city_id: {
    fetch: (ids: string[]) => Eq_City.find({ _id: { $in: ids } }).select("city_name").lean(),
    resolveLabel: (doc: any) => doc?.city_name || null,
  },
  area_id: {
    fetch: (ids: string[]) => Eq_Area.find({ _id: { $in: ids } }).select("area_name").lean(),
    resolveLabel: (doc: any) => doc?.area_name || null,
  },
  camp_id: {
    fetch: (ids: string[]) => Eq_Camps.find({ _id: { $in: ids } }).select("camp_name").lean(),
    resolveLabel: (doc: any) => doc?.camp_name || null,
  },
  enquiry_brought_by: {
    fetch: (ids: string[]) => Users.find({ _id: { $in: ids } }).select("name email").lean(),
    resolveLabel: (doc: any) => doc?.name || doc?.email || null,
  },
  meeting_initiated_by: {
    fetch: (ids: string[]) => Users.find({ _id: { $in: ids } }).select("name email").lean(),
    resolveLabel: (doc: any) => doc?.name || doc?.email || null,
  },
  project_closed_by: {
    fetch: (ids: string[]) => Users.find({ _id: { $in: ids } }).select("name email").lean(),
    resolveLabel: (doc: any) => doc?.name || doc?.email || null,
  },
  project_managed_by: {
    fetch: (ids: string[]) => Users.find({ _id: { $in: ids } }).select("name email").lean(),
    resolveLabel: (doc: any) => doc?.name || doc?.email || null,
  },
} as const;

type HistoryAccessor<T> = (entry: T) => any;

const toObjectIdList = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => String(item || "").trim())
    .filter((item) => OBJECT_ID_PATTERN.test(item));
};

const resolveFieldValue = (value: unknown, dictionary: Map<string, string>) => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const key = String(item || "").trim();
      return dictionary.get(key) || item;
    });
  }

  const key = String(value || "").trim();
  return dictionary.get(key) || value;
};

export async function hydrateChangedFieldNames<T>(histories: T[], getHistory: HistoryAccessor<T>) {
  const idsByField = new Map<string, Set<string>>();

  histories.forEach((entry) => {
    const history = getHistory(entry);
    const changedFields = Array.isArray(history?.changed_fields) ? history.changed_fields : [];

    changedFields.forEach((change: any) => {
      const field = String(change?.field || "");
      if (!(field in FIELD_CONFIG)) return;

      const ids = [
        ...toObjectIdList(change?.from_value),
        ...toObjectIdList(change?.to_value),
      ];

      if (!ids.length) return;

      const bucket = idsByField.get(field) ?? new Set<string>();
      ids.forEach((id) => bucket.add(id));
      idsByField.set(field, bucket);
    });
  });

  const dictionaries = new Map<string, Map<string, string>>();

  await Promise.all(
    Object.entries(FIELD_CONFIG).map(async ([field, config]) => {
      const ids = Array.from(idsByField.get(field) ?? []);
      if (!ids.length) return;

      const docs = await config.fetch(ids);
      const dictionary = new Map<string, string>();
      docs.forEach((doc: any) => {
        const label = config.resolveLabel(doc);
        if (!label) return;
        dictionary.set(String(doc?._id), String(label));
      });
      dictionaries.set(field, dictionary);
    })
  );

  histories.forEach((entry) => {
    const history = getHistory(entry);
    const changedFields = Array.isArray(history?.changed_fields) ? history.changed_fields : [];

    changedFields.forEach((change: any) => {
      const field = String(change?.field || "");
      const dictionary = dictionaries.get(field);
      if (!dictionary) return;

      change.from_value = resolveFieldValue(change.from_value, dictionary);
      change.to_value = resolveFieldValue(change.to_value, dictionary);
    });
  });

  return histories;
}
