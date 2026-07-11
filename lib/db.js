// Tiny JSON-file datastore. Collections are plain arrays of objects with
// string ids. Writes are debounced to a single file at data/db.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.MERP_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const COLLECTIONS = ['clients', 'services', 'staff', 'appointments', 'products', 'invoices', 'settings'];

let db = null;
let saveTimer = null;

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function load() {
  if (db) return db;
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const c of COLLECTIONS) if (!db[c]) db[c] = c === 'settings' ? defaultSettings() : [];
  } else {
    db = seed();
    persistNow();
  }
  return db;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistNow();
  }, 150);
}

function persistNow() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function list(collection) {
  return load()[collection];
}

function get(collection, id) {
  return load()[collection].find((x) => x.id === id) || null;
}

function insert(collection, doc) {
  const record = { id: newId(), createdAt: new Date().toISOString(), ...doc };
  load()[collection].push(record);
  scheduleSave();
  return record;
}

function update(collection, id, patch) {
  const record = get(collection, id);
  if (!record) return null;
  Object.assign(record, patch, { id, updatedAt: new Date().toISOString() });
  scheduleSave();
  return record;
}

function remove(collection, id) {
  const arr = load()[collection];
  const idx = arr.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  scheduleSave();
  return true;
}

function getSettings() {
  return load().settings;
}

function updateSettings(patch) {
  Object.assign(load().settings, patch);
  scheduleSave();
  return load().settings;
}

function defaultSettings() {
  return {
    salonName: 'Mirna Beauty Salon',
    currency: 'ETB',
    taxRate: 15, // Ethiopian VAT
    openingTime: '09:00',
    closingTime: '19:00',
    nextInvoiceNumber: 1001
  };
}

function seed() {
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const plusDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return iso(d);
  };

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
    { id: newId(), name: 'Olivia Bennett', phone: '555-0201', email: 'olivia.b@example.com', notes: 'Prefers Sofia. Allergic to ammonia-based dye.', createdAt: new Date().toISOString() },
    { id: newId(), name: 'James Whitfield', phone: '555-0202', email: 'james.w@example.com', notes: '', createdAt: new Date().toISOString() },
    { id: newId(), name: 'Priya Sharma', phone: '555-0203', email: 'priya.s@example.com', notes: 'Regular gel manicure every 3 weeks.', createdAt: new Date().toISOString() },
    { id: newId(), name: 'Carmen Rodriguez', phone: '555-0204', email: 'carmen.r@example.com', notes: 'Bride — wedding in September.', createdAt: new Date().toISOString() },
    { id: newId(), name: 'Hannah Lee', phone: '555-0205', email: 'hannah.l@example.com', notes: 'Sensitive skin, use fragrance-free products.', createdAt: new Date().toISOString() }
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
    { id: newId(), clientId: clients[0].id, staffId: staff[0].id, serviceIds: [services[0].id, services[4].id], date: plusDays(0), time: '10:00', status: 'scheduled', notes: '', createdAt: new Date().toISOString() },
    { id: newId(), clientId: clients[2].id, staffId: staff[2].id, serviceIds: [services[6].id], date: plusDays(0), time: '11:30', status: 'scheduled', notes: '', createdAt: new Date().toISOString() },
    { id: newId(), clientId: clients[4].id, staffId: staff[3].id, serviceIds: [services[8].id], date: plusDays(0), time: '14:00', status: 'scheduled', notes: 'Fragrance-free products only.', createdAt: new Date().toISOString() },
    { id: newId(), clientId: clients[1].id, staffId: staff[0].id, serviceIds: [services[1].id], date: plusDays(1), time: '09:30', status: 'scheduled', notes: '', createdAt: new Date().toISOString() },
    { id: newId(), clientId: clients[3].id, staffId: staff[1].id, serviceIds: [services[3].id], date: plusDays(2), time: '13:00', status: 'scheduled', notes: 'Trial before bridal booking.', createdAt: new Date().toISOString() },
    { id: newId(), clientId: clients[2].id, staffId: staff[2].id, serviceIds: [services[7].id], date: plusDays(-3), time: '15:00', status: 'completed', notes: '', createdAt: new Date().toISOString() },
    { id: newId(), clientId: clients[0].id, staffId: staff[1].id, serviceIds: [services[2].id], date: plusDays(-7), time: '10:00', status: 'completed', notes: '', createdAt: new Date().toISOString() }
  ];

  return {
    clients,
    services,
    staff,
    appointments,
    products,
    invoices: [],
    settings: defaultSettings()
  };
}

module.exports = { load, list, get, insert, update, remove, getSettings, updateSettings, COLLECTIONS };
