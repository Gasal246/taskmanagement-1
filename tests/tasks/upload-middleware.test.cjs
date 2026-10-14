const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { getCloneableBody } = require('next/dist/server/body-streams');

async function throughMiddleware(body, limit) {
  const stream = Readable.from((function* () {
    for (let i = 0; i < body.length; i += 65536) yield body.subarray(i, i + 65536);
  })());
  const chunks = [];
  for await (const chunk of getCloneableBody(stream, limit).cloneBodyStream()) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test('valid 10 MiB documents survive middleware including multipart overhead', async () => {
  const config = (await import('../../next.config.mjs')).default;
  const bytes = require('next/dist/compiled/bytes');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(10 * 1024 * 1024)]), 'photo.png');
  const request = new Request('http://localhost/upload', { method: 'POST', body: form });
  const body = Buffer.from(await request.arrayBuffer());
  const headers = { 'Content-Type': request.headers.get('content-type') };
  // Reproduce the previous default limit using Next's actual body-cloning code.
  const truncated = await throughMiddleware(body);
  await assert.rejects(new Response(truncated, { headers }).formData());
  const received = await throughMiddleware(body, bytes.parse(config.experimental.middlewareClientMaxBodySize));
  const parsed = await new Response(received, { headers }).formData();
  assert.equal(parsed.get('file').size, 10 * 1024 * 1024);
  assert.equal(received.length, body.length);
});
