// Builds a self-contained, single-file demo of the ERP (demo/index.html).
// The REST API is replaced by an in-browser fetch shim backed by
// localStorage, so the file runs anywhere static HTML can be served —
// no Node server needed. The UI code (public/app.js) is inlined unchanged.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css = read('public/styles.css');
const appJs = read('public/app.js');
const indexHtml = read('public/index.html');

// Page markup = everything inside <body>, minus the app.js script tag
// (it gets inlined below, after the API shim).
const body = indexHtml
  .match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/\s*<script src="\/app\.js"><\/script>/, '')
  .trim();

// The seed and invoice logic mirror lib/db.js and server.js.
const shim = `
(() => {
  const LS_KEY = 'mirna-erp-demo-db';

  function newId() {
    return Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 6);
  }

  function defaultSettings() {
    return {
      salonName: 'Mirna Beauty Salon',
      currency: 'ETB',
      taxRate: 15,
      openingTime: '09:00',
      closingTime: '19:00',
      nextInvoiceNumber: 1001
    };
  }

  function seed() {
    const iso = (d) => d.toISOString().slice(0, 10);
    const today = new Date();
    const plusDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
    const now = () => new Date().toISOString();

    const services = [
      { id: newId(), name: "Women's Haircut", category: 'Hair', price: 800, durationMin: 45, active: true },
      { id: newId(), name: "Men's Haircut", category: 'Hair', price: 400, durationMin: 30, active: true },
      { id: newId(), name: 'Full Color', category: 'Hair', price: 2500, durationMin: 120, active: true },
      { id: newId(), name: 'Balayage', category: 'Hair', price: 3500, durationMin: 150, active: true },
      { id: newId(), name: 'Blowout & Style', category: 'Hair', price: 600, durationMin: 40, active: true },
      { id: newId(), name: 'Classic Manicure', category: 'Nails', price: 500, durationMin: 30, active: true },
      { id: newId(), name: 'Gel Manicure', category: 'Nails', price: 800, durationMin: 45, active: true },
      { id: newId(), name: 'Spa Pedicure', category: 'Nails', price: 900, durationMin: 50, active: true },
      { id: newId(), name: 'Classic Facial', category: 'Skin', price: 1200, durationMin: 60, active: true },
      { id: newId(), name: 'Deep Cleansing Facial', category: 'Skin', price: 1800, durationMin: 75, active: true },
      { id: newId(), name: 'Eyebrow Shaping', category: 'Waxing', price: 250, durationMin: 15, active: true },
      { id: newId(), name: 'Full Leg Wax', category: 'Waxing', price: 1000, durationMin: 45, active: true },
      { id: newId(), name: 'Swedish Massage (60 min)', category: 'Massage', price: 1500, durationMin: 60, active: true },
      { id: newId(), name: 'Bridal Makeup', category: 'Makeup', price: 4000, durationMin: 90, active: true }
    ];
    const staff = [
      { id: newId(), name: 'Sofia Marchetti', role: 'Senior Stylist', phone: '555-0101', email: 'sofia@mirnabeauty.example', commissionPct: 40, active: true },
      { id: newId(), name: 'Amara Okafor', role: 'Colorist', phone: '555-0102', email: 'amara@mirnabeauty.example', commissionPct: 40, active: true },
      { id: newId(), name: 'Linh Tran', role: 'Nail Technician', phone: '555-0103', email: 'linh@mirnabeauty.example', commissionPct: 35, active: true },
      { id: newId(), name: 'Elena Petrova', role: 'Esthetician', phone: '555-0104', email: 'elena@mirnabeauty.example', commissionPct: 35, active: true },
      { id: newId(), name: 'Maya Chen', role: 'Massage Therapist', phone: '555-0105', email: 'maya@mirnabeauty.example', commissionPct: 45, active: true }
    ];
    const clients = [
      { id: newId(), name: 'Olivia Bennett', phone: '555-0201', email: 'olivia.b@example.com', notes: 'Prefers Sofia. Allergic to ammonia-based dye.', createdAt: now() },
      { id: newId(), name: 'James Whitfield', phone: '555-0202', email: 'james.w@example.com', notes: '', createdAt: now() },
      { id: newId(), name: 'Priya Sharma', phone: '555-0203', email: 'priya.s@example.com', notes: 'Regular gel manicure every 3 weeks.', createdAt: now() },
      { id: newId(), name: 'Carmen Rodriguez', phone: '555-0204', email: 'carmen.r@example.com', notes: 'Bride — wedding in September.', createdAt: now() },
      { id: newId(), name: 'Hannah Lee', phone: '555-0205', email: 'hannah.l@example.com', notes: 'Sensitive skin, use fragrance-free products.', createdAt: now() }
    ];
    const products = [
      { id: newId(), name: 'Argan Oil Shampoo 250ml', sku: 'SH-001', category: 'Hair Care', costPrice: 450, salePrice: 850, stock: 24, reorderLevel: 10 },
      { id: newId(), name: 'Keratin Repair Mask 200ml', sku: 'HM-002', category: 'Hair Care', costPrice: 600, salePrice: 1100, stock: 14, reorderLevel: 8 },
      { id: newId(), name: 'Gel Polish — Ruby Red', sku: 'GP-101', category: 'Nails', costPrice: 200, salePrice: 450, stock: 6, reorderLevel: 8 },
      { id: newId(), name: 'Cuticle Oil 15ml', sku: 'CO-102', category: 'Nails', costPrice: 120, salePrice: 300, stock: 30, reorderLevel: 10 },
      { id: newId(), name: 'Hyaluronic Serum 30ml', sku: 'SR-201', category: 'Skin Care', costPrice: 800, salePrice: 1600, stock: 9, reorderLevel: 6 },
      { id: newId(), name: 'SPF 50 Day Cream 50ml', sku: 'DC-202', category: 'Skin Care', costPrice: 500, salePrice: 1000, stock: 4, reorderLevel: 6 },
      { id: newId(), name: 'Massage Oil — Lavender 1L', sku: 'MO-301', category: 'Massage', costPrice: 650, salePrice: 1300, stock: 5, reorderLevel: 4 }
    ];
    const appointments = [
      { id: newId(), clientId: clients[0].id, staffId: staff[0].id, serviceIds: [services[0].id, services[4].id], date: plusDays(0), time: '10:00', status: 'scheduled', notes: '', createdAt: now() },
      { id: newId(), clientId: clients[2].id, staffId: staff[2].id, serviceIds: [services[6].id], date: plusDays(0), time: '11:30', status: 'scheduled', notes: '', createdAt: now() },
      { id: newId(), clientId: clients[4].id, staffId: staff[3].id, serviceIds: [services[8].id], date: plusDays(0), time: '14:00', status: 'scheduled', notes: 'Fragrance-free products only.', createdAt: now() },
      { id: newId(), clientId: clients[1].id, staffId: staff[0].id, serviceIds: [services[1].id], date: plusDays(1), time: '09:30', status: 'scheduled', notes: '', createdAt: now() },
      { id: newId(), clientId: clients[3].id, staffId: staff[1].id, serviceIds: [services[3].id], date: plusDays(2), time: '13:00', status: 'scheduled', notes: 'Trial before bridal booking.', createdAt: now() },
      { id: newId(), clientId: clients[2].id, staffId: staff[2].id, serviceIds: [services[7].id], date: plusDays(-3), time: '15:00', status: 'completed', notes: '', createdAt: now() },
      { id: newId(), clientId: clients[0].id, staffId: staff[1].id, serviceIds: [services[2].id], date: plusDays(-7), time: '10:00', status: 'completed', notes: '', createdAt: now() }
    ];
    return { clients, services, staff, appointments, products, invoices: [], settings: defaultSettings() };
  }

  let db;
  try {
    db = JSON.parse(localStorage.getItem(LS_KEY)) || seed();
  } catch {
    db = seed();
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch {}
  }
  save();

  window.resetDemoData = () => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    location.reload();
  };

  const CRUD = ['clients', 'services', 'staff', 'appointments', 'products', 'invoices'];
  const REQUIRED = {
    clients: ['name'], services: ['name'], staff: ['name'],
    appointments: ['clientId', 'staffId', 'date', 'time'],
    products: ['name'], invoices: ['items']
  };
  const round2 = (n) => Math.round(n * 100) / 100;

  function validate(coll, body) {
    for (const f of REQUIRED[coll] || []) {
      const v = body[f];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        return 'Missing required field: ' + f;
      }
    }
    return null;
  }

  function createInvoice(body) {
    const items = (body.items || []).map((it) => ({
      type: it.type === 'product' ? 'product' : 'service',
      refId: it.refId || null,
      name: String(it.name || 'Item'),
      qty: Math.max(1, Number(it.qty) || 1),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0)
    }));
    if (!items.length) throw new Error('Invoice needs at least one line item');
    for (const it of items) {
      if (it.type !== 'product' || !it.refId) continue;
      const p = db.products.find((x) => x.id === it.refId);
      if (!p) throw new Error('Unknown product on invoice: ' + it.name);
      if (p.stock < it.qty) throw new Error('Insufficient stock for ' + p.name + ' (have ' + p.stock + ', need ' + it.qty + ')');
    }
    for (const it of items) {
      if (it.type !== 'product' || !it.refId) continue;
      const p = db.products.find((x) => x.id === it.refId);
      p.stock -= it.qty;
    }
    const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(body.discount) || 0));
    const taxRate = body.taxRate !== undefined ? Number(body.taxRate) : db.settings.taxRate;
    const tax = round2((subtotal - discount) * (taxRate / 100));
    const invoice = {
      id: newId(), createdAt: new Date().toISOString(),
      number: db.settings.nextInvoiceNumber,
      clientId: body.clientId || null,
      appointmentId: body.appointmentId || null,
      items, subtotal: round2(subtotal), discount: round2(discount),
      taxRate, tax, total: round2(subtotal - discount + tax),
      paymentMethod: body.paymentMethod || 'cash',
      status: body.status === 'unpaid' ? 'unpaid' : 'paid'
    };
    db.invoices.push(invoice);
    db.settings.nextInvoiceNumber += 1;
    if (invoice.appointmentId) {
      const a = db.appointments.find((x) => x.id === invoice.appointmentId);
      if (a) a.status = 'completed';
    }
    return invoice;
  }

  function handle(method, pathname, body) {
    const parts = pathname.split('/').filter(Boolean); // ['api', coll, id?]
    const coll = parts[1];
    const id = parts[2];

    if (coll === 'settings') {
      if (method === 'GET') return [200, db.settings];
      if (method === 'PUT') { Object.assign(db.settings, body); save(); return [200, db.settings]; }
      return [405, { error: 'Method not allowed' }];
    }
    if (!CRUD.includes(coll)) return [404, { error: 'Unknown resource' }];

    if (method === 'GET' && !id) return [200, db[coll]];
    if (method === 'GET') {
      const r = db[coll].find((x) => x.id === id);
      return r ? [200, r] : [404, { error: 'Not found' }];
    }
    if (method === 'POST' && !id) {
      const err = validate(coll, body);
      if (err) return [400, { error: err }];
      delete body.id;
      if (coll === 'invoices') {
        try { const inv = createInvoice(body); save(); return [201, inv]; }
        catch (e) { return [400, { error: e.message }]; }
      }
      const record = Object.assign({ id: newId(), createdAt: new Date().toISOString() }, body);
      db[coll].push(record);
      save();
      return [201, record];
    }
    if (method === 'PUT' && id) {
      const r = db[coll].find((x) => x.id === id);
      if (!r) return [404, { error: 'Not found' }];
      delete body.id;
      Object.assign(r, body, { id, updatedAt: new Date().toISOString() });
      save();
      return [200, r];
    }
    if (method === 'DELETE' && id) {
      const i = db[coll].findIndex((x) => x.id === id);
      if (i === -1) return [404, { error: 'Not found' }];
      db[coll].splice(i, 1);
      save();
      return [200, { ok: true }];
    }
    return [405, { error: 'Method not allowed' }];
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (url, opts = {}) => {
    const u = typeof url === 'string' ? url : url.url;
    if (!u.startsWith('/api/')) {
      if (realFetch) return realFetch(url, opts);
      throw new Error('Network unavailable in demo');
    }
    const body = opts.body ? JSON.parse(opts.body) : {};
    const [status, data] = handle((opts.method || 'GET').toUpperCase(), u, body);
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };
})();
`;

const demoFooter = `
<script>
  (function () {
    var nav = document.getElementById('nav');
    var note = document.createElement('div');
    note.style.cssText = 'margin-top:auto;padding:14px 18px;font-size:12px;color:#a396b3;border-top:1px solid rgba(255,255,255,0.08)';
    note.innerHTML = 'Demo mode — data is saved in this browser only.<br><a href="#" style="color:#cfc4dd" onclick="resetDemoData();return false">Reset demo data</a>';
    nav.parentElement.appendChild(note);
  })();
</script>`;

const html = `<title>Mirna Beauty Salon — ERP Demo</title>
<style>
:root { color-scheme: light; }
${css}
</style>
${body}
<script>${shim}</script>
<script>
${appJs}
</script>
${demoFooter}
`;

const outDir = path.join(root, 'demo');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`Wrote demo/index.html (${(html.length / 1024).toFixed(0)} KB)`);
