/* Merp — beauty salon ERP frontend (vanilla JS SPA). */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const main = $('#main');

  const state = {
    clients: [],
    services: [],
    staff: [],
    appointments: [],
    products: [],
    invoices: [],
    settings: {},
    cart: [] // POS cart lines {type, refId, name, qty, unitPrice}
  };

  // ---------- API ----------
  async function api(method, path, body) {
    const res = await fetch(`/api/${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function loadAll() {
    const [clients, services, staff, appointments, products, invoices, settings] = await Promise.all([
      api('GET', 'clients'), api('GET', 'services'), api('GET', 'staff'),
      api('GET', 'appointments'), api('GET', 'products'), api('GET', 'invoices'),
      api('GET', 'settings')
    ]);
    Object.assign(state, { clients, services, staff, appointments, products, invoices, settings });
  }

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: state.settings.currency || 'USD' }).format(n || 0);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const byId = (coll, id) => state[coll].find((x) => x.id === id);
  const clientName = (id) => byId('clients', id)?.name || '—';
  const staffName = (id) => byId('staff', id)?.name || '—';
  const serviceNames = (ids) => (ids || []).map((id) => byId('services', id)?.name || '?').join(', ');
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  function downloadCSV(filename, rows) {
    if (!rows.length) return toast('Nothing to export', true);
    const headers = Object.keys(rows[0]);
    const cell = (v) => {
      v = String(v ?? '');
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Exported ${filename}`);
  }

  function toast(msg, isError = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast${isError ? ' error' : ''}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  // ---------- Modal ----------
  function openModal(title, bodyHtml, { onSubmit, submitLabel = 'Save' } = {}) {
    const backdrop = $('#modal-backdrop');
    const modal = $('#modal');
    modal.innerHTML = `
      <div class="modal-header"><span>${esc(title)}</span><button class="modal-close" aria-label="Close">✕</button></div>
      <form id="modal-form">
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          <button type="button" class="btn" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn primary">${esc(submitLabel)}</button>
        </div>
      </form>`;
    backdrop.classList.remove('hidden');
    const close = () => backdrop.classList.add('hidden');
    $('.modal-close', modal).onclick = close;
    $('#modal-cancel', modal).onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
    $('#modal-form', modal).onsubmit = async (e) => {
      e.preventDefault();
      if (!onSubmit) return close();
      try {
        await onSubmit(new FormData(e.target), e.target);
        close();
      } catch (err) {
        toast(err.message, true);
      }
    };
    return { close };
  }

  function field(label, inputHtml, full = false) {
    return `<label class="field${full ? ' full' : ''}">${esc(label)}${inputHtml}</label>`;
  }
  const options = (items, selected, labelFn = (x) => x.name) =>
    items.map((x) => `<option value="${x.id}" ${x.id === selected ? 'selected' : ''}>${esc(labelFn(x))}</option>`).join('');

  // ---------- Views ----------
  const views = {
    dashboard: renderDashboard,
    appointments: renderAppointments,
    clients: renderClients,
    services: renderServices,
    staff: renderStaff,
    inventory: renderInventory,
    pos: renderPOS,
    invoices: renderInvoices,
    reports: renderReports,
    settings: renderSettings
  };

  function header(title, sub, actionsHtml = '') {
    return `<div class="page-header">
      <div><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
      <div class="header-actions">${actionsHtml}</div>
    </div>`;
  }

  // ----- Dashboard -----
  function renderDashboard() {
    const today = todayISO();
    const todaysAppts = state.appointments
      .filter((a) => a.date === today && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
    const monthStart = today.slice(0, 7);
    const monthInvoices = state.invoices.filter((i) => (i.createdAt || '').slice(0, 7) === monthStart && i.status === 'paid');
    const monthRevenue = monthInvoices.reduce((s, i) => s + i.total, 0);
    const todayRevenue = state.invoices
      .filter((i) => (i.createdAt || '').slice(0, 10) === today && i.status === 'paid')
      .reduce((s, i) => s + i.total, 0);
    const lowStock = state.products.filter((p) => p.stock <= p.reorderLevel);
    const upcoming = state.appointments
      .filter((a) => a.date > today && a.status === 'scheduled')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 6);

    main.innerHTML = `
      ${header(state.settings.salonName || 'Dashboard', `Overview for ${fmtDate(today)}`,
        `<a class="btn primary" href="#/appointments?new=1">＋ New appointment</a>
         <a class="btn" href="#/pos">Open POS</a>`)}
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Today's appointments</div><div class="value">${todaysAppts.length}</div><div class="hint">${todaysAppts.filter((a) => a.status === 'completed').length} completed</div></div>
        <div class="stat-card"><div class="label">Revenue today</div><div class="value">${money(todayRevenue)}</div><div class="hint">paid invoices</div></div>
        <div class="stat-card"><div class="label">Revenue this month</div><div class="value">${money(monthRevenue)}</div><div class="hint">${monthInvoices.length} invoices</div></div>
        <div class="stat-card"><div class="label">Clients</div><div class="value">${state.clients.length}</div><div class="hint">${state.staff.filter((s) => s.active).length} active staff</div></div>
        <div class="stat-card"><div class="label">Low stock items</div><div class="value">${lowStock.length}</div><div class="hint">${lowStock.length ? 'needs reorder' : 'all stocked'}</div></div>
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-title">Today's schedule</div>
          ${apptTable(todaysAppts, { hideDate: true })}
        </div>
        <div>
          <div class="card">
            <div class="card-title">Upcoming appointments</div>
            ${apptTable(upcoming, { compact: true })}
          </div>
          <div class="card">
            <div class="card-title">Low stock alerts</div>
            ${lowStock.length ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th class="num">Stock</th><th class="num">Reorder at</th></tr></thead><tbody>
              ${lowStock.map((p) => `<tr><td>${esc(p.name)}</td><td class="num"><span class="badge ${p.stock === 0 ? 'out' : 'low'}">${p.stock}</span></td><td class="num">${p.reorderLevel}</td></tr>`).join('')}
            </tbody></table></div>` : '<div class="empty">All products are above reorder level 🎉</div>'}
          </div>
        </div>
      </div>`;
    bindApptRowActions();
  }

  // ----- Appointments -----
  function apptTable(appts, { hideDate = false, compact = false, actions = false } = {}) {
    if (!appts.length) return '<div class="empty">No appointments</div>';
    return `<div class="table-wrap"><table><thead><tr>
      ${hideDate ? '' : '<th>Date</th>'}<th>Time</th><th>Client</th><th>Service(s)</th>${compact ? '' : '<th>Staff</th>'}<th>Status</th>${actions ? '<th></th>' : ''}
    </tr></thead><tbody>
      ${appts.map((a) => `<tr>
        ${hideDate ? '' : `<td>${fmtDate(a.date)}</td>`}
        <td>${esc(a.time)}</td>
        <td>${esc(clientName(a.clientId))}</td>
        <td style="white-space:normal">${esc(serviceNames(a.serviceIds))}</td>
        ${compact ? '' : `<td>${esc(staffName(a.staffId))}</td>`}
        <td><span class="badge ${a.status}">${a.status}</span></td>
        ${actions ? `<td class="btn-row">
          ${a.status === 'scheduled' ? `<button class="btn small" data-act="checkout" data-id="${a.id}">Checkout</button>
          <button class="btn small" data-act="edit-appt" data-id="${a.id}">Edit</button>
          <button class="btn small danger" data-act="cancel-appt" data-id="${a.id}">Cancel</button>` : `<button class="btn small danger" data-act="del-appt" data-id="${a.id}">Delete</button>`}
        </td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  function bindApptRowActions() {
    main.querySelectorAll('[data-act]').forEach((btn) => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      btn.onclick = async () => {
        if (act === 'edit-appt') return appointmentForm(byId('appointments', id));
        if (act === 'cancel-appt') {
          await api('PUT', `appointments/${id}`, { status: 'cancelled' });
          await refresh('Appointment cancelled');
        }
        if (act === 'del-appt') {
          if (!confirm('Delete this appointment?')) return;
          await api('DELETE', `appointments/${id}`);
          await refresh('Appointment deleted');
        }
        if (act === 'checkout') {
          const appt = byId('appointments', id);
          state.cart = (appt.serviceIds || []).map((sid) => {
            const s = byId('services', sid);
            return { type: 'service', refId: sid, name: s?.name || 'Service', qty: 1, unitPrice: s?.price || 0 };
          });
          state.cartClientId = appt.clientId;
          state.cartAppointmentId = appt.id;
          location.hash = '#/pos';
        }
      };
    });
  }

  function viewToggle(mode) {
    return `<div class="btn-row">
      <button class="btn small ${mode === 'list' ? 'primary' : ''}" id="mode-list">List</button>
      <button class="btn small ${mode === 'week' ? 'primary' : ''}" id="mode-week">Week</button>
    </div>`;
  }

  function bindViewToggle() {
    $('#mode-list').onclick = () => { state.apptMode = 'list'; renderAppointments(); };
    $('#mode-week').onclick = () => { state.apptMode = 'week'; renderAppointments(); };
  }

  function renderAppointments() {
    if ((state.apptMode || 'list') === 'week') return renderWeekView();
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const filter = state.apptFilter || { status: 'all', staffId: 'all', from: todayISO() };
    let appts = [...state.appointments];
    if (filter.status !== 'all') appts = appts.filter((a) => a.status === filter.status);
    if (filter.staffId !== 'all') appts = appts.filter((a) => a.staffId === filter.staffId);
    if (filter.from) appts = appts.filter((a) => a.date >= filter.from);
    appts.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    // group by date
    const groups = {};
    for (const a of appts) (groups[a.date] ||= []).push(a);

    main.innerHTML = `
      ${header('Appointments', `${appts.length} shown`, `${viewToggle('list')} <button class="btn primary" id="new-appt">＋ New appointment</button>`)}
      <div class="card"><div class="card-body filters">
        <label class="field">Status<select id="f-status">
          ${['all', 'scheduled', 'completed', 'cancelled', 'no-show'].map((s) => `<option ${filter.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></label>
        <label class="field">Staff<select id="f-staff"><option value="all">all</option>${options(state.staff, filter.staffId)}</select></label>
        <label class="field">From date<input type="date" id="f-from" value="${filter.from || ''}"></label>
        <button class="btn small" id="f-clear" style="align-self:flex-end">Show all dates</button>
      </div></div>
      ${Object.keys(groups).length === 0 ? '<div class="card"><div class="empty">No appointments match the filters</div></div>' : ''}
      ${Object.entries(groups).map(([date, list]) => `
        <div class="card">
          <div class="day-group-title">${fmtDate(date)} — ${list.length} appointment${list.length > 1 ? 's' : ''}</div>
          ${apptTable(list, { hideDate: true, actions: true })}
        </div>`).join('')}`;

    bindViewToggle();
    $('#new-appt').onclick = () => appointmentForm();
    $('#f-status').onchange = (e) => { state.apptFilter = { ...filter, status: e.target.value }; renderAppointments(); };
    $('#f-staff').onchange = (e) => { state.apptFilter = { ...filter, staffId: e.target.value }; renderAppointments(); };
    $('#f-from').onchange = (e) => { state.apptFilter = { ...filter, from: e.target.value }; renderAppointments(); };
    $('#f-clear').onclick = () => { state.apptFilter = { ...filter, from: '' }; renderAppointments(); };
    bindApptRowActions();
    if (params.get('new')) {
      history.replaceState(null, '', '#/appointments');
      appointmentForm();
    }
  }

  function renderWeekView() {
    // Monday of the displayed week, stored as ISO date.
    if (!state.weekStart) {
      const d = new Date();
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      state.weekStart = d.toISOString().slice(0, 10);
    }
    const start = new Date(state.weekStart + 'T00:00:00');
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const end = days[6];
    const shift = (n) => {
      const d = new Date(start);
      d.setDate(d.getDate() + n);
      state.weekStart = d.toISOString().slice(0, 10);
      renderAppointments();
    };
    const rangeLabel = `${fmtDate(days[0])} – ${fmtDate(end)}`;

    main.innerHTML = `
      ${header('Appointments', rangeLabel, `${viewToggle('week')}
        <div class="btn-row">
          <button class="btn small" id="wk-prev">‹ Prev</button>
          <button class="btn small" id="wk-today">Today</button>
          <button class="btn small" id="wk-next">Next ›</button>
        </div>
        <button class="btn primary" id="new-appt">＋ New appointment</button>`)}
      <div class="week-grid">
        ${days.map((date) => {
          const isToday = date === todayISO();
          const appts = state.appointments
            .filter((a) => a.date === date && a.status !== 'cancelled')
            .sort((a, b) => a.time.localeCompare(b.time));
          return `<div class="week-col${isToday ? ' today' : ''}">
            <div class="week-col-head">
              <span>${fmtDate(date)}</span>
              <button class="btn small" data-book="${date}" title="Book on this day">＋</button>
            </div>
            ${appts.map((a) => `
              <button class="appt-chip ${a.status}" data-chip="${a.id}">
                <div class="chip-time">${esc(a.time)} · ${esc(staffName(a.staffId))}</div>
                <div class="chip-client">${esc(clientName(a.clientId))}</div>
                <div class="chip-svc">${esc(serviceNames(a.serviceIds))}</div>
              </button>`).join('') || '<div class="week-empty">—</div>'}
          </div>`;
        }).join('')}
      </div>`;

    bindViewToggle();
    $('#new-appt').onclick = () => appointmentForm();
    $('#wk-prev').onclick = () => shift(-7);
    $('#wk-next').onclick = () => shift(7);
    $('#wk-today').onclick = () => { state.weekStart = null; renderAppointments(); };
    main.querySelectorAll('[data-book]').forEach((btn) => {
      btn.onclick = () => appointmentForm(null, { date: btn.dataset.book });
    });
    main.querySelectorAll('[data-chip]').forEach((btn) => {
      btn.onclick = () => appointmentForm(byId('appointments', btn.dataset.chip));
    });
  }

  function appointmentForm(appt, defaults = {}) {
    const isEdit = !!appt;
    appt = appt || { date: defaults.date || todayISO(), time: '10:00', status: 'scheduled', serviceIds: [] };
    const activeServices = state.services.filter((s) => s.active !== false);
    openModal(isEdit ? 'Edit appointment' : 'New appointment', `
      <div class="form-grid">
        ${field('Client', `<select name="clientId" required><option value="">— select —</option>${options(state.clients, appt.clientId)}</select>`)}
        ${field('Staff', `<select name="staffId" required><option value="">— select —</option>${options(state.staff.filter((s) => s.active !== false), appt.staffId)}</select>`)}
        ${field('Date', `<input type="date" name="date" value="${appt.date}" required>`)}
        ${field('Time', `<input type="time" name="time" value="${appt.time}" required>`)}
        ${field('Services', `<div class="checkbox-list">${activeServices.map((s) => `
          <label><input type="checkbox" name="serviceIds" value="${s.id}" ${appt.serviceIds?.includes(s.id) ? 'checked' : ''}> ${esc(s.name)} — ${money(s.price)} (${s.durationMin} min)</label>`).join('')}</div>`, true)}
        ${isEdit ? field('Status', `<select name="status">${['scheduled', 'completed', 'cancelled', 'no-show'].map((s) => `<option ${appt.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`) : ''}
        ${field('Notes', `<textarea name="notes">${esc(appt.notes || '')}</textarea>`, true)}
      </div>`, {
      onSubmit: async (fd) => {
        const body = {
          clientId: fd.get('clientId'),
          staffId: fd.get('staffId'),
          date: fd.get('date'),
          time: fd.get('time'),
          serviceIds: fd.getAll('serviceIds'),
          notes: fd.get('notes') || '',
          status: fd.get('status') || appt.status
        };
        if (body.serviceIds.length === 0) throw new Error('Select at least one service');
        if (isEdit) await api('PUT', `appointments/${appt.id}`, body);
        else await api('POST', 'appointments', body);
        await refresh(isEdit ? 'Appointment updated' : 'Appointment booked');
      }
    });
  }

  // ----- Clients -----
  function renderClients() {
    const q = (state.clientSearch || '').toLowerCase();
    const clients = state.clients
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));

    main.innerHTML = `
      ${header('Clients', `${state.clients.length} total`, `
        <input class="search-input" id="client-search" placeholder="Search name, phone, email…" value="${esc(state.clientSearch || '')}">
        <button class="btn primary" id="new-client">＋ New client</button>`)}
      <div class="card">${clients.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th class="num">Visits</th><th class="num">Total spent</th><th></th></tr></thead>
        <tbody>${clients.map((c) => {
          const visits = state.appointments.filter((a) => a.clientId === c.id && a.status === 'completed').length;
          const spent = state.invoices.filter((i) => i.clientId === c.id && i.status === 'paid').reduce((s, i) => s + i.total, 0);
          return `<tr>
            <td><span class="link" data-act="view-client" data-id="${c.id}">${esc(c.name)}</span></td>
            <td>${esc(c.phone || '—')}</td><td>${esc(c.email || '—')}</td>
            <td class="num">${visits}</td><td class="num">${money(spent)}</td>
            <td class="btn-row">
              <button class="btn small" data-act="edit-client" data-id="${c.id}">Edit</button>
              <button class="btn small danger" data-act="del-client" data-id="${c.id}">Delete</button>
            </td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty">No clients found</div>'}</div>`;

    $('#new-client').onclick = () => clientForm();
    const search = $('#client-search');
    search.oninput = () => {
      state.clientSearch = search.value;
      clearTimeout(search._t);
      search._t = setTimeout(() => { renderClients(); $('#client-search').focus(); $('#client-search').setSelectionRange(search.value.length, search.value.length); }, 250);
    };
    main.querySelectorAll('[data-act]').forEach((el) => {
      const id = el.dataset.id;
      el.onclick = async () => {
        if (el.dataset.act === 'edit-client') clientForm(byId('clients', id));
        if (el.dataset.act === 'view-client') clientDetail(byId('clients', id));
        if (el.dataset.act === 'del-client') {
          if (!confirm('Delete this client? Their appointments and invoices remain but lose the link.')) return;
          await api('DELETE', `clients/${id}`);
          await refresh('Client deleted');
        }
      };
    });
  }

  function clientDetail(c) {
    const appts = state.appointments.filter((a) => a.clientId === c.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const invoices = state.invoices.filter((i) => i.clientId === c.id);
    const spent = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    openModal(c.name, `
      <p><strong>Phone:</strong> ${esc(c.phone || '—')} &nbsp; <strong>Email:</strong> ${esc(c.email || '—')}</p>
      <p style="margin-top:6px"><strong>Total spent:</strong> ${money(spent)} across ${invoices.length} invoice(s)</p>
      ${c.notes ? `<p style="margin-top:6px"><strong>Notes:</strong> ${esc(c.notes)}</p>` : ''}
      <h4 style="margin:14px 0 6px">Visit history</h4>
      ${appts.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Services</th><th>Status</th></tr></thead><tbody>
        ${appts.slice(0, 10).map((a) => `<tr><td>${fmtDate(a.date)} ${esc(a.time)}</td><td style="white-space:normal">${esc(serviceNames(a.serviceIds))}</td><td><span class="badge ${a.status}">${a.status}</span></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No visits yet</div>'}`,
      { submitLabel: 'Close' });
  }

  function clientForm(c) {
    const isEdit = !!c;
    c = c || {};
    openModal(isEdit ? 'Edit client' : 'New client', `
      <div class="form-grid">
        ${field('Full name', `<input name="name" value="${esc(c.name || '')}" required>`, true)}
        ${field('Phone', `<input name="phone" value="${esc(c.phone || '')}">`)}
        ${field('Email', `<input type="email" name="email" value="${esc(c.email || '')}">`)}
        ${field('Notes (allergies, preferences…)', `<textarea name="notes">${esc(c.notes || '')}</textarea>`, true)}
      </div>`, {
      onSubmit: async (fd) => {
        const body = { name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'), notes: fd.get('notes') };
        if (isEdit) await api('PUT', `clients/${c.id}`, body);
        else await api('POST', 'clients', body);
        await refresh(isEdit ? 'Client updated' : 'Client added');
      }
    });
  }

  // ----- Services -----
  function renderServices() {
    const cats = {};
    for (const s of [...state.services].sort((a, b) => a.name.localeCompare(b.name))) (cats[s.category || 'Other'] ||= []).push(s);
    main.innerHTML = `
      ${header('Services', `${state.services.length} services`, '<button class="btn primary" id="new-service">＋ New service</button>')}
      ${Object.entries(cats).map(([cat, list]) => `
        <div class="card">
          <div class="card-title">${esc(cat)}</div>
          <div class="table-wrap"><table><thead><tr><th>Service</th><th class="num">Duration</th><th class="num">Price</th><th>Status</th><th></th></tr></thead><tbody>
            ${list.map((s) => `<tr>
              <td>${esc(s.name)}</td><td class="num">${s.durationMin} min</td><td class="num">${money(s.price)}</td>
              <td><span class="badge ${s.active !== false ? 'ok' : 'out'}">${s.active !== false ? 'active' : 'inactive'}</span></td>
              <td class="btn-row">
                <button class="btn small" data-act="edit" data-id="${s.id}">Edit</button>
                <button class="btn small danger" data-act="del" data-id="${s.id}">Delete</button>
              </td></tr>`).join('')}
          </tbody></table></div>
        </div>`).join('') || '<div class="card"><div class="empty">No services yet</div></div>'}`;

    $('#new-service').onclick = () => serviceForm();
    main.querySelectorAll('[data-act]').forEach((el) => {
      el.onclick = async () => {
        if (el.dataset.act === 'edit') serviceForm(byId('services', el.dataset.id));
        else {
          if (!confirm('Delete this service?')) return;
          await api('DELETE', `services/${el.dataset.id}`);
          await refresh('Service deleted');
        }
      };
    });
  }

  function serviceForm(s) {
    const isEdit = !!s;
    s = s || { active: true };
    openModal(isEdit ? 'Edit service' : 'New service', `
      <div class="form-grid">
        ${field('Name', `<input name="name" value="${esc(s.name || '')}" required>`, true)}
        ${field('Category', `<input name="category" value="${esc(s.category || '')}" list="cats" placeholder="Hair, Nails, Skin…"><datalist id="cats">${[...new Set(state.services.map((x) => x.category).filter(Boolean))].map((c) => `<option>${esc(c)}</option>`).join('')}</datalist>`)}
        ${field('Price', `<input type="number" step="0.01" min="0" name="price" value="${s.price ?? ''}" required>`)}
        ${field('Duration (minutes)', `<input type="number" min="5" step="5" name="durationMin" value="${s.durationMin ?? 30}" required>`)}
        ${field('Active', `<select name="active"><option value="true" ${s.active !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.active === false ? 'selected' : ''}>No</option></select>`)}
      </div>`, {
      onSubmit: async (fd) => {
        const body = {
          name: fd.get('name'), category: fd.get('category') || 'Other',
          price: Number(fd.get('price')), durationMin: Number(fd.get('durationMin')),
          active: fd.get('active') === 'true'
        };
        if (isEdit) await api('PUT', `services/${s.id}`, body);
        else await api('POST', 'services', body);
        await refresh(isEdit ? 'Service updated' : 'Service added');
      }
    });
  }

  // ----- Staff -----
  function renderStaff() {
    main.innerHTML = `
      ${header('Staff', `${state.staff.filter((s) => s.active !== false).length} active`, '<button class="btn primary" id="new-staff">＋ New staff member</button>')}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th class="num">Commission</th><th class="num">Appointments (30d)</th><th class="num">Revenue (30d)</th><th>Status</th><th></th></tr></thead>
        <tbody>${state.staff.map((s) => {
          const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
          const appts30 = state.appointments.filter((a) => a.staffId === s.id && a.date >= cutoff && a.status === 'completed');
          const revenue = appts30.reduce((sum, a) => sum + (a.serviceIds || []).reduce((x, sid) => x + (byId('services', sid)?.price || 0), 0), 0);
          return `<tr>
            <td>${esc(s.name)}</td><td>${esc(s.role || '—')}</td><td>${esc(s.phone || '—')}</td>
            <td class="num">${s.commissionPct ?? 0}%</td>
            <td class="num">${appts30.length}</td><td class="num">${money(revenue)}</td>
            <td><span class="badge ${s.active !== false ? 'ok' : 'out'}">${s.active !== false ? 'active' : 'inactive'}</span></td>
            <td class="btn-row">
              <button class="btn small" data-act="edit" data-id="${s.id}">Edit</button>
              <button class="btn small danger" data-act="del" data-id="${s.id}">Delete</button>
            </td></tr>`;
        }).join('') || '<tr><td colspan="8" class="empty">No staff yet</td></tr>'}</tbody></table></div></div>`;

    $('#new-staff').onclick = () => staffForm();
    main.querySelectorAll('[data-act]').forEach((el) => {
      el.onclick = async () => {
        if (el.dataset.act === 'edit') staffForm(byId('staff', el.dataset.id));
        else {
          if (!confirm('Delete this staff member?')) return;
          await api('DELETE', `staff/${el.dataset.id}`);
          await refresh('Staff member deleted');
        }
      };
    });
  }

  function staffForm(s) {
    const isEdit = !!s;
    s = s || { active: true, commissionPct: 35 };
    openModal(isEdit ? 'Edit staff member' : 'New staff member', `
      <div class="form-grid">
        ${field('Full name', `<input name="name" value="${esc(s.name || '')}" required>`, true)}
        ${field('Role', `<input name="role" value="${esc(s.role || '')}" placeholder="Stylist, Nail Technician…">`)}
        ${field('Phone', `<input name="phone" value="${esc(s.phone || '')}">`)}
        ${field('Email', `<input type="email" name="email" value="${esc(s.email || '')}">`)}
        ${field('Commission %', `<input type="number" min="0" max="100" name="commissionPct" value="${s.commissionPct ?? 0}">`)}
        ${field('Active', `<select name="active"><option value="true" ${s.active !== false ? 'selected' : ''}>Yes</option><option value="false" ${s.active === false ? 'selected' : ''}>No</option></select>`)}
      </div>`, {
      onSubmit: async (fd) => {
        const body = {
          name: fd.get('name'), role: fd.get('role'), phone: fd.get('phone'), email: fd.get('email'),
          commissionPct: Number(fd.get('commissionPct')) || 0, active: fd.get('active') === 'true'
        };
        if (isEdit) await api('PUT', `staff/${s.id}`, body);
        else await api('POST', 'staff', body);
        await refresh(isEdit ? 'Staff updated' : 'Staff added');
      }
    });
  }

  // ----- Inventory -----
  function renderInventory() {
    const products = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
    main.innerHTML = `
      ${header('Inventory', `${products.length} products`, '<button class="btn primary" id="new-product">＋ New product</button>')}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th class="num">Cost</th><th class="num">Sale price</th><th class="num">Stock</th><th></th></tr></thead>
        <tbody>${products.map((p) => `<tr>
          <td>${esc(p.name)}</td><td>${esc(p.sku || '—')}</td><td>${esc(p.category || '—')}</td>
          <td class="num">${money(p.costPrice)}</td><td class="num">${money(p.salePrice)}</td>
          <td class="num"><span class="badge ${p.stock === 0 ? 'out' : p.stock <= p.reorderLevel ? 'low' : 'ok'}">${p.stock}</span></td>
          <td class="btn-row">
            <button class="btn small" data-act="restock" data-id="${p.id}">Restock</button>
            <button class="btn small" data-act="edit" data-id="${p.id}">Edit</button>
            <button class="btn small danger" data-act="del" data-id="${p.id}">Delete</button>
          </td></tr>`).join('') || '<tr><td colspan="7" class="empty">No products yet</td></tr>'}</tbody></table></div></div>`;

    $('#new-product').onclick = () => productForm();
    main.querySelectorAll('[data-act]').forEach((el) => {
      const p = byId('products', el.dataset.id);
      el.onclick = async () => {
        if (el.dataset.act === 'edit') productForm(p);
        else if (el.dataset.act === 'restock') {
          openModal(`Restock — ${p.name}`, `
            <div class="form-grid">${field('Quantity to add', '<input type="number" min="1" name="qty" value="10" required>', true)}</div>
            <p class="sub" style="color:var(--muted);margin-top:8px">Current stock: ${p.stock}</p>`, {
            submitLabel: 'Add stock',
            onSubmit: async (fd) => {
              await api('PUT', `products/${p.id}`, { stock: p.stock + Number(fd.get('qty')) });
              await refresh('Stock updated');
            }
          });
        } else {
          if (!confirm('Delete this product?')) return;
          await api('DELETE', `products/${el.dataset.id}`);
          await refresh('Product deleted');
        }
      };
    });
  }

  function productForm(p) {
    const isEdit = !!p;
    p = p || { stock: 0, reorderLevel: 5 };
    openModal(isEdit ? 'Edit product' : 'New product', `
      <div class="form-grid">
        ${field('Name', `<input name="name" value="${esc(p.name || '')}" required>`, true)}
        ${field('SKU', `<input name="sku" value="${esc(p.sku || '')}">`)}
        ${field('Category', `<input name="category" value="${esc(p.category || '')}">`)}
        ${field('Cost price', `<input type="number" step="0.01" min="0" name="costPrice" value="${p.costPrice ?? ''}">`)}
        ${field('Sale price', `<input type="number" step="0.01" min="0" name="salePrice" value="${p.salePrice ?? ''}" required>`)}
        ${field('Stock', `<input type="number" min="0" name="stock" value="${p.stock ?? 0}">`)}
        ${field('Reorder level', `<input type="number" min="0" name="reorderLevel" value="${p.reorderLevel ?? 5}">`)}
      </div>`, {
      onSubmit: async (fd) => {
        const body = {
          name: fd.get('name'), sku: fd.get('sku'), category: fd.get('category'),
          costPrice: Number(fd.get('costPrice')) || 0, salePrice: Number(fd.get('salePrice')) || 0,
          stock: Number(fd.get('stock')) || 0, reorderLevel: Number(fd.get('reorderLevel')) || 0
        };
        if (isEdit) await api('PUT', `products/${p.id}`, body);
        else await api('POST', 'products', body);
        await refresh(isEdit ? 'Product updated' : 'Product added');
      }
    });
  }

  // ----- POS -----
  function renderPOS() {
    const cart = state.cart;
    const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const discount = Math.min(subtotal, state.cartDiscount || 0);
    const taxRate = state.settings.taxRate || 0;
    const tax = (subtotal - discount) * taxRate / 100;
    const total = subtotal - discount + tax;

    main.innerHTML = `
      ${header('Point of Sale', 'Ring up services and retail products')}
      <div class="pos-grid">
        <div class="pos-catalog">
          <div class="card">
            <div class="card-title">Services</div>
            <div class="pos-items">${state.services.filter((s) => s.active !== false).map((s) =>
              `<button class="pos-item" data-type="service" data-id="${s.id}"><div class="name">${esc(s.name)}</div><div class="price">${money(s.price)}</div></button>`).join('')}</div>
          </div>
          <div class="card">
            <div class="card-title">Retail products</div>
            <div class="pos-items">${state.products.map((p) =>
              `<button class="pos-item" data-type="product" data-id="${p.id}" ${p.stock === 0 ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}><div class="name">${esc(p.name)}</div><div class="price">${money(p.salePrice)} · ${p.stock} in stock</div></button>`).join('')}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Sale ${state.cartAppointmentId ? '<span class="badge neutral">from appointment</span>' : ''}</div>
          <div class="card-body">
            <label class="field">Client
              <select id="cart-client"><option value="">Walk-in</option>${options(state.clients, state.cartClientId)}</select>
            </label>
            <div id="cart-lines" style="margin-top:12px">
              ${cart.length ? cart.map((l, i) => `
                <div class="cart-line">
                  <span class="name">${esc(l.name)}</span>
                  <input class="qty" type="number" min="1" value="${l.qty}" data-i="${i}">
                  <span class="line-total">${money(l.qty * l.unitPrice)}</span>
                  <button class="btn small danger" data-remove="${i}">✕</button>
                </div>`).join('') : '<div class="empty">Cart is empty — click items to add</div>'}
            </div>
            <div class="cart-totals">
              <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
              <div class="row"><span>Discount</span><span><input type="number" id="cart-discount" min="0" step="0.01" value="${discount || ''}" placeholder="0.00" style="width:100px;text-align:right"></span></div>
              <div class="row"><span>Tax (${taxRate}%)</span><span>${money(tax)}</span></div>
              <div class="row grand"><span>Total</span><span>${money(total)}</span></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:14px">
              <select id="cart-payment" style="flex:1">
                <option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Bank transfer</option><option value="other">Other</option>
              </select>
              <button class="btn primary" id="cart-pay" ${cart.length ? '' : 'disabled'}>Take payment</button>
              <button class="btn danger" id="cart-clear" ${cart.length ? '' : 'disabled'}>Clear</button>
            </div>
          </div>
        </div>
      </div>`;

    main.querySelectorAll('.pos-item').forEach((btn) => {
      btn.onclick = () => {
        const { type, id } = btn.dataset;
        const src = type === 'service' ? byId('services', id) : byId('products', id);
        const existing = cart.find((l) => l.refId === id && l.type === type);
        if (existing) existing.qty += 1;
        else cart.push({ type, refId: id, name: src.name, qty: 1, unitPrice: type === 'service' ? src.price : src.salePrice });
        renderPOS();
      };
    });
    main.querySelectorAll('.cart-line .qty').forEach((inp) => {
      inp.onchange = () => { cart[Number(inp.dataset.i)].qty = Math.max(1, Number(inp.value) || 1); renderPOS(); };
    });
    main.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.onclick = () => { cart.splice(Number(btn.dataset.remove), 1); renderPOS(); };
    });
    $('#cart-client').onchange = (e) => { state.cartClientId = e.target.value || null; };
    $('#cart-discount').onchange = (e) => { state.cartDiscount = Math.max(0, Number(e.target.value) || 0); renderPOS(); };
    $('#cart-clear').onclick = () => { state.cart = []; state.cartDiscount = 0; state.cartClientId = null; state.cartAppointmentId = null; renderPOS(); };
    $('#cart-pay').onclick = async () => {
      try {
        const invoice = await api('POST', 'invoices', {
          clientId: state.cartClientId || null,
          appointmentId: state.cartAppointmentId || null,
          items: cart,
          discount: state.cartDiscount || 0,
          paymentMethod: $('#cart-payment').value,
          status: 'paid'
        });
        state.cart = [];
        state.cartDiscount = 0;
        state.cartClientId = null;
        state.cartAppointmentId = null;
        await refresh(`Payment taken — invoice #${invoice.number}`);
        location.hash = '#/invoices';
      } catch (e) {
        toast(e.message, true);
      }
    };
  }

  // ----- Invoices -----
  function renderInvoices() {
    const invoices = [...state.invoices].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    main.innerHTML = `
      ${header('Invoices', `${invoices.length} total · ${money(invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0))} collected`,
        '<a class="btn primary" href="#/pos">＋ New sale</a>')}
      <div class="card">${invoices.length ? `<div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Date</th><th>Client</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
        <tbody>${invoices.map((inv) => `<tr>
          <td><span class="link" data-view-inv="${inv.id}">#${inv.number}</span></td>
          <td>${new Date(inv.createdAt).toLocaleDateString()} ${new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${inv.clientId ? esc(clientName(inv.clientId)) : 'Walk-in'}</td>
          <td style="white-space:normal">${esc(inv.items.map((i) => `${i.qty}× ${i.name}`).join(', '))}</td>
          <td class="num">${money(inv.total)}</td>
          <td>${esc(inv.paymentMethod)}</td>
          <td><span class="badge ${inv.status}">${inv.status}</span></td>
          <td>${inv.status === 'unpaid' ? `<button class="btn small" data-mark-paid="${inv.id}">Mark paid</button>` : ''}</td>
        </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No invoices yet — make a sale in the POS</div>'}</div>`;

    main.querySelectorAll('[data-view-inv]').forEach((el) => {
      el.onclick = () => invoiceDetail(byId('invoices', el.dataset.viewInv));
    });
    main.querySelectorAll('[data-mark-paid]').forEach((el) => {
      el.onclick = async () => {
        await api('PUT', `invoices/${el.dataset.markPaid}`, { status: 'paid' });
        await refresh('Invoice marked paid');
      };
    });
  }

  function invoiceDetail(inv) {
    openModal(`Invoice #${inv.number}`, `
      <p><strong>${esc(state.settings.salonName || '')}</strong></p>
      <p style="color:var(--muted)">${new Date(inv.createdAt).toLocaleString()} · ${inv.clientId ? esc(clientName(inv.clientId)) : 'Walk-in'} · ${esc(inv.paymentMethod)}</p>
      <div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
        <tbody>${inv.items.map((i) => `<tr><td style="white-space:normal">${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num">${money(i.unitPrice)}</td><td class="num">${money(i.qty * i.unitPrice)}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="cart-totals" style="margin-top:12px">
        <div class="row"><span>Subtotal</span><span>${money(inv.subtotal)}</span></div>
        ${inv.discount ? `<div class="row"><span>Discount</span><span>−${money(inv.discount)}</span></div>` : ''}
        <div class="row"><span>Tax (${inv.taxRate}%)</span><span>${money(inv.tax)}</span></div>
        <div class="row grand"><span>Total</span><span>${money(inv.total)}</span></div>
      </div>`, { submitLabel: 'Close' });
  }

  // ----- Reports -----
  function renderReports() {
    const month = state.reportMonth || todayISO().slice(0, 7);
    const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const invoices = state.invoices.filter((i) => i.status === 'paid' && (i.createdAt || '').slice(0, 7) === month);
    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const avgTicket = invoices.length ? revenue / invoices.length : 0;
    const lineRev = (type) => invoices.reduce((s, i) => s + i.items.filter((it) => it.type === type).reduce((x, it) => x + it.qty * it.unitPrice, 0), 0);
    const serviceRev = lineRev('service');
    const productRev = lineRev('product');

    const completed = state.appointments.filter((a) => a.status === 'completed' && a.date.slice(0, 7) === month);

    // Commission payouts: each staff member's completed-appointment service
    // revenue for the month times their commission rate.
    const commissions = state.staff.map((s) => {
      const appts = completed.filter((a) => a.staffId === s.id);
      const rev = appts.reduce((sum, a) => sum + (a.serviceIds || []).reduce((x, sid) => x + (byId('services', sid)?.price || 0), 0), 0);
      return { staff: s, appts: appts.length, revenue: rev, payout: rev * (s.commissionPct || 0) / 100 };
    }).filter((c) => c.appts > 0 || c.staff.active !== false);

    // Top services by bookings this month.
    const counts = {};
    for (const a of completed) for (const sid of a.serviceIds || []) counts[sid] = (counts[sid] || 0) + 1;
    const topServices = Object.entries(counts)
      .map(([sid, n]) => ({ svc: byId('services', sid), n }))
      .filter((x) => x.svc)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

    main.innerHTML = `
      ${header('Reports', monthLabel, `
        <input type="month" id="report-month" value="${month}">
        <button class="btn" id="exp-commissions">⬇ Commissions CSV</button>
        <button class="btn" id="exp-invoices">⬇ Invoices CSV</button>
        <button class="btn" id="exp-clients">⬇ Clients CSV</button>`)}
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Revenue</div><div class="value">${money(revenue)}</div><div class="hint">${invoices.length} paid invoices</div></div>
        <div class="stat-card"><div class="label">Average ticket</div><div class="value">${money(avgTicket)}</div><div class="hint">per invoice</div></div>
        <div class="stat-card"><div class="label">Service sales</div><div class="value">${money(serviceRev)}</div><div class="hint">before discount/tax</div></div>
        <div class="stat-card"><div class="label">Retail sales</div><div class="value">${money(productRev)}</div><div class="hint">before discount/tax</div></div>
        <div class="stat-card"><div class="label">Completed visits</div><div class="value">${completed.length}</div><div class="hint">appointments</div></div>
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-title">Staff commission payouts</div>
          ${commissions.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Staff</th><th class="num">Visits</th><th class="num">Service revenue</th><th class="num">Rate</th><th class="num">Payout</th></tr></thead>
            <tbody>${commissions.map((c) => `<tr>
              <td>${esc(c.staff.name)}</td><td class="num">${c.appts}</td>
              <td class="num">${money(c.revenue)}</td><td class="num">${c.staff.commissionPct ?? 0}%</td>
              <td class="num"><strong>${money(c.payout)}</strong></td></tr>`).join('')}
              <tr><td><strong>Total</strong></td><td class="num">${completed.length}</td>
                <td class="num"><strong>${money(commissions.reduce((s, c) => s + c.revenue, 0))}</strong></td><td></td>
                <td class="num"><strong>${money(commissions.reduce((s, c) => s + c.payout, 0))}</strong></td></tr>
            </tbody></table></div>` : '<div class="empty">No completed appointments this month</div>'}
        </div>
        <div class="card">
          <div class="card-title">Top services</div>
          ${topServices.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Service</th><th class="num">Bookings</th><th class="num">List price</th></tr></thead>
            <tbody>${topServices.map((t) => `<tr><td>${esc(t.svc.name)}</td><td class="num">${t.n}</td><td class="num">${money(t.svc.price)}</td></tr>`).join('')}</tbody>
          </table></div>` : '<div class="empty">No completed appointments this month</div>'}
        </div>
      </div>`;

    $('#report-month').onchange = (e) => { state.reportMonth = e.target.value; renderReports(); };
    $('#exp-commissions').onclick = () => downloadCSV(`commissions-${month}.csv`, commissions.map((c) => ({
      staff: c.staff.name, role: c.staff.role || '', visits: c.appts,
      service_revenue: c.revenue.toFixed(2), commission_pct: c.staff.commissionPct ?? 0, payout: c.payout.toFixed(2)
    })));
    $('#exp-invoices').onclick = () => downloadCSV(`invoices-${month}.csv`, invoices.map((i) => ({
      number: i.number, date: (i.createdAt || '').slice(0, 10), client: i.clientId ? clientName(i.clientId) : 'Walk-in',
      items: i.items.map((it) => `${it.qty}x ${it.name}`).join('; '),
      subtotal: i.subtotal.toFixed(2), discount: i.discount.toFixed(2), tax: i.tax.toFixed(2),
      total: i.total.toFixed(2), payment: i.paymentMethod, status: i.status
    })));
    $('#exp-clients').onclick = () => downloadCSV('clients.csv', state.clients.map((c) => ({
      name: c.name, phone: c.phone || '', email: c.email || '', notes: c.notes || '',
      visits: state.appointments.filter((a) => a.clientId === c.id && a.status === 'completed').length,
      total_spent: state.invoices.filter((i) => i.clientId === c.id && i.status === 'paid').reduce((s, i) => s + i.total, 0).toFixed(2)
    })));
  }

  // ----- Settings -----
  function renderSettings() {
    const s = state.settings;
    main.innerHTML = `
      ${header('Settings', 'Salon configuration')}
      <div class="card" style="max-width:560px"><div class="card-body">
        <form id="settings-form" class="form-grid">
          ${field('Salon name', `<input name="salonName" value="${esc(s.salonName || '')}" required>`, true)}
          ${field('Currency (ISO code)', `<input name="currency" value="${esc(s.currency || 'USD')}" maxlength="3" style="text-transform:uppercase">`)}
          ${field('Tax rate %', `<input type="number" step="0.01" min="0" name="taxRate" value="${s.taxRate ?? 0}">`)}
          ${field('Opening time', `<input type="time" name="openingTime" value="${esc(s.openingTime || '09:00')}">`)}
          ${field('Closing time', `<input type="time" name="closingTime" value="${esc(s.closingTime || '19:00')}">`)}
          <div class="full"><button class="btn primary" type="submit">Save settings</button></div>
        </form>
      </div></div>`;
    $('#settings-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api('PUT', 'settings', {
          salonName: fd.get('salonName'),
          currency: (fd.get('currency') || 'USD').toUpperCase(),
          taxRate: Number(fd.get('taxRate')) || 0,
          openingTime: fd.get('openingTime'),
          closingTime: fd.get('closingTime')
        });
        await refresh('Settings saved');
      } catch (err) {
        toast(err.message, true);
      }
    };
  }

  // ---------- Router ----------
  function currentView() {
    const hash = (location.hash || '#/dashboard').slice(2);
    return hash.split('?')[0] || 'dashboard';
  }

  function route() {
    const view = views[currentView()] ? currentView() : 'dashboard';
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
    views[view]();
  }

  async function refresh(msg) {
    await loadAll();
    route();
    if (msg) toast(msg);
  }

  window.addEventListener('hashchange', route);

  loadAll()
    .then(() => {
      $('#brand-name').textContent = state.settings.salonName || 'Merp';
      route();
    })
    .catch((e) => {
      main.innerHTML = `<div class="empty">Failed to load data: ${esc(e.message)}</div>`;
    });
})();
