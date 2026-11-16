import { escapeSearch } from "@/lib/search";

export function parseTaskTags(input: string): string[] {
  const seen = new Set<string>();
  return input.split("#").map(tag => tag.trim().replace(/\s+/g, " ")).filter(tag => {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeTaskTags(tags: readonly string[]): string[] {
  return parseTaskTags(tags.map(tag => `#${tag}`).join(" "));
}

export function validateTaskTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(tag => typeof tag !== "string")) {
    throw new Error("Invalid tags: provide an array of strings");
  }
  const tags = normalizeTaskTags(value);
  if (tags.length > 100 || tags.some(tag => tag.length > 200)) {
    throw new Error("Invalid tags: use at most 100 tags of 200 characters each");
  }
  return tags;
}

// Each # delimits one complete tag, including spaces. All tags must match.
export function taskTagSearchFilter(search: string): Record<string, unknown> | null {
  if (!search.trim().startsWith("#")) return null;
  escapeSearch(search); // Apply the same length limit as task/activity searches.
  const tags = parseTaskTags(search);
  return tags.length
    ? { tags: { $all: tags.map(tag => new RegExp(`^${escapeSearch(tag)}$`, "i")) } }
    : { _id: { $in: [] } };
}
