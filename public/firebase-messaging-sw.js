/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js"
);

const PRECACHE_NAME = "taskmanager-precache-v2";
const RUNTIME_CACHE_NAME = "taskmanager-runtime-v2";
const BADGE_CACHE_NAME = "taskmanager-meta-v1";
const BADGE_COUNT_CACHE_KEY = "/__badge_count__";
const CORE_ASSETS = ["/", "/logo.png", "/avatar.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== PRECACHE_NAME && key !== RUNTIME_CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache Next.js internals to avoid stale chunks and broken HMR.
  if (url.pathname.startsWith("/_next/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(RUNTIME_CACHE_NAME)
            .then((cache) => cache.put(event.request, copy))
            .catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  const isStaticAsset =
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches
            .open(RUNTIME_CACHE_NAME)
            .then((cache) => cache.put(event.request, copy))
            .catch(() => undefined);
        }
        return response;
      });
    })
  );
});

firebase.initializeApp({
  apiKey: "AIzaSyDu8e76eUQnaCiETaeh-af2hQtVg9vnUWo",
  authDomain: "taskmanager-4b024.firebaseapp.com",
  projectId: "taskmanager-4b024",
  storageBucket: "taskmanager-4b024.firebasestorage.app",
  messagingSenderId: "536356281424",
  appId: "1:536356281424:web:4324c9101f775b9b664555",
});

const messaging = firebase.messaging();

async function readBadgeCount() {
  const cache = await caches.open(BADGE_CACHE_NAME);
  const response = await cache.match(BADGE_COUNT_CACHE_KEY);
  if (!response) return 0;

  try {
    const data = await response.json();
    const count = Number(data?.count ?? 0);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  } catch (_error) {
    return 0;
  }
}

async function persistBadgeCount(count) {
  const cache = await caches.open(BADGE_CACHE_NAME);
  await cache.put(
    BADGE_COUNT_CACHE_KEY,
    new Response(JSON.stringify({ count: Math.max(0, count) }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
}

async function syncAppBadge(count) {
  await persistBadgeCount(count);

  const badgeNavigator = self.navigator;
  if (count > 0 && typeof badgeNavigator?.setAppBadge === "function") {
    await badgeNavigator.setAppBadge(count);
    return;
  }

  if (typeof badgeNavigator?.clearAppBadge === "function") {
    await badgeNavigator.clearAppBadge();
  }
}

async function incrementAppBadge(payload) {
  const payloadCount = Number(payload?.data?.badgeCount);
  const nextCount = Number.isFinite(payloadCount)
    ? Math.max(0, payloadCount)
    : (await readBadgeCount()) + 1;

  await syncAppBadge(nextCount);
}

async function broadcastToClients(payload) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  windowClients.forEach((client) => {
    client.postMessage({
      type: "fcm-background-message",
      payload,
    });
  });
}

messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "New notification";
  const body = payload?.notification?.body || payload?.data?.body || "";

  const options = {
    body,
    icon: "/logo.png",
    data: payload?.data || {},
  };

  Promise.all([
    self.registration.showNotification(title, options),
    broadcastToClients(payload),
    incrementAppBadge(payload),
  ]).catch(() => undefined);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const relativeUrl = data.link || data.url || "/";
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const matchedClient = windowClients.find(
          (client) => client.url === targetUrl
        );
        if (matchedClient && "focus" in matchedClient) {
          return matchedClient.focus();
        }
        return clients.openWindow(targetUrl);
      })
  );
});
