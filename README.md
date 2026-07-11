# Merp — Beauty Salon ERP

A lightweight, zero-dependency ERP system for beauty salons. Runs on plain
Node.js (18+) with a JSON-file datastore — no database or `npm install` needed.

## Quick start

```bash
node server.js
# open http://localhost:3000
```

The app seeds itself with demo data (services, staff, clients, products and
appointments) on first run so every screen is populated immediately.

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Today's schedule, revenue today/this month, client count, low-stock alerts |
| **Appointments** | Book, edit, cancel; list view with status/staff/date filters or weekly calendar view; one-click checkout to POS |
| **Clients** | CRM with search, notes (allergies/preferences), visit history and lifetime spend |
| **Services** | Catalog grouped by category with price, duration and active flag |
| **Staff** | Team roster with roles, commission %, 30-day appointment and revenue stats |
| **Inventory** | Retail products with SKU, cost/sale price, stock levels, reorder alerts and one-click restock |
| **Point of Sale** | Ring up services + products, per-sale discount, tax, payment method; stock is decremented automatically |
| **Invoices** | Sequential invoice numbers, itemized detail view, paid/unpaid tracking |
| **Reports** | Monthly revenue, average ticket, service vs retail split, staff commission payouts, top services; CSV export of commissions, invoices and clients |
| **Settings** | Salon name, currency, tax rate, opening hours |

## Architecture

```
server.js        Zero-dependency HTTP server: static files + REST API
lib/db.js        JSON-file datastore (data/db.json) with seed data
public/          Single-page app (vanilla JS, no build step)
test/            API tests (node --test)
```

### REST API

Generic CRUD on `clients`, `services`, `staff`, `appointments`, `products`,
`invoices`:

```
GET    /api/<collection>        list
POST   /api/<collection>        create (validates required fields)
GET    /api/<collection>/:id    read
PUT    /api/<collection>/:id    update
DELETE /api/<collection>/:id    delete
GET    /api/settings            read settings
PUT    /api/settings            update settings
```

Invoice creation is special-cased: totals (subtotal, discount, tax) are
computed server-side, sequential invoice numbers are assigned, product stock
is checked and decremented, and any linked appointment is marked completed.

## Tests

```bash
npm test
```

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `MERP_DATA_DIR` | `./data` | Where `db.json` is stored |

To reset to fresh demo data, delete `data/db.json` and restart.
