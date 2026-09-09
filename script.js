const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const BOOKING_URL = "/booking";

// Blend the JPG logo into the warm header background.
if (!document.querySelector('link[data-logo-blend]')) {
  const logoStyle = document.createElement('link');
  logoStyle.rel = 'stylesheet';
  logoStyle.href = 'logo-blend.css';
  logoStyle.dataset.logoBlend = 'true';
  document.head.appendChild(logoStyle);
}

if (nav) {
  if (!nav.querySelector('a[href="show-room.html"]')) {
    const link=document.createElement("a"); link.href="show-room.html"; link.textContent="Show Room";
    const cta=nav.querySelector(".nav-cta"); nav.insertBefore(link,cta||null);
  }
  if (!nav.querySelector('a[href="stove-packages.html"]')) {
    const link=document.createElement("a"); link.href="stove-packages.html"; link.textContent="Stove Packages";
    const cta=nav.querySelector(".nav-cta"); nav.insertBefore(link,cta||null);
  }
  if (!nav.querySelector('a[href="quote.html"]')) {
    const link=document.createElement("a"); link.href="quote.html"; link.textContent="Quote";
    const cta=nav.querySelector(".nav-cta"); nav.insertBefore(link,cta||null);
  }
  if (!nav.querySelector('a[href="https://burnright.co.uk/"]')) {
    const link=document.createElement("a"); link.href="https://burnright.co.uk/"; link.textContent="BurnRight"; link.target="_blank"; link.rel="noopener noreferrer";
    const cta=nav.querySelector(".nav-cta"); nav.insertBefore(link,cta||null);
  }
  if (!nav.querySelector('a[href="https://www.nacs.org.uk/"]')) {
    const link=document.createElement("a"); link.href="https://www.nacs.org.uk/"; link.textContent="NACS"; link.target="_blank"; link.rel="noopener noreferrer";
    const cta=nav.querySelector(".nav-cta"); nav.insertBefore(link,cta||null);
  }
}

// Every Book Now CTA stays on the real website domain.
document.querySelectorAll('a, button').forEach(element => {
  const label = element.textContent.trim().replace(/\s+/g, ' ');
  const href = element.getAttribute('href') || '';
  if (/^book now$/i.test(label) || /(?:^|\/)booking\.html(?:$|[?#])/i.test(href)) {
    if (element.tagName === 'A') {
      element.href = BOOKING_URL;
    } else {
      element.addEventListener('click', () => { window.location.href = BOOKING_URL; });
    }
  }
});

document.querySelectorAll('a[href^="tel:"]').forEach(link => {
  link.href = "tel:+447442174051";
  if (/^(Call us|Call|Phone)$/i.test(link.textContent.trim())) link.setAttribute("aria-label", "Call Soot Destroyer on 07442 174051");
});

menuToggle?.addEventListener("click", () => {
  const open=nav.classList.toggle("open"); menuToggle.setAttribute("aria-expanded",String(open));
});
document.querySelectorAll(".nav a").forEach(link=>link.addEventListener("click",()=>{nav.classList.remove("open");menuToggle?.setAttribute("aria-expanded","false")}));

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

document.querySelectorAll("details").forEach(detail=>detail.addEventListener("toggle",()=>{if(detail.open)document.querySelectorAll("details").forEach(other=>{if(other!==detail)other.removeAttribute("open")})}));

const form=document.querySelector("#bookingForm");
form?.addEventListener("submit",event=>{event.preventDefault();form.querySelector(".success")?.classList.add("show");form.reset()});

const header=document.querySelector(".site-header");
window.addEventListener("scroll",()=>{header?.classList.toggle("scrolled",window.scrollY>20)},{passive:true});

const heroLogo=document.querySelector('.hero-photo img');
if(heroLogo&&window.location.pathname.endsWith('/index.html')){heroLogo.src='sootlogo.jpg';heroLogo.alt='Soot Destroyer logo'}
