
const menu=document.querySelector(".menu"),nav=document.querySelector(".header nav");
menu?.addEventListener("click",()=>nav.classList.toggle("open"));
document.querySelectorAll(".header nav a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
document.querySelectorAll(".accordion details").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)document.querySelectorAll(".accordion details").forEach(x=>{if(x!==d)x.removeAttribute("open")})}));
document.querySelectorAll("form").forEach(form=>form.addEventListener("submit",e=>{e.preventDefault();let s=form.querySelector(".success");if(s){s.classList.add("show");form.reset()}}));
