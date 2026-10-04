import Cookies from "js-cookie";

const KNOWN_AUTH_COOKIES = [
  "user_role",
  "user_domain",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "next-auth.callback-url",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "authjs.callback-url",
];

function getDomainCandidates(hostname: string): string[] {
  const candidates = new Set<string>();

  if (!hostname || hostname === "localhost") {
    return [];
  }

  candidates.add(hostname);
  candidates.add(`.${hostname}`);

  const parts = hostname.split(".");
  if (parts.length >= 2) {
    const apex = parts.slice(-2).join(".");
    candidates.add(apex);
    candidates.add(`.${apex}`);
  }

  return Array.from(candidates);
}

function removeCookieEverywhere(name: string): void {
  Cookies.remove(name);
  Cookies.remove(name, { path: "/" });

  if (typeof window === "undefined") return;

  const domains = getDomainCandidates(window.location.hostname);
  for (const domain of domains) {
    Cookies.remove(name, { path: "/", domain });
  }

  const expireDate = "Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `${name}=;expires=${expireDate};path=/`;
  for (const domain of domains) {
    document.cookie = `${name}=;expires=${expireDate};path=/;domain=${domain}`;
  }
}

export async function clearClientAuthCleanup(): Promise<void> {
  if (typeof window === "undefined") return;

  KNOWN_AUTH_COOKIES.forEach(removeCookieEverywhere);

  // Personal todos, drafts, preferences and Firebase databases are not auth state.
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      for (const key of KNOWN_AUTH_COOKIES) storage.removeItem(key);
    } catch { /* Storage may be disabled by the browser. */ }
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.filter(key => key.startsWith("taskmanager-")).map((key) => window.caches.delete(key)));
    }
  } catch {
    // Best-effort cleanup only.
  }

}
