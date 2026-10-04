const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function worker() {
  const values = new Map(), events = {}, shown = [], badges = [];
  let receive, closed = 0;
  const cache = { match: async key => values.has(key) ? new Response(values.get(key)) : undefined, put: async (key, response) => values.set(key, await response.text()) };
  const context = { Response, URL, console, importScripts: () => {}, caches: { open: async () => cache },
    firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage: fn => { receive = fn; } }) },
    navigator: { setAppBadge: async n => badges.push(n), clearAppBadge: async () => badges.push(0) },
    clients: { matchAll: async () => [] },
    self: { addEventListener: (name, fn) => { events[name] = fn; }, location: { origin: 'https://app.example.com' },
      registration: { showNotification: async (title, data) => shown.push({ title, ...data }), getNotifications: async () => [{ close: () => closed++ }] } },
  };
  vm.runInNewContext(fs.readFileSync('public/firebase-messaging-sw.js', 'utf8'), context);
  return { shown, values, badges, closed: () => closed, receive: payload => receive(payload), account: userId => new Promise((resolve, reject) => events.message({ data: { type: 'notification-account', userId }, waitUntil: promise => promise.then(resolve, reject) })) };
}
test('background delivery ignores signed-out and foreign accounts, deduplicates and links the inbox item', async () => {
  const w = worker();
  const payload = { data: { recipientId: 'alice', notificationId: 'inbox1', deliveryId: 'delivery1', title: 'Task assigned', body: 'Review task', badgeCount: '4' } };
  await w.receive(payload); assert.equal(w.shown.length, 0);
  await w.account('bob'); await w.receive(payload); assert.equal(w.shown.length, 0);
  await w.account('alice'); await w.receive(payload); await w.receive(payload);
  assert.equal(w.shown.length, 1); assert.equal(w.shown[0].data.link, '/notifications/inbox1');
  assert.equal(w.shown[0].tag, 'inbox1');
  assert.equal(JSON.parse(w.values.get('/__badge_count__')).count, 4);
  const closed = w.closed(); await w.account('alice'); assert.equal(w.closed(), closed);
  await w.account(null); assert.ok(w.closed() > closed); assert.equal(JSON.parse(w.values.get('/__badge_count__')).count, 0);
  await w.receive({ data: { ...payload.data, deliveryId: 'delivery2' } }); assert.equal(w.shown.length, 1);
});
