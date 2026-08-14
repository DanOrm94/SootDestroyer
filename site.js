const menu=document.querySelector(".menu"),nav=document.querySelector(".header nav");
if(menu&&nav){
  menu.setAttribute("aria-expanded","false");
  menu.addEventListener("click",()=>{
    const open=nav.classList.toggle("open");
    menu.setAttribute("aria-expanded",String(open));
  });
}
if(nav){
  if(!nav.querySelector('a[href="show-room.html"]')){
    const link=document.createElement("a");link.href="show-room.html";link.textContent="Show Room";
    const cta=nav.querySelector(".nav-cta");nav.insertBefore(link,cta||null);
  }
  if(!nav.querySelector('a[href="stove-packages.html"]')){
    const link=document.createElement("a");link.href="stove-packages.html";link.textContent="Stove Packages";
    const cta=nav.querySelector(".nav-cta");nav.insertBefore(link,cta||null);
  }
  if(!nav.querySelector('a[href="https://burnright.co.uk/"]')){
    const link=document.createElement("a");link.href="https://burnright.co.uk/";link.textContent="BurnRight";link.target="_blank";link.rel="noopener noreferrer";
    const cta=nav.querySelector(".nav-cta");nav.insertBefore(link,cta||null);
  }
  if(!nav.querySelector('a[href="https://www.nacs.org.uk/"]')){
    const link=document.createElement("a");link.href="https://www.nacs.org.uk/";link.textContent="NACS";link.target="_blank";link.rel="noopener noreferrer";
    const cta=nav.querySelector(".nav-cta");nav.insertBefore(link,cta||null);
  }
}
document.querySelectorAll(".header nav a").forEach(a=>a.addEventListener("click",()=>{
  nav?.classList.remove("open");
  menu?.setAttribute("aria-expanded","false");
}));
document.querySelectorAll(".accordion details").forEach(d=>d.addEventListener("toggle",()=>{
  if(d.open)document.querySelectorAll(".accordion details").forEach(x=>{if(x!==d)x.removeAttribute("open")});
}));
document.querySelectorAll("form").forEach(form=>form.addEventListener("submit",e=>{
  e.preventDefault();
  const s=form.querySelector(".success");
  if(s){s.style.display="block";s.classList.add("show");}
  form.reset();
}));
