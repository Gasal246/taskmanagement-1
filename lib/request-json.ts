/** Preserve useful errors even when a proxy returns HTML/plain text instead of JSON. */
export async function requestJson(url: string, init?: RequestInit) {
  let response: Response;
  try { response = await fetch(url, init); }
  catch { throw new Error("The connection was interrupted. Check your connection and try again."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback: Record<number, string> = {
      401: "Your session has expired. Sign in again before retrying.",
      403: "You no longer have permission to perform this action.",
      413: "The upload exceeds the server's request-size limit. Please try a smaller file or contact your administrator.",
      408: "The request timed out. Please try again.",
      502: "The upload service is temporarily unavailable. Please try again.",
      503: "The service is temporarily unavailable. Please try again.",
      504: "The request timed out. Please try again.",
    };
    throw new Error(data?.message || data?.error || fallback[response.status] || `The request failed (${response.status}). Please try again.`);
  }
  if (!data || typeof data !== "object") throw new Error("The server returned an unexpected response. Please try again.");
  return data;
}
