/* Cover (V16): torn-paper photo collage character picker.
   Exposed as window.renderCoverV16 / window.bindCoverV16, called from app.js. */
(() => {
'use strict';

const cutoutSrc = key => `assets/cover/${key}.webp`;
// Two aligned layers: props stay still, the person "breathes" on top.
const cutoutHTML = (key, alt) => `<div class="cv-stack" role="img" aria-label="${alt}">`+
  `<img class="cv-props" src="assets/cover/${key}-props.webp" alt="">`+
  `<img class="cv-person" src="assets/cover/${key}-person.webp" alt=""></div>`;

const defs = `<svg class="cv-defs" aria-hidden="true"><defs>
  <filter id="cvTorn" x="-4%" y="-6%" width="108%" height="112%">
    <feTurbulence type="fractalNoise" baseFrequency=".035 .05" numOctaves="3" seed="11" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="cvTornSmall" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</defs></svg>`;

function arrow(dir){
  // stair-stepped pixel triangle on an 8x8 grid
  const cells=[]; for(let y=0;y<8;y++){const w=y<4?y+1:8-y; for(let x=0;x<w;x++){cells.push(dir==='left'?[7-x,y]:[x,y]);}}
  return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges">${cells.map(([x,y])=>`<rect x="${x}" y="${y}" width="1" height="1" fill="#2b2140"/>`).join('')}</svg>`;
}
const ring = `<svg class="ring" viewBox="0 0 200 40" preserveAspectRatio="none"><path d="M12,21 C20,4 120,2 172,8 C198,12 196,30 160,34 C100,40 20,38 8,28 C2,22 10,14 30,12" fill="none" stroke="#20152e" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;

window.renderCoverV16 = function(ctx){
  const {state, families, meta, shortName, esc} = ctx; const total = ctx.total || 18;
  const idx = Math.max(0, families.indexOf(state.selectedFamily));
  const f = families[idx], m = meta[f];
  const items = families.map((fam,i)=>`<button class="cv-item ${i===idx?'active':''}" data-cv-pick="${i}"><span class="nm">${esc(shortName[fam])}</span><span class="who">${esc(meta[fam].name)}</span>${ring}</button>`).join('');
  const preload='';
  return `<section class="page cover-page v16" id="coverV16">${defs}${preload}
    <h1 class="cv-title scrap-paper">U.S. Data <span class="u">Career</span> Explorer</h1>

    <button class="cv-arrow left" data-cv-dir="-1" aria-label="Previous character">${arrow('left')}</button>
    <div class="cv-figure" id="cvFigure"><div class="cv-cut">${cutoutHTML(m.key, `${esc(m.name)}, ${esc(shortName[f])}`)}</div></div>
    <button class="cv-arrow right" data-cv-dir="1" aria-label="Next character">${arrow('right')}</button>
    <div class="cv-tag scrap-paper mark" id="cvTag"><b>${esc(m.name)}</b><span>${esc(shortName[f])}</span></div>

    <aside class="cv-list scrap-paper"><h3>Six careers</h3>${items}</aside>

    <button class="cv-start scrap-paper mark" data-nav="next">Start</button>
    <div class="cv-start-note" id="cvStartNote">follow ${esc(m.name)} through ${total} pages</div>
    <div class="cv-count">page 1 / ${total}</div>
  </section>`;
};

window.bindCoverV16 = function(ctx){
  const {stage, state, families, meta, shortName, esc} = ctx; const total = ctx.total || 18;
  const root = stage.querySelector('#coverV16'); if(!root) return;
  const fig = root.querySelector('#cvFigure');
  // warm the cache so swaps are instant
  families.forEach(fam=>['props','person'].forEach(l=>{const i=new Image(); i.src=`assets/cover/${meta[fam].key}-${l}.webp`;}));

  function apply(idx, dir){
    idx = (idx + families.length) % families.length;
    const f = families[idx], m = meta[f];
    state.selectedFamily=f; state.flowerFamily=f; state.waterfallFamily=f; state.futureFamily=f; state.benchmarkFamily=f; state.compareFamily=null; state.selectedRole=0;

    // Retire EVERY existing cutout (not just the first), so rapid clicks never leave avatars stacked.
    fig.querySelectorAll('.cv-cut').forEach(c=>{
      if(c.classList.contains('out')){ c.remove(); return; }   // already leaving: drop it now
      // next (dir>0): old exits LEFT, new enters from the RIGHT; previous: the mirror image. They never cross.
      c.className='cv-cut out '+(dir>0?'to-l':'to-r');
      setTimeout(()=>c.remove(),300);
    });
    const nu = document.createElement('div'); nu.className='cv-cut in '+(dir>0?'from-r':'from-l');
    nu.innerHTML = cutoutHTML(m.key, `${esc(m.name)}, ${esc(shortName[f])}`);
    fig.appendChild(nu);

    root.querySelector('#cvTag').innerHTML = `<b>${esc(m.name)}</b><span>${esc(shortName[f])}</span>`;
    root.querySelector('#cvStartNote').textContent = `follow ${m.name} through ${total} pages`;
    root.querySelectorAll('.cv-item').forEach((b,i)=>b.classList.toggle('active', i===idx));
  }

  root.querySelectorAll('[data-cv-dir]').forEach(b=>b.addEventListener('click',()=>{
    const d=+b.dataset.cvDir; apply(families.indexOf(state.selectedFamily)+d, d);
  }));
  root.querySelectorAll('[data-cv-pick]').forEach(b=>b.addEventListener('click',()=>{
    const i=+b.dataset.cvPick, cur=families.indexOf(state.selectedFamily); if(i===cur) return; apply(i, i>cur?1:-1);
  }));
  const onKey=(e)=>{
    if(!document.body.contains(root)){window.removeEventListener('keydown',onKey);return;}
    if(e.key==='ArrowLeft') apply(families.indexOf(state.selectedFamily)-1,-1);
    else if(e.key==='ArrowRight') apply(families.indexOf(state.selectedFamily)+1,1);
    else if(e.key==='Enter') root.querySelector('.cv-start').click();
  };
  window.addEventListener('keydown', onKey);
};
})();
