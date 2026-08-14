const menu=document.querySelector(".menu"),nav=document.querySelector(".header nav");
if(menu&&nav){
  menu.setAttribute("aria-expanded","false");
  menu.addEventListener("click",()=>{
    const open=nav.classList.toggle("open");
    menu.setAttribute("aria-expanded",String(open));
  });
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
