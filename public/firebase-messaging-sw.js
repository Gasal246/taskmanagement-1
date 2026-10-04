/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

const PRECACHE_NAME = "taskmanager-precache-v3";
const RUNTIME_CACHE_NAME = "taskmanager-runtime-v3";
const BADGE_CACHE_NAME = "taskmanager-meta-v1";
const BADGE_COUNT_CACHE_KEY = "/__badge_count__";
const CORE_ASSETS = ["/offline.html", "/logo.png", "/avatar.png", "/manifest.webmanifest"];

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
              (key) => key.startsWith("taskmanager-") && key !== PRECACHE_NAME && key !== RUNTIME_CACHE_NAME && key !== BADGE_CACHE_NAME
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
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  // Never cache Next.js internals to avoid stale chunks and broken HMR.
  if (url.pathname.startsWith("/_next/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () =>
        (await caches.match("/offline.html")) || new Response("You are offline. Reconnect and try again.", { status: 503, headers: { "Content-Type": "text/plain" } })
      )
    );
    return;
  }

  // Cache only known public assets, never arbitrary uploaded/private files.
  if (!CORE_ASSETS.includes(url.pathname)) return;

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

self.addEventListener("message", event => {
  if (event.data?.type !== "notification-account") return;
  event.waitUntil((async () => {
    const cache = await caches.open(BADGE_CACHE_NAME);
    const previous = await cache.match("/__notification_account__");
    if (previous && (await previous.json()).userId === (event.data.userId || null)) return;
    await cache.put("/__notification_account__", new Response(JSON.stringify({ userId: event.data.userId || null })));
    await syncAppBadge(0);
    const notifications = await self.registration.getNotifications();
    notifications.forEach(notification => notification.close());
  })());
});

messaging.onBackgroundMessage(async payload => {
  const data = payload.data || {};
  const cache = await caches.open(BADGE_CACHE_NAME);
  const accountResponse = await cache.match("/__notification_account__");
  const account = accountResponse ? await accountResponse.json() : null;
  if (!account?.userId || (data.recipientId && account.userId !== data.recipientId)) return;
  const deliveryId = data.deliveryId || payload.messageId;
  const seenResponse = await cache.match("/__notification_deliveries__");
  const seen = seenResponse ? await seenResponse.json() : [];
  if (deliveryId && seen.includes(deliveryId)) return;
  const notificationId = data.notificationId;
  await self.registration.showNotification(data.title || payload.notification?.title || "New notification", {
    body: data.body || payload.notification?.body || "", icon: "/logo.png", badge: "/logo.png",
    tag: notificationId || deliveryId, data: { ...data, link: notificationId ? `/notifications/${notificationId}` : data.link || "/" },
  });
  if (deliveryId) await cache.put("/__notification_deliveries__", new Response(JSON.stringify([...seen, deliveryId].slice(-200))));
  await Promise.all([broadcastToClients(payload), incrementAppBadge(payload)]);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const data = event.notification?.data || {};
  const requestedUrl = new URL(data.link || "/", self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl.href : self.location.origin + "/";
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const current = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (current && "navigate" in current) { await current.navigate(targetUrl); return current.focus(); }
    return clients.openWindow(targetUrl);
  })());
});
