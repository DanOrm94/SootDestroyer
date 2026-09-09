// Shared sub-page header/menu behaviour and navigation enhancements.
(function(){
  const BOOKING_URL='https://sootdestroyer.danielorm.workers.dev/booking';

  if(!document.querySelector('link[data-subpage-header]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='subpage-header.css';
    style.dataset.subpageHeader='true';
    document.head.appendChild(style);
  }

  if(!document.querySelector('link[data-logo-blend]')){
    const logoStyle=document.createElement('link');
    logoStyle.rel='stylesheet';
    logoStyle.href='logo-blend.css';
    logoStyle.dataset.logoBlend='true';
    document.head.appendChild(logoStyle);
  }

  const menu=document.querySelector('.menu'),nav=document.querySelector('.header nav');
  if(menu&&nav){
    menu.setAttribute('aria-expanded','false');
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      menu.setAttribute('aria-expanded',String(open));
    });
  }
  if(nav){
    if(!nav.querySelector('a[href="show-room.html"]')){
      const link=document.createElement('a');link.href='show-room.html';link.textContent='Show Room';
      const cta=nav.querySelector('.nav-cta');nav.insertBefore(link,cta||null);
    }
    if(!nav.querySelector('a[href="stove-packages.html"]')){
      const link=document.createElement('a');link.href='stove-packages.html';link.textContent='Stove Packages';
      const cta=nav.querySelector('.nav-cta');nav.insertBefore(link,cta||null);
    }
    if(!nav.querySelector('a[href="quote.html"]')){
      const link=document.createElement('a');link.href='quote.html';link.textContent='Quote';
      const cta=nav.querySelector('.nav-cta');nav.insertBefore(link,cta||null);
    }
    if(!nav.querySelector('a[href="https://burnright.co.uk/"]')){
      const link=document.createElement('a');link.href='https://burnright.co.uk/';link.textContent='BurnRight';link.target='_blank';link.rel='noopener noreferrer';
      const cta=nav.querySelector('.nav-cta');nav.insertBefore(link,cta||null);
    }
    if(!nav.querySelector('a[href="https://www.nacs.org.uk/"]')){
      const link=document.createElement('a');link.href='https://www.nacs.org.uk/';link.textContent='NACS';link.target='_blank';link.rel='noopener noreferrer';
      const cta=nav.querySelector('.nav-cta');nav.insertBefore(link,cta||null);
    }
  }

  // Every Book Now CTA goes directly to the live Cloudflare booking app.
  document.querySelectorAll('a, button').forEach(element=>{
    const label=element.textContent.trim().replace(/\s+/g,' ');
    const href=element.getAttribute('href')||'';
    if(/^book now$/i.test(label)||/(?:^|\/)booking\.html(?:$|[?#])/i.test(href)){
      if(element.tagName==='A'){
        element.href=BOOKING_URL;
      }else{
        element.addEventListener('click',()=>{window.location.href=BOOKING_URL;});
      }
    }
  });

  document.querySelectorAll('.header nav a').forEach(a=>a.addEventListener('click',()=>{
    nav?.classList.remove('open');
    menu?.setAttribute('aria-expanded','false');
  }));
  document.querySelectorAll('.accordion details').forEach(d=>d.addEventListener('toggle',()=>{
    if(d.open)document.querySelectorAll('.accordion details').forEach(x=>{if(x!==d)x.removeAttribute('open')});
  }));

  const quoteForm=document.getElementById('quote-form');
  quoteForm?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=quoteForm.querySelector('.submit-btn');
    const original=button?.innerHTML;
    if(button){button.disabled=true;button.innerHTML='Sending quote request…';}
    const data=new FormData(quoteForm);
    const payload={
      name:data.get('Name'),
      phone:data.get('Phone number'),
      email:data.get('Email'),
      total_price:data.get('Total Price'),
      stove_choice:data.get('Stove Choice'),
      flue_choice:data.get('Flue Choice'),
      hearth_choice:data.get('Hearth Choice'),
      beam_choice:data.get('Beam Choice'),
      chamber_choice:data.get('Chamber Choice')
    };
    try{
      const response=await fetch('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||'Unable to submit quote request');
      if(button) button.innerHTML='Quote request sent ✓';
      quoteForm.reset();
      setTimeout(()=>{if(button)button.innerHTML=original||'Submit quote request <span>↗</span>';},4000);
    }catch(error){
      if(button) button.innerHTML='Try again';
      alert(error.message||'Unable to submit quote request. Please try again.');
      setTimeout(()=>{if(button)button.innerHTML=original||'Submit quote request <span>↗</span>';},2500);
    }finally{
      if(button) button.disabled=false;
    }
  });

  document.querySelectorAll('form').forEach(form=>{
    if(form.id==='quote-form') return;
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const s=form.querySelector('.success');
      if(s){s.style.display='block';s.classList.add('show');}
      form.reset();
    });
  });
})();
