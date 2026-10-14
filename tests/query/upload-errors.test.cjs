require('../enquiries/register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestJson } = require('../../lib/request-json.ts');

test('proxy payload, timeout and authentication errors remain actionable without JSON', async () => {
  const original = global.fetch;
  try {
    for (const [status, text] of [[413, /request-size limit/], [504, /timed out/], [401, /session has expired/], [502, /temporarily unavailable/]]) {
      global.fetch = async () => new Response('<html>Gateway error</html>', { status });
      await assert.rejects(requestJson('/upload'), text);
    }
    global.fetch = async () => Response.json({ message: 'Attachment must be smaller than 5MB' }, { status: 400 });
    await assert.rejects(requestJson('/upload'), /smaller than 5MB/);
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(requestJson('/upload'), /connection was interrupted/);
    global.fetch = async () => new Response('<html>Sign in</html>');
    await assert.rejects(requestJson('/upload'), /unexpected response/);
  } finally { global.fetch = original; }
});
