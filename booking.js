(() => {
  const serviceEl=document.getElementById('service'), choicesEl=document.getElementById('serviceChoices'), dateEl=document.getElementById('date'), slotsEl=document.getElementById('slots'), summaryEl=document.getElementById('serviceSummary');
  const selectedTime=document.getElementById('selectedTime'), form=document.getElementById('bookingForm'), message=document.getElementById('bookingMessage'), button=document.getElementById('bookButton');
  let services=[];
  const today=new Date(); today.setHours(12,0,0,0);
  const iso=d=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  dateEl.min=iso(today); dateEl.value=iso(today);
  const money=s=>s.price_label || 'POA';
  const durationLabels={'free-installation-survey':'1 hr','chimney-sweep':'1 hr 15 mins','chimney-sweep-2':'1 hr 45 mins','chimney-sweep-3':'2 hrs 30 mins','chimney-sweep-4':'3 hrs 15 mins','chimney-sweep-cctv':'2 hrs','cctv-inspection':'1 hr','other':'7 mins'};
  const duration=s=>durationLabels[s.id] || `${s.duration_minutes} mins`;
  function renderServices(){
    serviceEl.innerHTML=services.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
    choicesEl.innerHTML=services.map((s,i)=>`<button type="button" class="service-card${i===0?' selected':''}" data-service="${s.id}"><span class="service-card-main"><strong>${s.name}</strong><span>${duration(s)} · ${money(s)}</span></span><span class="service-card-desc">${s.description||''}</span><span class="service-card-arrow">Book</span></button>`).join('');
    choicesEl.querySelectorAll('.service-card').forEach(card=>card.addEventListener('click',()=>{
      serviceEl.value=card.dataset.service;
      choicesEl.querySelectorAll('.service-card').forEach(x=>x.classList.remove('selected'));
      card.classList.add('selected');
      loadSlots();
    }));
  }
  async function loadServices(){
    const res=await fetch('/api/services'); const data=await res.json(); if(!res.ok) throw new Error(data.error||'Unable to load services');
    services=data.services||[]; renderServices();
    if(services[0]) await loadSlots();
  }
  async function loadSlots(){
    const service=services.find(s=>s.id===serviceEl.value); if(!service) return;
    selectedTime.value='';
    summaryEl.textContent=`${service.name} · ${duration(service)} appointment · ${money(service)}`;
    slotsEl.innerHTML='<div class="empty-state">Checking live availability…</div>';
    const res=await fetch(`/api/availability?date=${encodeURIComponent(dateEl.value)}&service=${encodeURIComponent(service.id)}`); const data=await res.json();
    if(!res.ok){slotsEl.innerHTML=`<div class="empty-state">${data.error||'Unable to load availability.'}</div>`;return;}
    if(!data.slots?.length){slotsEl.innerHTML='<div class="empty-state">No appointments are available on this date. Try another day.</div>';return;}
    slotsEl.innerHTML=data.slots.map(t=>`<button class="slot" type="button" data-time="${t}">${t}</button>`).join('');
    slotsEl.querySelectorAll('.slot').forEach(btn=>btn.addEventListener('click',()=>{slotsEl.querySelectorAll('.slot').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');selectedTime.value=btn.dataset.time; message.className='booking-message'; message.textContent='';}));
  }
  function shift(days){const d=new Date(`${dateEl.value}T12:00:00`);d.setDate(d.getDate()+days);if(d<today)return;dateEl.value=iso(d);loadSlots();}
  document.getElementById('prevDate').addEventListener('click',()=>shift(-1)); document.getElementById('nextDate').addEventListener('click',()=>shift(1));
  dateEl.addEventListener('change',loadSlots);
  form.addEventListener('submit',async e=>{
    e.preventDefault(); message.className='booking-message';
    if(!selectedTime.value){message.textContent='Please choose an appointment time first.';message.className='booking-message error';return;}
    button.disabled=true;button.textContent='Saving booking…';
    const payload={service_id:serviceEl.value,date:dateEl.value,time:selectedTime.value,name:document.getElementById('name').value,phone:document.getElementById('phone').value,email:document.getElementById('email').value,postcode:document.getElementById('postcode').value,address:document.getElementById('address').value,notes:document.getElementById('notes').value};
    try{
      const res=await fetch('/api/bookings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Unable to create booking');
      message.innerHTML=`<strong>Booking confirmed.</strong><br>${data.booking.service} on ${data.booking.date} at ${data.booking.time}. Your reference is <strong>${data.booking.id.slice(0,8).toUpperCase()}</strong>.`;
      message.className='booking-message success'; form.reset(); selectedTime.value=''; dateEl.value=iso(today); await loadSlots();
    }catch(err){message.textContent=err.message;message.className='booking-message error';await loadSlots();}
    finally{button.disabled=false;button.textContent='Confirm booking →';}
  });
  loadServices().catch(err=>{slotsEl.innerHTML=`<div class="empty-state">${err.message}</div>`});
})();
