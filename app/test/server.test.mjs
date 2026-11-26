import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handler } from '../src/server.mjs';

async function withServer(fn) {
  const server = createServer(handler());
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

test('POST /api/quote returns totals', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/quote`, { method: 'POST', body: JSON.stringify({ lines: [{ description: 'x', quantity: 1, unitPrice: 100 }] }) });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json().then((j) => [j.subtotal, j.vat, j.total]), [100, 5, 105]);
  });
});

test('POST /api/quote rejects invalid input with 400', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/quote`, { method: 'POST', body: JSON.stringify({ lines: [] }) });
    assert.equal(res.status, 400);
  });
});
