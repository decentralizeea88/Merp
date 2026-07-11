const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Point the datastore at a throwaway directory before loading the server.
process.env.MERP_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'merp-test-'));
const { server } = require('../server');

let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(process.env.MERP_DATA_DIR, { recursive: true, force: true });
});

async function req(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test('serves the SPA at /', async () => {
  const res = await fetch(base + '/');
  assert.strictEqual(res.status, 200);
  const html = await res.text();
  assert.match(html, /Merp/);
});

test('lists seeded collections', async () => {
  for (const coll of ['clients', 'services', 'staff', 'appointments', 'products']) {
    const { status, data } = await req('GET', `/api/${coll}`);
    assert.strictEqual(status, 200, coll);
    assert.ok(Array.isArray(data) && data.length > 0, `${coll} should be seeded`);
  }
});

test('client CRUD lifecycle', async () => {
  const created = await req('POST', '/api/clients', { name: 'Test Person', phone: '555-9999' });
  assert.strictEqual(created.status, 201);
  const id = created.data.id;

  const updated = await req('PUT', `/api/clients/${id}`, { phone: '555-0000' });
  assert.strictEqual(updated.data.phone, '555-0000');
  assert.strictEqual(updated.data.name, 'Test Person');

  const removed = await req('DELETE', `/api/clients/${id}`);
  assert.strictEqual(removed.status, 200);
  const gone = await req('GET', `/api/clients/${id}`);
  assert.strictEqual(gone.status, 404);
});

test('rejects records missing required fields', async () => {
  const res = await req('POST', '/api/appointments', { date: '2026-08-01' });
  assert.strictEqual(res.status, 400);
  assert.match(res.data.error, /clientId/);
});

test('invoice computes totals, decrements stock, completes appointment', async () => {
  const products = (await req('GET', '/api/products')).data;
  const product = products.find((p) => p.stock >= 2);
  const appts = (await req('GET', '/api/appointments')).data;
  const appt = appts.find((a) => a.status === 'scheduled');

  const inv = await req('POST', '/api/invoices', {
    clientId: appt.clientId,
    appointmentId: appt.id,
    taxRate: 10,
    discount: 5,
    items: [
      { type: 'service', name: 'Haircut', qty: 1, unitPrice: 50 },
      { type: 'product', refId: product.id, name: product.name, qty: 2, unitPrice: product.salePrice }
    ]
  });
  assert.strictEqual(inv.status, 201);
  const expectedSubtotal = 50 + 2 * product.salePrice;
  assert.strictEqual(inv.data.subtotal, expectedSubtotal);
  assert.strictEqual(inv.data.total, Math.round((expectedSubtotal - 5) * 1.1 * 100) / 100);
  assert.ok(inv.data.number >= 1001);

  const after = (await req('GET', `/api/products/${product.id}`)).data;
  assert.strictEqual(after.stock, product.stock - 2);

  const apptAfter = (await req('GET', `/api/appointments/${appt.id}`)).data;
  assert.strictEqual(apptAfter.status, 'completed');
});

test('invoice numbers are sequential', async () => {
  const a = await req('POST', '/api/invoices', { items: [{ type: 'service', name: 'A', qty: 1, unitPrice: 10 }] });
  const b = await req('POST', '/api/invoices', { items: [{ type: 'service', name: 'B', qty: 1, unitPrice: 10 }] });
  assert.strictEqual(b.data.number, a.data.number + 1);
});

test('rejects invoice with insufficient stock', async () => {
  const products = (await req('GET', '/api/products')).data;
  const product = products[0];
  const res = await req('POST', '/api/invoices', {
    items: [{ type: 'product', refId: product.id, name: product.name, qty: product.stock + 100, unitPrice: 1 }]
  });
  assert.strictEqual(res.status, 400);
  assert.match(res.data.error, /Insufficient stock/);
});

test('settings can be read and updated', async () => {
  const before = (await req('GET', '/api/settings')).data;
  assert.ok(before.salonName);
  const updated = await req('PUT', '/api/settings', { taxRate: 12 });
  assert.strictEqual(updated.data.taxRate, 12);
});

test('unknown resource returns 404', async () => {
  const res = await req('GET', '/api/nonsense');
  assert.strictEqual(res.status, 404);
});
