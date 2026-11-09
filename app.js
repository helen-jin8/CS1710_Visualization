(() => {
'use strict';
const stage = document.getElementById('stage');
// The whole site is laid out at a fixed 1600x900 design size and scaled to fit the window (like a slide),
// so nothing overlaps on smaller screens.
const DESIGN_W=1600, DESIGN_H=900;
// A dark band of at least SIDE_GUTTER px is kept on each side of the stage; the right one holds the page squares (#side-pager).
const SIDE_GUTTER=64;
function fitStage(){
 const k=Math.max(0.05, Math.min((window.innerWidth-2*SIDE_GUTTER)/DESIGN_W, window.innerHeight/DESIGN_H));
 stage.style.setProperty('--stage-scale', k);
 document.documentElement.style.setProperty('--side-gutter', Math.max(SIDE_GUTTER,(window.innerWidth-DESIGN_W*k)/2)+'px');
 return k;
}
function stageScale(){ return parseFloat(stage.style.getPropertyValue('--stage-scale'))||1; }
fitStage(); window.addEventListener('resize', fitStage);
let DATA=null;
const families=[
  'Data Science & Analytics','AI & Machine Learning','Data Engineering & Architecture',
  'Software Engineering','Systems, Cloud & Security','Data & Technology Management'
];
const meta={
  'Data Science & Analytics':{key:'dot',name:'Dot',color:'#efadc2',tag:'Patterns, evidence, decisions'},
  'AI & Machine Learning':{key:'nova',name:'Nova',color:'#bda4ec',tag:'Models, research, intelligent systems'},
  'Data Engineering & Architecture':{key:'pip',name:'Pip',color:'#efcc63',tag:'Pipelines, platforms, data architecture'},
  'Software Engineering':{key:'pixel',name:'Pixel',color:'#8fcf9f',tag:'Applications, systems, software products'},
  'Systems, Cloud & Security':{key:'nimbus',name:'Nimbus',color:'#9db8e8',tag:'Infrastructure, networks, security'},
  'Data & Technology Management':{key:'kit',name:'Kit',color:'#f29b6b',tag:'Teams, governance, technical delivery'}
};
const shortName={
  'Data Science & Analytics':'Data Science & Analytics','AI & Machine Learning':'AI & ML','Data Engineering & Architecture':'Data Engineering & Arch.',
  'Software Engineering':'Software Engineering','Systems, Cloud & Security':'Systems, Cloud & Security','Data & Technology Management':'Data & Tech Management'
};
const levelColors={EN:'#eadbff',MI:'#c9acf5',SE:'#9470dd',EX:'#5d36bb'};
const state={page:0, targetSalary:null, selectedFamily:families[0], selectedRole:0, selectedState:'MA', mapMode:'mix', flowerFamily:families[0], flowerExpanded:false, remoteView:'dist', levelFocus:null, waterfallFamily:families[0], futureView:'salary', futureFamily:families[0], compareFamily:null};
const TOTAL=8;
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function money(v){ if(v==null||!isFinite(v)) return 'N/A'; return '$'+Math.round(v/1000)+'k'; }
function pct(v,d=1){return v==null||!isFinite(v)?'N/A':(+v).toFixed(d)+'%';}
function careerColor(f){return meta[f]?.color||'#cdbcf3'}
function avatarSrc(f){const k=meta[f].key; return `assets/cover/${k}.webp`;}
function rawAvatarSrc(f){const k=meta[f].key; return `assets/cover/${k}.webp`;}
function avatarTag(f,extra=''){return `<div class="guide-badge" ${extra}><img src="${avatarSrc(f)}" onerror="this.src='${rawAvatarSrc(f)}'" alt="${esc(meta[f].name)}"><div><strong>${esc(meta[f].name)}</strong><small>${esc(shortName[f])}</small></div></div>`}
function brand(){return `<div class="brand"><div class="us">U.S. Data Careers</div><div class="explorer">Explorer</div></div>`}
function top(title,kicker=''){return `<div class="topline">${brand()}<div class="page-title"><h1>${title}</h1>${kicker?`<span class="kicker">${kicker}</span>`:''}</div></div><div class="page-count">${String(state.page+1).padStart(2,'0')} / ${TOTAL}</div>`}
// Vertical page squares in the dark band to the right of the stage (outside #stage, so they are not scaled or re-rendered with the page).
// Each square jumps straight to its page.
let sidePager=null;
function updateSidePager(){
 if(!sidePager){
  sidePager=document.createElement('nav'); sidePager.id='side-pager'; sidePager.setAttribute('aria-label','Pages');
  sidePager.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button type="button" data-goto="${i}" title="Page ${i+1}" aria-label="Go to page ${i+1}"></button>`).join('')+'<div class="sp-count"></div>';
  sidePager.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>setPage(+b.dataset.goto)));
  (document.getElementById('viewport')||document.body).appendChild(sidePager);
 }
 sidePager.querySelectorAll('[data-goto]').forEach(b=>{const on=+b.dataset.goto===state.page; b.classList.toggle('active',on); if(on)b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');});
 sidePager.querySelector('.sp-count').innerHTML=`${String(state.page+1).padStart(2,'0')}<span>/${TOTAL}</span>`;
}
// o.hideNext: start with Next hidden (the page reveals it itself, e.g. the race page after the first race)
function nav(o={}){
 return `<div class="navbar"><button class="nav-btn" data-nav="back" ${state.page===0?'disabled':''}>← Back</button><button class="nav-btn next" data-nav="next" ${state.page===TOTAL-1?'disabled':''} ${NO_NEXT_BUTTON.has(state.page)||o.hideNext?'hidden':''}>${state.page===0?'Start Exploring':'Next'} →</button></div>`;
}
function pageShell(title,kicker,body,cls=''){return `<section class="page ${cls}">${top(title,kicker)}<div class="content">${body}</div>${nav()}</section>`}
// Page changes: no overlays. Going forward, the new page opens with a title intro:
// only the title shows, centred on the stage; it glides up into its place, then the rest of the page fades in.
function playTransition(from,to){
 // The career picked on the cover is "home". Switching career inside a page only affects that page:
 // every page you arrive at starts again on the home career.
 if(from===0) state.homeFamily=state.selectedFamily;
 resetToHomeFamily();
 state.page=to; render({intro: to>from && to>0 && !NO_TITLE_INTRO.has(to)});
}
function resetToHomeFamily(){
 const f=state.homeFamily||state.selectedFamily;
 state.selectedFamily=f; state.flowerFamily=f; state.waterfallFamily=f; state.futureFamily=f; state.benchmarkFamily=f;
 state.compareFamily=null; state.selectedRole=0;
}
// pages (0-based) that appear directly, without the centred-title intro: 4 = "Which mountain do you land on?" (comes straight after the coin game),
// 7 = "Which door stays open in 2035?" (its own entrance is the fellows running in)
const NO_TITLE_INTRO=new Set([4,7]);
// pages (0-based) without a Next button: 3 = the coin game (you move on by grabbing the coin)
const NO_NEXT_BUTTON=new Set([3]);
let introToken=0;
function playTitleIntro(){
 const sec=stage.querySelector('.page'); const h1=sec&&sec.querySelector('h1');
 if(!sec||!h1) return false;
 const token=++introToken;
 // everything except the title: siblings of every node on the path title -> page
 const others=[]; for(let n=h1;n&&n!==sec;n=n.parentElement){ for(const sib of n.parentElement.children){ if(sib!==n) others.push(sib); } }
 others.forEach(el=>{el.style.opacity='0'});
 sec.classList.add('intro-hold');                       // freezes the page's CSS animations (falling fellows etc.) until reveal
 const k=stageScale(), st=stage.getBoundingClientRect(), r=h1.getBoundingClientRect();
 // stage-local coordinates (the stage is scaled; a fixed element inside it is positioned relative to the stage, in unscaled px)
 const W=h1.offsetWidth, H=h1.offsetHeight, X=(r.left+r.width/2-st.left)/k-W/2, Y=(r.top+r.height/2-st.top)/k-H/2;   // un-rotated box of the real title
 const home=getComputedStyle(h1).transform, homeT=home==='none'?'none':home;
 // a stand-in title (same parent => same styles) that is only as wide as its text, so it can sit centred
 const c=h1.cloneNode(true); c.removeAttribute('id'); c.setAttribute('aria-hidden','true');
 Object.assign(c.style,{position:'fixed',margin:'0',boxSizing:'border-box',left:X+'px',top:Y+'px',width:'max-content',maxWidth:'none',zIndex:'50',pointerEvents:'none'});
 h1.parentElement.appendChild(c);
 const w0=Math.min(c.offsetWidth, DESIGN_W*0.8), h0=c.offsetHeight; c.style.width=w0+'px';
 h1.style.visibility='hidden';
 const L0=(DESIGN_W-w0)/2, T0=DESIGN_H*0.45-h0/2;
 const centre={left:L0+'px',top:T0+'px',width:w0+'px',transform:'scale(1.15)'};
 const fly=c.animate([{...centre,opacity:0},{...centre,opacity:1,offset:.18},{...centre,opacity:1,offset:.5},{left:X+'px',top:Y+'px',width:W+'px',transform:homeT,opacity:1}],
   {duration:1700,easing:'cubic-bezier(.55,0,.25,1)',fill:'forwards'});
 fly.finished.then(()=>{
  h1.style.visibility=''; c.remove();
  if(token!==introToken||!stage.contains(sec)) return;
  sec.classList.remove('intro-hold'); bind();             // start the page's own animations/timers in sync with the reveal
  others.forEach(el=>{ el.animate([{opacity:0},{opacity:1}],{duration:650,easing:'ease-out'}).finished.then(()=>{el.style.opacity=''}); el.style.opacity='1'; });
 }).catch(()=>{});
 return true;
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function setPage(n){n=Math.max(0,Math.min(TOTAL-1,n)); if(n===state.page)return; playTransition(state.page,n)}
function selectedData(){return DATA.familyData[state.selectedFamily]}
function renderCover(){
 if(window.renderCoverV16) return window.renderCoverV16({state,families,meta,shortName,esc});
 return `<section class="page cover-page"><button data-nav="next">Start</button></section>`;
}
function renderFair(){
 const intro={
 'Data Science & Analytics':'I turn messy data into evidence people can act on.',
 'AI & Machine Learning':'I build and study systems that learn from data.',
 'Data Engineering & Architecture':'I design the pipelines and platforms data depends on.',
 'Software Engineering':'I turn ideas into reliable software people use.',
 'Systems, Cloud & Security':'I keep technical systems resilient, connected, and secure.',
 'Data & Technology Management':'I coordinate people, priorities, governance, and delivery.'};
 const cards=families.map(f=>`<button class="fellow-card ${f===state.selectedFamily?'selected':''}" data-family="${esc(f)}" style="--c:${careerColor(f)}"><img src="${avatarSrc(f)}" onerror="this.src='${rawAvatarSrc(f)}'" alt="${esc(meta[f].name)}"><div class="fellow-copy"><span class="meet">Meet ${esc(meta[f].name)}</span><strong>${esc(shortName[f])}</strong><small>${esc(intro[f])}</small></div></button>`).join('');
 return pageShell('Data Career Fair','Choose one fellow to guide the story',`<div class="fair-grid">${cards}</div>`);
}
function renderCareerIntro(){
 const f=state.selectedFamily,m=meta[f];
 const body=`<div class="intro-scene"><div class="intro-portrait"><img src="${avatarSrc(f)}" onerror="this.src='${rawAvatarSrc(f)}'" alt="${esc(m.name)}"></div><div class="intro-speech"><div class="scrap-label" style="background:${careerColor(f)}">You chose ${esc(shortName[f])}</div><br><br>“Every career has different paths to explore. <strong>Let’s see which responsibilities people in yours actually land on.</strong>”<div style="margin-top:24px;font-size:18px;color:#695e70">Next, we let the people in this career fall into piles by job title.</div></div></div>`;
 return pageShell('Meet your career guide','Rising insights begin here',body);
}
/* ---------- Page: What responsibility to land on? (falling paper fellows) ---------- */
// Every career gets 100 fellows, split across its 10 most common job titles in proportion to their salary records,
// so one fellow ≈ 1% of those titles and no raw counts are needed. Largest-remainder rounding keeps the total at
// exactly 100; a title too small to round to one fellow still gets one (taken from the biggest pile).
const PILE_TOTAL=100;
function pileCounts(roles){
 const tot=roles.reduce((s,r)=>s+(r.records||0),0)||1;
 const exact=roles.map(r=>(r.records||0)/tot*PILE_TOTAL), n=exact.map(Math.floor);
 const left=PILE_TOTAL-n.reduce((s,x)=>s+x,0);
 exact.map((x,i)=>({i,r:x-n[i]})).sort((a,b)=>b.r-a.r).slice(0,left).forEach(o=>n[o.i]++);
 n.forEach((x,i)=>{ if(x===0&&(roles[i].records||0)>0){ n[i]=1; n[n.indexOf(Math.max(...n))]--; } });
 return n;
}
const pileShare=(roles,i)=>{const tot=roles.reduce((s,r)=>s+(r.records||0),0)||1, p=(roles[i].records||0)/tot*100; return p<1?'under 1%':Math.round(p)+'%';};
function pileLayout(n){ // rows of 4 from the bottom up; the top row holds whatever is left, centred
 const out=[]; let left=n, row=0;
 while(left>0){ const cols=Math.min(4,left); for(let c=0;c<cols;c++) out.push({row,col:c,cols}); left-=cols; row++; }
 return out;
}
function fellowImg(key,rot){return `<img class="f1" src="assets/fellows/${key}-fall.webp" alt="" style="transform:rotate(${rot}deg)"><img class="f2" src="assets/fellows/${key}-land.webp" alt="">`}
function seeded(i){const x=Math.sin(i*9973.1)*10000;return x-Math.floor(x)}
function treeInfoHtml(role){
 const famButtons=families.map(f=>`<button data-tree-family="${esc(f)}" class="${f===state.selectedFamily?'active':''}">${esc(shortName[f])}</button>`).join('');
 return `<div class="px-side-title">${esc(role.title)}</div>${role.description?`<h3>About this role</h3><p class="role-intro">${esc(role.description)}</p>`:''}<h3>Key skills</h3><div class="role-skills">${role.skills.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div><h3>Compare another career</h3><div class="family-switch">${famButtons}</div>`;
}
function pilesHtml(){
 const roles=selectedData().roles.slice(0,10), counts=pileCounts(roles), key=meta[state.selectedFamily].key;
 let k=0;
 return roles.map((r,i)=>{
   const n=counts[i]; const rows=Math.ceil(n/4);
   let maxDelay=0, firstLand=9; const cells=pileLayout(n).map(c=>{const idx=k++; const x=(c.col-(c.cols-1)/2)*17+(seeded(idx)-.5)*3+(c.row%2?2:-2); const rot=(seeded(idx+7)-.5)*16; const delay=+(c.row*0.1+seeded(idx+3)*0.05).toFixed(2);   /* row by row, bottom first: jitter (<0.05s) is smaller than the row gap (0.1s), so nobody lands on thin air */ maxDelay=Math.max(maxDelay,delay); if(c.row===0) firstLand=Math.min(firstLand,delay);
     return `<span class="fellow" style="left:calc(50% + ${x.toFixed(1)}px);bottom:calc(${c.row} * var(--rstep,32px));--d:${delay}s">${fellowImg(key,rot.toFixed(1))}</span>`}).join('');
   const puff=`<span class="puff" style="--d:${(firstLand+0.75).toFixed(2)}s"><img src="assets/fellows/dust0.webp" alt=""><img src="assets/fellows/dust1.webp" alt=""><img src="assets/fellows/dust2.webp" alt=""></span>`;
   return `<button class="pile ${state.selectedRole===i?'active':''}" data-role="${i}" data-rows="${rows}" style="left:${6.5+i*9.7}%" aria-label="${esc(r.title)}: ${n} of 100 fellows, ${pileShare(roles,i)} of this career's top job titles"><span class="pile-stack">${cells}${puff}</span><span class="pile-label">${esc(r.title)}</span></button>`;
 }).join('');
}
function renderTree(){
 const fd=selectedData(); const roles=fd.roles.slice(0,10); const role=roles[state.selectedRole]||roles[0];
 return `<section class="page piles-page"><h1 class="px-title">What responsibility to land on?</h1><div class="piles-layout"><div class="piles-canvas" id="pilesCanvas"><div class="piles-ground"></div><div class="piles-note">EACH CAREER = 100 FELLOWS<br>1 FELLOW ≈ 1% OF ITS TOP 10 JOB TITLES</div>${pilesHtml()}</div><aside class="px-side" id="treeInfo">${treeInfoHtml(role)}</aside></div>${nav()}</section>`;
}
function fitPiles(){
 const cv=stage.querySelector('#pilesCanvas'); if(!cv) return;
 const H=cv.clientHeight, FELLOW=40, TOP=12, GROUND0=120, LABEL_ROOM=88, STEP0=32;
 // same ground for every career: size everything for the tallest pile across ALL careers
 const rows=Math.max(1,...families.map(f=>Math.max(...pileCounts(DATA.familyData[f].roles.slice(0,10)).map(n=>Math.ceil(n/4)))));
 const need=(rows-1)*STEP0+FELLOW;
 let ground=GROUND0, step=STEP0;
 if(H-ground-TOP<need) ground=Math.max(LABEL_ROOM, H-TOP-need);                         // 1) lower the line
 if(H-ground-TOP<need) step=Math.max(10,(H-ground-TOP-FELLOW)/Math.max(1,rows-1));      // 2) still too tall: stack a bit tighter
 cv.style.setProperty('--ground',ground+'px'); cv.style.setProperty('--rstep',step.toFixed(2)+'px');
}
function bindTreeFamilyButtons(){
 stage.querySelectorAll('[data-tree-family]').forEach(btn=>btn.addEventListener('click',()=>{state.selectedFamily=btn.dataset.treeFamily;state.selectedRole=0;state.compareFamily=null;render()}));
}
function updateTreeRole(i){
 const roles=selectedData().roles.slice(0,10); const role=roles[i]; if(!role)return; state.selectedRole=i;
 stage.querySelectorAll('[data-role]').forEach((b,j)=>b.classList.toggle('active',j===i));
 const info=stage.querySelector('#treeInfo'); if(!info)return;
 info.animate([{opacity:.55,transform:'translateX(8px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
 info.innerHTML=treeInfoHtml(role); bindTreeFamilyButtons();
}
function renderIndustryWelcome(){
 const f=state.selectedFamily,m=meta[f];
 const body=`<div class="chapter-scene"><div class="portrait"><img src="${avatarSrc(f)}" onerror="this.src='${rawAvatarSrc(f)}'" alt="${esc(m.name)}"></div><div class="chapter-copy">“Now that we’ve explored the different roles within your career, let’s take a step further.<br><br><strong>Your skills can travel across industries—and across the country.</strong>”<div class="mini-art"><i style="--r:-4deg"></i><i style="--r:3deg;background:#b7d6eb"></i><i style="--r:-1deg;background:#b5dbc7"></i></div></div></div>`;
 return pageShell('Where can your skills take you?','From role paths to industries and geography',body);
}
/* ---------- AI/ML geography crosswalk ----------
   BLS has no "machine learning engineer" occupation. O*NET's closest match for that title is
   15-2051 Data Scientists (whose SOC definition includes machine learning), so in the BLS state data
   applied ML/AI workers are counted inside Data Science. Our AI & ML series only covers 15-1221
   (computer & information research scientists, i.e. the research side).
   Fix: move a share ALPHA of every state's Data Science employment into AI & ML, where
   ALPHA = applied AI/ML salary records / (applied AI/ML records + Data Science records).
   Research-type AI titles are excluded from the numerator because BLS already counts them in 15-1221. */
const AI_FAM='AI & Machine Learning', DS_FAM='Data Science & Analytics';
const AI_RESEARCH_TITLES=new Set(['Research Scientist','Research Engineer','Research Analyst','Machine Learning Researcher']);
function adjustAiGeography(d){
 if(!d||!d.geography||d.meta?.aiGeoAdjust) return d;
 const ai=d.familyData[AI_FAM], ds=d.familyData[DS_FAM];
 const research=ai.roles.filter(r=>AI_RESEARCH_TITLES.has(r.title)).reduce((s,r)=>s+(r.records||0),0);
 const applied=ai.n-research, alpha=applied/(applied+ds.n);
 const aiRows=d.geography[AI_FAM]; let moved=0;
 d.geography[DS_FAM].forEach(r=>{
   if(r.employment==null) return;
   const mv=Math.round(r.employment*alpha); r.employment-=mv; moved+=mv;   // DS location quotient is unchanged by a uniform scale
   let a=aiRows.find(x=>x.state===r.state);
   if(!a){a={state:r.state,name:r.name,employment:0,wageIndicator:null,locationQuotient:null}; aiRows.push(a);}
   a.employment=(a.employment||0)+mv; a.locationQuotient=null;                  // AI LQ no longer valid after the merge
 });
 d.meta.aiGeoAdjust={alpha,applied,dsRecords:ds.n,moved};
 return d;
}
function stateMix(abbr){
 const rows=families.map(f=>{
   const r=DATA.geography[f].find(x=>x.state===abbr); return {family:f,employment:r?.employment??null,wage:r?.wageIndicator??null,lq:r?.locationQuotient??null};
 });
 const total=rows.reduce((s,r)=>s+(r.employment||0),0); rows.forEach(r=>r.share=r.employment==null?null:(total?100*r.employment/total:0)); return rows;
}
function stateName(abbr){return DATA.states.find(s=>s.abbr===abbr)?.name||abbr}
function mapSvg(){
 const paths=Object.entries(DATA.statePaths.paths).map(([abbr,d])=>`<path class="map-state ${abbr===state.selectedState?'selected':''}" data-state="${abbr}" d="${d}"><title>${esc(stateName(abbr))}</title></path>`).join('');
 return `<svg class="map-svg" viewBox="0 0 ${DATA.statePaths.width} ${DATA.statePaths.height}" aria-label="Interactive U.S. state map">${paths}</svg>`;
}
function stateMixPanelHtml(abbr){
 const mix=stateMix(abbr); const total=mix.reduce((sum,r)=>sum+(r.employment||0),0);
 const rows=mix.map(r=>`<div class="bar-row" data-mix-family="${esc(r.family)}"><div class="lab">${esc(shortName[r.family])}</div><div class="bar-track"><div class="bar-fill" style="--w:${r.share==null?0:r.share}%;--c:${careerColor(r.family)}"></div></div><div class="bar-val">${r.share==null?'N/A':r.share.toFixed(1)+'%'}</div></div>`).join('');
 return `<div class="map-mix-head"><span class="scrap-label">${esc(stateName(abbr))}</span><div><strong>Six-career employment mix</strong><small>Share of published employment across these six career families</small></div></div><div class="bar-list">${rows}</div><div class="state-summary">Published employment total used here: <strong>${total.toLocaleString()}</strong>. Missing family values stay N/A and are not treated as zero.</div>`;
}
function industryPanelHtml(){
 const inds=(DATA.industryMix[state.selectedFamily]||[]).slice(0,6); const maxI=Math.max(...inds.map(x=>x.share||0),1);
 const rows=inds.map(x=>`<div class="bar-row"><div class="lab">${esc(x.industry)}</div><div class="bar-track"><div class="bar-fill" style="--w:${100*(x.share||0)/maxI}%;--c:${careerColor(state.selectedFamily)}"></div></div><div class="bar-val">${x.share}%</div></div>`).join('');
 return `<div class="map-mix-head"><span class="scrap-label" style="background:${careerColor(state.selectedFamily)}">${esc(shortName[state.selectedFamily])}</span><div><strong>Major industries</strong><small>National representative-occupation industry shares</small></div></div><div class="bar-list">${rows}</div><div class="industry-note">State clicks do not fabricate a state × industry matrix; use “State career mix” for the six-family percentages inside a selected state.</div>`;
}
/* ---------- Page: What place to land on? (fellows fall onto a choropleth map) ---------- */
function stateShares(){ // share of national employment for the selected family, by state
 const rows=DATA.geography[state.selectedFamily]||[]; const total=rows.reduce((s,r)=>s+(r.employment||0),0)||1;
 const m={}; rows.forEach(r=>{m[r.state]=(r.employment||0)/total}); return {m,total};
}
function hexToRgb(h){const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}
function mixHex(a,b,t){const A=hexToRgb(a),B=hexToRgb(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')}
function shareBucket(share,max){ if(share==null) return -1; const t=share/max; return t<.05?0:t<.15?1:t<.35?2:t<.65?3:4; } // 5 quantized steps
function placeFill(bucket){ const c=careerColor(state.selectedFamily); if(bucket<0) return '#ececea'; return mixHex('#ffffff',mixHex(c,'#2b2140',.25),[.12,.32,.55,.78,1][bucket]); }
function placeMapSvg(){
 const {m}=stateShares(); const max=Math.max(...Object.values(m),0.0001);
 const paths=Object.entries(DATA.statePaths.paths).map(([abbr,d])=>{const b=shareBucket(m[abbr],max);return `<path class="map-state ${abbr===state.selectedState?'selected':''}" data-state="${abbr}" data-bucket="${b}" style="--c:${placeFill(b)}" d="${d}"><title>${esc(stateName(abbr))}${m[abbr]!=null?' · '+(m[abbr]*100).toFixed(1)+'% of '+shortName[state.selectedFamily]:''}</title></path>`}).join('');
 const hatch=`<defs><pattern id="selHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="5" fill="#2b2140" opacity=".6"/></pattern></defs>`;
 const sel=DATA.statePaths.paths[state.selectedState]||'';   // selected state = data colour + dark hatching on top (works with every career palette)
 return `<svg class="map-svg place-map" viewBox="0 0 ${DATA.statePaths.width} ${DATA.statePaths.height}" aria-label="U.S. map coloured by where ${esc(shortName[state.selectedFamily])} jobs are">${hatch}${paths}<path class="sel-overlay" id="selOverlay" d="${sel}"/></svg>`;
}
function placeLegend(){
 const c=careerColor(state.selectedFamily);
 return `<div class="place-legend"><span>fewer</span>${[0,1,2,3,4].map(b=>`<i style="background:${placeFill(b)}"></i>`).join('')}<span>more ${esc(shortName[state.selectedFamily])} jobs</span></div>${geoAdjustNote()}`;
}
function geoAdjustNote(){
 const g=DATA.meta.aiGeoAdjust; if(!g) return '';
 return `<div class="place-note">* BLS counts ML engineers as Data Scientists (15-2051). AI&nbsp;&amp;&nbsp;ML here = research scientists (15-1221) + an estimated ${Math.round(g.alpha*100)}% of each state's Data Science jobs, based on our salary sample's role mix.</div>`;
}
function piePanelHtml(abbr){
 const mix=stateMix(abbr).filter(r=>r.employment!=null); const total=mix.reduce((s,r)=>s+r.employment,0)||1;
 const {m}=stateShares(); const natShare=m[abbr];
 const ranked=Object.entries(m).filter(([,v])=>v!=null).sort((x,y)=>y[1]-x[1]); const rank=ranked.findIndex(([a])=>a===abbr)+1;
 const R=80,cx=100,cy=100; let a0=-Math.PI/2; let slices='';
 mix.forEach(r=>{const frac=r.employment/total; const a1=a0+frac*Math.PI*2; const sel=r.family===state.selectedFamily;
   const mid=(a0+a1)/2, off=sel&&frac<.999?9:0, ox=off*Math.cos(mid), oy=off*Math.sin(mid);           // pull the selected slice out
   const x0=cx+R*Math.cos(a0),y0=cy+R*Math.sin(a0),x1=cx+R*Math.cos(a1),y1=cy+R*Math.sin(a1); const big=frac>.5?1:0;
   const d=frac>=.999?`M${cx-R} ${cy}A${R} ${R} 0 1 1 ${cx+R} ${cy}A${R} ${R} 0 1 1 ${cx-R} ${cy}Z`:`M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
   slices+=`<path d="${d}" transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)})" fill="${careerColor(r.family)}" stroke="#2b2140" stroke-width="${sel?4:2}" ${sel?'class="pie-sel"':''}><title>${esc(shortName[r.family])}: ${(frac*100).toFixed(1)}%</title></path>`; a0=a1;});
 const selRow=mix.find(r=>r.family===state.selectedFamily); const pct=selRow?(selRow.employment/total*100):null;
 const legend=[...mix].sort((x,y)=>y.employment-x.employment).map(r=>`<div class="pie-row ${r.family===state.selectedFamily?'sel':''}"><i style="background:${careerColor(r.family)}"></i><span>${esc(shortName[r.family])}</span><b>${(r.employment/total*100).toFixed(0)}%</b></div>`).join('');
 return `<div class="px-side-title">${esc(stateName(abbr))}</div>
 <div class="place-stat">${pct==null?`<b>No report</b> for ${esc(shortName[state.selectedFamily])} jobs in ${esc(stateName(abbr))}`:`<b>${pct.toFixed(0)}%</b> of ${esc(stateName(abbr))}'s six-career jobs are <b>${esc(shortName[state.selectedFamily])}</b>`}</div>
 <svg class="place-pie" viewBox="-12 -12 224 224">${slices}</svg>
 <div class="pie-legend">${legend}</div>
 <div class="place-stat small">${natShare==null?'No report for this state.':`<b>${(natShare*100).toFixed(1)}%</b> of all U.S. ${esc(shortName[state.selectedFamily])} jobs are here${rank?` · <b>#${rank}</b> of ${ranked.length} states`:''}`}</div>`;
}
function renderMap(){
 return `<section class="page piles-page place-page"><h1 class="px-title">What place to land on?</h1><div class="piles-layout"><div class="place-canvas" id="placeCanvas">${placeMapSvg()}${placeLegend()}<div class="place-fellows" id="placeFellows"></div></div><div class="place-right"><aside class="px-side" id="placeInfo">${piePanelHtml(state.selectedState)}</aside><aside class="px-side px-mini"><h3>Switch career</h3><div class="family-switch">${families.map(f=>`<button data-place-family="${esc(f)}" class="${f===state.selectedFamily?'active':''}">${esc(shortName[f])}</button>`).join('')}</div></aside></div></div>${nav()}</section>`;
}
function updateMapState(abbr){
 state.selectedState=abbr;
 stage.querySelectorAll('.map-state').forEach(p=>p.classList.toggle('selected',p.dataset.state===abbr));
 const ov=stage.querySelector('#selOverlay'); if(ov) ov.setAttribute('d',DATA.statePaths.paths[abbr]||'');
 const t=stage.querySelector('#placeInfo'); if(t){t.innerHTML=piePanelHtml(abbr); t.animate([{opacity:.4},{opacity:1}],{duration:220});}
}
function updateMapMode(){}
function bindPlaceFall(){
 const canvas=stage.querySelector('#placeCanvas'); if(!canvas) return;
 const svg=canvas.querySelector('svg'); const layer=canvas.querySelector('#placeFellows'); const key=meta[state.selectedFamily].key;
 const {m}=stateShares(); const entries=Object.entries(m).filter(([a])=>DATA.statePaths.paths[a]); const sum=entries.reduce((s,[,v])=>s+v,0)||1;
 const pick=()=>{let r=Math.random()*sum; for(const [a,v] of entries){r-=v; if(r<=0) return a;} return entries[0][0];};
 const vb=svg.viewBox.baseVal; const W=vb.width,H=vb.height;
 const order=Object.keys(DATA.statePaths.paths).sort(()=>Math.random()-.5); const N=order.length; let html='';
 order.forEach((abbr,i)=>{const p=svg.querySelector(`[data-state="${abbr}"]`); if(!p) return; const bb=p.getBBox(); const x=(bb.x+bb.width/2)/W*100, y=(bb.y+bb.height/2)/H*100; const d=(i*0.03).toFixed(2);
   html+=`<span class="fellow drop" data-target="${abbr}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--d:${d}s"><img class="f1" src="assets/fellows/${key}-fall.webp" alt=""><img class="f2" src="assets/fellows/${key}-land.webp" alt=""><img class="pf" src="assets/fellows/dust1.webp" alt=""></span>`;});
 layer.innerHTML=html;
 // states light up as fellows land
 layer.querySelectorAll('.fellow').forEach(f=>{const delay=parseFloat(f.style.getPropertyValue('--d'))*1000+780; setTimeout(()=>{const p=svg.querySelector(`[data-state="${f.dataset.target}"]`); if(p){p.classList.add('lit');}},delay);});
 setTimeout(()=>{svg.classList.add("all-lit")}, N*30+1600);
 setTimeout(()=>{ if(document.body.contains(layer)) layer.innerHTML=""; }, N*30+2400);   // clear the fellows once all have landed and faded
}

/* ---------- Page: What salary to land on? (coin mini-game) ---------- */
function salaryPercentile(f,v){const h=DATA.familyData[f].hist; const n=DATA.familyData[f].n||h.reduce((s,b)=>s+b.count,0); let below=0; for(const b of h){ if(v>=b.hi) below+=b.count; else if(v>b.lo){ below+=b.count*(v-b.lo)/(b.hi-b.lo); break;} else break;} return Math.max(0,Math.min(100,100*below/n));}
function renderSalaryGame(){
 const f=state.selectedFamily, key=meta[f].key;
 // Full-width game area. The controls are shown right around the fellow after it lands, and fade away once it moves.
 const hints=`<div class="game-hints" id="gameHints" aria-hidden="true"><span class="gh gh-up"><kbd>↑</kbd> or <kbd>space</kbd> jump</span><span class="gh gh-left"><kbd>←</kbd></span><span class="gh gh-right"><kbd>→</kbd> run</span></div><div class="gh gh-coin" id="gameCoinHint" aria-hidden="true">grab the coin!</div>`;
 return `<section class="page piles-page game-page"><h1 class="px-title">What salary to land on?</h1><div class="piles-layout game-layout"><div class="game-canvas" id="gameCanvas" aria-label="${esc(meta[f].name)}'s turn: use the left and right arrow keys to run, up arrow or space to jump, and grab the coin."><div class="game-ground"></div><div class="game-coin" id="gameCoin"><img src="assets/fellows/coin0.webp" alt="coin"></div><div class="game-hero" id="gameHero"><img src="assets/fellows/${key}-fall.webp" alt=""></div>${hints}<div class="game-spark" id="gameSpark" hidden></div>
 <div class="game-modal" id="gameModal" hidden><div class="game-box"><div class="game-q">How much do you want to earn a year?</div><div class="game-input"><span>$</span><input id="gameSalary" type="text" inputmode="numeric" placeholder="120,000" autocomplete="off"></div><div class="game-presets">${[80000,120000,160000,200000,300000].map(v=>`<button data-preset="${v}">${money(v)}</button>`).join('')}</div><button class="game-go" id="gameGo">Lock it in →</button></div></div></div></div>${nav()}</section>`;
}
function bindSalaryGame(){
 const root=stage.querySelector('.game-page'); if(!root) return;
 const canvas=root.querySelector('#gameCanvas'), hero=root.querySelector('#gameHero'), heroImg=hero.querySelector('img'), coin=root.querySelector('#gameCoin'), coinImg=coin.querySelector('img'), spark=root.querySelector('#gameSpark'), modal=root.querySelector('#gameModal'), input=root.querySelector('#gameSalary');
 const key=meta[state.selectedFamily].key; const src=fr=>`assets/fellows/${key}-${fr}.webp`;
 ['idle','run1','run2','run3','jump','land2','fall'].forEach(fr=>{const i=new Image(); i.src=src(fr)});
 let W=canvas.clientWidth, H=canvas.clientHeight; const GROUND=120, SZ=96;
 const g={x:170,y:-200,vx:0,vy:0,onGround:false,facing:1,t:0,alive:true,caught:false,frame:'fall'};
 const keys={};
 const coinX=W*0.52, coinY=H-GROUND-140; coin.style.left=coinX+'px'; coin.style.top=coinY+'px';
 const hintsEl=root.querySelector('#gameHints'), coinHint=root.querySelector('#gameCoinHint'); coinHint.style.left=coinX+'px'; coinHint.style.top=(coinY-52)+'px';
 let hintsShown=false, hintsGone=false;
 const showHints=()=>{ if(hintsShown||hintsGone) return; hintsShown=true; hintsEl.style.left=g.x+'px'; hintsEl.style.top=g.y+'px'; hintsEl.classList.add('show'); coinHint.classList.add('show'); };
 const hideHints=()=>{ if(hintsGone) return; hintsGone=true; hintsEl.classList.remove('show'); coinHint.classList.remove('show'); hintsEl.classList.add('gone'); coinHint.classList.add('gone'); };
 let coinF=0, coinT=0;
 const setFrame=fr=>{ if(g.frame!==fr){g.frame=fr; heroImg.src=src(fr);} };
 const onKey=e=>{ if(!document.body.contains(root)){window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onKey);return;} if(!modal.hidden) return; if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)){e.preventDefault(); keys[e.key]=e.type==='keydown'; if(e.type==='keydown'){ hideHints(); if(e.key==='ArrowUp'||e.key===' ') g.wantJump=true; } } };
 window.addEventListener('keydown',onKey); window.addEventListener('keyup',onKey);
 function catchCoin(){ g.caught=true; coin.hidden=true; spark.hidden=false; spark.style.left=coinX+'px'; spark.style.top=coinY+'px'; let i=0; spark.innerHTML=`<img src="assets/fellows/spark0.webp" alt="">`; const sp=setInterval(()=>{i++; if(i>3){clearInterval(sp); spark.hidden=true; return;} spark.firstChild.src=`assets/fellows/spark${i}.webp`;},70);
   setTimeout(()=>{ canvas.classList.add('frozen'); modal.hidden=false; input.value=''; input.focus(); },260); }
 let last=performance.now();
 function loop(now){ if(!document.body.contains(root)) return; const dt=Math.min(32,now-last)/16.67; last=now; W=canvas.clientWidth; H=canvas.clientHeight; const floor=H-GROUND-SZ;
   if(!canvas.classList.contains('frozen')){
     coinT+=dt; if(coinT>5){coinT=0; coinF=(coinF+1)%6; coinImg.src=`assets/fellows/coin${coinF}.webp`;} coin.style.transform=`translate(-50%,-50%) translateY(${Math.sin(now/400)*6}px)`;
     if(g.caught){g.vx*=0.85;} else if(keys.ArrowLeft){g.vx=-5;g.facing=-1} else if(keys.ArrowRight){g.vx=5;g.facing=1} else g.vx*=0.7;
     if(g.wantJump){ if(g.onGround){g.vy=-17;g.onGround=false;} g.wantJump=false; }
     g.vy+=0.8*dt; g.x+=g.vx*dt; g.y+=g.vy*dt; g.x=Math.max(10,Math.min(W-SZ-10,g.x));
     if(g.y>=floor){ if(!g.onGround&&g.vy>6){setFrame('land2'); g.t=8;} g.y=floor; g.vy=0; if(!g.onGround&&g.exitOnLand){g.exitOnLand=false; setTimeout(()=>{ if(document.body.contains(root)){ playTransition(state.page,state.page+1); } },260);} g.onGround=true; showHints(); }
     if(!g.onGround) setFrame(g.vy<0?'jump':'fall'); else if(g.t>0){g.t-=dt;} else if(Math.abs(g.vx)>0.6){ setFrame(['run1','run2','run3'][Math.floor(now/110)%3]); } else setFrame('idle');
     hero.style.transform=`translate(${g.x}px,${g.y}px) scaleX(${g.facing})`;
     if(!g.caught){ const cx=g.x+SZ/2, cy=g.y+SZ/2; if(Math.hypot(cx-coinX,cy-coinY)<56) catchCoin(); }
   }
   requestAnimationFrame(loop); }
 requestAnimationFrame(loop);
 const commit=()=>{ const v=parseInt(String(input.value).replace(/[^0-9]/g,''),10); if(!v||v<10000){input.classList.add('bad'); setTimeout(()=>input.classList.remove('bad'),400); return;} state.targetSalary=v;
   modal.hidden=true; canvas.classList.remove('frozen'); keys.ArrowLeft=keys.ArrowRight=false; if(g.onGround){ setTimeout(()=>{ if(document.body.contains(root)){ playTransition(state.page,state.page+1); } },300);} else g.exitOnLand=true;
   /* (side panel removed) */ };
 root.querySelector('#gameGo').addEventListener('click',commit);
 input.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();commit();} e.stopPropagation(); });
 input.addEventListener('input',()=>{ const v=input.value.replace(/[^0-9]/g,''); input.value=v?Number(v).toLocaleString():''; });
 root.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{input.value=Number(b.dataset.preset).toLocaleString(); input.focus();}));
 const rs=root.querySelector('[data-game-reset]'); if(rs) rs.addEventListener('click',()=>{state.targetSalary=null; render();});
}

function renderPayIntro(){
 const f=state.selectedFamily;
 const body=`<div class="paycheck-scene"><div class="paycheck"><div class="rule"></div><div>Career: <strong>${esc(shortName[f])}</strong></div><div class="rule"></div><div>Question: what does the salary distribution really look like?</div><div class="amt">$$$</div></div><div class="paycheck-copy">“We’ve explored what you can do and where your career can take you.<br><br><strong>But there’s one big question left… how much could you actually earn?</strong>”</div></div>`;
 return pageShell('The salary chapter begins','Climax — compensation',body);
}
function quartileSvg(){
 const W=1220,H=520,ml=240,mr=65,mt=32,mb=55; const min=40000,max=320000; const x=v=>ml+(v-min)/(max-min)*(W-ml-mr);
 let s=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}" aria-label="Quartile salary range chart">`;
 for(let v=50000;v<=300000;v+=50000){const xx=x(v);s+=`<line class="gridline" x1="${xx}" y1="${mt}" x2="${xx}" y2="${H-mb}"/><text class="axis-value" x="${xx}" y="${H-22}" text-anchor="middle">${money(v)}</text>`}
 families.forEach((f,i)=>{const d=DATA.familyData[f], y=72+i*68; const c=careerColor(f); s+=`<text x="${ml-18}" y="${y+5}" text-anchor="end" font-size="15" font-weight="900" fill="#2d2336">${esc(shortName[f])}</text><line x1="${x(d.q1)}" y1="${y}" x2="${x(d.q3)}" y2="${y}" stroke="${c}" stroke-width="18" stroke-linecap="round"/><line x1="${x(d.p10)}" y1="${y}" x2="${x(d.p90)}" y2="${y}" stroke="#53465b" stroke-width="2"/><circle cx="${x(d.median)}" cy="${y}" r="8" fill="#2e2140" stroke="#fff" stroke-width="3"><title>${esc(f)} — Q1 ${money(d.q1)}, median ${money(d.median)}, Q3 ${money(d.q3)}, n=${d.n.toLocaleString()}</title></circle>`});
 s+=`<line class="axis" x1="${ml}" y1="${H-mb}" x2="${W-mr}" y2="${H-mb}"/><text x="${(ml+W-mr)/2}" y="${H-5}" text-anchor="middle" font-size="13" font-weight="900">Annual salary (USD)</text></svg>`; return s;
}
/* ---------- Page: the salary mountains (streamgraph of six careers) ---------- */
/* ---------- Page: Which mountain do you land on? — six salary mountains in rows (ridgeline) ----------
   The career you are looking at is the front mountain; picking another career brings its mountain to the front. */
const RIDGE={lo:20000,hi:420000,W:1200,H:700,padL:310,padR:40,front:600,step:72,peak:175};
function ridgeSeries(){ // smoothed share-of-family density per bin, so every career has visible mass
 const bins=DATA.familyData[families[0]].hist.map(b=>b.lo);
 return families.map(f=>{const h=DATA.familyData[f].hist; const n=h.reduce((s,b)=>s+b.count,0)||1; const raw=h.map(b=>b.count/n); const sm=raw.map((v,i)=>{const a=raw[i-1]??v,b=raw[i+1]??v;return (a+2*v+b)/4}); return {f,bins,v:sm};});
}
function ridgeX(v){const {lo,hi,W,padL,padR}=RIDGE; return padL+(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(W-padL-padR)}
function ridgePath(xs,ya,yb){ // smooth closed area between ya (bottom) and yb (top)
 const sm=(arr)=>{let d='';arr.forEach((y,i)=>{const x=xs[i]; if(i===0){d+=`M${x} ${y}`;return;} const px=xs[i-1],py=arr[i-1]; const cx=(px+x)/2; d+=` C${cx} ${py} ${cx} ${y} ${x} ${y}`;}); return d;};
 const topP=sm(yb); const bot=[...ya].reverse(); const xr=[...xs].reverse(); let d=topP+` L${xr[0]} ${bot[0]}`; bot.forEach((y,i)=>{ if(i===0)return; const px=xr[i-1],py=bot[i-1],x=xr[i]; const cx=(px+x)/2; d+=` C${cx} ${py} ${cx} ${y} ${x} ${y}`;}); return d+' Z';
}
function ridgeModel(){ // one shared scale for all six mountains (fair comparison)
 const S=families.map(f=>{const h=DATA.familyData[f].hist; const n=h.reduce((s,b)=>s+b.count,0)||1; return {f,bins:h.map(b=>b.lo),v:h.map(b=>b.count/n)};});   // raw shares, no smoothing
 const maxV=Math.max(...S.flatMap(r=>r.v)); const scale=RIDGE.peak/maxV; const binW=20000;
 const xs=S[0].bins.map(b=>ridgeX(b+binW/2));
 return {S,xs,scale,ys:S.map(r=>r.v.map(v=>-v*scale))};   // ys are relative to each row's own baseline (0)
}
function ridgeSlots(selIdx){ // slot 0 = front. The others keep their usual order behind it.
 const order=[selIdx,...families.map((_,i)=>i).filter(i=>i!==selIdx)]; const slot={}; order.forEach((i,s)=>slot[i]=s); return slot;
}
function ridgeBase(slot){ return RIDGE.front-slot*RIDGE.step; }
function ridgeTopAt(model,i,x){ const {xs}=model, ys=model.ys[i]; const j=xs.findIndex(v=>v>=x); if(j===0) return ys[0]; if(j<0) return ys[ys.length-1]; const t=(x-xs[j-1])/(xs[j]-xs[j-1]); return ys[j-1]+(ys[j]-ys[j-1])*t; }
function ridgeRowHtml(model,i,slot,sel,sal){
 const f=families[i], c=careerColor(f), base=ridgeBase(slot); const xs=model.xs, ys=model.ys[i], n=xs.length;
 const mx=ridgeX(DATA.familyData[f].median);
 // sharp ridgeline: straight segments between the salary bins (same data, mountain-like silhouette)
 const x0=ridgeX(RIDGE.lo), x1=ridgeX(RIDGE.hi);
 const d=`M${x0.toFixed(1)} 0 `+xs.map((x,j)=>`L${x.toFixed(1)} ${ys[j].toFixed(1)}`).join(' ')+` L${x1.toFixed(1)} 0 Z`;
 let pk=0; ys.forEach((y,j)=>{ if(y<ys[pk]) pk=j; }); const px=xs[pk], py=ys[pk];
 // snow cap: the top ~22% of this mountain, with a jagged lower edge
 const snowY=py*0.80; let zig=''; for(let x=x1+12, k=0; x>=x0-12; x-=11, k++) zig+=` L${x.toFixed(1)} ${(snowY+(k%2?6:-3)).toFixed(1)}`;
 const snow=`M${x0-12} ${py-12} L${x1+12} ${py-12}${zig} Z`;
 const shade=`M${px.toFixed(1)} ${(py-14).toFixed(1)} L${RIDGE.W} ${(py-14).toFixed(1)} L${RIDGE.W} 2 L${(px-py*0.55).toFixed(1)} 2 Z`;   // shadow face: right of a slope running from the summit down to the right
 const cid=`rclip${i}`;
 return `<g class="rrow ${sel?'sel':''}" data-ridge="${i}" data-slot="${slot}" style="transform:translateY(${base}px);--c:${c};--cd:${mixHex(c,'#2b2140',.45)}">
  <clipPath id="${cid}"><path d="${d}"/></clipPath>
  <path class="rfill" d="${d}"><title>${esc(shortName[f])} · median ${money(DATA.familyData[f].median)}</title></path>
  <g clip-path="url(#${cid})" pointer-events="none"><path class="rshade" d="${shade}"/><path class="rsnow" d="${snow}"/></g>
  <path class="rline" d="${d}"/>
  <line class="rbase" x1="${RIDGE.padL}" y1="0" x2="${RIDGE.W-RIDGE.padR}" y2="0"/>
  <text class="rname" x="${RIDGE.padL-16}" y="-24" text-anchor="end">${esc(shortName[f])}</text>
  <text class="rpct" x="${RIDGE.padL-16}" y="-5" text-anchor="end">you beat ${salaryPercentile(f,sal).toFixed(0)}%</text>
  <polygon class="rmed" points="${mx-6},0 ${mx+6},0 ${mx},-10"/><text class="rmedlbl" x="${mx-10}" y="-8" text-anchor="end">median ${money(DATA.familyData[f].median)}</text>
 </g>`;
}
function ridgeSideHtml(f,sal){
 return `<div class="px-side-title" id="ridgeTitle">${esc(shortName[f])}</div>
 <div class="game-stat small" id="ridgeHover">Drag the dashed line to change your salary. Click a mountain to bring it to the front.</div>
 <h3>Switch career</h3><div class="family-switch">${families.map(ff=>`<button data-ridge-family="${esc(ff)}" class="${ff===f?'active':''}">${esc(shortName[ff])}</button>`).join('')}</div>`;
}
function renderQuartiles(){
 const f=state.selectedFamily, k=families.indexOf(f), key=meta[f].key; const sal=state.targetSalary??DATA.familyData[f].median;
 const model=ridgeModel(); const slot=ridgeSlots(k); const {W,H,front}=RIDGE;
 const rows=families.map((_,i)=>i).sort((a,b)=>slot[b]-slot[a]).map(i=>ridgeRowHtml(model,i,slot[i],i===k,sal)).join('');   // back rows first, front row painted last
 const ticks=[50000,100000,150000,200000,250000,300000,350000,400000].map(v=>`<line x1="${ridgeX(v)}" y1="${front+6}" x2="${ridgeX(v)}" y2="${front+14}" stroke="#2b2140" stroke-width="3"/><text x="${ridgeX(v)}" y="${front+38}" text-anchor="middle">${money(v)}</text>`).join('');
 const x=ridgeX(sal), y=front+ridgeTopAt(model,k,x); const lineTop=ridgeBase(families.length-1)-RIDGE.peak-6;
 return `<section class="page piles-page ridge-page"><h1 class="px-title">Which mountain do you land on?</h1><div class="piles-layout"><div class="ridge-canvas" id="ridgeCanvas"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" id="ridgeSvg">${ticks}<text x="${W-RIDGE.padR}" y="${front+66}" text-anchor="end" class="lbl">ANNUAL SALARY · 2024 U.S. SAMPLE</text>
 <g id="ridgeRows">${rows}</g>
 <foreignObject class="rb-slot" x="10" y="8" width="${RIDGE.padL-50}" height="190"><div xmlns="http://www.w3.org/1999/xhtml" class="ridge-banner rb-fixed" id="ridgeBanner" hidden><div class="rb-top">★ RESULT ★</div><div class="rb-sal" id="rbSal">${money(sal)}</div><div class="rb-line">YOU OUT-EARN</div><div class="rb-pct" id="rbPct">${salaryPercentile(f,sal).toFixed(0)}%</div><div class="rb-line">OF <span id="rbFam">${esc(shortName[f]).toUpperCase()}</span></div></div></foreignObject>
 <g class="ridge-dragger" id="ridgeDrag" opacity="0" transform="translate(${x},0)"><line x1="0" y1="${lineTop}" x2="0" y2="${front}" stroke="#2b2140" stroke-width="2" stroke-dasharray="4 6"/><rect x="-14" y="${lineTop}" width="28" height="${front-lineTop}" fill="transparent"/><rect class="ridge-knob" x="-10" y="${front-10}" width="20" height="20" fill="#f2c84b" stroke="#2b2140" stroke-width="3"/></g>
 <image class="ridge-hero" id="ridgeHero" href="assets/fellows/${key}-fall.webp" x="${x-36}" y="-90" width="72" height="72" data-y="${y}"/>
 <text class="ridge-tag" id="ridgeTag" x="${x}" y="${lineTop-10}" text-anchor="middle" opacity="0">${money(sal)}</text></svg></div><aside class="px-side ridge-side" id="ridgeInfo">${ridgeSideHtml(f,sal)}</aside></div>${nav()}</section>`;
}
function bindRidge(){
 const root=stage.querySelector('.ridge-page'); if(!root) return; const svg=root.querySelector('#ridgeSvg'), rowsG=svg.querySelector('#ridgeRows');
 const hero=root.querySelector('#ridgeHero'), drag=svg.querySelector('#ridgeDrag'), tag=svg.querySelector('#ridgeTag'), banner=root.querySelector('#ridgeBanner'), hov=root.querySelector('#ridgeHover');
 const model=ridgeModel(); const rowEl=i=>rowsG.querySelector(`.rrow[data-ridge="${i}"]`);
 let curSal=state.targetSalary??DATA.familyData[state.selectedFamily].median;   // stays put when you switch career
 const sal=()=>curSal;
 const defaultHint='Drag the dashed line to change your salary. Click a mountain to bring it to the front.';
 // the fellow drops onto the front mountain at your salary, then slides down and fades
 function dropHero(){
  const k=families.indexOf(state.selectedFamily), key=meta[state.selectedFamily].key, x=ridgeX(sal()), y=RIDGE.front+ridgeTopAt(model,k,x);
  hero.getAnimations().forEach(a=>a.cancel()); hero.style.display=''; hero.setAttribute('x',x-36); hero.setAttribute('href',`assets/fellows/${key}-fall.webp`);
  const a1=hero.animate([{transform:'translateY(0)',opacity:1},{transform:`translateY(${y-72+90}px)`,opacity:1}],{duration:650,easing:'cubic-bezier(.4,.7,.5,1.15)',fill:'forwards'});
  a1.onfinish=()=>{ hero.setAttribute('href',`assets/fellows/${key}-land2.webp`); drag.setAttribute('opacity','1'); tag.setAttribute('opacity','1'); banner.hidden=false;
   setTimeout(()=>{ if(!hero.isConnected||a1.playState!=='finished') return; hero.setAttribute('href',`assets/fellows/${key}-fall.webp`); const a2=hero.animate([{transform:`translateY(${y-72+90}px)`,opacity:1},{transform:`translateY(${y-72+90+RIDGE.peak/3}px)`,opacity:0}],{duration:520,easing:'ease-in',fill:'forwards'}); a2.onfinish=()=>{hero.style.display='none'}; },500); };
 }
 function refreshNumbers(){
  const v=sal(), x=ridgeX(v); drag.setAttribute('transform',`translate(${x},0)`); tag.setAttribute('x',x); tag.textContent=money(v);
  families.forEach((ff,i)=>{const t=rowEl(i).querySelector('.rpct'); t.textContent='you beat '+salaryPercentile(ff,v).toFixed(0)+'%';});
  root.querySelector('#rbSal').textContent=money(v); root.querySelector('#rbPct').textContent=salaryPercentile(state.selectedFamily,v).toFixed(0)+'%'; root.querySelector('#rbFam').textContent=shortName[state.selectedFamily].toUpperCase();
 }
 // bring a career's mountain to the front: rows glide to their new slots (FLIP), the chosen one is painted on top
 function bringFront(i){
  const f=families[i]; if(f===state.selectedFamily) return;
  state.selectedFamily=f; state.flowerFamily=f; state.waterfallFamily=f; state.futureFamily=f; state.compareFamily=null;   // this page only; the next page resets to the cover choice
  const slot=ridgeSlots(i);
  families.forEach((_,j)=>{ const el=rowEl(j); const from=ridgeBase(+el.dataset.slot), to=ridgeBase(slot[j]);
    el.dataset.slot=slot[j]; el.classList.toggle('sel',j===i); el.style.transform=`translateY(${to}px)`;
    if(from!==to) el.animate([{transform:`translateY(${from}px)`},{transform:`translateY(${to}px)`}],{duration:650,easing:'cubic-bezier(.5,0,.2,1)'}); });
  families.map((_,j)=>j).sort((a,b)=>slot[b]-slot[a]).forEach(j=>rowsG.appendChild(rowEl(j)));   // paint order: front last
  root.querySelector('#ridgeTitle').textContent=shortName[f];
  root.querySelectorAll('[data-ridge-family]').forEach(b=>b.classList.toggle('active',b.dataset.ridgeFamily===f));
  refreshNumbers(); setTimeout(dropHero,450);
 }
 rowsG.querySelectorAll('.rrow').forEach(r=>{ const i=+r.dataset.ridge, ff=families[i];
  r.addEventListener('click',e=>{e.stopPropagation(); bringFront(i);});
  r.addEventListener('mouseenter',()=>{ r.classList.add('hov'); hov.innerHTML=`<b>${esc(shortName[ff])}</b> · median ${money(DATA.familyData[ff].median)} · ${money(sal())} out-earns <b>${salaryPercentile(ff,sal()).toFixed(0)}%</b> of them`; });
  r.addEventListener('mouseleave',()=>{ r.classList.remove('hov'); hov.textContent=defaultHint; }); });
 root.querySelectorAll('[data-ridge-family]').forEach(b=>b.addEventListener('click',()=>bringFront(families.indexOf(b.dataset.ridgeFamily))));
 // drag the salary line
 let dragging=false;
 const toSvgX=ev=>{const pt=svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()).x;};
 const setSal=v=>{ curSal=state.targetSalary=Math.round(Math.max(RIDGE.lo,Math.min(RIDGE.hi,v))/1000)*1000; refreshNumbers(); };
 drag.addEventListener('pointerdown',e=>{dragging=true; drag.setPointerCapture(e.pointerId); e.stopPropagation();});
 drag.addEventListener('pointermove',e=>{ if(!dragging) return; const {lo,hi,W,padL,padR}=RIDGE; setSal(lo+(toSvgX(e)-padL)/(W-padL-padR)*(hi-lo)); });
 drag.addEventListener('pointerup',()=>{dragging=false;}); drag.addEventListener('click',e=>e.stopPropagation());
 dropHero();
}
function globalKdeMax(){let m=0;families.forEach(f=>DATA.familyData[f].kde.forEach(p=>m=Math.max(m,p.density)));return m||1}
function flowerPetalPath(f,cx,cy,angle){
 const kd=DATA.familyData[f].kde, maxD=globalKdeMax(); const minS=20000,maxS=800000; const ptsL=[],ptsR=[]; const a=angle-Math.PI/2, ux=Math.cos(a), uy=Math.sin(a), px=-uy, py=ux;
 kd.forEach((p,idx)=>{const t=(p.salary-minS)/(maxS-minS), r=44+t*245; const taper=Math.sin(Math.PI*Math.max(0,Math.min(1,t))); const half=Math.pow(p.density/maxD,.56)*55*taper; const bx=cx+ux*r, by=cy+uy*r; ptsL.push([bx+px*half,by+py*half]); ptsR.push([bx-px*half,by-py*half]);});
 const all=ptsL.concat(ptsR.reverse()); return all.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ')+' Z';
}
function flowerSvg(){
 const W=720,H=600,cx=360,cy=310,minS=20000,maxS=800000; let s=`<svg class="flower-svg" viewBox="0 0 ${W} ${H}" aria-label="Interactive salary flower">`;
 for(let sal=100000;sal<=800000;sal+=100000){const r=44+(sal-minS)/(maxS-minS)*245; s+=`<circle class="salary-ring" cx="${cx}" cy="${cy}" r="${r}"/><text class="salary-ring-label" x="${cx+r+5}" y="${cy-4}">${money(sal)}</text>`}
 families.forEach((f,i)=>{const angle=i*Math.PI*2/6; const d=DATA.familyData[f]; const a=angle-Math.PI/2; const lx=cx+Math.cos(a)*215, ly=cy+Math.sin(a)*215; s+=`<path class="petal ${f===state.flowerFamily?'selected':''}" data-petal="${esc(f)}" d="${flowerPetalPath(f,cx,cy,angle)}" fill="${careerColor(f)}" fill-opacity=".78" stroke="${careerColor(f)}"><title>${esc(f)} — median ${money(d.median)}, Q1 ${money(d.q1)}, Q3 ${money(d.q3)}, n=${d.n.toLocaleString()}</title></path><text class="petal-label" x="${lx}" y="${ly}">${esc(shortName[f].replace(' & ',' & '))}</text>`});
 s+=`<circle cx="${cx}" cy="${cy}" r="38" fill="#fff6d7" stroke="#5c4870" stroke-width="2"/><text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="12" font-weight="900">Salary</text><text x="${cx}" y="${cy+13}" text-anchor="middle" font-size="12" font-weight="900">density</text></svg>`; return s;
}
function histogramSvg(f){
 const d=DATA.familyData[f], rows=d.hist, W=760,H=430,ml=58,mr=20,mt=20,mb=54; const min=20000,max=800000, maxP=Math.max(...rows.map(x=>x.pct),1); const x=v=>ml+(v-min)/(max-min)*(W-ml-mr), y=v=>H-mb-v/maxP*(H-mt-mb); let s=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}" aria-label="Salary histogram for ${esc(f)}">`;
 for(let p=0;p<=maxP;p+=Math.max(2,Math.ceil(maxP/4/2)*2)){const yy=y(p);s+=`<line class="gridline" x1="${ml}" y1="${yy}" x2="${W-mr}" y2="${yy}"/><text class="axis-value" x="${ml-8}" y="${yy+4}" text-anchor="end">${p.toFixed(0)}%</text>`}
 rows.forEach(r=>{const x0=x(r.lo),x1=x(r.hi),yy=y(r.pct),w=Math.max(1,x1-x0-1);s+=`<rect x="${x0}" y="${yy}" width="${w}" height="${H-mb-yy}" fill="${careerColor(f)}" opacity=".82"><title>${money(r.lo)}–${money(r.hi)}: ${r.count.toLocaleString()} records (${r.pct.toFixed(2)}%)</title></rect>`});
 const med=x(d.median);s+=`<line x1="${med}" y1="${mt}" x2="${med}" y2="${H-mb}" stroke="#2b2038" stroke-width="3" stroke-dasharray="6 5"/><text x="${med}" y="${mt+13}" text-anchor="middle" font-size="12" font-weight="900">Median ${money(d.median)}</text>`;
 for(let v=100000;v<=800000;v+=100000){const xx=x(v);s+=`<text class="axis-value" x="${xx}" y="${H-23}" text-anchor="middle">${money(v)}</text>`}
 s+=`<line class="axis" x1="${ml}" y1="${H-mb}" x2="${W-mr}" y2="${H-mb}"/><text x="${(ml+W-mr)/2}" y="${H-4}" text-anchor="middle" font-size="13" font-weight="900">Annual salary</text></svg>`; return s;
}
function histPanelHtml(f){const d=DATA.familyData[f];return `<div class="hist-inner"><div class="hist-head"><div><h2>${esc(shortName[f])}</h2><div class="hist-meta">Q1 ${money(d.q1)} · Median ${money(d.median)} · Q3 ${money(d.q3)} · n=${d.n.toLocaleString()}</div></div><button class="close-hist" id="closeHist">Fold back</button></div><div class="hist-chart">${histogramSvg(f)}</div></div>`}
/* ---------- Page: Who reaches 2035 first? (race game, between the mountain and the doors) ----------
   Bet on one of the six fellows, then all six run from 2025 to 2035. Each runs at a constant speed proportional to a
   BLS 2025–35 measure, so when the leader reaches 2035 every other runner has covered (its value ÷ the leader's value)
   of the track — the stopping positions are a bar chart. Round 1 uses growth %; the twist goes back to betting for
   round 2, which counts new jobs. Each round: bet → race → result. */
const RACE_SZ=72;
const RACE_RULE={growth:'SPEED = PROJECTED JOB GROWTH %, 2025→2035',newjobs:'SPEED = NEW JOBS ADDED, 2025→2035'};
const RACE_FMT={growth:v=>`+${v.toFixed(0)}% jobs`,newjobs:v=>`+${Math.round(v/1000)}k jobs`};
// what the race measures, said up front (the title alone does not tell you it is about future jobs)
const RACE_EXPLAIN={growth:'Each runner\'s speed = how fast jobs in that career are projected to grow in the U.S. from 2025 to 2035.',
 newjobs:'Now each runner\'s speed = how many new jobs that career is projected to add in the U.S. from 2025 to 2035.'};
const RACE_ROUND={growth:'ROUND 1 · JOB GROWTH %',newjobs:'ROUND 2 · NEW JOBS'};
const RACE_ASK={growth:'BET ON THE CAREER WHOSE JOBS GROW FASTEST BY 2035',newjobs:'BET ON THE CAREER THAT ADDS THE MOST NEW JOBS BY 2035'};
const raceMsg=(metric,main,sub)=>`<div class="race-intro"><div class="race-prompt"><span class="race-round ${metric}">${RACE_ROUND[metric]}</span>${main}</div><div class="race-sub">${sub}</div></div>`;
const raceBetMsg=metric=>raceMsg(metric,`<span class="race-ask">${RACE_ASK[metric]}</span>`,RACE_EXPLAIN[metric]+' Click a runner to place your bet.');
function renderRace(){
 const lanes=families.map((f,i)=>`<button type="button" class="race-lane" data-race-lane="${i}" style="--c:${careerColor(f)}" aria-label="Bet on ${esc(shortName[f])} (${esc(meta[f].name)})"><span class="rl-name"><i></i><b>${esc(DOOR_SHORT[i])}</b><small>${esc(meta[f].name)}</small><em class="rl-bet">YOUR BET</em></span><span class="rl-track"><span class="rl-runner"><img src="assets/fellows/${meta[f].key}-idle.webp" alt=""></span><span class="rl-val"></span></span></button>`).join('');
 return `<section class="page piles-page race-page"><h1 class="px-title">Race to 2035: whose jobs grow the most?</h1><div class="race-layout"><div class="race-head"><div class="race-msg" id="raceMsg" aria-live="polite">${raceBetMsg('growth')}</div><button type="button" class="race-go pxbox" id="raceGo" disabled>START THE RACE ▶</button></div><div class="race-lanes">${lanes}<div class="race-count" id="raceCount" aria-hidden="true"></div></div><div class="race-foot"><div><span>2025</span><span class="race-rule" id="raceRule">${RACE_RULE.growth}</span><span>2035</span></div></div></div>${nav({hideNext:true})}</section>`;
}
function bindRace(){
 const root=stage.querySelector('.race-page'); if(!root) return;
 const lanes=[...root.querySelectorAll('[data-race-lane]')], go=root.querySelector('#raceGo'), msg=root.querySelector('#raceMsg'), count=root.querySelector('#raceCount'), rule=root.querySelector('#raceRule'), next=root.querySelector('.navbar [data-nav="next"]');
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 const alive=()=>document.body.contains(root);
 const R={bet:null,metric:'growth',phase:'bet',growthWinner:null};   // phase: bet → racing → done
 const runners=lanes.map((l,i)=>({lane:l,el:l.querySelector('.rl-runner'),img:l.querySelector('.rl-runner img'),val:l.querySelector('.rl-val'),key:meta[families[i]].key,frame:'idle',x:0}));
 runners.forEach(r=>['run1','run2','run3','jump','land2'].forEach(fr=>{const im=new Image(); im.src=`assets/fellows/${r.key}-${fr}.webp`;}));
 const setFrame=(r,fr)=>{if(r.frame!==fr){r.frame=fr; r.img.src=`assets/fellows/${r.key}-${fr}.webp`;}};
 // big pixel text over the track: the 3-2-1 countdown, GO!, and YOU WIN! / YOU LOSE after each race
 const show=(t,cls='')=>{count.className='race-count'+(cls?' '+cls:''); count.textContent=t; void count.offsetWidth; count.classList.add('pop');};
 const results=metric=>{const vals=families.map(f=>Math.max(0,DOOR_METRICS[metric].val(f))||0); const max=Math.max(...vals)||1; const order=vals.map((v,i)=>i).sort((a,b)=>vals[b]-vals[a]); return {vals,max,order,rank:i=>order.indexOf(i)+1};};
 lanes.forEach((l,i)=>l.addEventListener('click',()=>{
  if(R.phase!=='bet') return;
  R.bet=i; lanes.forEach(x=>x.classList.toggle('bet',x===l));
  msg.innerHTML=raceMsg(R.metric,`YOUR BET: <b>${esc(DOOR_SHORT[i])}</b> · ${esc(meta[families[i]].name.toUpperCase())} — PRESS START`,RACE_EXPLAIN[R.metric]);
  go.disabled=false;
 }));
 go.addEventListener('click',()=>{
  if(R.phase==='bet'){ if(R.bet==null) return; lanes.forEach(l=>{l.classList.add('locked'); l.setAttribute('aria-disabled','true'); l.tabIndex=-1;}); start(); }
  else if(R.phase==='done') enterBet(R.metric==='growth'?'newjobs':'growth');   // twist → round 2 betting; after round 2 → play again from round 1
 });
 // back to the betting stage for a round: runners walk back to the start line, the old bet is cleared, the top says what this round measures
 function enterBet(metric){
  R.metric=metric; R.bet=null; R.phase='bet'; count.textContent='';
  rule.textContent=RACE_RULE[metric]; rule.classList.remove('flash'); void rule.offsetWidth; rule.classList.add('flash');
  runners.forEach(r=>{
   r.val.classList.remove('show'); r.lane.classList.remove('winner','bet','locked'); r.lane.removeAttribute('aria-disabled'); r.lane.removeAttribute('tabindex');
   if(!reduce&&r.x>0) r.el.animate([{transform:`translateX(${r.x}px)`},{transform:'translateX(0px)'}],{duration:560,easing:'steps(8)'});
   r.x=0; r.el.style.transform='translateX(0px)'; setFrame(r,'idle');
  });
  msg.innerHTML=raceBetMsg(metric);
  go.textContent=metric==='growth'?'START THE RACE ▶':'START ROUND 2 ▶'; go.disabled=true;
 }
 function start(){
  R.phase='racing'; go.disabled=true;
  const res=results(R.metric);
  msg.innerHTML=raceMsg(R.metric,`YOUR BET: <b>${esc(DOOR_SHORT[R.bet])}</b> · ON YOUR MARKS…`,RACE_EXPLAIN[R.metric]);
  const steps=reduce?[]:['3','2','1'];
  let k=0;
  const tick=()=>{ if(!alive()) return;
   if(k<steps.length){ show(steps[k++]); setTimeout(tick,520); return; }
   if(!reduce){ show('GO!'); setTimeout(()=>{ if(alive()&&count.textContent==='GO!') count.textContent=''; },600); }
   run(res);
  };
  tick();
 }
 function run(res){
  const T=reduce?700:4600, trackW=runners[0].lane.querySelector('.rl-track').clientWidth, span=Math.max(40,trackW-RACE_SZ-22), t0=performance.now();
  const step=now=>{ if(!alive()) return;
   const el=Math.max(0,now-t0), u=Math.min(1,el/T);   // the first rAF timestamp can precede t0
   runners.forEach((r,i)=>{ const ratio=res.vals[i]/res.max; r.x=span*ratio*u; r.el.style.transform=`translateX(${r.x}px)`;
    // faster runners also cycle their run frames faster
    if(ratio<0.005) setFrame(r,'idle'); else { const per=Math.min(320,Math.max(100,110/ratio)); setFrame(r,['run1','run2','run3'][Math.floor(el/per+i)%3]); } });
   if(u<1) requestAnimationFrame(step); else finish(res,trackW);
  };
  requestAnimationFrame(step);
 }
 function finish(res,trackW){
  // Order at the finish line: the winner hops → YOU WIN! / YOU LOSE together with the red result banner (top left)
  // → once the big text clears, the result boxes beside every runner and the winner's red lane outline appear, and the
  // buttons come back.
  const w=res.order[0], fmt=RACE_FMT[R.metric], S=i=>esc(DOOR_SHORT[i]), metric=R.metric;
  runners.forEach((r,i)=>{
   setFrame(r,'idle');
   const p=res.vals[i]/res.max;
   r.val.innerHTML=`<b>#${res.rank(i)}</b>${fmt(res.vals[i])}`;
   // label after the runner, or in front of it when the runner is close to the finish line
   if(p>0.72){ r.val.style.left='auto'; r.val.style.right=(trackW-r.x+8)+'px'; } else { r.val.style.right='auto'; r.val.style.left=(r.x+RACE_SZ+8)+'px'; }
  });
  const win=runners[w]; setFrame(win,'jump');
  win.img.animate([{transform:'translateY(0)'},{transform:'translateY(-24px)'},{transform:'translateY(0)'}],{duration:440,easing:'ease-out'});
  setTimeout(()=>{ if(!alive())return; setFrame(win,'land2'); setTimeout(()=>{ if(alive()) setFrame(win,'idle'); },200); },440);
  const betLine=R.bet===w?'YOUR BET WON!':`YOUR BET ${S(R.bet)}: #${res.rank(R.bet)}`;
  let top,line1,line2;
  if(metric==='growth'){
   R.growthWinner=w; top='★ FINISH ★'; line1=`${S(w)} JOBS GROW FASTEST · ${fmt(res.vals[w])} BY 2035`; line2=betLine;
  } else {
   const g=R.growthWinner, twist=g!=null&&g!==w;
   top=twist?'★ PLOT TWIST ★':'★ FINISH ★'; line1=`${S(w)} ADDS THE MOST NEW JOBS · ${fmt(res.vals[w])} BY 2035`; line2=(twist?`ROUND 1 WINNER ${S(g)} IS NOW #${res.rank(g)} · `:'')+betLine;
  }
  const showResults=()=>{ if(!alive()) return;
   R.phase='done';
   runners.forEach((r,i)=>setTimeout(()=>{ if(alive()) r.val.classList.add('show'); },140*(res.rank(i)-1)));
   win.lane.classList.add('winner');
   go.textContent=metric==='growth'?'TWIST: COUNT NEW JOBS ▶':'PLAY AGAIN ▶';
   go.disabled=false;
   // Next only appears once round 2 (new jobs) has been run
   if(metric==='newjobs'&&next&&next.hidden){ next.hidden=false; next.animate([{opacity:0},{opacity:1}],{duration:300,easing:'steps(3)'}); }
  };
  // YOU WIN! / YOU LOSE in the countdown's big text, with the red result banner at the same moment; the boxes beside
  // the runners follow once the big text has cleared
  const won=R.bet===w, t=won?'YOU WIN!':'YOU LOSE';
  // shown the moment the winner hops at the finish line
  show(t,won?'win':'lose');
  msg.innerHTML=`<div class="race-banner"><div class="rb-top">${top}</div><div class="rb-line">${line1}</div><div class="rb-line">${line2}</div></div>`;
  setTimeout(()=>{ if(!alive()) return; if(count.textContent===t) count.textContent=''; showResults(); },1100);
 }
}

/* ---------- Page: Which door stays open in 2035? (pay benchmark + alluvial flow) ---------- */
const DOOR={W:1060,H:680,xL:300,xR:740,barW:30,top:80,bottom:70,gap:14};
// One fixed view: both columns rank the careers by the same BLS measure — annual job openings per 1,000 jobs —
// left for the past ten years (2016–26, ending now), right for the next ten (2025–35).
// Left data: BLS Employment Projections 2016–26, Table 1.10 (bls.gov/emp/data/projections-archive.htm):
// [code, title, 2016 employment (thousands), occupational openings 2016–26 annual average (thousands)].
// That release used the 2010 SOC: data scientists, database architects and software QA testers were not yet separate
// occupations, so Data Science = operations research analysts + statisticians + math science "all other",
// Data Eng = database administrators, Software = programmers + application and systems software developers.
const BLS_2016_26={
 'Data Science & Analytics':[['15-2031','Operations research analysts',114.0,10.7],['15-2041','Statisticians',37.2,4.4],['15-2099','Mathematical science occupations, all other',2.2,0.2]],
 'AI & Machine Learning':[['15-1111','Computer and information research scientists',27.9,2.5]],
 'Data Engineering & Architecture':[['15-1141','Database administrators',119.5,9.3]],
 'Software Engineering':[['15-1131','Computer programmers',294.9,15.7],['15-1132','Software developers, applications',831.3,85.9],['15-1133','Software developers, systems software',425.0,33.0]],
 'Systems, Cloud & Security':[['15-1121','Computer systems analysts',600.5,45.2],['15-1122','Information security analysts',100.0,10.4],['15-1143','Computer network architects',162.7,11.7],['15-1142','Network and computer systems administrators',391.3,27.0]],
 'Data & Technology Management':[['11-3021','Computer and information systems managers',367.6,32.5]]
};
const DOOR_PAST={label:'OPENINGS PER 1,000 JOBS (2016–26)',val:f=>{const o=BLS_2016_26[f]; return o.reduce((s,x)=>s+x[3],0)/o.reduce((s,x)=>s+x[2],0)*1000;},fmt:v=>v.toFixed(0)+' per 1,000'};
const DOOR_SHORT=['DATA SCIENCE','AI & ML','DATA ENG','SOFTWARE','CLOUD & SEC','MANAGEMENT'];
const DOOR_METRICS={
 openings:{label:'OPENINGS PER 1,000 JOBS (2025–35)',val:f=>DATA.blsFamily[f].openingsPer1000,fmt:v=>v.toFixed(0)+' per 1,000'},
 growth:{label:'GROWTH % BY 2035',val:f=>DATA.blsFamily[f].growth,fmt:v=>(v>=0?'+':'')+v.toFixed(0)+'%'},
 newjobs:{label:'NEW JOBS BY 2035',val:f=>DATA.blsFamily[f].employment2035-DATA.blsFamily[f].employment,fmt:v=>(v>=0?'+':'')+Math.round(v/1000)+'k jobs'}
};
function doorSize(e){return Math.max(22,Math.log10(e/1000)*52-56)}
function doorLayout(arr,top,bottom,gap){const tot=arr.reduce((s,a)=>s+a.h,0)+gap*(arr.length-1); let y=top+(bottom-top-tot)/2; arr.forEach(a=>{a.y=y; y+=a.h+gap;}); return arr;}
function doorFlowSvg(){
 const {W,H,xL,xR,barW,top,bottom,gap}=DOOR; const M=DOOR_METRICS.openings; const ML=DOOR_PAST;
 const L=doorLayout(families.map((f,i)=>({i,f,v:ML.val(f),h:doorSize(DATA.blsFamily[f].employment)})).sort((a,b)=>b.v-a.v),top,H-bottom,gap);
 const R=doorLayout(families.map((f,i)=>({i,f,v:M.val(f),h:doorSize(DATA.blsFamily[f].employment2035)})).sort((a,b)=>b.v-a.v),top,H-bottom,gap);
 // grouped so the entrance can show them in order: fellows run in first, then labels, bars, ribbons (see runDoorFellows)
 let g='<g class="door-ribbons">';
 families.forEach((f,i)=>{const l=L.find(a=>a.i===i), r=R.find(a=>a.i===i); const x0=xL+barW, x1=xR, c=(x0+x1)/2;
  g+=`<path class="door-ribbon" data-door="${i}" d="M${x0} ${l.y} C${c} ${l.y} ${c} ${r.y} ${x1} ${r.y} L${x1} ${r.y+r.h} C${c} ${r.y+r.h} ${c} ${l.y+l.h} ${x0} ${l.y+l.h} Z" style="--c:${careerColor(f)}"><title>${esc(shortName[f])}: openings rank #${L.indexOf(l)+1} in 2016–26 → #${R.indexOf(r)+1} in 2025–35</title></path>`;});
 const bars=(arr,x,key)=>{arr.forEach(a=>{const occ=DATA.blsFamily[a.f].occupations; const tot=occ.reduce((s,o)=>s+o[key],0)||1; let y=a.y;
   g+=`<rect class="door-bar" data-door="${a.i}" x="${x}" y="${a.y}" width="${barW}" height="${a.h}" fill="${careerColor(a.f)}" stroke="#2b2140" stroke-width="3"><title>${esc(shortName[a.f])} · ${(a.h?Math.round((key==='employment'?DATA.blsFamily[a.f].employment:DATA.blsFamily[a.f].employment2035)/1000):0)}k jobs</title></rect>`;
   occ.forEach((o,k)=>{const h=a.h*o[key]/tot; if(k>0) g+=`<line x1="${x}" y1="${y.toFixed(1)}" x2="${x+barW}" y2="${y.toFixed(1)}" stroke="#2b2140" stroke-width="1.5" stroke-dasharray="2 2"/>`; g+=`<rect class="door-bar-seg" data-door="${a.i}" x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="transparent"><title>${esc(o.name)} · ${Math.round(o[key]/1000)}k · ${o.growth>=0?'+':''}${o.growth}%</title></rect>`; y+=h;});});};
 g+='</g><g class="door-bars">'; bars(L,xL,'employment'); bars(R,xR,'employmentFuture'); g+='</g>';
 // each career is marked by its pixel fellow (the same sprites as the race page), facing the ribbons; right-column fellows are mirrored
 const SZ=56;
 const fellow=(a,rank,px,cy,side)=>{const k=meta[a.f].key, flip=side==='R'?` transform="matrix(-1 0 0 1 ${2*px} 0)"`:'';
  return `<g class="door-fellow" data-side="${side}" data-key="${k}" data-px="${px}" data-rank="${rank}"><image href="assets/fellows/${k}-idle.webp" x="${px-SZ/2}" y="${(cy-SZ/2).toFixed(1)}" width="${SZ}" height="${SZ}"${flip}/></g>`;};
 L.forEach((a,rank)=>{const cy=a.y+a.h/2, px=xL-40; g+=`<g class="door-face" data-door="${a.i}"><title>${esc(shortName[a.f])} · past 10 years (2016–26): about ${Math.round(a.v)} job openings a year for every 1,000 jobs — roughly 1 in ${Math.round(1000/a.v)}</title>${fellow(a,rank,px,cy,'L')}<g class="door-txt"><text x="${px-34}" y="${cy-3}" text-anchor="end" class="pf">#${rank+1} ${esc(DOOR_SHORT[a.i])}</text><text x="${px-34}" y="${cy+17}" text-anchor="end">${ML.fmt(a.v)}</text></g></g>`;});
 R.forEach((a,rank)=>{const cy=a.y+a.h/2, px=xR+barW+40; g+=`<g class="door-face" data-door="${a.i}"><title>${esc(shortName[a.f])} · next 10 years (2025–35): about ${Math.round(a.v)} job openings a year for every 1,000 jobs — roughly 1 in ${Math.round(1000/a.v)}</title>${fellow(a,rank,px,cy,'R')}<g class="door-txt"><text x="${px+34}" y="${cy-3}" class="pf">#${rank+1} ${esc(DOOR_SHORT[a.i])}</text><text x="${px+34}" y="${cy+17}">${M.fmt(a.v)}</text></g></g>`;});
 g+=`<g class="door-head"><text x="${xL+barW/2}" y="${top-46}" text-anchor="middle" class="pf" style="font-size:11px">PAST 10 YEARS · 2016–26</text><text x="${xL+barW/2}" y="${top-28}" text-anchor="middle" class="lbl">OPENINGS A YEAR PER 1,000 JOBS · BAR = JOBS NOW</text>`;
 g+=`<text x="${xR+barW/2}" y="${top-46}" text-anchor="middle" class="pf" style="font-size:11px">NEXT 10 YEARS · 2025–35</text><text x="${xR+barW/2}" y="${top-28}" text-anchor="middle" class="lbl">OPENINGS A YEAR PER 1,000 JOBS · BAR = JOBS IN 2035</text></g>`;
 return `<svg class="door-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}
// Left panel: the ribbons made concrete — a slope chart of the actual values. Left axis = past 10 years (2016–26),
// right axis = next 10 years (2025–35); each career is a line from its past value to its next value, in its ribbon colour.
// Value labels are nudged apart where careers sit close together.
function doorOpenSvg(){
 const W=400,H=680,xa=84,xb=246,yt=160,yb=590,lo=45,hiV=105, y=v=>yb-(v-lo)/(hiV-lo)*(yb-yt);
 const P=DOOR_PAST, N=DOOR_METRICS.openings;
 const rows=families.map((f,i)=>({i,f,p:Math.round(P.val(f)),n:Math.round(N.val(f))}));
 const spread=(arr,gap)=>{const a=arr.map(o=>({...o})).sort((p,q)=>p.y-q.y); for(let k=1;k<a.length;k++) if(a[k].y<a[k-1].y+gap) a[k].y=a[k-1].y+gap; const over=a[a.length-1].y-(yb+10); if(over>0) a.forEach(o=>o.y-=over); return a.reduce((m,o)=>(m[o.i]=o.y,m),{});};
 const yl=spread(rows.map(r=>({i:r.i,y:y(r.p)})),18), yr=spread(rows.map(r=>({i:r.i,y:y(r.n)})),18);
 let s=`<svg class="door-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
 s+=`<text x="${W/2}" y="40" text-anchor="middle" class="pf" style="font-size:12px">JOB OPENINGS EACH YEAR</text><text x="${W/2}" y="56" text-anchor="middle" class="lbl">FOR EVERY 1,000 JOBS · HOVER OR CLICK A LINE</text><text x="${W/2}" y="77" text-anchor="middle" class="lbl" style="font-size:11px;fill:#2b2140">E.G. 100 = 1 IN 10 JOBS OPENS UP EACH YEAR</text>`;
 [[xa,'PAST 10 YRS','2016–26'],[xb,'NEXT 10 YRS','2025–35']].forEach(([x,a,b])=>{
  s+=`<text x="${x}" y="${yt-50}" text-anchor="middle" class="pf" style="font-size:10px">${a}</text><text x="${x}" y="${yt-33}" text-anchor="middle" class="lbl">${b}</text><line x1="${x}" y1="${yt-20}" x2="${x}" y2="${yb+20}" stroke="#2b2140" stroke-width="2" stroke-dasharray="3 5" opacity=".45"/>`;});
 rows.forEach(r=>{const c=careerColor(r.f), y1=y(r.p).toFixed(1), y2=y(r.n).toFixed(1), d=r.n-r.p;
  s+=`<g class="door-pay" data-door="${r.i}"><title>${esc(shortName[r.f])}: ${r.p} → ${r.n} openings a year per 1,000 jobs (${d>=0?'+':'−'}${Math.abs(d)})</title>`
   +`<line x1="${xa}" y1="${y1}" x2="${xb}" y2="${y2}" stroke="transparent" stroke-width="18"/>`
   +`<line x1="${xa}" y1="${y1}" x2="${xb}" y2="${y2}" stroke="#2b2140" stroke-width="8" stroke-linecap="square"/><line x1="${xa}" y1="${y1}" x2="${xb}" y2="${y2}" stroke="${c}" stroke-width="5" stroke-linecap="square"/>`
   +`<rect x="${xa-7}" y="${y1-7}" width="14" height="14" fill="${c}" stroke="#2b2140" stroke-width="2.5"/><rect x="${xb-7}" y="${y2-7}" width="14" height="14" fill="${c}" stroke="#2b2140" stroke-width="2.5"/>`
   +`<text x="${xa-14}" y="${(yl[r.i]+6).toFixed(1)}" text-anchor="end" style="font-size:17px">${r.p}</text>`
   +`<text x="${xb+14}" y="${(yr[r.i]+6).toFixed(1)}" style="font-size:17px">${r.n}</text><text x="${xb+40}" y="${(yr[r.i]+5).toFixed(1)}" class="pf" style="font-size:9px">${esc(DOOR_SHORT[r.i])}</text></g>`;});
 s+=`<text x="${W/2}" y="${yb+44}" text-anchor="middle" class="lbl" style="font-size:15px;fill:#2b2140">LINE GOES DOWN =</text><text x="${W/2}" y="${yb+66}" text-anchor="middle" class="lbl" style="font-size:15px;fill:#2b2140">FEWER OPENINGS EACH YEAR</text>`;
 return s+'</svg>';
}
function renderFlower(){
 return `<section class="page piles-page door-page door-intro door-locked"><h1 class="px-title">Which door stays open in 2035?</h1><div class="door-layout"><div class="door-left">${doorOpenSvg()}</div><div class="door-right" id="doorRight">${doorFlowSvg()}</div></div><div class="ridge-banner door-banner" id="doorBanner" hidden><span class="rb-top">★ PLOT TWIST ★</span><span class="rb-line" id="doorBannerText"></span></div>${nav()}</section>`;
}
function bindDoors(){
 const root=stage.querySelector('.door-page'); if(!root) return;
 const hi=i=>{root.querySelectorAll('[data-door]').forEach(el=>{el.classList.toggle('dim',i!=null&&+el.dataset.door!==i); el.classList.toggle('hi',i!=null&&+el.dataset.door===i);});};
 const home=families.indexOf(state.homeFamily||state.selectedFamily);   // the career picked on the cover (page 1)
 const alive=()=>document.body.contains(root);
 const bn=root.querySelector('#doorBanner'), bt=root.querySelector('#doorBannerText'), bTop=root.querySelector('#doorBanner .rb-top');
 // banner: what happened to the selected career's rank — remains at / rises to / drops to
 const L=families.map(f=>({f,v:DOOR_PAST.val(f)})).sort((a,b)=>b.v-a.v).map(x=>x.f), R=families.map(f=>({f,v:DOOR_METRICS.openings.val(f)})).sort((a,b)=>b.v-a.v).map(x=>x.f);
 const setBanner=i=>{ const f=families[i], was=L.indexOf(f)+1, now=R.indexOf(f)+1, name=DOOR_SHORT[i];
  if(bt) bt.textContent=now===was?`${name} REMAINS AT #${now}`:now<was?`${name} RISES FROM #${was} TO #${now}`:`${name} DROPS FROM #${was} TO #${now}`;
  if(bTop) bTop.textContent=now===was?'★ STEADY ★':'★ PLOT TWIST ★'; };
 // the highlighted career: the cover career at first, then whichever career the reader clicks. Hovering previews
 // another career; leaving goes back to the selected one. The banner always describes the selected career.
 let sel=null;
 // hover and click do nothing until the entrance is over (fellows in place and everything faded in), so moving the
 // mouse while the fellows run does not dim or highlight anything. `door-locked` (CSS pointer-events:none on both
 // charts) also keeps the native <title> tooltips from popping up over invisible bars/labels during the entrance.
 let ready=false;
 const select=i=>{ sel=i; hi(i); setBanner(i); if(bn) bn.hidden=false; };
 root.querySelectorAll('.door-pay,.door-face,.door-ribbon,.door-bar,.door-bar-seg').forEach(el=>{const i=+el.dataset.door;
  // mouseover (not mouseenter) so a cursor already resting on a career reacts as soon as it moves after the entrance
  el.addEventListener('mouseover',()=>{ if(ready) hi(i); }); el.addEventListener('mouseleave',()=>{ if(ready) hi(sel); });
  el.addEventListener('click',()=>{ if(!ready) return; select(i); hopDoorFellows(root,i); });});
 setBanner(home);
 // after the fellows have run in: labels, bars, ribbons and the left chart fade in (CSS, ~1.4s); then hover/click are
 // switched on, and a moment later the cover career is highlighted and the banner appears (unless already clicked)
 const reveal=()=>{ if(!alive()) return; root.classList.remove('door-intro');
  setTimeout(()=>{ if(alive()){ ready=true; root.classList.remove('door-locked'); } },1400);
  setTimeout(()=>{ if(alive()&&sel==null) select(home); },1700);
 };
 if(root.classList.contains('door-intro')) runDoorFellows(root,alive,reveal); else reveal();
}
// Clicking a career (its fellow, ribbon, bar or line on the left chart) makes its two fellows hop, left and right column.
function hopDoorFellows(root,i){
 root.querySelectorAll(`.door-face[data-door="${i}"] .door-fellow`).forEach(g=>{
  const img=g.querySelector('image'), key=g.dataset.key, src=fr=>`assets/fellows/${key}-${fr}.webp`;
  g.getAnimations().forEach(a=>a.cancel()); clearTimeout(g._hopT); clearTimeout(g._hopT2);
  img.setAttribute('href',src('jump'));
  g.animate([{transform:'translate(0px,0px)'},{transform:'translate(0px,-26px)',offset:.45},{transform:'translate(0px,0px)'}],{duration:460,easing:'ease-out'});
  g._hopT=setTimeout(()=>{ img.setAttribute('href',src('land2')); g._hopT2=setTimeout(()=>img.setAttribute('href',src('idle')),170); },440);
 });
}
// Entrance: the 12 fellows run in from the box edges (left column from the left, right column from the right, each on its
// own row) and stop at their rank, staggered by rank; then `done` reveals everything else.
function runDoorFellows(root,alive,done){
 const fellows=[...root.querySelectorAll('.door-fellow')];
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 if(reduce||!fellows.length){ fellows.forEach(el=>{el.style.visibility='visible';}); done(); return; }
 const SPEED=230;   // viewBox units per second
 const runs=fellows.map(el=>{const side=el.dataset.side, px=+el.dataset.px, rank=+el.dataset.rank, key=el.dataset.key;
  ['run1','run2','run3','land2'].forEach(fr=>{const im=new Image(); im.src=`assets/fellows/${key}-${fr}.webp`;});
  const dist=side==='L'?px+70:DOOR.W-px+70, start=side==='L'?-dist:dist;
  el.setAttribute('transform',`translate(${start},0)`); el.style.visibility='visible';
  return {el,img:el.querySelector('image'),key,start,delay:rank*110+(side==='R'?60:0),dur:dist/SPEED*1000*(0.92+seeded(rank*7+(side==='R'?3:0))*0.16),frame:'idle',landed:false};});
 const setFrame=(r,fr)=>{ if(r.frame!==fr){ r.frame=fr; r.img.setAttribute('href',`assets/fellows/${r.key}-${fr}.webp`); } };
 // constant running speed, easing off over the last stretch
 const ease=u=>u<0.85?u/0.85*0.92:0.92+0.08*(1-Math.pow(1-(u-0.85)/0.15,2));
 const total=Math.max(...runs.map(r=>r.delay+r.dur)), t0=performance.now();
 const step=now=>{ if(!alive()) return; const t=Math.max(0,now-t0);
  runs.forEach((r,i)=>{ if(r.landed) return; const u=Math.min(1,Math.max(0,(t-r.delay)/r.dur));
   r.el.setAttribute('transform',`translate(${(r.start*(1-ease(u))).toFixed(1)},0)`);
   if(u>0&&u<1) setFrame(r,['run1','run2','run3'][Math.floor(t/100+i)%3]);
   else if(u>=1){ r.landed=true; setFrame(r,'land2'); setTimeout(()=>{ if(alive()) setFrame(r,'idle'); },160); } });
  if(t<total) requestAnimationFrame(step); else setTimeout(done,320);
 };
 requestAnimationFrame(step);
}

/* ---------- Page: Which company pays the most, year by year? (H-1B employer galaxy) ---------- */
const GAL={W:1060,H:680,x0:90,x1:1020,y0:610,y1:60,years:[2020,2021,2022,2023,2024,2025]};
const GAL_T=['data scientist','machine learning engineer','data engineer','software engineer','devops engineer','product manager'];
const GAL_SHORT=['DATA SCIENCE','AI & ML','DATA ENG','SOFTWARE','CLOUD & SEC','MANAGEMENT'];
state.galYear=state.galYear||2024; state.galEmployer=state.galEmployer||null;
function galNorm(e){return ({'Facebook Inc':'Meta Platforms Inc','International Business Machines Corporation':'Ibm Corporation'})[e]||e}
function galShort(e){return e.replace(/ (Inc|Llc|Corporation|Corp|Limited|Lp|Company)$/i,'').replace(/^The /,'').replace('Platforms','').replace('International Business Machines','IBM').replace('Boston Consulting Group','BCG').replace('Wal-Mart Associates','Walmart').replace('Technologies','Tech').replace('Solutions Group','').replace('Software Group','').trim()}
function galPoints(year){const pts=[]; GAL_T.forEach((t,k)=>{const d=window.EXT_DATA&&EXT_DATA.h1b[t]&&EXT_DATA.h1b[t].years[year]; if(!d||!d.top) return; d.top.forEach(e0=>{const e={...e0,employer:galNorm(e0.employer)}; pts.push({id:(t+'|'+e.employer).replace(/[^a-z0-9]/gi,'_'),e:e.employer,s:galShort(e.employer),m:e.median,c:e.count,k,t,all:d.median})});}); return pts;}
function galX(c){const {x0,x1}=GAL; return x0+(Math.log10(Math.max(5,c))-0.7)/(3.9-0.7)*(x1-x0)}
function galY(m){const {y0,y1}=GAL; return y0-(Math.max(60000,Math.min(260000,m))-60000)/(200000)*(y0-y1)}
function galTrailsSvg(){
 const sel=state.galEmployer; if(!sel) return '';
 let g=''; GAL_T.forEach((t,k)=>{const pts=GAL.years.map(y=>{const d=EXT_DATA.h1b[t].years[y]; const e=d&&d.top&&d.top.find(x=>galNorm(x.employer)===sel); return e?{y,x:galX(e.count),yy:galY(e.median),m:e.median,c:e.count}:null;}).filter(Boolean); if(pts.length<2) return; const col=careerColor(families[k]);
  g+=`<polyline points="${pts.map(p=>p.x+','+p.yy).join(' ')}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round" opacity=".9"/><polyline points="${pts.map(p=>p.x+','+p.yy).join(' ')}" fill="none" stroke="#2b2140" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"/>`;
  pts.forEach((p,i)=>{const cur=p.y===state.galYear; g+=`<rect x="${p.x-5}" y="${p.yy-5}" width="10" height="10" fill="${cur?'#f2c84b':col}" stroke="#2b2140" stroke-width="2"/>`; if(i===0||i===pts.length-1||cur) g+=`<text x="${p.x+9}" y="${p.yy-9}" class="gal-yr">${p.y}</text>`;});
  const a=pts[pts.length-2], b=pts[pts.length-1]; const ang=Math.atan2(b.yy-a.yy,b.x-a.x); const ax=b.x, ay=b.yy; g+=`<polygon points="${ax},${ay} ${ax-14*Math.cos(ang-.5)},${ay-14*Math.sin(ang-.5)} ${ax-14*Math.cos(ang+.5)},${ay-14*Math.sin(ang+.5)}" fill="#2b2140"/>`;});
 return g;
}
function galaxySvg(){
 const {W,H,x0,x1,y0,y1}=GAL; const pts=galPoints(state.galYear); pts.forEach(p=>{p.x=galX(p.c);p.y=galY(p.m);p.r=6+Math.sqrt(p.c)/3});
 let g='';
 [10,30,100,300,1000,3000].forEach(v=>{g+=`<line x1="${galX(v)}" y1="${y1}" x2="${galX(v)}" y2="${y0}" stroke="#2b2140" stroke-dasharray="3 5" opacity=".22"/><text x="${galX(v)}" y="${y0+26}" text-anchor="middle">${v.toLocaleString()}</text>`});
 [80000,120000,160000,200000,240000].forEach(v=>{g+=`<line x1="${x0}" y1="${galY(v)}" x2="${x1}" y2="${galY(v)}" stroke="#2b2140" stroke-dasharray="3 5" opacity=".22"/><text x="${x0-10}" y="${galY(v)+5}" text-anchor="end">${money(v)}</text>`});
 g+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="#2b2140" stroke-width="3"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="#2b2140" stroke-width="3"/>`;
 g+=`<text x="${x1}" y="${y0+50}" text-anchor="end" class="lbl">H-1B FILINGS FOR THAT TITLE IN ${state.galYear} (LOG) →</text><text x="${x0+8}" y="${y1-14}" class="lbl">↑ MEDIAN OFFERED BASE SALARY (H-1B LCA)</text>`;
 g+=`<text x="${x0+16}" y="${y1+34}" class="lbl" style="fill:#d9343b">TOP-LEFT: PAYS A LOT, HIRES FEW</text><text x="${x1-16}" y="${y0-22}" text-anchor="end" class="lbl" style="fill:#d9343b">BOTTOM-RIGHT: HIRES MANY, PAYS LESS</text>`;
 const byE={}; pts.forEach(p=>(byE[p.e]=byE[p.e]||[]).push(p));
 let links=''; Object.values(byE).filter(a=>a.length>1).forEach(a=>{a.sort((p,q)=>p.x-q.x); for(let i=1;i<a.length;i++) links+=`<line class="gal-link" data-emp="${esc(a[i].e)}" x1="${a[i-1].x}" y1="${a[i-1].y}" x2="${a[i].x}" y2="${a[i].y}"/>`});
 let bubbles=''; pts.slice().sort((a,b)=>b.c-a.c).forEach(p=>{bubbles+=`<g class="gal-b" data-emp="${esc(p.e)}" data-k="${p.k}" data-id="${p.id}" data-m="${p.m}" data-c="${p.c}" data-all="${p.all}" data-s="${esc(p.s)}"><circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${careerColor(families[p.k])}"><title>${esc(p.s)} · ${GAL_SHORT[p.k]} · ${money(p.m)} · ${p.c} filings</title></circle></g>`});
 const placed=[]; const fits=bx=>!placed.some(o=>!(bx.x+bx.w<o.x||o.x+o.w<bx.x||bx.y+bx.h<o.y||o.y+o.h<bx.y))&&bx.x>x0&&bx.x+bx.w<x1+36&&bx.y>y1-20&&bx.y+bx.h<y0;
 let labels=''; let idx=0; const unl=[];
 pts.forEach(p=>{const w=p.s.length*7+4,h=13; const cands=[[p.x+p.r+4,p.y-6],[p.x-p.r-4-w,p.y-6],[p.x-w/2,p.y-p.r-15],[p.x-w/2,p.y+p.r+3]]; let ok=false; for(const [lx,ly] of cands){const bx={x:lx,y:ly,w,h}; if(fits(bx)){placed.push(bx); labels+=`<text class="gal-lab" data-emp="${esc(p.e)}" x="${lx+2}" y="${ly+11}">${esc(p.s)}</text>`; ok=true; break;}} if(!ok){idx++; unl.push(p.s); labels+=`<text class="gal-num" data-emp="${esc(p.e)}" x="${p.x}" y="${p.y+4}" text-anchor="middle">${idx}</text>`;}});
 state._galUnl=unl; state._galByE=byE;
 return `<svg class="gal-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}${links}<g class="gal-trails" id="galTrails">${galTrailsSvg()}</g>${bubbles}${labels}</svg>`;
}
function galaxySide(){
 const y=state.galYear; const byE=state._galByE||{}; const sel=state.galEmployer;
 if(sel&&byE[sel]){const a=byE[sel]; return `<div class="px-side-title">${esc(galShort(sel))} · ${y}</div><div class="game-stat small">median offered base salary vs all employers for that title</div>${GAL_T.map((t,k)=>{const p=a.find(x=>x.k===k); const all=EXT_DATA.h1b[t].years[y]; return `<div class="gal-row" style="border-left-color:${careerColor(families[k])}"><span>${GAL_SHORT[k]}</span><span>${p?`<b>${money(p.m)}</b> vs ${money(all.median)}`:`— vs ${money(all.median)}`}</span></div>`}).join('')}<div class="game-stat small" style="margin-top:8px">Trail 2020→2025: ${GAL_T.map((t,k)=>{const ys=GAL.years.map(yy=>{const d=EXT_DATA.h1b[t].years[yy]; const e=d&&d.top&&d.top.find(x=>galNorm(x.employer)===sel); return e?{yy,m:e.median,c:e.count}:null}).filter(Boolean); if(ys.length<2) return null; const a=ys[0],b=ys[ys.length-1]; return `<span style="white-space:nowrap"><i style="display:inline-block;width:9px;height:9px;background:${careerColor(families[k])};border:2px solid #2b2140"></i> ${a.yy}→${b.yy} ${money(a.m)}→${money(b.m)}, ${a.c}→${b.c} ppl</span>`}).filter(Boolean).join(' · ')||'only one year on record'}</div><button class="px-btn" data-gal-clear>Show all employers</button>`;}
 const multi=Object.entries(byE).filter(([e,a])=>a.length>1).sort((a,b)=>b[1].length-a[1].length||b[1].reduce((s,p)=>s+p.c,0)-a[1].reduce((s,p)=>s+p.c,0));
 return `<div class="px-side-title">Employers hiring 2+ titles · ${y}</div><div class="gal-list">${multi.slice(0,14).map(([e,a])=>`<button class="gal-row" data-gal-emp="${esc(e)}"><span>${esc(galShort(e))}</span><span>${a.sort((p,q)=>p.k-q.k).map(p=>`<i style="background:${careerColor(families[p.k])}"></i>`).join('')}</span></button>`).join('')}</div><div class="game-stat small">Hover a bubble for employer · title · pay · filings. Click to pin.</div>${state._galUnl.length?`<div class="game-stat small">Numbered: ${state._galUnl.map((n,i)=>(i+1)+' '+esc(n)).join(' · ')}</div>`:''}`;
}
function renderGalaxy(){
 if(!window.EXT_DATA) return `<section class="page piles-page"><h1 class="px-title">Which company pays the most, year by year?</h1><div class="game-stat">ext-data.js not loaded.</div>${nav()}</section>`;
 const chips=`<button data-gal-play class="gal-play">▶ PLAY</button>`+GAL.years.map(y=>`<button data-gal-year="${y}" class="${y===state.galYear?'active':''}">${y}</button>`).join('');
 return `<section class="page piles-page gal-page"><h1 class="px-title">Which company pays the most, year by year?</h1><div class="piles-layout gal-layout"><div class="gal-canvas" id="galCanvas">${galaxySvg()}<div class="gal-tip" id="galTip" hidden></div><div class="door-chips gal-chips">${chips}</div><div class="ridge-banner gal-banner" id="galBanner"><div class="rb-top">★ SAME TITLE ★</div><div class="rb-line" style="font-family:var(--pxfont);font-size:11px;line-height:1.7" id="galBannerText"></div></div></div><aside class="px-side" id="galInfo">${galaxySide()}</aside></div>${nav()}</section>`;
}
function bindGalaxy(){
 const root=stage.querySelector('.gal-page'); if(!root) return; const svg=root.querySelector('.gal-svg');
 const hi=e=>{root.querySelectorAll('[data-emp]').forEach(el=>{el.classList.toggle('dim',e!=null&&el.dataset.emp!==e); el.classList.toggle('hi',e!=null&&el.dataset.emp===e);});};
 const pinned=()=>state.galEmployer;
 const tip=root.querySelector('#galTip'), cv=root.querySelector('#galCanvas');
 const showTip=(b,ev)=>{const k=+b.dataset.k, m=+b.dataset.m, c=+b.dataset.c, all=+b.dataset.all; const t=GAL_T[k]; const tot=EXT_DATA.h1b[t].years[state.galYear].n; const diff=m-all; tip.innerHTML=`<div class="gt-name" style="border-color:${careerColor(families[k])}">${b.dataset.s}</div><div class="gt-row"><span>title</span><b>${GAL_SHORT[k]} · ${state.galYear}</b></div><div class="gt-row"><span>median offer</span><b>${money(m)}</b></div><div class="gt-row"><span>vs market</span><b style="color:${diff>=0?'#2f8f5b':'#d9343b'}">${diff>=0?'+':'−'}${money(Math.abs(diff))}</b> <small>(all employers ${money(all)})</small></div><div class="gt-row"><span>filings</span><b>${c.toLocaleString()}</b> <small>= ${(100*c/tot).toFixed(1)}% of ${tot.toLocaleString()} ${GAL_SHORT[k].toLowerCase()} filings</small></div>`; tip.hidden=false; moveTip(ev);};
 const moveTip=ev=>{const r=cv.getBoundingClientRect(); const k=stageScale(); let x=(ev.clientX-r.left)/k+16, y=(ev.clientY-r.top)/k-10; if(x+300>r.width/k) x-=330; if(y+130>r.height/k) y-=120; tip.style.left=x+'px'; tip.style.top=y+'px';};
 svg.querySelectorAll('.gal-b').forEach(b=>{b.addEventListener('mouseenter',ev=>{if(!pinned()) hi(b.dataset.emp); showTip(b,ev);}); b.addEventListener('mousemove',moveTip); b.addEventListener('mouseleave',()=>{if(!pinned()) hi(null); tip.hidden=true;}); b.addEventListener('click',e=>{e.stopPropagation(); state.galEmployer=b.dataset.emp; hi(b.dataset.emp); root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxySide(root,hi); banner(); trails();});});
 svg.addEventListener('click',()=>{state.galEmployer=null; hi(null); root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxySide(root,hi); banner(); trails();});
 function trails(){const g=root.querySelector('#galTrails'); if(g){g.innerHTML=galTrailsSvg(); if(state.galEmployer) g.animate([{opacity:0},{opacity:1}],{duration:400,easing:'steps(4)'});}}
 root.trailsFn=trails;
 if(!root.dataset.galPlayBound){ root.dataset.galPlayBound=1; const pb=root.querySelector('[data-gal-play]'); pb.addEventListener('click',()=>{ if(root._play){cancelAnimationFrame(root._play.raf); const yEnd=GAL.years[Math.min(GAL.years.length-1,Math.round(root._play.t))]; root._play=null; pb.textContent='▶ PLAY'; state.galYear=yEnd; root.querySelector('.gal-svg').replaceWith((()=>{const d=document.createElement('div'); d.innerHTML=galaxySvg(); return d.firstChild})()); root.querySelectorAll('[data-gal-year]').forEach(x=>x.classList.toggle('active',+x.dataset.galYear===yEnd)); root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxy(); return;}
   pb.textContent='■ STOP';
   const Y=GAL.years; const P=Y.map(y=>{const m={}; galPoints(y).forEach(p=>{p.x=galX(p.c);p.y=galY(p.m);p.r=6+Math.sqrt(p.c)/3; m[p.id]=p}); return m;});
   const ids=[...new Set(P.flatMap(m=>Object.keys(m)))];
   const svg=root.querySelector('.gal-svg'); svg.querySelectorAll('.gal-b,.gal-lab,.gal-num,.gal-link').forEach(e=>e.remove());
   const trailsG=svg.querySelector('#galTrails');
   const layer=document.createElementNS('http://www.w3.org/2000/svg','g'); svg.appendChild(layer);
   const nodes={}; ids.forEach(id=>{const any=P.find(m=>m[id])[id]; const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.setAttribute('class','gal-b'); g.dataset.emp=any.e; g.dataset.k=any.k; g.dataset.id=id; const c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('fill',careerColor(families[any.k])); g.appendChild(c); const t=document.createElementNS('http://www.w3.org/2000/svg','text'); t.setAttribute('class','gal-lab'); t.textContent=any.s; g.appendChild(t); layer.appendChild(g); nodes[id]={g,c,t}; if(state.galEmployer&&any.e!==state.galEmployer) g.classList.add('dim'); if(state.galEmployer&&any.e===state.galEmployer) g.classList.add('hi');});
   const yearTag=document.createElementNS('http://www.w3.org/2000/svg','text'); yearTag.setAttribute('x',GAL.x1-10); yearTag.setAttribute('y',GAL.y1+70); yearTag.setAttribute('text-anchor','end'); yearTag.setAttribute('class','gal-yearbig'); svg.appendChild(yearTag);
   const PER=2600; let last=performance.now(); root._play={t:Y.indexOf(state.galYear),raf:0};
   const frame=now=>{ if(!document.body.contains(root)||!root._play) return; const dt=now-last; last=now; let t=root._play.t+dt/PER; if(t>Y.length-1) t=0; root._play.t=t; const i=Math.min(Y.length-2,Math.floor(t)), f=Math.min(1,t-i); const A=P[i],B=P[i+1];
     ids.forEach(id=>{const a=A[id],b=B[id],n=nodes[id]; let x,y,r,op; if(a&&b){x=a.x+(b.x-a.x)*f;y=a.y+(b.y-a.y)*f;r=a.r+(b.r-a.r)*f;op=1;} else if(a){x=a.x;y=a.y;r=a.r;op=1-f;} else if(b){x=b.x;y=b.y;r=b.r;op=f;} else {n.g.style.display='none';return;} n.g.style.display=''; n.c.setAttribute('cx',x);n.c.setAttribute('cy',y);n.c.setAttribute('r',r); n.g.style.opacity=op; n.t.setAttribute('x',x+r+4); n.t.setAttribute('y',y+4); n.t.style.display=(r>12||n.g.classList.contains('hi'))?'':'none';});
     const yShow=Y[Math.min(Y.length-1,Math.round(t))]; yearTag.textContent=Y[i]+' → '+Y[i+1]; if(yShow!==state.galYear){state.galYear=yShow; root.querySelectorAll('[data-gal-year]').forEach(x=>x.classList.toggle('active',+x.dataset.galYear===yShow)); if(trailsG) trailsG.innerHTML=galTrailsSvg();}
     root._play.raf=requestAnimationFrame(frame); };
   root._play.raf=requestAnimationFrame(frame); }); }
 if(!root.dataset.galChips){ root.dataset.galChips=1; root.querySelectorAll('[data-gal-year]').forEach(btn=>btn.addEventListener('click',()=>{const y=+btn.dataset.galYear; if(y===state.galYear) return; const svg=root.querySelector('.gal-svg'); const old={}; svg.querySelectorAll('.gal-b').forEach(b=>{const c=b.querySelector('circle'); old[b.dataset.id]=[+c.getAttribute('cx'),+c.getAttribute('cy')]}); state.galYear=y; const tmp=document.createElement('div'); tmp.innerHTML=galaxySvg(); const nu=tmp.firstChild; svg.replaceWith(nu); nu.querySelectorAll('.gal-b').forEach(b=>{const o=old[b.dataset.id]; const c=b.querySelector('circle'); if(o){const dx=o[0]-c.getAttribute('cx'),dy=o[1]-c.getAttribute('cy'); b.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:600,easing:'cubic-bezier(.3,.8,.4,1)'});} else b.animate([{opacity:0},{opacity:1}],{duration:500});}); root.querySelectorAll('[data-gal-year]').forEach(x=>x.classList.toggle('active',x===btn)); if(state.galEmployer&&!state._galByE[state.galEmployer]) state.galEmployer=null; root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxy(); })); }
 bindGalaxySide(root,hi); if(pinned()) hi(pinned()); banner();
 function banner(){const y=state.galYear; const t='data scientist'; const d=EXT_DATA.h1b[t].years[y]; const sel=state.galEmployer; const bt=root.querySelector('#galBannerText'); if(sel&&state._galByE[sel]){const a=state._galByE[sel]; const best=a.slice().sort((p,q)=>(q.m-q.all)-(p.m-p.all))[0]; bt.innerHTML=`${esc(galShort(sel)).toUpperCase()}: ${GAL_SHORT[best.k]} ${money(best.m)}<br>MARKET MEDIAN ${money(best.all)}`;} else { const top=d.top[0]; bt.innerHTML=`${esc(galShort(top.employer)).toUpperCase()} PAYS A DATA SCIENTIST ${money(top.median)}<br>MARKET MEDIAN ${money(d.median)}`; }}
}
function bindGalaxySide(root,hi){
 root.querySelectorAll('[data-gal-emp]').forEach(b=>{b.addEventListener('mouseenter',()=>{if(!state.galEmployer) hi(b.dataset.galEmp)}); b.addEventListener('mouseleave',()=>{if(!state.galEmployer) hi(null)}); b.addEventListener('click',()=>{state.galEmployer=b.dataset.galEmp; hi(state.galEmployer); root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxySide(root,hi); if(root.trailsFn) root.trailsFn();});});
 const c=root.querySelector('[data-gal-clear]'); if(c) c.addEventListener('click',()=>{state.galEmployer=null; hi(null); root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxySide(root,hi); if(root.trailsFn) root.trailsFn();});
}

function renderWorkIntro(){
 const body=`<div class="work-scenes"><div class="work-guide">Salary isn’t everything — where you work changes the day-to-day.</div><div class="work-scene"><div class="scene-art"></div><h2>Remote</h2><p>Home workspace, flexibility, different routines.</p></div><div class="work-scene office"><div class="scene-art"></div><h2>On-site</h2><p>Shared office, in-person collaboration, commute tradeoffs.</p></div></div>`;
 return pageShell('Where do you want to work?','Narrative transition — no graph yet',body);
}
function remoteDistSvg(){
 const W=1220,H=520,ml=235,mr=50,mt=28,mb=45,min=20000,max=500000;const x=v=>ml+(Math.max(min,Math.min(max,v))-min)/(max-min)*(W-ml-mr);let s=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}">`;
 for(let v=50000;v<=500000;v+=50000){const xx=x(v);s+=`<line class="gridline" x1="${xx}" y1="${mt}" x2="${xx}" y2="${H-mb}"/><text class="axis-value" x="${xx}" y="${H-17}" text-anchor="middle">${money(v)}</text>`}
 families.forEach((f,i)=>{const y=62+i*70,fd=DATA.familyData[f];s+=`<text x="${ml-15}" y="${y+4}" text-anchor="end" font-size="13" font-weight="900">${esc(shortName[f])}</text>`;['onsite','remote'].forEach((kind,k)=>{const w=fd.work[kind],col=kind==='onsite'?'#7250ca':'#f0aa32',yy=y+(k?12:-12),sample=(w?.sample||[]);const step=Math.max(1,Math.floor(sample.length/22));sample.filter((_,idx)=>idx%step===0).slice(0,24).forEach((v,j)=>{const jitter=((j*37)%9)-4;s+=`<circle cx="${x(v)}" cy="${yy+jitter}" r="3.2" fill="${col}" opacity=".55"><title>${kind}: ${money(v)}</title></circle>`});if(w){s+=`<line x1="${x(w.q1)}" y1="${yy}" x2="${x(w.q3)}" y2="${yy}" stroke="${col}" stroke-width="7" stroke-linecap="round"/><polygon points="${x(w.median)},${yy-7} ${x(w.median)+7},${yy} ${x(w.median)},${yy+7} ${x(w.median)-7},${yy}" fill="${col}" stroke="#2b2037" stroke-width="1"><title>${kind} median ${money(w.median)}</title></polygon>`}})});
 s+=`<text x="${W-205}" y="18" font-size="12" font-weight="900" fill="#7250ca">● On-site</text><text x="${W-105}" y="18" font-size="12" font-weight="900" fill="#d98d15">● Remote</text></svg>`;return s;
}
function payGapSvg(){
 const W=1220,H=520,ml=235,mr=70,mt=30,mb=45;const vals=families.map(f=>DATA.familyData[f].remoteGap);let maxAbs=Math.max(...vals.flatMap(v=>[Math.abs(v.diff||0),Math.abs(v.ci?.[0]||0),Math.abs(v.ci?.[1]||0)]),20000);maxAbs=Math.ceil(maxAbs/10000)*10000;const x=v=>ml+(v+maxAbs)/(2*maxAbs)*(W-ml-mr);let s=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}"><line x1="${x(0)}" y1="${mt}" x2="${x(0)}" y2="${H-mb}" stroke="#2c2139" stroke-width="3"/>`;
 for(let v=-maxAbs;v<=maxAbs;v+=maxAbs/4){const xx=x(v);s+=`<line class="gridline" x1="${xx}" y1="${mt}" x2="${xx}" y2="${H-mb}"/><text class="axis-value" x="${xx}" y="${H-18}" text-anchor="middle">${v===0?'0':(v>0?'+':'')+money(Math.abs(v))}</text>`}
 families.forEach((f,i)=>{const g=DATA.familyData[f].remoteGap,y=65+i*68,c=careerColor(f),lo=g.ci?.[0]??g.diff,hi=g.ci?.[1]??g.diff;s+=`<text x="${ml-15}" y="${y+5}" text-anchor="end" font-size="13" font-weight="900">${esc(shortName[f])}</text><line x1="${x(lo)}" y1="${y}" x2="${x(hi)}" y2="${y}" stroke="#786d80" stroke-width="3"/><polygon points="${x(g.diff)},${y-9} ${x(g.diff)+9},${y} ${x(g.diff)},${y+9} ${x(g.diff)-9},${y}" fill="${c}" stroke="#2c2139" stroke-width="2"><title>Remote − on-site median: ${g.diff>=0?'+':''}${money(Math.abs(g.diff))}; interval ${money(lo)} to ${money(hi)}</title></polygon>`});return s+'</svg>';
}
function renderRemote(){
 const chart=state.remoteView==='dist'?remoteDistSvg():payGapSvg();const body=`<div class="remote-card"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="chart-title">${state.remoteView==='dist'?'Salary constellations':'Remote pay gap'}</div><div style="font-size:12px;color:#685d70">${state.remoteView==='dist'?'Dots are salary observations; diamonds are medians; thick lines are IQRs.':'Difference = remote median − on-site median; line shows uncertainty interval where available.'}</div></div><div class="view-toggle"><button data-remote-view="dist" class="${state.remoteView==='dist'?'active':''}">Salary distributions</button><button data-remote-view="gap" class="${state.remoteView==='gap'?'active':''}">Explore Remote Pay Gap →</button></div></div><div class="remote-chart ${state._remoteChanged?'view-fade':''}">${chart}</div></div>`; state._remoteChanged=false; return pageShell('Remote vs. on-site','Two views in the same graph space',body);
}
function renderExperienceIntro(){
 const body=`<div class="stair-scene"><div class="chapter-copy">“We’ve explored where you work. But another factor can change salary even more: <strong>experience.</strong><br><br>Let’s climb the career ladder.”</div><div class="stairs">${[['Entry','28%','#eadbff'],['Mid','48%','#c9acf5'],['Senior','70%','#9470dd'],['Executive','94%','#5d36bb']].map(([n,h,c])=>`<div class="step" style="--h:${h};--c:${c}">${n}</div>`).join('')}</div></div>`;
 return pageShell('Experience matters','Entry → Mid → Senior → Executive',body);
}
function renderExperienceDistribution(){
 const chips=DATA.levels.map(l=>`<button data-level="${l.code}" class="${state.levelFocus===l.code?'active':''}" style="background:${levelColors[l.code]}">${esc(l.label)}</button>`).join('');
 const rows=families.map(f=>{const arr=DATA.familyData[f].experience;return `<div class="stack-row"><div class="lab">${esc(shortName[f])}</div><div class="stackbar">${arr.map(x=>`<div class="seg ${state.levelFocus?(x.code===state.levelFocus?'focus':'dim'):''}" style="--w:${x.share}%;--c:${levelColors[x.code]}"><span>${x.share>=8?Math.round(x.share)+'%':''}</span><title>${x.label}: ${x.n.toLocaleString()} salary records (${x.share.toFixed(1)}%)</title></div>`).join('')}</div></div>`}).join('');
 return pageShell('Who is represented in the salary records?','100% stacked bars — distribution of records, not workforce share',`<div class="stack-card"><div class="level-chips"><button data-level="" class="${state.levelFocus==null?'active':''}">All</button>${chips}</div>${rows}<div class="note" style="margin-top:15px;font-size:14px">Click an experience level to highlight it across all six careers.</div></div>`);
}
function waterfallSvg(f){
 const arr=DATA.familyData[f].experience;const W=940,H=510,ml=80,mr=35,mt=30,mb=65;const meds=arr.map(x=>x.median||0),max=Math.max(...meds)*1.15,min=0;const y=v=>H-mb-(v-min)/(max-min)*(H-mt-mb),bw=125,gap=62;let s=`<svg class="svg-chart" viewBox="0 0 ${W} ${H}">`;
 for(let v=0;v<=max;v+=50000){const yy=y(v);s+=`<line class="gridline" x1="${ml}" y1="${yy}" x2="${W-mr}" y2="${yy}"/><text class="axis-value" x="${ml-9}" y="${yy+4}" text-anchor="end">${money(v)}</text>`}
 let prev=0;arr.forEach((xv,i)=>{const x=ml+80+i*(bw+gap),med=xv.median||0;if(i===0){const yy=y(med);s+=`<rect x="${x}" y="${yy}" width="${bw}" height="${H-mb-yy}" fill="${levelColors[xv.code]}"/>`}else{const y1=y(prev),y2=y(med),top=Math.min(y1,y2),h=Math.abs(y1-y2);s+=`<rect x="${x}" y="${top}" width="${bw}" height="${Math.max(h,2)}" fill="${levelColors[xv.code]}"/><line x1="${x-gap}" y1="${y1}" x2="${x}" y2="${y1}" stroke="#6d6371" stroke-dasharray="4 4"/>`}s+=`<text x="${x+bw/2}" y="${y(med)-9}" text-anchor="middle" font-size="14" font-weight="900">${money(med)}</text><text x="${x+bw/2}" y="${H-35}" text-anchor="middle" font-size="13" font-weight="900">${esc(xv.label)}</text><text x="${x+bw/2}" y="${H-18}" text-anchor="middle" font-size="10">n=${xv.n.toLocaleString()}</text>`;prev=med});return s+'</svg>';
}
function renderWaterfall(){const buttons=families.map(f=>`<button data-waterfall="${esc(f)}" class="${f===state.waterfallFamily?'active':''}">${esc(shortName[f])}</button>`).join('');return pageShell('Salary steps','One career at a time — median salary progression',`<div class="waterfall-layout"><div class="waterfall-card"><div class="chart-title">${esc(shortName[state.waterfallFamily])}</div>${waterfallSvg(state.waterfallFamily)}</div><div class="career-vertical">${buttons}</div></div>`)}
function renderFutureIntro(){const f=state.selectedFamily;return pageShell('What about the future?','Growth and opportunities beyond salary',`<div class="future-road"><div class="future-copy">“We’ve explored how salaries change as you gain experience.<br><br><strong>Now let’s look at where these six careers might be heading.</strong>”</div><div class="future-guide"><img src="${avatarSrc(f)}" onerror="this.src='${rawAvatarSrc(f)}'" alt="${esc(meta[f].name)}"></div><div class="road"></div></div>`)}
function bubbleSvg(){
 const W=1000,H=500,ml=80,mr=40,mt=30,mb=65;const xs=families.map(f=>DATA.blsFamily[f].growth);const ys=families.map(f=>state.futureView==='salary'?DATA.blsFamily[f].wageIndicator:DATA.blsFamily[f].openingsPer1000);const xMin=Math.min(...xs)-2,xMax=Math.max(...xs)+2,yMin=state.futureView==='salary'?Math.min(...ys)*.9:Math.max(0,Math.min(...ys)*.8),yMax=Math.max(...ys)*1.1;const x=v=>ml+(v-xMin)/(xMax-xMin)*(W-ml-mr),y=v=>H-mb-(v-yMin)/(yMax-yMin)*(H-mt-mb);let s=`<svg id="futureSvg" class="svg-chart" viewBox="0 0 ${W} ${H}">`;
 for(let k=0;k<5;k++){const v=xMin+(xMax-xMin)*k/4,xx=x(v);s+=`<line class="gridline" x1="${xx}" y1="${mt}" x2="${xx}" y2="${H-mb}"/><text class="axis-value" x="${xx}" y="${H-25}" text-anchor="middle">${v.toFixed(0)}%</text>`}
 families.forEach((f,i)=>{const b=DATA.blsFamily[f],yyVal=state.futureView==='salary'?b.wageIndicator:b.openingsPer1000,rr=14+Math.sqrt(Math.max(1,b.employment))/55,c=careerColor(f),selected=f===state.futureFamily;s+=`<circle class="future-bubble" data-future="${esc(f)}" cx="${x(b.growth)}" cy="${y(yyVal)}" r="${rr}" fill="${c}" fill-opacity="${selected?'.95':'.65'}" stroke="${selected?'#2e213c':'#fff'}" stroke-width="${selected?4:2}" style="cursor:pointer;transition:cx .5s,cy .5s,r .35s,opacity .35s"><title>${esc(f)}: growth ${b.growth.toFixed(1)}%, ${state.futureView==='salary'?'wage '+money(b.wageIndicator):'openings per 1,000 '+b.openingsPer1000.toFixed(1)}</title></circle><text x="${x(b.growth)}" y="${y(yyVal)-rr-7}" text-anchor="middle" font-size="11" font-weight="900">${esc(shortName[f])}</text>`});s+=`<text x="${W/2}" y="${H-5}" text-anchor="middle" font-size="13" font-weight="900">Projected employment growth (%)</text></svg>`;return s;
}
function renderFuture(){const b=DATA.blsFamily[state.futureFamily];const body=`<div class="bubble-layout"><div class="bubble-card"><div class="view-toggle" style="position:absolute;right:18px;top:15px;z-index:5"><button data-future-view="salary" class="${state.futureView==='salary'?'active':''}">Growth vs wage</button><button data-future-view="openings" class="${state.futureView==='openings'?'active':''}">Growth vs openings</button></div>${bubbleSvg()}</div><div class="bubble-side"><div class="career-mini">${esc(shortName[state.futureFamily])}</div><div class="metric">Projected growth<strong>${pct(b.growth)}</strong></div><div class="metric">BLS wage indicator<strong>${money(b.wageIndicator)}</strong></div><div class="metric">Annual openings<strong>${Math.round(b.openings).toLocaleString()}</strong></div><div class="metric">Openings / 1,000 employed<strong>${b.openingsPer1000.toFixed(1)}</strong></div><div class="proxy-note">These future metrics are BLS occupational-family proxies, not individual hiring probabilities.</div></div></div>`;return pageShell('The future of these careers','Switch the vertical measure; bubbles animate in the same graph space',body)}
function radarSvg(){
 const W=690,H=560,cx=345,cy=278,R=184,axes=['Salary','Remote Work','Salary Progression','Future Growth','Job Opportunities'];
 const angle=i=>-Math.PI/2+i*2*Math.PI/5;
 const rawLabel=(a,v)=>a==='Salary'||a==='Salary Progression'?money(v):a==='Job Opportunities'?`${Number(v).toFixed(1)} / 1k`:pct(v);
 const scorePoint=(f,a,i)=>{const score=Number(DATA.radar[f][a].score);if(!Number.isFinite(score)||score<=0)throw new Error(`Invalid radar score for ${f} / ${a}: ${score}`);const sc=Math.min(100,score)/100;return [cx+Math.cos(angle(i))*R*sc,cy+Math.sin(angle(i))*R*sc]};
 let s=`<svg class="svg-chart radar-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Career Passport radar chart. Each spoke is the raw metric divided by the highest raw value among the six careers, so 100 means the largest value among the six careers for that metric.">`;
 for(let q=25;q<=100;q+=25){const pts=axes.map((_,i)=>[cx+Math.cos(angle(i))*R*q/100,cy+Math.sin(angle(i))*R*q/100]);s+=`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${q===100?'#b7a8c6':'#ddd4e5'}" stroke-width="${q===100?1.7:1}"/><text x="${cx+7}" y="${cy-R*q/100+11}" font-size="10" fill="#776a80">${q}</text>`}
 axes.forEach((a,i)=>{const x=cx+Math.cos(angle(i))*R,y=cy+Math.sin(angle(i))*R;const lx=cx+Math.cos(angle(i))*(R+54),ly=cy+Math.sin(angle(i))*(R+54);s+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#c9bfce"/><text class="radar-axis-title" x="${lx}" y="${ly-4}" text-anchor="middle">${a}</text><text class="radar-axis-value" x="${lx}" y="${ly+13}" text-anchor="middle">${rawLabel(a,DATA.radar[state.selectedFamily][a].raw)}</text>`});
 function shape(f,fill,opacity,dash=''){const pts=axes.map((a,i)=>scorePoint(f,a,i));return `<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" fill-opacity="${opacity}" stroke="${fill}" stroke-width="4" ${dash?`stroke-dasharray="${dash}"`:''}/>`}
 const mainColor=careerColor(state.selectedFamily);s+=shape(state.selectedFamily,mainColor,.28);
 if(state.compareFamily&&state.compareFamily!==state.selectedFamily)s+=shape(state.compareFamily,careerColor(state.compareFamily),.12,'9 6');
 axes.forEach((a,i)=>{const p=scorePoint(state.selectedFamily,a,i);s+=`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#fff" stroke="${mainColor}" stroke-width="3"><title>${esc(shortName[state.selectedFamily])} · ${a}: ${rawLabel(a,DATA.radar[state.selectedFamily][a].raw)} · score ${DATA.radar[state.selectedFamily][a].score.toFixed(1)}/100</title></circle>`;if(state.compareFamily&&state.compareFamily!==state.selectedFamily){const q=scorePoint(state.compareFamily,a,i),c=careerColor(state.compareFamily);s+=`<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#fff" stroke="${c}" stroke-width="2.5"><title>${esc(shortName[state.compareFamily])} · ${a}: ${rawLabel(a,DATA.radar[state.compareFamily][a].raw)} · score ${DATA.radar[state.compareFamily][a].score.toFixed(1)}/100</title></circle>`}});
 const legend=[`<span><i style="background:${mainColor}"></i>Your career: <b>${esc(shortName[state.selectedFamily])}</b></span>`];if(state.compareFamily&&state.compareFamily!==state.selectedFamily)legend.push(`<span><i class="dash" style="--lc:${careerColor(state.compareFamily)}"></i>Comparison: <b>${esc(shortName[state.compareFamily])}</b></span>`);s+=`<foreignObject x="155" y="515" width="380" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="radar-legend">${legend.join('')}</div></foreignObject>`;
 return s+'</svg>';
}
function radarRawRows(f){const r=DATA.radar[f];return `<div class="metric"><strong>${money(r['Salary'].raw)}</strong> median salary</div><div class="metric"><strong>${pct(r['Remote Work'].raw)}</strong> remote salary records</div><div class="metric"><strong>${money(r['Salary Progression'].raw)}</strong> entry→executive median increase</div><div class="metric"><strong>${pct(r['Future Growth'].raw)}</strong> projected BLS proxy growth</div><div class="metric"><strong>${r['Job Opportunities'].raw.toFixed(1)}</strong> annual openings / 1,000 (proxy)</div>`}
function renderPassport(){
 const opts=families.filter(f=>f!==state.selectedFamily).map(f=>`<button data-compare="${esc(f)}" class="${state.compareFamily===f?'active':''}">${esc(shortName[f])}</button>`).join('');
 const compareBlock=state.compareFamily?`<div class="compare-raw"><strong>${esc(shortName[state.compareFamily])}</strong>${radarRawRows(state.compareFamily)}</div>`:'';
 const body=`<div class="passport-layout"><div class="passport-card"><div class="chart-title">Career Passport</div><div class="radar-method">Outer ring = 100. For each spoke, the raw value is divided by the highest raw value among the six careers.</div>${radarSvg()}</div><div class="passport-side"><div class="scrap-label" style="background:${careerColor(state.selectedFamily)}">${esc(shortName[state.selectedFamily])}</div><div class="raw-heading">Your original values</div>${radarRawRows(state.selectedFamily)}<h3>Compare with one other career</h3><div class="compare-buttons"><button data-compare="" class="${!state.compareFamily?'active':''}">My career only</button>${opts}</div>${compareBlock}<div class="proxy-note"><strong>How to read this:</strong> a larger polygon means larger values on these five metrics, not “better fit.” Salary, Remote Work, and Salary Progression come directly from the salary records. Future Growth and Job Opportunities are BLS occupational-family proxies.</div></div></div>`;return pageShell('Your Career Passport','Starts with your career only; compare with exactly one other career',body)}
function renderRefs(){
 const sources=DATA.meta.sources||[];return pageShell('References & methods','What the story uses — and what it does not claim',`<div class="refs"><div class="ref-card"><h2>Data sources</h2><ul><li><strong>Salary sample:</strong> processed U.S. salary records used for career medians, quartiles, distributions, remote/on-site and experience views.</li><li><strong>BLS OEWS / Employment Projections:</strong> occupational wage indicators, employment, growth, openings and state occupational employment.</li><li><strong>BLS Employment Projections 2016–26 (archived release, Table 1.10):</strong> annual job openings per 1,000 jobs for the past ten years, used for the left column of “Which door stays open in 2035?”. That release used the 2010 SOC, so data scientists, database architects and software QA testers are represented by the closest occupations then published.</li><li><strong>O*NET:</strong> skill context for role descriptions and Career Passport supporting context.</li><li><strong>Regional / industry context:</strong> used only where the underlying data supports the requested relationship.</li></ul></div><div class="ref-card"><h2>Important interpretation notes</h2><ul><li>Experience percentages describe the <em>salary records</em>, not the U.S. workforce.</li><li>Remote pay gaps are differences in medians in the salary sample; they are not causal estimates.</li><li>State career-mix percentages use published values available for the six mapped career families and display missing values as N/A.</li><li>BLS has no machine-learning-engineer occupation; O*NET's closest match is 15-2051 Data Scientists. On the map, AI &amp; ML = 15-1221 research scientists plus an estimated ${Math.round((DATA.meta.aiGeoAdjust?.alpha||0)*100)}% of each state's Data Science employment (applied AI/ML ÷ (applied AI/ML + Data Science) records in the salary sample); Data Science is reduced by the same amount. This is an estimate.</li><li>On the map, Data Engineering &amp; Architecture = database administrators + architects (15-1242, 15-1243) and Systems, Cloud &amp; Security = systems analysts, information security analysts, network architects and network/computer systems administrators (15-1211, 15-1212, 15-1241, 15-1244), BLS OEWS May 2025 — the same occupation groups used on the Future page.</li><li>Future Growth and Job Opportunities in the Passport are family-level BLS proxies.</li></ul><div class="note" style="margin-top:20px">The goal is exploration, not a promise about an individual salary or hiring probability.</div></div></div>`)}
function render(opts){
 if(!DATA)return; const pages=[renderCover,renderTree,renderMap,renderSalaryGame,renderQuartiles,renderGalaxy,renderRace,renderFlower]; stage.innerHTML=pages[state.page](); updateSidePager(); introToken++; if(!(opts&&opts.intro&&playTitleIntro())) bind();
}
function bind(){
 if(window.bindCoverV16)window.bindCoverV16({stage,state,families,meta,shortName,esc,setPage});
 stage.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;const d=btn.dataset.nav;setPage(state.page+(d==='next'?1:-1))}));
 stage.querySelectorAll('[data-family]').forEach(btn=>btn.addEventListener('click',async()=>{const f=btn.dataset.family;state.selectedFamily=f;state.flowerFamily=f;state.waterfallFamily=f;state.futureFamily=f;state.compareFamily=null;state.selectedRole=0;btn.animate([{transform:'translateY(-8px) scale(1)'},{transform:'translateY(-14px) scale(1.035)'},{transform:'translateY(-8px) scale(1)'}],{duration:300});await wait(210);setPage(2)}));
 fitPiles();
 stage.querySelectorAll('[data-role]').forEach(btn=>{const i=+btn.dataset.role;btn.addEventListener('click',()=>{if(i===state.selectedRole)return;const st=btn.querySelector('.pile-stack');if(st)st.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'translateY(0)'}],{duration:260});updateTreeRole(i)})});
 bindTreeFamilyButtons();
 stage.querySelectorAll('[data-state]').forEach(p=>p.addEventListener('click',()=>updateMapState(p.dataset.state)));
 bindPlaceFall();
 bindSalaryGame();
 bindRidge();
 bindRace();
 bindDoors();
 bindGalaxy();
 stage.querySelectorAll('[data-place-family]').forEach(b=>b.addEventListener('click',()=>{const f=b.dataset.placeFamily;if(f===state.selectedFamily)return;state.selectedFamily=f;state.flowerFamily=f;state.waterfallFamily=f;state.futureFamily=f;state.benchmarkFamily=f;state.compareFamily=null;state.selectedRole=0;render()}));
 stage.querySelectorAll('[data-map-mode]').forEach(b=>b.addEventListener('click',()=>updateMapMode(b.dataset.mapMode)));
 bindFlower();
 stage.querySelectorAll('[data-bench]').forEach(c=>c.addEventListener('click',()=>{state.benchmarkFamily=c.dataset.bench;render()}));
 stage.querySelectorAll('[data-remote-view]').forEach(b=>b.addEventListener('click',()=>{if(state.remoteView===b.dataset.remoteView)return;state.remoteView=b.dataset.remoteView;state._remoteChanged=true;render()}));
 stage.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{state.levelFocus=b.dataset.level||null;render()}));
 stage.querySelectorAll('[data-waterfall]').forEach(b=>b.addEventListener('click',()=>{state.waterfallFamily=b.dataset.waterfall;render()}));
 stage.querySelectorAll('[data-future-view]').forEach(b=>b.addEventListener('click',()=>{if(state.futureView===b.dataset.futureView)return;state.futureView=b.dataset.futureView;render()}));
 stage.querySelectorAll('[data-future]').forEach(c=>c.addEventListener('click',()=>{state.futureFamily=c.dataset.future;render()}));
 stage.querySelectorAll('[data-compare]').forEach(b=>b.addEventListener('click',()=>{state.compareFamily=b.dataset.compare||null;render()}));
}
function bindFlower(){
 const ws=stage.querySelector('#flowerWorkspace'); if(!ws)return;
 const petals=[...stage.querySelectorAll('[data-petal]')];
 petals.forEach(p=>p.addEventListener('click',()=>{
   const f=p.dataset.petal;
   if(state.flowerExpanded && f===state.flowerFamily){p.classList.remove('petal-flash');void p.offsetWidth;p.classList.add('petal-flash');return;}
   state.flowerFamily=f;
   petals.forEach(x=>x.classList.toggle('selected',x.dataset.petal===f));
   const hp=stage.querySelector('#histPanel');
   if(!state.flowerExpanded){state.flowerExpanded=true;ws.classList.add('expanded');hp.innerHTML=histPanelHtml(f);hp.animate([{opacity:0,transform:'translateX(60px)'},{opacity:1,transform:'none'}],{duration:520,easing:'cubic-bezier(.2,.75,.2,1)'});}
   else{hp.animate([{opacity:1},{opacity:.15},{opacity:1}],{duration:330});hp.innerHTML=histPanelHtml(f);}
   bindCloseHist();
 }));
 bindCloseHist();
}
function bindCloseHist(){const c=stage.querySelector('#closeHist');if(!c)return;c.onclick=()=>{const ws=stage.querySelector('#flowerWorkspace');if(ws){ws.classList.remove('expanded');state.flowerExpanded=false;const hp=stage.querySelector('#histPanel');if(hp)hp.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateX(60px)'}],{duration:420})}}}
window.__CAREER_TEST__={state,render,setPage,renderFlower,renderMap,renderTree};
if(window.__STORY__){DATA=adjustAiGeography(window.__STORY__);render();}else{fetch('data/story.json').then(r=>{if(!r.ok)throw new Error('Could not load story data');return r.json()}).then(d=>{DATA=adjustAiGeography(d);render()}).catch(err=>{stage.innerHTML=`<div style="padding:50px;background:white;color:#222"><h1>Could not load the project data.</h1><p>${esc(err.message)}</p></div>`});}
})();
