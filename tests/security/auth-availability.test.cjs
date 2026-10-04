require('../enquiries/register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { authAvailabilityBoundary, markAuthStorageFailure, authStorageFailed, AuthStorageUnavailableError,
  isTemporaryDatabaseError, temporaryDatabaseFailureResponse, authClientFailureResponse,
  temporarilyUnavailableResponse } = require('../../lib/auth-availability.ts');

test('temporary auth storage failure replaces cookie-clearing responses with retryable 503', async () => {
  const response = await authAvailabilityBoundary(async () => {
    assert.equal(markAuthStorageFailure({ name: 'MongoWaitQueueTimeoutError' }), true);
    return new Response('null', { headers: { 'Set-Cookie': 'authjs.session-token=; Max-Age=0' } });
  }, true);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('Retry-After'), '2');
  assert.match((await response.json()).message, /try again/i);
  assert.equal(authStorageFailed(), false);
});

test('temporary sign-in failure retains the redirect-false client URL contract without cookie deletion', async () => {
  const request = new Request('https://app.example/api/auth/callback/credentials', { method: 'POST', headers: { 'X-Auth-Return-Redirect': '1' } });
  const response = authClientFailureResponse(request, temporarilyUnavailableResponse());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(new URL((await response.json()).url).searchParams.get('error'), 'ServiceUnavailable');
  const regular = new Response('null');
  assert.equal(authClientFailureResponse(request, regular), regular);
});

test('session consumers throw instead of returning a truthy error or pretending logout', async () => {
  await assert.rejects(authAvailabilityBoundary(async () => {
    markAuthStorageFailure({ name: 'MongoServerSelectionError' });
    return null;
  }), AuthStorageUnavailableError);
});

test('storage failures are isolated across concurrent sessions and recover on the next request', async () => {
  const [failed, valid] = await Promise.all([
    authAvailabilityBoundary(async () => {
      markAuthStorageFailure({ name: 'MongoNetworkError' });
      await new Promise(r => setTimeout(r, 10));
      return new Response('denied');
    }, true),
    authAvailabilityBoundary(async () => {
      await new Promise(r => setTimeout(r, 5));
      assert.equal(authStorageFailed(), false);
      return new Response('verified');
    }, true),
  ]);
  assert.equal(failed.status, 503);
  assert.equal(await valid.text(), 'verified');
  assert.deepEqual(await authAvailabilityBoundary(async () => ({ user: { id: 'verified' } })), { user: { id: 'verified' } });
});

test('real rejection retains cookie cleanup and ordinary errors are not disguised as outages', async () => {
  const denied = await authAvailabilityBoundary(async () => new Response('null', { headers: { 'Set-Cookie': 'authjs.session-token=; Max-Age=0' } }), true);
  assert.match(denied.headers.get('Set-Cookie'), /Max-Age=0/);
  const error = new Error('code defect');
  await assert.rejects(authAvailabilityBoundary(async () => { throw error; }, true), e => e === error);
  assert.equal(isTemporaryDatabaseError({ name: 'MongoServerError', code: 13 }), false);
  assert.equal(isTemporaryDatabaseError({ name: 'MongoServerError', code: 91 }), true);
  assert.equal(temporaryDatabaseFailureResponse(error), null);
});
