/* Marketing-only motion. Cashier/admin/driver operations never wait for animation. */
(()=>{
 let lenis=null,context=null,resizeObserver=null,booted=false;
 const headings=new Map();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)');
 function destroy(){for(const [el,original] of headings){el.innerHTML=original;el.removeAttribute('aria-label')}headings.clear();if(lenis){lenis.destroy();lenis=null}if(context){context.revert();context=null}window.gsap?.ticker.remove(tick);resizeObserver?.disconnect();resizeObserver=null;booted=false}
 function tick(t){lenis?.raf(t*1000)}
 function boot(){if(booted||reduced.matches||!window.gsap||!window.ScrollTrigger)return;booted=true;gsap.registerPlugin(ScrollTrigger);
  context=gsap.context(()=>{
   // The first frame is complete; transform-only intro keeps the CTA legible.
   gsap.from('.hero>div:first-child',{y:20,duration:.8,ease:'power3.out',clearProps:'transform'});
   gsap.from('.hero-image-shell',{y:32,scale:.98,duration:1,ease:'power3.out',delay:.08,clearProps:'transform'});
   gsap.from('.hero-label',{rotation:2,y:16,duration:1,ease:'power3.out',delay:.15,clearProps:'transform'});
   document.querySelectorAll('.atelier h2,.ritual h2,.last-call h2').forEach(el=>{
    // Plain heading accessible name remains unchanged; no splitting links or inline emphasis.
    const original=el.innerHTML;headings.set(el,original);if(el.querySelector('a,button'))return;
    const accessible=el.textContent.trim();el.setAttribute('aria-label',accessible);
    const fragments=[];el.childNodes.forEach(node=>{if(node.nodeType===3)fragments.push(node.textContent.split(/(\s+)/).map(w=>/\S/.test(w)?'<span class="motion-word" aria-hidden="true" style="display:inline-block">'+w+'</span>':w).join(''));else fragments.push(node.outerHTML)});
    el.innerHTML=fragments.join('');const words=el.querySelectorAll('.motion-word');
    gsap.from(words,{y:14,duration:.65,stagger:.04,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true},clearProps:'transform'});
    // Revert the actual DOM when motion preference changes or the page is left.

   });
   gsap.from('.atelier-photo',{y:25,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.atelier-photo',start:'top 92%',once:true},clearProps:'transform'});
  });
  // Lenis chosen over Locomotive: smallest integration; native touch and nested controls.
  if(window.Lenis&&!coarse.matches){lenis=new Lenis({autoRaf:false,smoothWheel:true,anchors:true,prevent:node=>!!node.closest('dialog,.chips,.hub,.tw,[data-lenis-prevent]')});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(tick);gsap.ticker.lagSmoothing(0)}
  document.fonts.ready.then(()=>ScrollTrigger.refresh());window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
  resizeObserver=new ResizeObserver(()=>{lenis?.resize()});resizeObserver.observe(document.body);
 }
 reduced.addEventListener('change',()=>{destroy();if(!reduced.matches)boot()});window.addEventListener('pagehide',destroy);window.addEventListener('pageshow',()=>boot());
 const ready=()=>{if(typeof DB!=='undefined')DB.ready.then(boot).catch(()=>{})};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
