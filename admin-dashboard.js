(() => {
  const $=id=>document.getElementById(id); const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(path,options={})=>{const r=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d};
  const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  let calDate=new Date();calDate.setHours(12,0,0,0);$('calDate').value=iso(calDate);
  let services=[];
  let showPastBookings=false;

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
    const start=weekStart(),end=new Date(start);end.setDate(end.getDate()+6);const d=await api(`/api/admin/bookings?from=${iso(start)}&to=${iso(end)}`);const map={};
    (d.bookings||[]).filter(b=>b.status!=='cancelled').forEach(b=>(map[b.date]??=[]).push(b));
    $('calendarGrid').innerHTML=Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(day.getDate()+i);const key=iso(day);const events=(map[key]||[]).map(b=>`<div class="event"><strong>${esc(b.start_time)}–${esc(b.end_time)} · ${esc(b.service_name)}</strong>${esc(b.name)}<br>${esc(b.phone)}<br><span>${esc(b.status)}</span></div>`).join('');return `<div class="day-card ${key===iso(new Date())?'today':''}"><div class="day-name">${day.toLocaleDateString('en-GB',{weekday:'long'})}</div><div class="day-date">${day.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>${events||'<span style="color:#999;font-size:11px">No bookings</span>'}</div>`}).join('');
  }
  $('calDate').addEventListener('change',()=>{calDate=new Date(`${$('calDate').value}T12:00:00`);loadCalendar()});$('calPrev').addEventListener('click',()=>{calDate.setDate(calDate.getDate()-7);$('calDate').value=iso(calDate);loadCalendar()});$('calNext').addEventListener('click',()=>{calDate.setDate(calDate.getDate()+7);$('calDate').value=iso(calDate);loadCalendar()});

  async function changeBookingStatus(id,next){
    if(next==='cancelled' && !confirm('Cancel this booking? The appointment time will immediately become available again.')) return false;
    await api('/api/admin/bookings/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:next})});
    await loadAll();
    return true;
  }

  function customerEditHtml(b){
    return `<div class="customer-details"><div class="customer-summary"><strong>${esc(b.name)}</strong><br>${esc(b.phone)}<br>${esc(b.email)}<br>${esc(b.address)} ${esc(b.postcode)}</div><button type="button" class="edit-customer-btn" data-id="${esc(b.id)}">Edit customer</button><div class="customer-edit" data-id="${esc(b.id)}" hidden><label>Name<input class="c-name" value="${esc(b.name)}"></label><label>Phone<input class="c-phone" value="${esc(b.phone)}"></label><label>Email<input class="c-email" type="email" value="${esc(b.email)}"></label><label>Address<input class="c-address" value="${esc(b.address)}"></label><label>Postcode<input class="c-postcode" value="${esc(b.postcode)}"></label><label>Notes<input class="c-notes" value="${esc(b.notes)}"></label><div class="customer-edit-actions"><button type="button" class="save-customer-btn small-btn" data-id="${esc(b.id)}">Save changes</button><button type="button" class="cancel-customer-btn cancel-btn">Cancel</button><span class="customer-edit-message"></span></div></div></div>`;
  }

  async function saveCustomer(id,edit){
    const msg=edit.querySelector('.customer-edit-message');msg.textContent='Saving…';msg.className='customer-edit-message saving';
    try{
      await api('/api/admin/bookings/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({name:edit.querySelector('.c-name').value,phone:edit.querySelector('.c-phone').value,email:edit.querySelector('.c-email').value,address:edit.querySelector('.c-address').value,postcode:edit.querySelector('.c-postcode').value,notes:edit.querySelector('.c-notes').value})});
      msg.textContent='Saved ✓';msg.className='customer-edit-message saved';
      await loadBookings();
    }catch(err){msg.textContent=err.message;msg.className='customer-edit-message error';}
  }

  function bookingIsUpcoming(b){
    const now=new Date();
    const appointment=new Date(`${b.date}T${b.start_time}:00`);
    return appointment >= now;
  }

  function renderBookingRows(bookings){
    const rows=bookings.map(b=>`<tr><td><strong>${esc(b.date)}</strong><br>${esc(b.start_time)}–${esc(b.end_time)}</td><td>${customerEditHtml(b)}</td><td>${esc(b.service_name)}<br>${esc(b.price_label||'')}</td><td>${esc(b.notes)}</td><td><div class="status-actions"><select class="status-select ${esc(b.status)}" data-id="${esc(b.id)}"><option value="pending" ${b.status==='pending'?'selected':''}>Pending</option><option value="confirmed" ${b.status==='confirmed'?'selected':''}>Confirmed</option><option value="completed" ${b.status==='completed'?'selected':''}>Completed</option><option value="cancelled" ${b.status==='cancelled'?'selected':''}>Cancelled</option></select><button type="button" class="booking-cancel-btn" data-id="${esc(b.id)}" ${b.status==='cancelled'?'disabled':''}>${b.status==='cancelled'?'Cancelled':'Cancel booking'}</button></div></td></tr>`).join('');
    $('bookingTable').innerHTML=`<table class="booking-table"><thead><tr><th>When</th><th>Customer</th><th>Service</th><th>Notes</th><th>Status</th></tr></thead><tbody>${rows||`<tr><td colspan="5">No ${showPastBookings?'previous':'upcoming'} bookings.</td></tr>`}</tbody></table>`;
    $('bookingTable').querySelectorAll('.edit-customer-btn').forEach(btn=>btn.addEventListener('click',()=>{const wrap=btn.closest('.customer-details');wrap.querySelector('.customer-summary').hidden=true;btn.hidden=true;wrap.querySelector('.customer-edit').hidden=false;}));
    $('bookingTable').querySelectorAll('.cancel-customer-btn').forEach(btn=>btn.addEventListener('click',()=>{const wrap=btn.closest('.customer-details');wrap.querySelector('.customer-summary').hidden=false;wrap.querySelector('.edit-customer-btn').hidden=false;wrap.querySelector('.customer-edit').hidden=true;}));
    $('bookingTable').querySelectorAll('.save-customer-btn').forEach(btn=>btn.addEventListener('click',()=>saveCustomer(btn.dataset.id,btn.closest('.customer-edit'))));
    $('bookingTable').querySelectorAll('.status-select').forEach(s=>s.addEventListener('change',async()=>{const next=s.value;try{await changeBookingStatus(s.dataset.id,next);}catch(err){alert(err.message);await loadBookings();}}));
    $('bookingTable').querySelectorAll('.booking-cancel-btn').forEach(btn=>btn.addEventListener('click',async()=>{try{await changeBookingStatus(btn.dataset.id,'cancelled');}catch(err){alert(err.message);await loadBookings();}}));
  }

  async function loadBookings(){
    const d=await api('/api/admin/bookings?from=2000-01-01&to=2100-12-31');
    let bookings=(d.bookings||[]).slice().sort((a,b)=>`${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));
    if(showPastBookings){
      bookings=bookings.filter(b=>!bookingIsUpcoming(b));
    }else{
      bookings=bookings.filter(b=>bookingIsUpcoming(b) && b.status!=='cancelled');
    }
    renderBookingRows(bookings);
    const toggle=$('togglePastBookings');
    if(toggle){toggle.textContent=showPastBookings?'Show upcoming bookings':'Show previous bookings';toggle.classList.toggle('active',showPastBookings);}
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
    $('serviceList').innerHTML=services.map(s=>`<div class="service-row" data-id="${esc(s.id)}"><label>Name<input class="s-name" value="${esc(s.name)}"></label><label>Price shown<input class="s-price" value="${esc(s.price_label)}"></label><label>Minutes<input class="s-duration" type="number" min="15" step="5" value="${esc(s.duration_minutes)}"></label><label>Sort<input class="s-sort" type="number" value="${esc(s.sort_order)}"></label><label class="check"><input class="s-active" type="checkbox" ${s.active?'checked':''}> Active</label><button class="save">Save</button></div>`).join('');
    $('serviceList').querySelectorAll('.save').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('.service-row');const original=btn.textContent;btn.disabled=true;btn.textContent='Saving…';try{await api('/api/admin/services/'+encodeURIComponent(row.dataset.id),{method:'PATCH',body:JSON.stringify({name:row.querySelector('.s-name').value,description:'',price_label:row.querySelector('.s-price').value,duration_minutes:Number(row.querySelector('.s-duration').value),sort_order:Number(row.querySelector('.s-sort').value),active:row.querySelector('.s-active').checked})});btn.textContent='Saved ✓';setTimeout(()=>{btn.disabled=false;btn.textContent=original;loadServices();loadCalendar()},900);}catch(err){btn.disabled=false;btn.textContent='Save failed';alert(err.message);}}));
  }
  $('addService').addEventListener('click',async()=>{const name=prompt('Service name');if(!name)return;const price=prompt('Price shown to customers','POA')||'POA';const duration=Number(prompt('Duration in minutes (5-minute increments)','60')||60);await api('/api/admin/services',{method:'POST',body:JSON.stringify({name,price_label:price,duration_minutes:duration,active:true})});loadServices()});

  async function loadHours(){const d=await api('/api/admin/hours');const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];$('hoursList').innerHTML=(d.hours||[]).map(h=>`<div class="hours-row" data-day="${h.day_of_week}"><strong>${names[h.day_of_week]}</strong><label>Open<input class="h-open" type="time" value="${esc(h.open_time)}" ${h.is_open?'':'disabled'}></label><label>Close<input class="h-close" type="time" value="${esc(h.close_time)}" ${h.is_open?'':'disabled'}></label><label><input class="h-active" type="checkbox" ${h.is_open?'checked':''}> Open</label></div>`).join('');$('hoursList').querySelectorAll('.h-active').forEach(c=>c.addEventListener('change',()=>{const r=c.closest('.hours-row');r.querySelector('.h-open').disabled=!c.checked;r.querySelector('.h-close').disabled=!c.checked;}));}
  $('saveHours').addEventListener('click',async()=>{const hours=[...$('hoursList').querySelectorAll('.hours-row')].map(r=>({day_of_week:Number(r.dataset.day),is_open:r.querySelector('.h-active').checked,open_time:r.querySelector('.h-open').value,close_time:r.querySelector('.h-close').value}));await api('/api/admin/hours',{method:'PUT',body:JSON.stringify({hours})});loadCalendar()});
  async function loadBlocked(){const d=await api('/api/admin/blocked');$('blockedList').innerHTML=(d.blocked||[]).map(b=>`<div class="blocked-item"><span><strong>${esc(b.date)}</strong> · ${esc(b.reason)}</span><button data-date="${esc(b.date)}">Remove</button>`).join('')||'<p>No blocked dates.</p>';$('blockedList').querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{await api('/api/admin/blocked/'+encodeURIComponent(b.dataset.date),{method:'DELETE'});loadBlocked();loadCalendar()}));}
  $('blockedForm').addEventListener('submit',async e=>{e.preventDefault();await api('/api/admin/blocked',{method:'POST',body:JSON.stringify({date:$('blockedDate').value,reason:$('blockedReason').value||'Unavailable'})});e.target.reset();loadBlocked();loadCalendar()});
  $('refreshBookings').addEventListener('click',loadBookings);
  $('togglePastBookings').addEventListener('click',()=>{showPastBookings=!showPastBookings;loadBookings()});
  async function loadAll(){await Promise.all([loadCalendar(),loadBookings(),loadServices(),loadHours(),loadBlocked()])}
  check();
})();
