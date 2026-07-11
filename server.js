// Merp — beauty salon ERP server. Zero-dependency Node HTTP server that
// serves the SPA from public/ and a JSON REST API under /api.
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const CRUD_COLLECTIONS = ['clients', 'services', 'staff', 'appointments', 'products', 'invoices'];

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Validation: required string fields per collection for create.
const REQUIRED = {
  clients: ['name'],
  services: ['name'],
  staff: ['name'],
  appointments: ['clientId', 'staffId', 'date', 'time'],
  products: ['name'],
  invoices: ['items']
};

function validate(collection, body) {
  for (const field of REQUIRED[collection] || []) {
    const v = body[field];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Creating an invoice assigns a sequential number, computes totals server-side
// and decrements stock for product line items.
function createInvoice(body) {
  const settings = db.getSettings();
  const items = (body.items || []).map((it) => ({
    type: it.type === 'product' ? 'product' : 'service',
    refId: it.refId || null,
    name: String(it.name || 'Item'),
    qty: Math.max(1, Number(it.qty) || 1),
    unitPrice: Math.max(0, Number(it.unitPrice) || 0)
  }));
  if (items.length === 0) throw new Error('Invoice needs at least one line item');

  // Stock check first so we fail before mutating anything.
  for (const it of items) {
    if (it.type !== 'product' || !it.refId) continue;
    const product = db.get('products', it.refId);
    if (!product) throw new Error(`Unknown product on invoice: ${it.name}`);
    if (product.stock < it.qty) throw new Error(`Insufficient stock for ${product.name} (have ${product.stock}, need ${it.qty})`);
  }
  for (const it of items) {
    if (it.type !== 'product' || !it.refId) continue;
    const product = db.get('products', it.refId);
    db.update('products', product.id, { stock: product.stock - it.qty });
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const discount = Math.min(subtotal, Math.max(0, Number(body.discount) || 0));
  const taxRate = body.taxRate !== undefined ? Number(body.taxRate) : settings.taxRate;
  const tax = round2((subtotal - discount) * (taxRate / 100));
  const total = round2(subtotal - discount + tax);

  const invoice = db.insert('invoices', {
    number: settings.nextInvoiceNumber,
    clientId: body.clientId || null,
    appointmentId: body.appointmentId || null,
    items,
    subtotal: round2(subtotal),
    discount: round2(discount),
    taxRate,
    tax,
    total,
    paymentMethod: body.paymentMethod || 'cash',
    status: body.status === 'unpaid' ? 'unpaid' : 'paid'
  });
  db.updateSettings({ nextInvoiceNumber: settings.nextInvoiceNumber + 1 });

  if (invoice.appointmentId) {
    db.update('appointments', invoice.appointmentId, { status: 'completed' });
  }
  return invoice;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', collection, id?]
  const collection = parts[1];
  const id = parts[2];

  if (collection === 'settings') {
    if (req.method === 'GET') return sendJson(res, 200, db.getSettings());
    if (req.method === 'PUT') return sendJson(res, 200, db.updateSettings(await readBody(req)));
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!CRUD_COLLECTIONS.includes(collection)) {
    return sendJson(res, 404, { error: 'Unknown resource' });
  }

  if (req.method === 'GET' && !id) return sendJson(res, 200, db.list(collection));
  if (req.method === 'GET') {
    const record = db.get(collection, id);
    return record ? sendJson(res, 200, record) : sendJson(res, 404, { error: 'Not found' });
  }
  if (req.method === 'POST' && !id) {
    const body = await readBody(req);
    const err = validate(collection, body);
    if (err) return sendJson(res, 400, { error: err });
    delete body.id;
    if (collection === 'invoices') {
      try {
        return sendJson(res, 201, createInvoice(body));
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }
    return sendJson(res, 201, db.insert(collection, body));
  }
  if (req.method === 'PUT' && id) {
    const body = await readBody(req);
    delete body.id;
    const record = db.update(collection, id, body);
    return record ? sendJson(res, 200, record) : sendJson(res, 404, { error: 'Not found' });
  }
  if (req.method === 'DELETE' && id) {
    return db.remove(collection, id) ? sendJson(res, 200, { ok: true }) : sendJson(res, 404, { error: 'Not found' });
  }
  return sendJson(res, 405, { error: 'Method not allowed' });
}

function serveStatic(res, urlPath) {
  let filePath = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(res, url.pathname);
    }
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Merp salon ERP running at http://localhost:${PORT}`);
  });
}

module.exports = { server };
