const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

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
