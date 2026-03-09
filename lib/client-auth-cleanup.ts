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

async function clearIndexedDBDatabases(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;

  const idbFactory = window.indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string | null }>>;
  };

  if (typeof idbFactory.databases !== "function") return;

  try {
    const databases = await idbFactory.databases();
    await Promise.all(
      databases.map((database) => {
        const dbName = database?.name;
        if (!dbName) return Promise.resolve();

        return new Promise<void>((resolve) => {
          const request = window.indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        });
      })
    );
  } catch {
    // Best-effort cleanup only.
  }
}

export async function clearClientAuthCleanup(): Promise<void> {
  if (typeof window === "undefined") return;

  KNOWN_AUTH_COOKIES.forEach(removeCookieEverywhere);

  document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter(Boolean)
    .forEach((cookieName) => removeCookieEverywhere(cookieName));

  try {
    window.localStorage.clear();
  } catch {
    // Best-effort cleanup only.
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Best-effort cleanup only.
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // Best-effort cleanup only.
  }

  await clearIndexedDBDatabases();
}
