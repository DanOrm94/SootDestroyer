const slides = Array.from({length: 20}, (_, i) => ({file:`showroom-${i + 1}.jpg`, title:`Show Room ${String(i + 1).padStart(2,'0')}`, subtitle:'Soot Destroyer'}));
const stage=document.querySelector('#showroomSlideshow');
const image=document.querySelector('#slideImage');
const empty=document.querySelector('#slideEmpty');
const counter=document.querySelector('#slideCounter');
const title=document.querySelector('#slideTitle');
const subtitle=document.querySelector('#slideSubtitle');
const thumbs=document.querySelector('#thumbs');
const dots=document.querySelector('#dots');
const progress=document.querySelector('#progressBar');
const play=document.querySelector('#playPause');
let index=0,playing=true,timer;

function imageExists(file){return new Promise(resolve=>{const test=new Image();test.onload=()=>resolve(true);test.onerror=()=>resolve(false);test.src=file;});}

async function buildGallery(){
  const available=[];
  for(const slide of slides){if(await imageExists(slide.file))available.push(slide);}
  if(!available.length){showEmpty();return;}
  slides.length=0;slides.push(...available);
  thumbs.innerHTML='';dots.innerHTML='';
  slides.forEach((slide,i)=>{
    const button=document.createElement('button');button.className='thumb';button.type='button';button.setAttribute('aria-label',`Show image ${i+1}`);
    const thumb=document.createElement('img');thumb.src=slide.file;thumb.alt='';button.appendChild(thumb);button.addEventListener('click',()=>goTo(i));thumbs.appendChild(button);
    const dot=document.createElement('button');dot.className='dot-button';dot.type='button';dot.setAttribute('aria-label',`Go to image ${i+1}`);dot.addEventListener('click',()=>goTo(i));dots.appendChild(dot);
  });
  showSlide(0);start();
}
function showEmpty(){image.style.display='none';empty.classList.add('show');counter.textContent='00 / 00';title.textContent='Your photos go here';subtitle.textContent='Upload showroom-1.jpg, showroom-2.jpg and so on';}
function showSlide(i){
  index=(i+slides.length)%slides.length;const slide=slides[index];
  image.classList.add('fade');
  setTimeout(()=>{image.src=slide.file;image.alt=`Soot Destroyer showroom — ${slide.title}`;title.textContent=slide.title;subtitle.textContent=slide.subtitle;counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;progress.style.width=`${((index+1)/slides.length)*100}%`;image.classList.remove('fade');},160);
  document.querySelectorAll('.thumb').forEach((el,n)=>el.classList.toggle('active',n===index));document.querySelectorAll('.dot-button').forEach((el,n)=>el.classList.toggle('active',n===index));
}
function goTo(i){showSlide(i);restart();}
function next(){showSlide(index+1);restart();}
function prev(){showSlide(index-1);restart();}
function start(){clearInterval(timer);if(playing)timer=setInterval(()=>showSlide(index+1),5000);updatePlay();}
function restart(){clearInterval(timer);if(playing)timer=setInterval(()=>showSlide(index+1),5000);}
function updatePlay(){play.innerHTML=playing?'<span>Ⅱ</span> Pause slideshow':'<span>▶</span> Play slideshow';}
function togglePlay(){playing=!playing;start();}

document.querySelector('#nextSlide').addEventListener('click',next);document.querySelector('#prevSlide').addEventListener('click',prev);play.addEventListener('click',togglePlay);
stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev();if(e.key===' ') {e.preventDefault();togglePlay();}});
let touchX=0;stage.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX},{passive:true});stage.addEventListener('touchend',e=>{const delta=e.changedTouches[0].screenX-touchX;if(Math.abs(delta)>45){delta<0?next():prev();}},{passive:true});
stage.addEventListener('mouseenter',()=>clearInterval(timer));stage.addEventListener('mouseleave',()=>{if(playing)restart();});
buildGallery();
