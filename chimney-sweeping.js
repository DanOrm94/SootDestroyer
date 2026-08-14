const menu = document.querySelector(".menu");
const nav = document.querySelector(".header nav");
menu?.addEventListener("click", () => nav.classList.toggle("open"));

document.querySelectorAll(".accordion details").forEach(d => {
  d.addEventListener("toggle", () => {
    if (d.open) document.querySelectorAll(".accordion details").forEach(x => {
      if (x !== d) x.removeAttribute("open");
    });
  });
});

const style = document.createElement("style");
style.textContent = `.header nav.open{display:flex}@media(max-width:700px){.header nav.open{position:absolute;left:15px;right:15px;top:72px;background:#fffdf8;border:1px solid #d8d4c9;border-radius:16px;padding:12px;flex-direction:column;align-items:stretch;box-shadow:0 20px 50px #20211f22}.header nav.open a{padding:11px}}`;
document.head.appendChild(style);
