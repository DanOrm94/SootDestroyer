(() => {
  const $=id=>document.getElementById(id); const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(path,options={})=>{const r=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d};
  const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  let calDate=new Date();calDate.setHours(12,0,0,0);$('calDate').value=iso(calDate);
  let services=[];

  async function check(){
    try{
      const d=await api('/api/admin/me');
      $('adminEmail').textContent=d.email;
      $('app').hidden=false;
      await loadAll();
    }catch{ location.replace('/admin'); }
  }

  $('logout').addEventListener('click',async()=>{await api('/api/auth/logout',{method:'POST'});location.replace('/admin')});
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$(btn.dataset.tab).classList.add('active');}));
  const weekStart=()=>{const d=new Date(calDate);const day=d.getDay();d.setDate(d.getDate()-day);return d};
  async function loadCalendar(){
    const start=weekStart(),end=new Date(start);end.setDate(end.getDate()+6);const d=await api(`/api/admin/bookings?from=${iso(start)}&to=${iso(end)}`);const map={};(d.bookings||[]).forEach(b=>(map[b.date]??=[]).push(b));
    $('calendarGrid').innerHTML=Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(day.getDate()+i);const key=iso(day);const events=(map[key]||[]).map(b=>`<div class="event"><strong>${esc(b.start_time)}–${esc(b.end_time)} · ${esc(b.service_name)}</strong>${esc(b.name)}<br>${esc(b.phone)}<br><span>${esc(b.status)}</span></div>`).join('');return `<div class="day-card ${key===iso(new Date())?'today':''}"><div class="day-name">${day.toLocaleDateString('en-GB',{weekday:'long'})}</div><div class="day-date">${day.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>${events||'<span style="color:#999;font-size:11px">No bookings</span>'}</div>`}).join('');
  }
  $('calDate').addEventListener('change',()=>{calDate=new Date(`${$('calDate').value}T12:00:00`);loadCalendar()});$('calPrev').addEventListener('click',()=>{calDate.setDate(calDate.getDate()-7);$('calDate').value=iso(calDate);loadCalendar()});$('calNext').addEventListener('click',()=>{calDate.setDate(calDate.getDate()+7);$('calDate').value=iso(calDate);loadCalendar()});

  async function loadBookings(){
    const d=await api('/api/admin/bookings?from=2000-01-01&to=2100-12-31');
    const rows=(d.bookings||[]).map(b=>`<tr><td><strong>${esc(b.date)}</strong><br>${esc(b.start_time)}–${esc(b.end_time)}</td><td><strong>${esc(b.name)}</strong><br>${esc(b.phone)}<br>${esc(b.email)}<br>${esc(b.address)} ${esc(b.postcode)}</td><td>${esc(b.service_name)}<br>${esc(b.price_label||'')}</td><td>${esc(b.notes)}</td><td><select class="status-select" data-id="${esc(b.id)}"><option ${b.status==='confirmed'?'selected':''}>confirmed</option><option ${b.status==='completed'?'selected':''}>completed</option><option ${b.status==='cancelled'?'selected':''}>cancelled</option></select></td></tr>`).join('');
    $('bookingTable').innerHTML=`<table class="booking-table"><thead><tr><th>When</th><th>Customer</th><th>Service</th><th>Notes</th><th>Status</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No bookings.</td></tr>'}</tbody></table>`;
    $('bookingTable').querySelectorAll('.status-select').forEach(s=>s.addEventListener('change',async()=>{await api('/api/admin/bookings/'+encodeURIComponent(s.dataset.id),{method:'PATCH',body:JSON.stringify({status:s.value})});loadAll()}));
  }

  function renderManualServices(){
    $('manualService').innerHTML=services.filter(s=>s.active).map(s=>`<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.duration_label||`${s.duration_minutes} mins`)} · ${esc(s.price_label||'POA')}</option>`).join('');
  }
  function resetManualBooking(){
    $('manualBookingForm').reset();
    $('manualDate').value=iso(new Date());
    $('manualBookingMessage').textContent='';
    $('manualBookingMessage').className='';
  }
  $('addBooking').addEventListener('click',()=>{$('manualBookingForm').hidden=false;resetManualBooking();$('manualBookingForm').scrollIntoView({behavior:'smooth',block:'start'});});
  $('cancelManualBooking').addEventListener('click',()=>{$('manualBookingForm').hidden=true;});
  $('manualBookingForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const msg=$('manualBookingMessage'); msg.textContent='Saving…'; msg.className='manual-saving';
    const payload={service_id:$('manualService').value,date:$('manualDate').value,time:$('manualTime').value,name:$('manualName').value,phone:$('manualPhone').value,email:$('manualEmail').value,postcode:$('manualPostcode').value,address:$('manualAddress').value,notes:$('manualNotes').value};
    try{
      await api('/api/admin/bookings',{method:'POST',body:JSON.stringify(payload)});
      msg.textContent='Booking added successfully.'; msg.className='manual-success';
      await Promise.all([loadBookings(),loadCalendar()]);
      setTimeout(()=>{$('manualBookingForm').hidden=true;resetManualBooking();},700);
    }catch(err){msg.textContent=err.message;msg.className='manual-error';}
  });

  async function loadServices(){
    const d=await api('/api/admin/services');services=d.services||[];renderManualServices();
    $('serviceList').innerHTML=services.map(s=>`<div class="service-row" data-id="${esc(s.id)}"><label>Name<input class="s-name" value="${esc(s.name)}"></label><label>Price shown<input class="s-price" value="${esc(s.price_label)}"></label><label>Minutes<input class="s-duration" type="number" min="15" step="15" value="${esc(s.duration_minutes)}"></label><label>Sort<input class="s-sort" type="number" value="${esc(s.sort_order)}"></label><label class="check"><input class="s-active" type="checkbox" ${s.active?'checked':''}> Active</label><button class="save">Save</button></div>`).join('');
    $('serviceList').querySelectorAll('.save').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('.service-row');await api('/api/admin/services/'+encodeURIComponent(row.dataset.id),{method:'PATCH',body:JSON.stringify({name:row.querySelector('.s-name').value,description:'',price_label:row.querySelector('.s-price').value,duration_minutes:Number(row.querySelector('.s-duration').value),sort_order:Number(row.querySelector('.s-sort').value),active:row.querySelector('.s-active').checked})});loadServices();loadCalendar()}));
  }
  $('addService').addEventListener('click',async()=>{const name=prompt('Service name');if(!name)return;const price=prompt('Price shown to customers','POA')||'POA';const duration=Number(prompt('Duration in minutes (15-minute increments)','60')||60);await api('/api/admin/services',{method:'POST',body:JSON.stringify({name,price_label:price,duration_minutes:duration,active:true})});loadServices()});

  async function loadHours(){const d=await api('/api/admin/hours');const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];$('hoursList').innerHTML=(d.hours||[]).map(h=>`<div class="hours-row" data-day="${h.day_of_week}"><strong>${names[h.day_of_week]}</strong><label>Open<input class="h-open" type="time" value="${esc(h.open_time)}" ${h.is_open?'':'disabled'}></label><label>Close<input class="h-close" type="time" value="${esc(h.close_time)}" ${h.is_open?'':'disabled'}></label><label><input class="h-active" type="checkbox" ${h.is_open?'checked':''}> Open</label></div>`).join('');$('hoursList').querySelectorAll('.h-active').forEach(c=>c.addEventListener('change',()=>{const r=c.closest('.hours-row');r.querySelector('.h-open').disabled=!c.checked;r.querySelector('.h-close').disabled=!c.checked;}));}
  $('saveHours').addEventListener('click',async()=>{const hours=[...$('hoursList').querySelectorAll('.hours-row')].map(r=>({day_of_week:Number(r.dataset.day),is_open:r.querySelector('.h-active').checked,open_time:r.querySelector('.h-open').value,close_time:r.querySelector('.h-close').value}));await api('/api/admin/hours',{method:'PUT',body:JSON.stringify({hours})});loadCalendar()});
  async function loadBlocked(){const d=await api('/api/admin/blocked');$('blockedList').innerHTML=(d.blocked||[]).map(b=>`<div class="blocked-item"><span><strong>${esc(b.date)}</strong> · ${esc(b.reason)}</span><button data-date="${esc(b.date)}">Remove</button></div>`).join('')||'<p>No blocked dates.</p>';$('blockedList').querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{await api('/api/admin/blocked/'+encodeURIComponent(b.dataset.date),{method:'DELETE'});loadBlocked();loadCalendar()}));}
  $('blockedForm').addEventListener('submit',async e=>{e.preventDefault();await api('/api/admin/blocked',{method:'POST',body:JSON.stringify({date:$('blockedDate').value,reason:$('blockedReason').value||'Unavailable'})});e.target.reset();loadBlocked();loadCalendar()});
  $('refreshBookings').addEventListener('click',loadBookings);
  async function loadAll(){await Promise.all([loadCalendar(),loadBookings(),loadServices(),loadHours(),loadBlocked()])}
  check();
})();
