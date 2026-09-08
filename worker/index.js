const SESSION_TTL = 60 * 60 * 12;
const SLOT_MINUTES = 30;

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
function localDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date || ''); }
function localTime(time) { return /^\d{2}:\d{2}$/.test(time || ''); }
function toMinutes(t) { const [h,m] = t.split(':').map(Number); return h*60+m; }
function fromMinutes(v) { return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`; }
function nowIso() { return new Date().toISOString(); }

async function services(env, includeInactive=false) {
  const q = includeInactive ? 'SELECT * FROM services ORDER BY sort_order, name' : 'SELECT * FROM services WHERE active=1 ORDER BY sort_order, name';
  return (await env.DB.prepare(q).all()).results || [];
}

async function availability(date, serviceId, env) {
  if (!localDate(date)) throw new Error('Invalid date');
  const service = await env.DB.prepare('SELECT * FROM services WHERE id=? AND active=1').bind(serviceId).first();
  if (!service) throw new Error('Service not found');
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hours = await env.DB.prepare('SELECT * FROM business_hours WHERE day_of_week=?').bind(day).first();
  if (!hours || !hours.is_open) return { date, service, slots: [] };
  const blocked = await env.DB.prepare('SELECT 1 FROM blocked_dates WHERE date=?').bind(date).first();
  if (blocked) return { date, service, slots: [] };
  const busy = await env.DB.prepare('SELECT slot_time FROM booking_slots WHERE date=?').bind(date).all();
  const busySet = new Set((busy.results || []).map(r => r.slot_time));
  const duration = Number(service.duration_minutes);
  const open = toMinutes(hours.open_time);
  const close = toMinutes(hours.close_time);
  const slots = [];
  for (let start=open; start + duration <= close; start += SLOT_MINUTES) {
    let free = true;
    for (let m=start; m<start+duration; m+=SLOT_MINUTES) if (busySet.has(fromMinutes(m))) { free=false; break; }
    if (free) slots.push(fromMinutes(start));
  }
  return { date, service, slots };
}

async function createBooking(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return bad('Invalid booking details');
  const required = ['service_id','date','time','name','phone','email','postcode'];
  for (const key of required) if (!String(body[key] || '').trim()) return bad(`Missing ${key.replaceAll('_',' ')}`);
  if (!localDate(body.date) || !localTime(body.time)) return bad('Invalid date or time');
  const service = await env.DB.prepare('SELECT * FROM services WHERE id=? AND active=1').bind(body.service_id).first();
  if (!service) return bad('Service is no longer available', 409);
  const startMin = toMinutes(body.time);
  if (startMin % SLOT_MINUTES !== 0) return bad('Bookings must start on a 30-minute boundary');
  const endMin = startMin + Number(service.duration_minutes);
  const day = new Date(`${body.date}T12:00:00Z`).getUTCDay();
  const hours = await env.DB.prepare('SELECT * FROM business_hours WHERE day_of_week=?').bind(day).first();
  if (!hours || !hours.is_open || startMin < toMinutes(hours.open_time) || endMin > toMinutes(hours.close_time)) return bad('That time is outside opening hours', 409);
  const blocked = await env.DB.prepare('SELECT 1 FROM blocked_dates WHERE date=?').bind(body.date).first();
  if (blocked) return bad('That date is unavailable', 409);
  const id = crypto.randomUUID();
  const slots = [];
  for (let m=startMin; m<endMin; m+=SLOT_MINUTES) slots.push(fromMinutes(m));
  const bookingSql = env.DB.prepare(`INSERT INTO bookings (id, service_id, date, start_time, end_time, name, phone, email, address, postcode, notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    id, service.id, body.date, body.time, fromMinutes(endMin), String(body.name).trim(), String(body.phone).trim(), String(body.email).trim().toLowerCase(), String(body.address||'').trim(), String(body.postcode).trim(), String(body.notes||'').trim(), 'confirmed', nowIso(), nowIso()
  );
  const slotSql = slots.map(time => env.DB.prepare('INSERT INTO booking_slots (date, slot_time, booking_id) VALUES (?,?,?)').bind(body.date, time, id));
  try { await env.DB.batch([bookingSql, ...slotSql]); }
  catch (error) { console.error(error); return bad('That time has just been booked. Please choose another slot.', 409); }
  return json({ ok:true, booking:{ id, service:service.name, date:body.date, time:body.time, end_time:fromMinutes(endMin), name:String(body.name).trim() } }, 201);
}

async function adminData(path, request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return bad('Unauthorised', 401);
  if (path === '/api/admin/me') return json({ ok:true, email:admin.email });
  if (path === '/api/admin/bookings' && request.method === 'GET') {
    const url = new URL(request.url);
    const rows = await env.DB.prepare(`SELECT b.*, s.name service_name, s.duration_minutes, s.price_label FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.date BETWEEN ? AND ? ORDER BY b.date, b.start_time`).bind(url.searchParams.get('from') || '2000-01-01', url.searchParams.get('to') || '2100-12-31').all();
    return json({ bookings: rows.results || [] });
  }
  if (path === '/api/admin/services' && request.method === 'GET') return json({ services: await services(env,true) });
  if (path === '/api/admin/services' && request.method === 'POST') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const b=await request.json(); const id=crypto.randomUUID();
    if (!b.name || !Number(b.duration_minutes)) return bad('Name and duration are required');
    await env.DB.prepare('INSERT INTO services (id,name,description,price_label,duration_minutes,active,sort_order) VALUES (?,?,?,?,?,?,?)').bind(id,b.name,b.description||'',b.price_label||'POA',Number(b.duration_minutes),b.active===false?0:1,Number(b.sort_order||0)).run();
    return json({ service: await env.DB.prepare('SELECT * FROM services WHERE id=?').bind(id).first() },201);
  }
  if (path.startsWith('/api/admin/services/') && request.method === 'PATCH') {
    if (!sameOrigin(request)) return bad('Forbidden',403);
    const id=path.split('/').pop(); const b=await request.json();
    await env.DB.prepare('UPDATE services SET name=?,description=?,price_label=?,duration_minutes=?,active=?,sort_order=? WHERE id=?').bind(b.name,b.description||'',b.price_label||'POA',Number(b.duration_minutes),b.active?1:0,Number(b.sort_order||0),id).run();
    return json({ service: await env.DB.prepare('SELECT * FROM services WHERE id=?').bind(id).first() });
  }
  if (path === '/api/admin/hours' && request.method === 'GET') return json({ hours:(await env.DB.prepare('SELECT * FROM business_hours ORDER BY day_of_week').all()).results||[] });
  if (path === '/api/admin/hours' && request.method === 'PUT') {
    if (!sameOrigin(request)) return bad('Forbidden',403); const b=await request.json();
    await env.DB.batch((b.hours||[]).map(h=>env.DB.prepare('UPDATE business_hours SET is_open=?, open_time=?, close_time=? WHERE day_of_week=?').bind(h.is_open?1:0,h.open_time,h.close_time,Number(h.day_of_week))));
    return json({ok:true});
  }
  if (path === '/api/admin/blocked' && request.method === 'GET') return json({ blocked:(await env.DB.prepare('SELECT * FROM blocked_dates ORDER BY date').all()).results||[] });
  if (path === '/api/admin/blocked' && request.method === 'POST') {
    if (!sameOrigin(request)) return bad('Forbidden',403); const b=await request.json(); if(!localDate(b.date)) return bad('Invalid date');
    await env.DB.prepare('INSERT OR IGNORE INTO blocked_dates (date,reason) VALUES (?,?)').bind(b.date,b.reason||'Unavailable').run(); return json({ok:true},201);
  }
  if (path.startsWith('/api/admin/blocked/') && request.method === 'DELETE') {
    if (!sameOrigin(request)) return bad('Forbidden',403); const date=decodeURIComponent(path.split('/').pop()); await env.DB.prepare('DELETE FROM blocked_dates WHERE date=?').bind(date).run(); return json({ok:true});
  }
  if (path.startsWith('/api/admin/bookings/') && request.method === 'PATCH') {
    if (!sameOrigin(request)) return bad('Forbidden',403); const id=path.split('/').pop(); const b=await request.json();
    const booking=await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first(); if(!booking) return bad('Booking not found',404);
    if(!['confirmed','completed','cancelled'].includes(b.status)) return bad('Invalid status');
    if(b.status==='cancelled') await env.DB.batch([env.DB.prepare('UPDATE bookings SET status=?,updated_at=? WHERE id=?').bind(b.status,nowIso(),id), env.DB.prepare('DELETE FROM booking_slots WHERE booking_id=?').bind(id)]);
    else await env.DB.prepare('UPDATE bookings SET status=?,updated_at=? WHERE id=?').bind(b.status,nowIso(),id).run();
    return json({ok:true});
  }
  return bad('Not found',404);
}

async function handleApi(request, env) {
  const url=new URL(request.url), path=url.pathname;
  if(path==='/api/health') return json({ok:true, database:!!env.DB});
  if(path==='/api/services' && request.method==='GET') return json({services:await services(env)});
  if(path==='/api/availability' && request.method==='GET') {
    try { return json(await availability(url.searchParams.get('date'),url.searchParams.get('service'),env)); } catch(e) { return bad(e.message,400); }
  }
  if(path==='/api/bookings' && request.method==='POST') return createBooking(request,env);
  if(path==='/api/auth/login' && request.method==='POST') {
    const b=await request.json().catch(()=>null); const email=String(b?.email||'').trim().toLowerCase(); const password=String(b?.password||'');
    const adminEmail=String(env.ADMIN_EMAIL||'admin@sootdestroyer.co.uk').toLowerCase();
    if(!env.ADMIN_PASSWORD || email!==adminEmail || password!==env.ADMIN_PASSWORD) return bad('Invalid email or password',401);
    const token=crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
    await env.SESSIONS.put(`session:${token}`,JSON.stringify({email,expiresAt:Date.now()+SESSION_TTL*1000}),{expirationTtl:SESSION_TTL});
    return json({ok:true},200,{'Set-Cookie':`sd_admin=${encodeURIComponent(token)}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`});
  }
  if(path==='/api/auth/logout' && request.method==='POST') {
    const token=parseCookie(request,'sd_admin'); if(token&&env.SESSIONS) await env.SESSIONS.delete(`session:${token}`);
    return json({ok:true},200,{'Set-Cookie':'sd_admin=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
  }
  if(path.startsWith('/api/admin/')) return adminData(path,request,env);
  return bad('Not found',404);
}

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')) {
      try { return await handleApi(request,env); } catch(error) { console.error(error); return bad('Server error',500); }
    }
    return env.ASSETS.fetch(request);
  }
};
