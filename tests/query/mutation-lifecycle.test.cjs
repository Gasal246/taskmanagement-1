require('../enquiries/register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { QueryObserver } = require('@tanstack/react-query');
const { createQueryClient, isInteractiveMutation } = require('../../query/create-query-client.ts');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function observe(client, key, queryFn) {
  client.setQueryData(key, 'before');
  const observer = new QueryObserver(client, { queryKey: key, queryFn, retry: false });
  return observer.subscribe(() => {});
}

test('save remains pending until all mounted views refresh; inactive views become stale', async () => {
  const client = createQueryClient(assert.fail);
  const refresh = deferred();
  const off = observe(client, ['enquiry', 'a'], () => refresh.promise);
  client.setQueryData(['enquiries', 'other-page'], 'cached');
  const mutation = client.getMutationCache().build(client, { mutationFn: async () => ({ status: 200 }) });
  const done = mutation.execute();
  await tick();
  assert.equal(mutation.state.status, 'pending');
  assert.equal(client.isMutating({ predicate: isInteractiveMutation }), 1);
  assert.equal(client.getQueryState(['enquiries', 'other-page']).isInvalidated, true);
  refresh.resolve('after');
  await done;
  assert.equal(client.getQueryData(['enquiry', 'a']), 'after');
  assert.equal(client.isMutating(), 0);
  off(); client.clear();
});

test('lookup mutations neither lock controls nor refresh queries', async () => {
  const client = createQueryClient(assert.fail);
  let reads = 0;
  const off = observe(client, ['regions'], async () => { reads++; return 'after'; });
  const lookup = deferred();
  const mutation = client.getMutationCache().build(client, { meta: { background: true, refresh: false }, mutationFn: () => lookup.promise });
  const done = mutation.execute();
  await tick();
  assert.equal(client.isMutating({ predicate: isInteractiveMutation }), 0);
  lookup.resolve([]); await done;
  assert.equal(reads, 0);
  off(); client.clear();
});

test('failed saves unlock controls without replacing displayed data', async () => {
  const errors = [];
  const client = createQueryClient(message => errors.push(message));
  let reads = 0;
  const off = observe(client, ['task'], async () => { reads++; return 'after'; });
  const mutation = client.getMutationCache().build(client, { mutationFn: async () => { throw new Error('Save failed'); } });
  await assert.rejects(mutation.execute(), /Save failed/);
  assert.equal(client.isMutating(), 0);
  assert.equal(reads, 0);
  assert.equal(client.getQueryData(['task']), 'before');
  assert.deepEqual(errors, ['Save failed']);
  off(); client.clear();
});

test('refresh failure reports saved state accurately and does not retry the write', async () => {
  const errors = []; let writes = 0;
  const client = createQueryClient(message => errors.push(message));
  const off = observe(client, ['project'], async () => { throw new Error('Offline'); });
  const mutation = client.getMutationCache().build(client, { mutationFn: async () => { writes++; return { status: 200 }; } });
  await mutation.execute();
  assert.equal(writes, 1);
  assert.equal(mutation.state.status, 'success');
  assert.equal(client.isMutating(), 0);
  assert.match(errors[0], /change was saved/);
  off(); client.clear();
});

test('exports can show progress without invalidating data', async () => {
  const client = createQueryClient(assert.fail);
  client.setQueryData(['enquiries'], 'before');
  const mutation = client.getMutationCache().build(client, { meta: { refresh: false }, mutationFn: async () => 'file' });
  assert.equal(isInteractiveMutation(mutation), true);
  await mutation.execute();
  assert.equal(client.getQueryState(['enquiries']).isInvalidated, false);
  client.clear();
});

test('legacy error responses do not trigger a success refresh', async () => {
  const client = createQueryClient(assert.fail);
  client.setQueryData(['enquiries'], 'before');
  const mutation = client.getMutationCache().build(client, { mutationFn: async () => ({ status: 409 }) });
  await mutation.execute();
  assert.equal(client.getQueryState(['enquiries']).isInvalidated, false);
  assert.equal(client.isMutating(), 0);
  client.clear();
});

test('overlapping saves keep the guard active until the last operation settles', async () => {
  const client = createQueryClient(assert.fail);
  const slow = deferred();
  const a = client.getMutationCache().build(client, { mutationFn: () => slow.promise });
  const b = client.getMutationCache().build(client, { mutationFn: async () => ({ status: 200 }) });
  const done = a.execute();
  await b.execute();
  assert.equal(client.isMutating({ predicate: isInteractiveMutation }), 1);
  slow.resolve({ status: 200 }); await done;
  assert.equal(client.isMutating(), 0);
  client.clear();
});
