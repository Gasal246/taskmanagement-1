export function escapeSearch(value: string): string {
  if (value.length > 200) throw new Error("Invalid search: use at most 200 characters");
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pageBounds(params: Pick<URLSearchParams, "get">, defaultLimit = 10, maxLimit = 50) {
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || defaultLimit);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger((page - 1) * Math.min(limit, maxLimit))) throw new Error("Invalid pagination");
  return { page, limit: Math.min(limit, maxLimit), skip: (page - 1) * Math.min(limit, maxLimit) };
}
