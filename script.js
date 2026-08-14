const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

if (nav) {
  if (!nav.querySelector('a[href="show-room.html"]')) {
    const link = document.createElement("a");
    link.href = "show-room.html";
    link.textContent = "Show Room";
    const cta = nav.querySelector(".nav-cta");
    nav.insertBefore(link, cta || null);
  }
  if (!nav.querySelector('a[href="stove-packages.html"]')) {
    const link = document.createElement("a");
    link.href = "stove-packages.html";
    link.textContent = "Stove Packages";
    const cta = nav.querySelector(".nav-cta");
    nav.insertBefore(link, cta || null);
  }
  if (!nav.querySelector('a[href="https://burnright.co.uk/"]')) {
    const link = document.createElement("a");
    link.href = "https://burnright.co.uk/";
    link.textContent = "BurnRight";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const cta = nav.querySelector(".nav-cta");
    nav.insertBefore(link, cta || null);
  }
}

menuToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".nav a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

document.querySelectorAll("details").forEach(detail => {
  detail.addEventListener("toggle", () => {
    if (detail.open) {
      document.querySelectorAll("details").forEach(other => {
        if (other !== detail) other.removeAttribute("open");
      });
    }
  });
});

const form = document.querySelector("#bookingForm");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const success = form.querySelector(".success");
  success.classList.add("show");
  form.reset();
});

const header = document.querySelector(".site-header");
let lastScroll = 0;
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  if (y > 20) header.classList.add("scrolled");
  else header.classList.remove("scrolled");
  lastScroll = y;
}, { passive: true });

// Use the uploaded Soot Destroyer logo in the homepage hero image block.
const heroLogo = document.querySelector('.hero-photo img');
if (heroLogo && window.location.pathname.endsWith('/index.html')) {
  heroLogo.src = 'sootlogo.jpg';
  heroLogo.alt = 'Soot Destroyer logo';
}
