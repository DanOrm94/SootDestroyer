const SESSION_TTL = 60 * 60 * 12;
const SLOT_MINUTES = 5;

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
});
const bad = (message, status = 400) => json({ error: message }, status);

function parseCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

async function requireAdmin(request, env) {
  const token = parseCookie(request, 'sd_admin');
  if (!token || !env.SESSIONS) return null;
  const session = await env.SESSIONS.get(`session:${token}`, 'json');
  if (!session || !session.expiresAt || session.expiresAt < Date.now()) {
    if (token) await env.SESSIONS.delete(`session:${token}`);
    return null;
  }
  return session;
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function localDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')); }
function localTime(time) { return /^\d{2}:\d{2}$/.test(String(time || '')); }
function toMinutes(t) { const [h,m] = t.split(':').map(Number); return h * 60 + m; }
function fromMinutes(v) { return `${String(Math.floor(v / 60)).padStart(2,'0')}:${String(v % 60).padStart(2,'0')}`; }
function nowIso() { return new Date().toISOString(); }

async function notifyAdmin(env, subject, text) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) return;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'Soot Destroyer <notifications@sootdestroyer.co.uk>',
        to: [env.ADMIN_EMAIL], subject, text
      })
    });
    if (!response.ok) console.error('Admin notification email failed:', response.status, await response.text());
  } catch (error) {
    console.error('Admin notification email failed:', error);
  }
}

async function services(env, includeInactive = false) {
  const q = includeInactive
    ? 'SELECT * FROM services ORDER BY sort_order, name'
    : 'SELECT * FROM services WHERE active=1 ORDER BY sort_order, name';
  return (await env.DB.prepare(q).all()).results || [];
}

async function availability(date, serviceId, env) {
  if (!localDate(date)) throw new Error('Invalid date');
  const service = await env.DB.prepare('SELECT * FROM services WHERE id=? AND active=1').bind(serviceId).first();
  if (!service) throw new Error('Service not found');
  const duration = Number(service.duration_minutes);
  if (!Number.isInteger(duration) || duration < SLOT_MINUTES || duration % SLOT_MINUTES) {
    throw new Error(`Service duration must be in ${SLOT_MINUTES}-minute increments`);
  }
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hours = await env.DB.prepare('SELECT * FROM business_hours WHERE day_of_week=?').bind(day).first();
  if (!hours || !hours.is_open) return { date, service, slots: [] };
  const blocked = await env.DB.prepare('SELECT 1 FROM blocked_dates WHERE date=?').bind(date).first();
  if (blocked) return { date, service, slots: [] };
  const busy = await env.DB.prepare('SELECT slot_time FROM booking_slots WHERE date=?').bind(date).all();
  const busySet = new Set((busy.results || []).map(r => r.slot_time));
  const open = toMinutes(hours.open_time), close = toMinutes(hours.close_time), slots = [];
  for (let start = open; start + duration <= close; start += 60) {
    let free = true;
    for (let m = start; m < start + duration; m += SLOT_MINUTES) {
      if (busySet.has(fromMinutes(m))) { free = false; break; }
    }
    if (free) slots.push(fromMinutes(start));
  }
  return { date, service, slots };
}

async function createBooking(request, env, options = {}) {
  const body = await request.json().catch(() => null);
  if (!body) return bad('Invalid booking details');
  const required = ['service_id','date','time','name','phone','email','postcode'];
  for (const key of required) {
    if (!String(body[key] || '').trim()) return bad(`Missing ${key.replaceAll('_',' ')}`);
  }
  if (!localDate(body.date) || !localTime(body.time)) return bad('Invalid date or time');
  const service = await env.DB.prepare('SELECT * FROM services WHERE id=? AND active=1').bind(body.service_id).first();
  if (!service) return bad('Service is no longer available', 409);
  const duration = Number(service.duration_minutes);
  if (!Number.isInteger(duration) || duration < SLOT_MINUTES || duration % SLOT_MINUTES) return bad(`This service must use a duration in ${SLOT_MINUTES}-minute increments`, 409);
  const startMin = toMinutes(body.time);
  if (startMin % 60 !== 0) return bad('Bookings must start on the hour', 409);
  const endMin = startMin + duration;
  const day = new Date(`${body.date}T12:00:00Z`).getUTCDay();
  const hours = await env.DB.prepare('SELECT * FROM business_hours WHERE day_of_week=?').bind(day).first();
  if (!hours || !hours.is_open || startMin < toMinutes(hours.open_time) || endMin > toMinutes(hours.close_time)) return bad('That time is outside opening hours', 409);
  const blocked = await env.DB.prepare('SELECT 1 FROM blocked_dates WHERE date=?').bind(body.date).first();
  if (blocked) return bad('That date is unavailable', 409);
  const id = crypto.randomUUID(), slots = [];
  for (let m = startMin; m < endMin; m += SLOT_MINUTES) slots.push(fromMinutes(m));
  const status = options.pending ? 'pending' : 'confirmed';
  const bookingSql = env.DB.prepare(`INSERT INTO bookings (id, service_id, date, start_time, end_time, name, phone, email, address, postcode, notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    id, service.id, body.date, body.time, fromMinutes(endMin), String(body.name).trim(), String(body.phone).trim(), String(body.email).trim().toLowerCase(), String(body.address||'').trim(), String(body.postcode).trim(), String(body.notes||'').trim(), status, nowIso(), nowIso()
  );
  const slotSql = slots.map(time => env.DB.prepare('INSERT INTO booking_slots (date, slot_time, booking_id) VALUES (?,?,?)').bind(body.date, time, id));
  try {
    await env.DB.batch([bookingSql, ...slotSql]);
  } catch (error) {
    console.error(error);
    const detail = String(error?.message || error || '');
    if (/check constraint|status/i.test(detail) && /booking|pending|confirmed|completed|cancelled/i.test(detail)) {
      return bad('The booking database needs migration 0004 applied before pending bookings can be created.', 500);
    }
    return bad('That time has just been booked. Please choose another slot.', 409);
  }
  await notifyAdmin(env, `${status === 'pending' ? 'New booking request' : 'New booking'} — ${String(body.name).trim()}`, [
    `A new ${status === 'pending' ? 'booking request' : 'booking'} has been added to the Soot Destroyer database.`, '',
    `Status: ${status}`, `Booking ID: ${id}`, `Customer: ${String(body.name).trim()}`, `Phone: ${String(body.phone).trim()}`, `Email: ${String(body.email).trim()}`,
    `Service: ${service.name}`, `Date: ${body.date}`, `Time: ${body.time}–${fromMinutes(endMin)}`, `Address: ${String(body.address||'').trim()}`,
    `Postcode: ${String(body.postcode).trim()}`, `Notes: ${String(body.notes||'').trim() || 'None'}`
  ].join('\n'));
  return json({ ok:true, booking:{ id, service:service.name, date:body.date, time:body.time, end_time:fromMinutes(endMin), name:String(body.name).trim(), status } }, 201);
}

async function createQuoteRequest(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return bad('Invalid quote request');
  const required = ['name','phone','email','total_price','stove_choice','flue_choice','hearth_choice','beam_choice','chamber_choice'];
  for (const key of required) if (!String(body[key] || '').trim()) return bad(`Missing ${key.replaceAll('_',' ')}`);
  const email = String(body.email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Invalid email address');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO quote_requests (id,name,phone,email,total_price,stove_choice,flue_choice,hearth_choice,beam_choice,chamber_choice,created_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    id, String(body.name).trim(), String(body.phone).trim(), email, String(body.total_price).trim(), String(body.stove_choice).trim(), String(body.flue_choice).trim(), String(body.hearth_choice).trim(), String(body.beam_choice).trim(), String(body.chamber_choice).trim(), nowIso(), 'new'
  ).run();
  await notifyAdmin(env, `New quote request — ${String(body.name).trim()}`, [
    'A new quote request has been added to the Soot Destroyer database.', '', `Quote ID: ${id}`,
    `Customer: ${String(body.name).trim()}`, `Phone: ${String(body.phone).trim()}`, `Email: ${email}`, `Estimated total: ${String(body.total_price).trim()}`,
    `Stove: ${String(body.stove_choice).trim()}`, `Flue: ${String(body.flue_choice).trim()}`, `Hearth: ${String(body.hearth_choice).trim()}`,
    `Beam: ${String(body.beam_choice).trim()}`, `Chamber: ${String(body.chamber_choice).trim()}`
  ].join('\n'));
  return json({ ok:true, quote:{ id } }, 201);
}

async function adminData(path, request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return bad('Unauthorised', 401);
  if (path === '/api/admin/me') return json({ ok:true, email:admin.email });
  if (path === '/api/admin/quotes' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM quote_requests ORDER BY created_at DESC').all();
    return json({ quotes: rows.results || [] });
  }
  if (path === '/api/admin/bookings' && request.method === 'GET') {
    const url = new URL(request.url);
    const rows = await env.DB.prepare(`SELECT b.*, s.name service_name, s.duration_minutes, s.price_label FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.date BETWEEN ? AND ? ORDER BY b.date, b.start_time`).bind(url.searchParams.get('from') || '2000-01-01', url.searchParams.get('to') || '2100-12-31').all();
    return json({ bookings: rows.results || [] });
  }
  if (path === '/api/admin/bookings' && request.method === 'POST') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    return createBooking(request, env, { pending:false });
  }
  if (path === '/api/admin/services' && request.method === 'GET') return json({ services: await services(env,true) });
  if (path === '/api/admin/services' && request.method === 'POST') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const b = await request.json(); const duration = Number(b.duration_minutes); const id = crypto.randomUUID();
    if (!b.name || !Number.isInteger(duration) || duration < SLOT_MINUTES || duration % SLOT_MINUTES) return bad(`Name and a duration in ${SLOT_MINUTES}-minute increments are required`);
    await env.DB.prepare('INSERT INTO services (id,name,description,price_label,duration_minutes,active,sort_order) VALUES (?,?,?,?,?,?,?)').bind(id,b.name,b.description||'',b.price_label||'POA',duration,b.active===false?0:1,Number(b.sort_order||0)).run();
    await notifyAdmin(env, 'Database updated — service added', `Service added: ${b.name} (${duration} minutes, ${b.price_label||'POA'})`);
    return json({ service: await env.DB.prepare('SELECT * FROM services WHERE id=?').bind(id).first() },201);
  }
  if (path.startsWith('/api/admin/services/') && request.method === 'PATCH') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const id = path.split('/').pop(); const b = await request.json(); const duration = Number(b.duration_minutes);
    if (!b.name || !Number.isInteger(duration) || duration < SLOT_MINUTES || duration % SLOT_MINUTES) return bad(`Name and a duration in ${SLOT_MINUTES}-minute increments are required`);
    await env.DB.prepare('UPDATE services SET name=?,description=?,price_label=?,duration_minutes=?,active=?,sort_order=? WHERE id=?').bind(b.name,b.description||'',b.price_label||'POA',duration,b.active?1:0,Number(b.sort_order||0),id).run();
    await notifyAdmin(env, 'Database updated — service changed', `Service updated: ${b.name} (ID: ${id}, ${duration} minutes)`);
    return json({ service: await env.DB.prepare('SELECT * FROM services WHERE id=?').bind(id).first() });
  }
  if (path === '/api/admin/hours' && request.method === 'GET') return json({ hours:(await env.DB.prepare('SELECT * FROM business_hours ORDER BY day_of_week').all()).results||[] });
  if (path === '/api/admin/hours' && request.method === 'PUT') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const b = await request.json();
    await env.DB.batch((b.hours||[]).map(h=>env.DB.prepare('UPDATE business_hours SET is_open=?, open_time=?, close_time=? WHERE day_of_week=?').bind(h.is_open?1:0,h.open_time,h.close_time,Number(h.day_of_week))));
    await notifyAdmin(env, 'Database updated — business hours changed', 'Business hours were updated from the admin dashboard.');
    return json({ok:true});
  }
  if (path === '/api/admin/blocked' && request.method === 'GET') return json({ blocked:(await env.DB.prepare('SELECT * FROM blocked_dates ORDER BY date').all()).results||[] });
  if (path === '/api/admin/blocked' && request.method === 'POST') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const b = await request.json(); if (!localDate(b.date)) return bad('Invalid date');
    await env.DB.prepare('INSERT OR IGNORE INTO blocked_dates (date,reason) VALUES (?,?)').bind(b.date,b.reason||'Unavailable').run();
    await notifyAdmin(env, 'Database updated — date blocked', `Blocked date added: ${b.date}\nReason: ${b.reason||'Unavailable'}`);
    return json({ok:true},201);
  }
  if (path.startsWith('/api/admin/blocked/') && request.method === 'DELETE') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const date = decodeURIComponent(path.split('/').pop());
    await env.DB.prepare('DELETE FROM blocked_dates WHERE date=?').bind(date).run();
    await notifyAdmin(env, 'Database updated — blocked date removed', `Blocked date removed: ${date}`);
    return json({ok:true});
  }
  if (path.startsWith('/api/admin/bookings/') && request.method === 'PATCH') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const id = path.split('/').pop(); const b = await request.json();
    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
    if (!booking) return bad('Booking not found',404);

    const editable = ['name','phone','email','address','postcode','notes'];
    const hasCustomerEdit = editable.some(key => Object.prototype.hasOwnProperty.call(b,key));
    if (hasCustomerEdit) {
      const name = String(b.name ?? booking.name).trim();
      const phone = String(b.phone ?? booking.phone).trim();
      const email = String(b.email ?? booking.email).trim().toLowerCase();
      const address = String(b.address ?? booking.address ?? '').trim();
      const postcode = String(b.postcode ?? booking.postcode).trim();
      const notes = String(b.notes ?? booking.notes ?? '').trim();
      if (!name || !phone || !email || !postcode) return bad('Name, phone, email and postcode are required');
      if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Invalid email address');
      await env.DB.prepare('UPDATE bookings SET name=?,phone=?,email=?,address=?,postcode=?,notes=?,updated_at=? WHERE id=?').bind(name,phone,email,address,postcode,notes,nowIso(),id).run();
      await notifyAdmin(env, 'Database updated — customer details changed', `Customer details updated for booking ${id}: ${name}`);
      return json({ok:true, booking:await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first()});
    }

    if (!['pending','confirmed','completed','cancelled'].includes(b.status)) return bad('Invalid status');
    if (booking.status === 'cancelled' && b.status !== 'cancelled') return bad('Cancelled bookings cannot be reactivated; create a new booking',409);
    if (b.status === 'cancelled') {
      await env.DB.batch([
        env.DB.prepare('UPDATE bookings SET status=?,updated_at=? WHERE id=?').bind(b.status,nowIso(),id),
        env.DB.prepare('DELETE FROM booking_slots WHERE booking_id=?').bind(id)
      ]);
    } else {
      await env.DB.prepare('UPDATE bookings SET status=?,updated_at=? WHERE id=?').bind(b.status,nowIso(),id).run();
    }
    await notifyAdmin(env, `Database updated — booking ${b.status}`, `Booking ${id} was changed from ${booking.status} to ${b.status}.`);
    return json({ok:true});
  }
  return bad('Not found',404);
}

async function handleApi(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/api/health') return json({ok:true, database:!!env.DB, email:!!env.RESEND_API_KEY});
  if (path === '/api/services' && request.method === 'GET') return json({services:await services(env)});
  if (path === '/api/availability' && request.method === 'GET') {
    try { return json(await availability(url.searchParams.get('date'), url.searchParams.get('service'), env)); }
    catch (e) { return bad(e.message,400); }
  }
  if (path === '/api/bookings' && request.method === 'POST') return createBooking(request,env,{pending:true});
  if (path === '/api/quotes' && request.method === 'POST') return createQuoteRequest(request,env);
  if (path === '/api/auth/login' && request.method === 'POST') {
    const b = await request.json().catch(()=>null);
    const email = String(b?.email||'').trim().toLowerCase(), password = String(b?.password||'');
    const adminEmail = String(env.ADMIN_EMAIL||'admin@sootdestroyer.co.uk').toLowerCase();
    if (!env.ADMIN_PASSWORD || email !== adminEmail || password !== env.ADMIN_PASSWORD) return bad('Invalid email or password',401);
    const token = crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
    await env.SESSIONS.put(`session:${token}`,JSON.stringify({email,expiresAt:Date.now()+SESSION_TTL*1000}),{expirationTtl:SESSION_TTL});
    return json({ok:true},200,{'Set-Cookie':`sd_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`});
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    const token = parseCookie(request,'sd_admin');
    if (token && env.SESSIONS) await env.SESSIONS.delete(`session:${token}`);
    return json({ok:true},200,{'Set-Cookie':'sd_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
  }
  if (path.startsWith('/api/admin/')) return adminData(path,request,env);
  return bad('Not found',404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
};