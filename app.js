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
const state={page:0, targetSalary:null, selectedFamily:families[0], selectedRole:0, selectedState:null, mapMode:'mix', flowerFamily:families[0], flowerExpanded:false, remoteView:'dist', levelFocus:null, waterfallFamily:families[0], futureView:'salary', futureFamily:families[0], compareFamily:null, storyOpen:null, unlocked:false, summaryCompare:null, whyStep:0};
const TOTAL=14;
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
let sidePager=null, pagerJump=false;   // pagerJump: the page change comes from the side pager
function updateSidePager(){
 if(!sidePager){
  sidePager=document.createElement('nav'); sidePager.id='side-pager'; sidePager.setAttribute('aria-label','Pages');
  sidePager.innerHTML=Array.from({length:TOTAL},(_,i)=>`<button type="button" data-goto="${i}" title="Page ${i+1}" aria-label="Go to page ${i+1}"></button>`).join('')+'<div class="sp-count"></div>'
   +'<button type="button" class="sp-restart" title="Start over" aria-label="Start over from the cover"><i>↺</i><span>START<br>OVER</span></button>';
  sidePager.querySelector('.sp-restart').addEventListener('click',restartStory);
  sidePager.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>{ pagerJump=true; setPage(+b.dataset.goto); pagerJump=false; }));
  (document.getElementById('viewport')||document.body).appendChild(sidePager);
 }
 sidePager.querySelectorAll('[data-goto]').forEach(b=>{const on=+b.dataset.goto===state.page; b.classList.toggle('active',on); if(on)b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');});
 sidePager.querySelector('.sp-count').innerHTML=`${String(state.page+1).padStart(2,'0')}<span>/${TOTAL}</span>`;
 // START OVER keeps its place in the column (so the page squares never move) and fades: in after the cover, out on the
 // last page (which has its own Start over button)
 sidePager.querySelector('.sp-restart').classList.toggle('off',state.page===0||state.page===TOTAL-1);
}
// o.hideNext: start with Next hidden (the page reveals it itself, e.g. the race page after the first race)
// o.showNext: always show Next (a page story, even on pages that otherwise hide it)
// Arriving by Back or the side pager (state.arrivedBack) also shows Next, except on the welcome page (its own I'm ready! button)
// o.restart: a START OVER button in place of Next (the last page)
function nav(o={}){
 if(o.restart) return `<div class="navbar"><button class="nav-btn" data-nav="back">← Back</button><button type="button" class="nav-btn next" data-restart>↺ Start over</button></div>`;
 return `<div class="navbar"><button class="nav-btn" data-nav="back" ${state.page===0?'disabled':''}>← Back</button><button class="nav-btn next" data-nav="next" ${state.page===TOTAL-1?'disabled':''} ${state.page===TOTAL-1||(!o.showNext&&(NO_NEXT_BUTTON.has(state.page)||o.hideNext)&&!(state.arrivedBack&&state.page!==1))?'hidden':''}>${state.page===0?'Start Exploring':'Next'} →</button></div>`;
}
function pageShell(title,kicker,body,cls=''){return `<section class="page ${cls}">${top(title,kicker)}<div class="content">${body}</div>${nav()}</section>`}
// Page changes: no overlays. Going forward, the new page opens with a title intro:
// only the title shows, centred on the stage; it glides up into its place, then the rest of the page fades in.
function playTransition(from,to){
 // The career picked on the cover is "home". Switching career inside a page only affects that page:
 // every page you arrive at starts again on the home career.
 if(from===0) state.homeFamily=state.selectedFamily;
 resetToHomeFamily();
 // a story page opens on its story when you arrive going forward; coming back from a later page shows the page itself
 state.storyOpen = to>from && PAGE_STORIES[to] ? to : null;
 // arriving by Back or by the side pager (either direction): pages that make you finish something first (coin game,
 // level game, race, the door) show Next at once. Only stepping forward with Next makes you finish them.
 state.arrivedBack = to<from || pagerJump;
 // the key-and-door page: arriving going forward, you open the door again; coming back from a later page, it is open
 if(to===UNLOCK_PAGE){ state.unlocked = to<from; state.summaryCompare=null; }
 // the level-up game always starts at ENTRY; coming back from a later page (already cleared), Next is shown right away
 if(to===LEVEL_PAGE) state.levelDone = to<from;
 if(to===WHY_PAGE) state.whyPick=null;   // the reasons page starts with the reader's own career
 // the pay-and-people ring: going forward, the blocks grow out to their pay again; coming back, it shows them grown
 if(to===LVMAP_PAGE){ state.lvmStep = to<from ? 2 : 1; state.lvmAnim=false; state.lvmPick=null; }
 // the openings split page: going forward it builds up again (step 1 → 2); coming back, it shows the finished chart
 state.page=to; render({intro: to>from && to>0 && !NO_TITLE_INTRO.has(to)});
}
function resetToHomeFamily(){
 const f=state.homeFamily||state.selectedFamily;
 state.selectedFamily=f; state.flowerFamily=f; state.waterfallFamily=f; state.futureFamily=f; state.benchmarkFamily=f;
 state.compareFamily=null; state.selectedRole=0;
}
// pages (0-based) that appear directly, without the centred-title intro: 5 = "Which mountain do you land on?" (comes straight after the coin game),
// 10 = "Which door stays open in 2035?" (its own entrance is the fellows running in)
const NO_TITLE_INTRO=new Set([5,10]);
// pages (0-based) without a Next button: 1 = the welcome page (its "I'm ready!" button moves on), 4 = the coin game (you move on by grabbing the coin)
const NO_NEXT_BUTTON=new Set([1,4]);
// Pages (0-based) that open with a short story under the title: a bridge from the last page, what this page shows,
// how to read it and why it matters. The story page carries the page's own title, so when the first Next fades the
// story out and renders the page itself, the title stays put; the next Next moves on. (Texts: "Page stories" below.)
const PAGE_STORIES={
 2:{title:'What responsibility to land on?',html:()=>treeStoryHtml()},
 3:{title:'What place to land on?',html:()=>placeStoryHtml()},
 4:{title:'What salary to land on?',html:()=>salaryStoryHtml()},
 6:{title:'Which industry pays the most, year by year?',html:()=>galaxyStoryHtml()},
 7:{title:'Level up: from Entry to Executive',html:()=>levelStoryHtml()},
 8:{title:'Where is the pay, and where are the people?',html:()=>lvmStoryHtml()},
 9:{title:'Race to 2035: which career opens the most doors?',html:()=>raceStoryHtml()},
 11:{title:'Why do some careers open more doors?',html:()=>whyStoryHtml()}
};
// the story always shows a Next button, even on pages that hide theirs (the coin game, the race)
function storyPageHtml(p){const s=PAGE_STORIES[p]; return `<section class="page piles-page story-page"><h1 class="px-title">${esc(s.title)}</h1>${s.html()}${nav({showNext:true})}</section>`;}
let storyLeaving=false;
// set by a page that animates before leaving (page 10: the fellow runs off); returns true when it handles Next itself
let nextHook=null;
function openStoryPage(){
 if(storyLeaving) return; storyLeaving=true;            // a double click must not skip straight to the next page
 const go=()=>{ storyLeaving=false; if(state.storyOpen!==state.page) return;   // left the page (Back) during the fade
  state.storyOpen=null; render();
  // fade in everything under the title (the navbar stays as it is)
  const sec=stage.querySelector('.page'); if(sec) [...sec.children].forEach(el=>{ if(el.tagName!=='H1'&&!el.classList.contains('navbar')) el.animate([{opacity:0},{opacity:1}],{duration:500,easing:'ease-out'}); });
 };
 const s=stage.querySelector('.page-story');
 if(s) s.animate([{opacity:1},{opacity:0}],{duration:250,easing:'ease-in',fill:'forwards'}).finished.then(go,go); else go();
}
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
// START OVER (side pager, and the button on the last page): back to the cover, where a career can be picked again
function restartStory(){ pagerJump=true; setPage(0); pagerJump=false; }
function selectedData(){return DATA.familyData[state.selectedFamily]}
function renderCover(){
 if(window.renderCoverV16) return window.renderCoverV16({state,families,meta,shortName,esc,total:TOTAL});
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
/* ---------- Page 2: Welcome — the fellow picked on the cover congratulates you, says what the job is, and maps the journey ---------- */
// One job title + a plain-language description per career (the family is a group of BLS occupations; the title is
// the role most people in it would recognise).
const WELCOME={
 'Data Science & Analytics':{role:'Data Scientist',what:'Data scientists turn messy data into evidence people can act on. You will frame questions, clean and explore data, build statistical and machine-learning models, and explain what the numbers mean.'},
 'AI & Machine Learning':{role:'Machine Learning Engineer',what:'Machine learning engineers and AI researchers build systems that learn from data. You will train and test models, then turn them into products that can predict, see, read or talk.'},
 'Data Engineering & Architecture':{role:'Data Engineer',what:'Data engineers build the pipelines and platforms everything else runs on. You will collect data from many sources, clean and store it, and keep it flowing reliably to the people and apps that need it.'},
 'Software Engineering':{role:'Software Engineer',what:'Software engineers design, build, test and maintain the software people use every day, from apps and websites to the systems running behind them.'},
 'Systems, Cloud & Security':{role:'Cloud & Security Engineer',what:'Cloud and security engineers keep technology running. You will set up servers, networks and cloud platforms, and protect them from outages and attacks.'},
 'Data & Technology Management':{role:'Data & Tech Manager',what:'Data and technology managers lead the people and the plan. You will set priorities, coordinate teams, look after budgets and data rules, and make sure projects get delivered.'}
};
// The stops of the story, in page order (the first is the next page, "What responsibility to land on?")
const JOURNEY=[
 ['Jobs','which job titles you could land on'],
 ['Places','where in the U.S. the jobs are'],
 ['Pay','guess your salary, then compare careers'],
 ['Industries','which industry pays the most'],
 ['Levels','pay and people, Entry to Executive'],
 ['2035','whose jobs grow, which doors stay open'],
 ['Summary','unlock your career summary']
];
function renderWelcome(){
 const f=state.homeFamily||state.selectedFamily, m=meta[f], w=WELCOME[f];
 // --d = when each line appears; the CSS animations are paused during the title intro, so they start after it
 const stops=JOURNEY.map(([t,s],i)=>`<li style="--d:${(2+i*.18).toFixed(2)}s"><span class="wj-n"></span><b>${esc(t)}</b><small>${esc(s)}</small></li>`).join('');
 return `<section class="page piles-page welcome-page" style="--c:${careerColor(f)}"><h1 class="px-title">Welcome to the world of ${esc(f)}!</h1>`
  +`<div class="welcome-layout"><div class="welcome-hero"><div class="welcome-stack" role="img" aria-label="${esc(m.name)}"><img class="ws-props" src="assets/cover/${m.key}-props.webp" alt=""><img class="ws-person" src="assets/cover/${m.key}-person.webp" alt=""></div><div class="welcome-tag"><b>${esc(m.name)}</b><span>${esc(shortName[f])}</span></div></div>`
  +`<div class="welcome-talk"><div class="welcome-bubble"><p class="wl" style="--d:.2s"><span class="wl-hi">Hi, I'm ${esc(m.name)}!</span> From today, you're a <mark>${esc(w.role)}</mark>.</p><p class="wl" style="--d:.8s">${esc(w.what)}</p><p class="wl" style="--d:1.3s">We'll make seven stops together. Our first stop: <b>What responsibility to land on?</b></p></div>`
  +`<div class="welcome-journey"><div class="wj-title wl" style="--d:1.8s">The journey ahead</div><ol class="wj-path">${stops}</ol></div>`
  +`<div class="welcome-ready wl" style="--d:3.4s"><div class="wr-ask">Are you ready for it?</div><button class="nav-btn next welcome-go" data-nav="next">I'm ready! →</button></div></div></div>${nav()}</section>`;
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
/* ---------- Page stories (PAGE_STORIES): read under the title before the page itself ----------
   Each is: a lead line (bridge from the last page), 2-3 short paragraphs (what / how to read it / why it matters) and a
   closing question in red. Lines appear one by one; the CSS animations wait for the title intro (.intro-hold). */
function storyHtml(lead,paras,ask){
 const D=[.2,.9,1.7,2.5,3.3,4.1]; let i=0; const p=(cls,h)=>`<p class="${cls}wl" style="--d:${D[i++]}s">${h}</p>`;
 return `<div class="page-story" style="--c:${careerColor(state.selectedFamily)}">${p('ps-lead ',lead)}${paras.map(h=>p('',h)).join('')}${p('ps-ask ',ask)}</div>`;
}
function treeStoryHtml(){
 const f=state.selectedFamily, m=meta[f], t=selectedData().roles.slice(0,3).map(r=>`<b>${esc(r.title)}</b>`);
 return storyHtml(`Our first stop starts with a surprise:<br><mark>one career, many jobs.</mark>`,[
  `${esc(m.name)} and 99 friends all work in <b>${esc(f)}</b>, yet they don't share one job title. They get hired as ${t[0]}, ${t[1]}, ${t[2]} and more, and each title means different work every day. When you look for a job, these titles are what you'll search for.`,
  `Next, all 100 fellows drop onto the 10 most common job titles in your career. Each fellow is about 1% of the people holding those titles in our salary data, so the taller the pile, the more common the job.`],
  `Before they fall: where do you think most of them will land?`);
}
function placeStoryHtml(){
 const f=state.selectedFamily, m=meta[f], s=shortName[f];
 return storyHtml(`You know the jobs. Now, <mark>where</mark> are they?`,[
  `${esc(m.name)}'s friends don't all live in one place. <b>${esc(s)}</b> jobs are spread unevenly across the U.S.: a few states hold a big share of them, while others have only a handful. And more jobs nearby means more employers to choose from.`,
  `Next, the fellows drop onto the map. The darker a state, the bigger its share of all U.S. ${esc(s)} jobs (U.S. government data, May 2025). Click any state to see how the six careers split there.`],
  `Before they land: which state do you think has the most?`);
}
function salaryStoryHtml(){
 const f=state.selectedFamily, m=meta[f];
 return storyHtml(`Now, let's talk <mark>money</mark>.`,[
  `You know what you'd do and where. Next comes the question everyone wonders about but rarely asks out loud: <b>how much could you earn as a ${esc(WELCOME[f].role)}?</b>`,
  `First, a quick game. Help ${esc(m.name)} run with <b>← →</b>, jump with <b>↑</b> or <b>space</b>, and grab the coin. Then tell us the salary you'd like to earn each year, and on the next page see how it compares with about 19,000 real 2024 U.S. salaries.`],
  `Ready? Go grab that coin!`);
}
function galaxyStoryHtml(){
 const f=state.selectedFamily, r=WELCOME[f].role;
 return storyHtml(`Same job, different <mark>industry</mark>, different pay.`,[
  `You've seen what each career pays. But a ${esc(r)} can work almost anywhere: a bank, a hospital, a tech company, even the government. <b>The industry you pick changes both how many jobs there are and how much they pay.</b>`,
  `Next, each dot is one career inside one industry. The higher the dot, the more it pays; the further right, the more people it hires. Press PLAY to watch 2015 to 2025 unfold, or click an industry to follow it across all six careers.`],
  `Guess: does the biggest employer also pay the most?`);
}
function raceStoryHtml(){
 const m=meta[state.selectedFamily];
 return storyHtml(`Now, let's look ahead to <mark>2035</mark>.`,[
  `So far, everything has been about jobs today. But you're choosing a career for the next ten years. <b>Which career will open the most doors for newcomers like you?</b>`,
  `Next is a race. Bet on a career, then watch the six fellows run. Each runner's speed is its <b>job openings</b>: how many jobs open up each year for every 1,000 jobs, from 2025 to 2035 (official U.S. government projections). A job opens up when the career grows, or when someone retires or switches careers.`],
  `Place your bet: will ${esc(m.name)} win the race?`);
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
 return `<div class="place-legend"><span>fewer</span>${[0,1,2,3,4].map(b=>`<i style="background:${placeFill(b)}"></i>`).join('')}<span>more ${esc(shortName[state.selectedFamily])} jobs</span></div>`;
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
// the side panel before any state is picked (first visit): a prompt and a pixel arrow pointing left at the map
function placePromptHtml(){
 return `<div class="px-side-title">Pick a state</div>
 <div class="place-stat">Click any state on the map to see how its jobs split across the six careers, and its share of all U.S. <b>${esc(shortName[state.selectedFamily])}</b> jobs.</div>
 <div class="place-hint">${placeArrowSvg()}<span>CLICK A STATE</span></div>`;
}
// a pixel arrow pointing left at the map: the cover's stair-stepped arrowhead (8 rows: 1,2,3,4,4,3,2,1 cells) plus a 2-cell shaft
function placeArrowSvg(){
 const cells=[]; for(let y=0;y<8;y++){ const w=y<4?y+1:8-y; for(let x=4-w;x<4;x++) cells.push([x,y]); }
 for(let x=4;x<12;x++) cells.push([x,3],[x,4]);
 return `<svg class="place-arrow" viewBox="0 0 12 8" shape-rendering="crispEdges" aria-hidden="true">${cells.map(([x,y])=>`<rect x="${x}" y="${y}" width="1" height="1"/>`).join('')}</svg>`;
}
function renderMap(){
 return `<section class="page piles-page place-page"><h1 class="px-title">What place to land on?</h1><div class="piles-layout"><div class="place-canvas" id="placeCanvas">${placeMapSvg()}${placeLegend()}<div class="place-fellows" id="placeFellows"></div></div><div class="place-right"><aside class="px-side" id="placeInfo">${state.selectedState?piePanelHtml(state.selectedState):placePromptHtml()}</aside><aside class="px-side px-mini"><h3>Switch career</h3><div class="family-switch">${families.map(f=>`<button data-place-family="${esc(f)}" class="${f===state.selectedFamily?'active':''}">${esc(shortName[f])}</button>`).join('')}</div></aside></div></div>${nav()}</section>`;
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
 return `<section class="page piles-page ridge-page"><h1 class="px-title">Which mountain do you land on?</h1><div class="piles-layout"><div class="ridge-canvas" id="ridgeCanvas"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" id="ridgeSvg">${ticks}<text x="${W-RIDGE.padR}" y="${front+66}" text-anchor="end" class="lbl ridge-axis">ANNUAL SALARY</text>
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
/* ---------- Page 8: Level up! (the level-up potion shop, after the industry page) ----------
   The reader's fellow walks into a potion shop (drawn like the other pages: dotted white wall, cream floor). Four potions stand on the shelf: ENTRY, MID, SENIOR and EXECUTIVE,
   each tagged with that level's median salary in the reader's career. The fellow starts as Entry (that bottle is already
   empty); the others unlock in order. Click the next potion: the fellow drinks it and grows (its height is proportional to
   the level's median salary), and its salary counter rolls up. After the Executive potion, Next appears.
   Salaries: median by experience level for the reader's career, 2024 U.S. salary sample (DATA.familyData[f].experience). */
const LEVEL_PAGE=7;   // 0-based index in render()'s list
const LV_NAMES=['ENTRY','MID','SENIOR','EXECUTIVE'];
const LV_COLORS=['#8fc9e0','#f2b58a','#9a86c4','#3d4385'];   // potion colours, low to high: the sky from day to night
function levelSalaries(f){ const e=DATA.familyData[f].experience||[]; return ['EN','MI','SE','EX'].map(c=>{const x=e.find(z=>z.code===c); return x?x.median:null;}); }
// a pixel map (rows of characters, '.' = empty) drawn as crisp svg squares `px` wide
function pxMapSvg(rows,colors,px,cls=''){
 const w=rows[0].length*px, h=rows.length*px; let s='';
 rows.forEach((r,y)=>{ let x=0; while(x<r.length){ const ch=r[x]; let n=1; while(x+n<r.length&&r[x+n]===ch) n++;
  if(ch!=='.'&&colors[ch]) s+=`<rect x="${x*px}" y="${y*px}" width="${n*px}" height="${px}" fill="${colors[ch]}"/>`; x+=n; } });
 return `<svg${cls?` class="${cls}"`:''} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
}
// a potion bottle in colour `c` (cork, glass neck, round flask with liquid, a highlight and bubbles); `empty`: no liquid left
const PS_BOTTLE=['.....####.....','....#cccc#....','....#cCCc#....','...########...','....#gwgg#....','....#gwgg#....','...##gggg##...',
 '..#gggggggg#..','.#gwgggggggg#.','#gwLLLLLLLLLg#','#wllllllllllg#','#wlllllllllll#','#llllllllllll#','#lllbllllllll#',
 '#llllllllblll#','#lllllllllllD#','#llllllllllDD#','.#llllllllDD#.','..#DDDDDDDD#..','...########...'];
const PS_PX=7;   // bottle pixel size: 14×20 pixels → 98×140 px
function psPotionSvg(c,empty=false,open=false){
 const glass='#eef6f9', rows=open?PS_BOTTLE.map((r,i)=>i<3?'.'.repeat(r.length):r):PS_BOTTLE;
 return pxMapSvg(rows,{'#':'#2b2140',c:'#c99059',C:'#9a6534',g:glass,w:'#ffffff',
  L:empty?glass:mixHex(c,'#ffffff',.45),l:empty?glass:c,D:empty?mixHex(c,'#ffffff',.55):mixHex(c,'#2b2140',.3),b:empty?glass:mixHex(c,'#ffffff',.75)},PS_PX);
}
const psCorkSvg=px=>pxMapSvg(['.####.','#cccc#','#cCCc#','######'],{'#':'#2b2140',c:'#c99059',C:'#9a6534'},px);   // the cork, popped off before drinking
const psLockSvg=()=>pxMapSvg(['..####..','.#....#.','.#....#.','########','#yyyyyy#','#yy##yy#','#yy##yy#','#yyyyyy#','########'],{'#':'#2b2140',y:'#f2c14e'},5);
function renderLevel(){
 const f=state.homeFamily||state.selectedFamily, sal=levelSalaries(f), m0=v=>v==null?'N/A':money(v);
 const slots=LV_NAMES.map((n,k)=>`<div class="ps-slot"><span class="ps-drink" hidden>DRINK ME ▼</span>`
  +`<button type="button" class="ps-potion" data-k="${k}" aria-label="${n} potion: ${k===0?`starting pay ${m0(sal[k])} a year`:'effect unknown until you drink it'}">${psPotionSvg(LV_COLORS[k],k===0)}</button>`
  +`<span class="ps-lock" hidden>${psLockSvg()}</span>`
  // the tag shows the potion's EFFECT, not a price: Entry is the START pay; a later level's effect reads ??? until its
  // potion is drunk, then "pay → $117k" (that level's median salary; bindLevel's showEffect reveals it with the +$ pop)
  +`<div class="ps-tag"><b><i style="background:${LV_COLORS[k]}"></i>${n}</b><em>${k===0?'START':'EFFECT'}</em><span${k===0?' data-known="1"':''}>${k===0?m0(sal[k]):'???'}</span><small></small></div></div>`).join('');
 return `<section class="page piles-page level-page" style="--c:${careerColor(f)}"><h1 class="px-title">Level up: from Entry to Executive</h1>`
  +`<div class="ps-shop" id="psShop"><div class="ps-floor"></div>`
  +`<div class="ps-sign"><b>LEVEL-UP POTIONS</b><span>EACH POTION'S EFFECT = THAT LEVEL'S MEDIAN SALARY</span></div>`
  +`<div class="ps-cab"><div class="ps-slots">${slots}</div></div>`
  +`<div class="ps-hud" id="psHud"></div><div class="ps-fellow" id="psFellow"><img src="assets/fellows/${meta[f].key}-idle.webp" alt="${esc(meta[f].name)}"></div>`
  +`<div class="ps-bubble" id="psBubble" hidden></div></div>${nav({hideNext:!state.levelDone})}</section>`;
}
function bindLevel(){
 const root=stage.querySelector('.level-page'); if(!root) return;
 const shop=root.querySelector('#psShop'), hud=root.querySelector('#psHud'), fel=root.querySelector('#psFellow'), img=fel.querySelector('img'),
  bubble=root.querySelector('#psBubble'), next=root.querySelector('.navbar [data-nav="next"]'), slots=[...root.querySelectorAll('.ps-slot')];
 const alive=()=>document.body.contains(root), f=state.homeFamily||state.selectedFamily, key=meta[f].key, sal=levelSalaries(f);
 const m0=v=>v==null?'N/A':money(v);
 const H0=112, CX=290, FLOOR=66;   // the fellow's height as Entry, its centre and the floor line (px)
 const size=k=>Math.round(H0*(sal[k]&&sal[0]?sal[k]/sal[0]:1+k*.25));   // height ∝ the level's median salary
 let lvl=0, busy=false, shownSal=sal[0]||0;
 ['jump','land2','run1','run2','run3'].forEach(fr=>{const i=new Image(); i.src=`assets/fellows/${key}-${fr}.webp`;}); [0,1,2,3].forEach(i=>{const im=new Image(); im.src=`assets/fellows/spark${i}.webp`;});
 const place=h=>{ fel.style.width=fel.style.height=h+'px'; fel.style.left=(CX-h/2)+'px'; fel.style.bottom=FLOOR+'px'; };
 const setHud=()=>{ hud.innerHTML=`<b>${LV_NAMES[lvl]}</b><span>Your salary: ${m0(Math.round(shownSal/100)*100)} / yr</span><small>${esc(shortName[f])} · median</small>`; };
 // the shelf: drunk bottles are empty, the next one can be bought ("DRINK ME"), later ones are locked
 const paint=()=>slots.forEach((s,k)=>{ const pot=s.querySelector('.ps-potion'), can=k===lvl+1&&!busy, locked=k>lvl+1;
  pot.classList.toggle('can',can); pot.classList.toggle('locked',locked); pot.disabled=!can;
  s.querySelector('.ps-lock').hidden=!locked; s.querySelector('.ps-drink').hidden=!can;
  s.querySelector('.ps-tag small').textContent=k===lvl?'✓ YOU ARE HERE':k<lvl?'✓ DONE':k===lvl+1?'CLICK TO DRINK':`LOCKED · AFTER ${LV_NAMES[k-1]}`; });
 // a potion's effect stays ??? until it has been drunk; grow() then shows the new pay on its tag (a short fade) at the
 // same moment as the "+$… MID" pop above the fellow
 const showEffect=k=>{ const s=slots[k], tag=s.querySelector('.ps-tag span'); if(tag.dataset.known==='1') return; tag.dataset.known='1';
  tag.textContent=`pay → ${m0(sal[k])}`; tag.animate([{opacity:0},{opacity:1}],{duration:240,easing:'steps(3)'});
  s.querySelector('.ps-potion').setAttribute('aria-label',`${LV_NAMES[k]} potion: effect, pay becomes ${m0(sal[k])} a year`); };
 const spark=h=>[[-.42,.8],[.42,.55],[0,1.08]].forEach(([dx,dy],i)=>{ const s=document.createElement('img'); s.className='ps-spark'; s.alt=''; s.src='assets/fellows/spark0.webp';
  s.style.left=(CX+dx*h-48)+'px'; s.style.bottom=(FLOOR+dy*h-48)+'px'; s.style.visibility='hidden'; shop.appendChild(s); let j=0;
  setTimeout(()=>{ s.style.visibility=''; const t=setInterval(()=>{ j++; if(j>3||!alive()){ clearInterval(t); s.remove(); return; } s.src=`assets/fellows/spark${j}.webp`; },90); },i*120); });
 const popUp=(big,small)=>{ const p=document.createElement('div'); p.className='ps-pop'; p.innerHTML=`${big}<small>${small}</small>`; p.style.left=CX+'px'; p.style.bottom=(FLOOR+size(lvl)+14)+'px'; shop.appendChild(p);
  p.animate([{transform:'translate(-50%,10px)',opacity:0},{transform:'translate(-50%,0)',opacity:1,offset:.15},{transform:'translate(-50%,-28px)',opacity:1,offset:.8},{transform:'translate(-50%,-36px)',opacity:0}],{duration:1600,easing:'steps(12)',fill:'forwards'}).finished.then(()=>p.remove(),()=>{}); return new Promise(res=>setTimeout(res,1650)); };
 const finish=()=>{ state.levelDone=true; const h=size(3), x=sal[0]&&sal[3]?(sal[3]/sal[0]).toFixed(1):null;
  bubble.innerHTML=`<p><b>Executive!</b> The median salary is now <b>${m0(sal[3])}</b> a year${x?`, <b>${x}×</b> the Entry salary`:''}.</p><button type="button" id="psAgain">↺ START OVER</button>`;
  bubble.style.bottom=(FLOOR+h+34)+'px'; bubble.style.setProperty('--tail',(CX-40-16)+'px'); bubble.hidden=false;
  bubble.animate([{opacity:0},{opacity:1}],{duration:300,easing:'steps(3)'});
  bubble.querySelector('#psAgain').addEventListener('click',()=>render());   // start again as Entry; Next stays (already cleared)
  if(next&&next.hidden){ next.hidden=false; next.animate([{opacity:0},{opacity:1}],{duration:300,easing:'steps(3)'}); } };
 // drinking: the fellow grows to the new level's height in pixel steps, hops, and the salary counter rolls up
 const grow=k=>{ const h0=size(lvl), h1=size(k), from=shownSal, to=sal[k]||from; lvl=k;
  img.src=`assets/fellows/${key}-jump.webp`; place(h1); spark(h1);
  const sc=t=>`scale(${(h0+(h1-h0)*t)/h1})`;
  fel.animate([{transform:sc(0)},{transform:sc(1/3),offset:.33},{transform:sc(2/3),offset:.66},{transform:sc(1)}],{duration:600,easing:'steps(1,end)'});
  setTimeout(()=>{ if(!alive()) return; img.src=`assets/fellows/${key}-land2.webp`; fel.animate([{transform:'translateY(0)'},{transform:'translateY(-18px)'},{transform:'translateY(0)'}],{duration:320,easing:'steps(4)'});
   setTimeout(()=>{ if(alive()) img.src=`assets/fellows/${key}-idle.webp`; },340); },620);
  const t0=performance.now(), roll=now=>{ if(!alive()) return; const p=Math.min(1,(now-t0)/700); shownSal=from+(to-from)*p; setHud(); if(p<1) requestAnimationFrame(roll); };
  requestAnimationFrame(roll); const popped=popUp(`+${m0(to-from)}`,LV_NAMES[k]); showEffect(k); paint();   // the pop, the tag's effect and its "✓ YOU ARE HERE" appear together
  setTimeout(()=>{ if(!alive()) return; busy=false; paint(); },950);
  if(k===3) popped.then(()=>{ if(alive()) finish(); });   // the closing bubble comes once the +$ pop has gone
 };
 // buying and drinking: the bottle leaves the shelf and flies over to the fellow, shrinking to its size, and stops upright
 // beside its mouth; pop! the cork flies off; the bottle tips up with its neck at the mouth; three sips (glug glug glug),
 // the bottle is empty, it fades away and the empty one is back on the shelf, corked again. Then the fellow grows.
 const drink=k=>{ if(busy||k!==lvl+1||!alive()) return; busy=true; paint();
  const pot=slots[k].querySelector('.ps-potion'), sr=shop.getBoundingClientRect(), pr=pot.getBoundingClientRect(), z=sr.width/shop.offsetWidth;   // the stage is scaled
  const BW=14*PS_PX, BH=20*PS_PX, x0=(pr.left-sr.left)/z, y0=(pr.top-sr.top)/z, c=LV_COLORS[k];
  const fly=document.createElement('div'); fly.className='ps-fly'; fly.innerHTML=psPotionSvg(c); fly.style.left=x0+'px'; fly.style.top=y0+'px'; shop.appendChild(fly);
  pot.style.visibility='hidden';
  // the drinking pose: half size, tipped up by A degrees, so the neck (top centre) points down-left into the mouth
  const h=size(lvl), mx=CX+6, my=shop.offsetHeight-FLOOR-h*.55, S=.5, A=-115, r=A*Math.PI/180;
  const nx=BH/2*S*Math.sin(r), ny=-BH/2*S*Math.cos(r);   // the neck tip, from the bottle's centre, once turned
  const cx=mx-nx, cy=my-ny, dx=cx-(x0+BW/2), dy=cy-(y0+BH/2);   // the bottle's centre stays put while it turns
  const T=(x,y,a,sc)=>`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${a}deg) scale(${sc})`;
  const up=T(dx,dy,0,S), sip=T(dx+3,dy-3,A-10,S), rest=T(dx,dy,A,S), done=f=>f.finished.catch(()=>{});
  done(fly.animate([{transform:T(0,0,0,1)},{transform:T(dx*.55,dy-150,-20,.7),offset:.6},{transform:up}],{duration:750,easing:'ease-in-out',fill:'forwards'})).then(()=>{
   if(!alive()) return;
   // pop! the cork flies off, up and to the right
   fly.innerHTML=psPotionSvg(c,false,true);
   const ck=document.createElement('div'); ck.className='ps-cork'; ck.innerHTML=psCorkSvg(Math.round(PS_PX*S));
   const cw=6*Math.round(PS_PX*S), chh=4*Math.round(PS_PX*S);
   ck.style.left=(cx-cw/2)+'px'; ck.style.top=(cy-BH/2*S-chh/2+2)+'px'; shop.appendChild(ck);
   ck.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate(14px,-46px) rotate(120deg)',opacity:1,offset:.55},{transform:'translate(30px,-20px) rotate(260deg)',opacity:0}],{duration:650,easing:'ease-out',fill:'forwards'}).finished.then(()=>ck.remove(),()=>{});
   return done(fly.animate([{transform:up},{transform:T(dx,dy,6,S)},{transform:T(dx,dy,-6,S)},{transform:up}],{duration:300,easing:'steps(3)',fill:'forwards'}));
  }).then(()=>{ if(!alive()) return;
   return done(fly.animate([{transform:up},{transform:rest}],{duration:300,easing:'ease-in-out',fill:'forwards'}));   // tip it up to the mouth
  }).then(()=>{ if(!alive()) return;
   setTimeout(()=>{ if(alive()) fly.innerHTML=psPotionSvg(c,true,true); },600);   // drained by the last sip (still open)
   return done(fly.animate([{transform:rest},{transform:sip},{transform:rest},{transform:sip},{transform:rest},{transform:sip},{transform:rest}],{duration:900,easing:'steps(6)',fill:'forwards'}));
  }).then(()=>{ if(!alive()) return;
   done(fly.animate([{opacity:1,transform:rest},{opacity:0,transform:T(dx+24,dy-16,-40,S)}],{duration:300,easing:'steps(3)',fill:'forwards'})).then(()=>fly.remove());
   pot.innerHTML=psPotionSvg(c,true); pot.style.visibility=''; pot.animate([{opacity:0},{opacity:1}],{duration:300,easing:'steps(3)'});
   grow(k); }); };
 slots.forEach(s=>{ const pot=s.querySelector('.ps-potion'); pot.addEventListener('click',()=>drink(+pot.dataset.k)); });
 root._ps={drink,get lvl(){return lvl;}};   // for testing
 // the fellow walks in from the left; the potions can be bought once it has arrived
 const h=size(0); place(h); setHud(); busy=true; paint();
 let fr=0; const run=setInterval(()=>{ if(!alive()){ clearInterval(run); return; } fr=fr%3+1; img.src=`assets/fellows/${key}-run${fr}.webp`; },90);
 fel.animate([{transform:`translateX(${-(CX+h)}px)`},{transform:'translateX(0)'}],{duration:1100,easing:'linear'}).finished.then(()=>{
  clearInterval(run); if(!alive()) return; img.src=`assets/fellows/${key}-idle.webp`; busy=false; paint(); },()=>clearInterval(run));
}
// Page 8's story
function levelStoryHtml(){
 const f=state.homeFamily||state.selectedFamily, m=meta[f];
 return storyHtml(`Every career has <mark>levels</mark>.`,[
  `From <b>Entry</b> to <b>Mid</b>, <b>Senior</b> and <b>Executive</b>: the more experience you gain, the more you earn, so your first salary is only the starting point.`,
  `Next, ${esc(m.name)} walks into a potion shop. Each potion takes you up one level, but its effect is a mystery: drink it to find out that level's <b>median salary</b> in ${esc(shortName[state.homeFamily||state.selectedFamily])}. Drink them in order, all the way to Executive!`],
  `Ready? Let's level up!`);
}
/* ---------- Page: Where is the pay, and where are the people? (right after the potion shop) ----------
   One ring for both, one career at a time (the cover career first; the chips switch).
   The ring is 100 blocks = 100 people (1 block = 1 in 100 of the career's salary records), coloured by level and in
   level order clockwise from 12 o'clock: Entry → Mid → Senior → Executive. Each block reaches outward from the inner
   circle ($0: every pay is measured from zero, as the user requires) to the median pay of its level; dashed circles
   mark $50k, $100k, $150k and $200k, labelled in the gap at the top. The ring is as big as the canvas allows and the
   centre hole small, so the blocks are long and how far they reach from the centre stays close to their true pay ratio.
   How many blocks = how many people; how far they reach = how much they earn. Executive reaches farthest, with only a
   few blocks. The centre shows the career's fellow with the career's short name under it.
   Opening the page: the fellow falls from above into the middle of the ring and lands (name fades in), then
   the blocks grow from zero out to their pay. Switching career: the old fellow jumps and vanishes at the top while the old ring
   sweeps back to zero; then the page re-renders and the new fellow falls in and its ring grows.
   Data: DATA.familyData[f].experience, the same as the potion shop. */
const LVMAP_PAGE=8;   // 0-based index in render()'s list
const LVM={W:1100,H:640,cx:365,cy:322,r0:74,rMax:314,top:225000,gap:18,few:50};
const LV_WORDS=['Entry','Mid','Senior','Executive'];
function lvmPoints(f){ const e=DATA.familyData[f].experience||[]; return ['EN','MI','SE','EX'].map((c,k)=>{ const x=e.find(z=>z.code===c)||{}; return {k,share:x.share||0,median:x.median||0,n:x.n||0}; }); }
// 100 people: the shares rounded with the largest-remainder method, so they add up to exactly 100
function lvmPeople(f){ const s=lvmPoints(f).map(p=>p.share), n=s.map(Math.floor), left=100-n.reduce((a,b)=>a+b,0);
 s.map((v,i)=>[v-n[i],i]).sort((a,b)=>b[0]-a[0]).slice(0,Math.max(0,left)).forEach(([,i])=>n[i]++); return n; }
const lvmLevelOf=(n,i)=>{ let acc=0; for(let k=0;k<4;k++){ acc+=n[k]; if(i<acc) return k; } return 3; };
const lvmReach=v=>LVM.r0+v/LVM.top*(LVM.rMax-LVM.r0);   // radius for a pay; the inner circle is $0
// block i of 100, from the inner circle out to radius R; the blocks share the ring minus a gap at 12 o'clock (for the $ labels)
function lvmBlockPath(i,R){
 const span=(360-LVM.gap)/100, a0=LVM.gap/2+i*span+.45, a1=LVM.gap/2+(i+1)*span-.45, r=LVM.r0, f=v=>v.toFixed(1);
 const P=(a,rad)=>[LVM.cx+rad*Math.sin(a*Math.PI/180),LVM.cy-rad*Math.cos(a*Math.PI/180)];
 const [x0,y0]=P(a0,R),[x1,y1]=P(a1,R),[x2,y2]=P(a1,r),[x3,y3]=P(a0,r);
 return `M${f(x0)} ${f(y0)} A${f(R)} ${f(R)} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r} ${r} 0 0 0 ${f(x3)} ${f(y3)} Z`;
}
function lvmSvg(f){
 const {W,H,cx,cy,r0}=LVM, n=lvmPeople(f), p=lvmPoints(f);
 let s=`<svg class="lvm-svg" id="lvmSvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><g class="lvm-scale" style="opacity:0">`;
 // dashed $ circles behind the blocks; their labels go on top of the blocks, below
 const grid=[50000,100000,150000,200000];
 grid.forEach(v=>{ s+=`<circle cx="${cx}" cy="${cy}" r="${lvmReach(v).toFixed(1)}"/>`; });
 s+='</g><g class="lvm-blocks">';
 for(let i=0;i<100;i++){ const k=lvmLevelOf(n,i), x=p[k];
  s+=`<path class="lvm-b${x.n<LVM.few?' few':''}" data-k="${k}" fill="${LV_COLORS[k]}" d="${lvmBlockPath(i,r0)}"><title>${LV_WORDS[k]} · ${n[k]} of 100 people · median pay ${money(x.median)}${x.n<LVM.few?` · only ${x.n} records: read with care`:''}</title></path>`; }
 // the $ labels sit in the gap at the top; "$0" marks the inner circle, where every block starts
 s+=`</g><g class="lvm-scale" style="opacity:0"><text class="lvm-zero halo" x="${cx}" y="${(cy-r0+6).toFixed(1)}" text-anchor="middle">$0</text>`
  +grid.map(v=>`<text class="halo" x="${cx}" y="${(cy-lvmReach(v)+6).toFixed(1)}" text-anchor="middle">${money(v)}</text>`).join('')+'</g>';
 s+=`<g class="lvm-fel" id="lvmFel"><image class="lvm-fellow" href="assets/fellows/${meta[f].key}-idle.webp" x="${cx-38}" y="${cy-58}" width="76" height="76"/></g>`
  +`<text class="pf lvm-name" id="lvmName" x="${cx}" y="${cy+40}" text-anchor="middle">${esc(DOOR_SHORT[families.indexOf(f)])}</text>`;
 // how to read it, and one small button per level (right), centred on the ring: pressing one highlights that level (see bindLvmap).
 // Each button: swatch + level name and its pay on the first line; people out of 100 and the raise from the level below on the second.
 // A level with fewer than 50 records has a pale swatch (as its blocks are pale), explained by an extra how-to line only when one exists.
 const lx=760, bx=746, bw=304, bh=62, few=p.some(x=>x.n<LVM.few);
 const read=['■ 1 block = 1 person (100 in all)','↗ longer block = more pay'].concat(few?['░ pale = only a few records']:[]);
 const ty=cy-(36+read.length*26+24+3*76+bh)/2;   // top of the legend block
 s+=`<text class="pf" x="${lx}" y="${ty+12}">HOW TO READ IT</text>`+read.map((t,i)=>`<text class="lvm-how" x="${lx}" y="${ty+40+i*26}">${t}</text>`).join('');
 const by=ty+36+read.length*26+24;
 p.forEach((x,k)=>{ const y=by+k*76, xr=bx+bw-14;
  s+=`<g class="lvm-row" data-k="${k}" role="button" tabindex="0" aria-pressed="false" aria-label="Highlight ${LV_WORDS[k]}: ${n[k]} of 100 people, median pay ${money(x.median)}">`
   +`<rect class="lvm-sh" x="${bx+3}" y="${y+3}" width="${bw}" height="${bh}"/><g class="lvm-face"><rect class="lvm-btn" x="${bx}" y="${y}" width="${bw}" height="${bh}"/>`
   +`<rect x="${bx+14}" y="${y+12}" width="16" height="16" fill="${LV_COLORS[k]}" fill-opacity="${x.n<LVM.few?.5:1}" stroke="#2b2140" stroke-width="3"/><text class="pf" x="${bx+40}" y="${y+26}">${LV_NAMES[k]}</text>`
   +`<text class="lvm-pay lvm-big" x="${xr}" y="${y+28}" text-anchor="end">${money(x.median)}</text>`
   +`<text class="lvm-ppl" x="${bx+40}" y="${y+51}"><tspan class="b">${n[k]}</tspan> of 100 people</text>`
   +(k?`<text class="lvm-pay lvm-up" x="${xr}" y="${y+51}" text-anchor="end">+${money(x.median-p[k-1].median)}</text>`:'')+`</g></g>`; });
 return s+'</svg>';
}
function lvmNote(f){
 const p=lvmPoints(f), n=lvmPeople(f), by=[0,1,2,3].sort((a,b)=>n[b]-n[a]), tie=n[by[0]]===n[by[1]]||Math.abs(p[by[0]].share-p[by[1]].share)<1;
 const most=tie?`<b>${LV_WORDS[Math.min(by[0],by[1])]}</b> and <b>${LV_WORDS[Math.max(by[0],by[1])]}</b> (${n[by[0]]} of 100 each)`:`<b>${LV_WORDS[by[0]]}</b> (${n[by[0]]} of 100), reaching ${money(p[by[0]].median)}`;
 const rank=families.map(ff=>lvmPoints(ff)[0].share).sort((a,b)=>b-a).indexOf(p[0].share)+1, where=rank===1?'the most of the six careers':rank===6?'the fewest of the six careers':`#${rank} of the six careers`;
 return `Most people are ${most}. <b>Executive</b> reaches the farthest (${money(p[3].median)}), but only <b>${n[3]} of 100</b> get there.<span>Entry: ${n[0]} of 100, ${where}.</span>`;
}
function lvmSideHtml(f){
 return `<div class="px-side-title">${esc(shortName[f])}</div><div class="game-stat small lvm-note">${lvmNote(f)}</div>`
  +`<h3>Switch career</h3><div class="family-switch">${families.map(ff=>`<button type="button" data-lvm-family="${esc(ff)}" class="${ff===f?'active':''}">${esc(shortName[ff])}</button>`).join('')}</div>`;
}
function renderLvmap(){
 const f=state.selectedFamily;
 return `<section class="page piles-page lvm-page"><h1 class="px-title">Where is the pay, and where are the people?</h1><div class="piles-layout"><div class="lvm-canvas">${lvmSvg(f)}</div><aside class="px-side lvm-side">${lvmSideHtml(f)}</aside></div>${nav()}</section>`;
}
function bindLvmap(){
 const root=stage.querySelector('.lvm-page'); if(!root) return;
 const svg=root.querySelector('#lvmSvg'), f=state.selectedFamily, key=meta[f].key, p=lvmPoints(f), alive=()=>document.body.contains(root);
 const blocks=[...svg.querySelectorAll('.lvm-b')], scales=[...svg.querySelectorAll('.lvm-scale')], pays=[...svg.querySelectorAll('.lvm-pay')];
 const fel=svg.querySelector('#lvmFel'), img=fel.querySelector('image'), name=svg.querySelector('#lvmName');
 const src=fr=>`assets/fellows/${key}-${fr}.webp`;
 ['fall','land2','jump'].forEach(fr=>{ const i=new Image(); i.src=src(fr); });
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 // u[i] in 0..1: how far block i has grown, from zero length to its full pay; the $ circles and "reach" lines fade with it
 const u=new Array(blocks.length).fill(0);
 const paint=()=>{ blocks.forEach((b,i)=>{ const k=+b.dataset.k; b.setAttribute('d',lvmBlockPath(i,LVM.r0+(lvmReach(p[k].median)-LVM.r0)*u[i])); });
  const m=(u.reduce((a,b)=>a+b,0)/u.length).toFixed(3); scales.forEach(g=>{ g.style.opacity=m; }); pays.forEach(t=>{ t.style.opacity=m; }); };
 let token=0, leaving=false;
 // the blocks grow out (to=1, clockwise from Entry) or sweep back in (to=0, from Executive), from wherever they are now
 const sweep=(to,D,STAG)=>new Promise(res=>{ const my=++token, from=u.slice(), t0=performance.now(), ease=x=>1-Math.pow(1-x,3);
  if(reduce){ u.fill(to); paint(); return res(); }
  const tick=now=>{ if(!alive()||my!==token) return res(); const t=now-t0; let done=true;
   for(let i=0;i<u.length;i++){ const j=to>0?i:u.length-1-i, q=Math.min(1,Math.max(0,(t-j*STAG)/D)); if(q<1) done=false; u[i]=from[i]+(to-from[i])*ease(q); }
   paint(); if(!done) requestAnimationFrame(tick); else res(); };
  requestAnimationFrame(tick); });
 // the fellow falls from above (through the gap at the top of the ring) and lands in the middle
 const drop=()=>new Promise(res=>{
  if(reduce){ fel.style.visibility=''; name.style.opacity=1; return res(); }
  img.setAttribute('href',src('fall')); fel.style.visibility='';
  fel.animate([{transform:`translateY(${-(LVM.cy+30)}px)`},{transform:'translateY(0px)'}],{duration:560,easing:'cubic-bezier(.5,0,.85,.55)'}).finished.then(()=>{
   if(!alive()||leaving) return res();
   img.setAttribute('href',src('land2'));
   fel.animate([{transform:'translateY(0px)'},{transform:'translateY(-10px)'},{transform:'translateY(0px)'}],{duration:220,easing:'steps(4)'});
   setTimeout(()=>{ if(alive()&&!leaving) img.setAttribute('href',src('idle')); },200);
   name.style.opacity=1; name.animate([{opacity:0},{opacity:1}],{duration:300,easing:'steps(3)'});
   setTimeout(res,260);
  },()=>res());
 });
 // switching away: the old fellow jumps and vanishes at the top of the jump (it does not come back down); its name fades too
 const leave=()=>new Promise(res=>{
  fel.getAnimations().forEach(a=>a.cancel()); name.getAnimations().forEach(a=>a.cancel());
  if(reduce||fel.style.visibility==='hidden'){ fel.style.visibility='hidden'; return res(); }
  name.animate([{opacity:getComputedStyle(name).opacity},{opacity:0}],{duration:280,easing:'steps(3)',fill:'forwards'});
  img.setAttribute('href',src('jump'));
  fel.animate([{transform:'translateY(0px)',opacity:1},{transform:'translateY(-36px)',opacity:1,offset:.62},{transform:'translateY(-44px)',opacity:0}],{duration:400,easing:'ease-out',fill:'forwards'}).finished.then(res,res);
 });
 if(state.lvmStep===2&&!state.lvmAnim){ u.fill(1); paint(); }   // coming back from a later page: already grown
 else {
  paint(); fel.style.visibility='hidden'; name.style.opacity=0;
  // on opening, wait for the page to fade in first; after a career switch, start right away
  setTimeout(()=>{ if(!alive()||leaving) return;
   drop().then(()=>{ if(!alive()||leaving) return; sweep(1,650,8).then(()=>{ if(alive()&&!leaving) state.lvmStep=2; }); });
  }, state.lvmAnim?60:450);
 }
 state.lvmAnim=false;
 // pressing a level button (or clicking a block of the ring) highlights that level: its button turns yellow and the
 // other levels' blocks fade. Pressing the same level again shows all levels. The pick stays when you switch career.
 const pick=k=>{ state.lvmPick=k; svg.classList.toggle('focus',k!=null);
  svg.querySelectorAll('.lvm-b').forEach(el=>el.classList.toggle('on',+el.dataset.k===k));
  svg.querySelectorAll('.lvm-row').forEach(el=>{ const on=+el.dataset.k===k; el.classList.toggle('on',on); el.setAttribute('aria-pressed',on); }); };
 const toggle=k=>pick(state.lvmPick===k?null:k);
 pick(state.lvmPick??null);
 svg.querySelectorAll('.lvm-b').forEach(el=>el.addEventListener('click',()=>toggle(+el.dataset.k)));
 svg.querySelectorAll('.lvm-row').forEach(el=>{ el.addEventListener('click',()=>toggle(+el.dataset.k));
  el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(+el.dataset.k); } }); });
 // switch career: the chip lights up at once; the old fellow leaves and the ring sweeps back, then the new career drops in
 root.querySelectorAll('[data-lvm-family]').forEach(b=>b.addEventListener('click',()=>{ const ff=b.dataset.lvmFamily; if(ff===state.selectedFamily||leaving) return; leaving=true;
  root.querySelectorAll('[data-lvm-family]').forEach(x=>x.classList.toggle('active',x===b));
  Promise.all([leave(),sweep(0,380,2)]).then(()=>{ if(!alive()) return; state.selectedFamily=ff; state.lvmAnim=true; render(); }); }));
}
function lvmStoryHtml(){
 const m=meta[state.homeFamily||state.selectedFamily];
 return storyHtml(`Higher level, higher pay. <mark>But how many people get there?</mark>`,[
  `In the potion shop, ${esc(m.name)}'s pay grew with every level. Now let's count the people too: out of every 100 people in the salary data, how many are at each level?`,
  `Next is a ring of <b>100 blocks: one block is one person</b>, coloured by level. Then each block grows outward to that person's <b>pay</b>: the more blocks, the more people; the farther they reach, the more they earn.`],
  `Where do most people stand?`);
}
/* ---------- Page: Who reaches 2035 first? (race game, between the mountain and the doors) ----------
   Bet on one of the six fellows, then all six run from 2025 to 2035. Each runs at a constant speed proportional to a
   BLS 2025–35 measure, so when the leader reaches 2035 every other runner has covered (its value ÷ the leader's value)
   of the track — the stopping positions are a bar chart. One race, on the same measure as page 9 ("Which door stays
   open"): job openings a year per 1,000 jobs, 2025–35 (growth plus people retiring or switching careers). Page 9 then
   compares it with the previous ten years. bet → race → result; PLAY AGAIN runs it again. */
const RACE_SZ=72;
const RACE_RULE={openings:'SPEED = JOB OPENINGS A YEAR PER 1,000 JOBS, 2025→2035'};
const RACE_FMT={openings:v=>`${Math.round(v)} per 1,000`};
// what the race measures, said up front (the title alone does not tell you it is about future jobs)
const RACE_EXPLAIN={openings:'Each runner\'s speed = how many jobs open up each year for every 1,000 jobs in that career, 2025–2035 (new jobs plus people retiring or switching careers).'};
const RACE_ROUND={openings:'JOB OPENINGS'};
const RACE_ASK={openings:'BET ON THE CAREER WITH THE MOST JOB OPENINGS'};
const raceMsg=(metric,main,sub)=>`<div class="race-intro"><div class="race-prompt"><span class="race-round ${metric}">${RACE_ROUND[metric]}</span>${main}</div><div class="race-sub">${sub}</div></div>`;
const raceBetMsg=metric=>raceMsg(metric,`<span class="race-ask">${RACE_ASK[metric]}</span>`,RACE_EXPLAIN[metric]+' Click a runner to place your bet.');
function renderRace(){
 const lanes=families.map((f,i)=>`<button type="button" class="race-lane" data-race-lane="${i}" style="--c:${careerColor(f)}" aria-label="Bet on ${esc(shortName[f])} (${esc(meta[f].name)})"><span class="rl-name"><i></i><b>${esc(DOOR_SHORT[i])}</b><small>${esc(meta[f].name)}</small><em class="rl-bet">YOUR BET</em></span><span class="rl-track"><span class="rl-runner"><img src="assets/fellows/${meta[f].key}-idle.webp" alt=""></span><span class="rl-val"></span></span></button>`).join('');
 return `<section class="page piles-page race-page"><h1 class="px-title">Race to 2035: which career opens the most doors?</h1><div class="race-layout"><div class="race-head"><div class="race-msg" id="raceMsg" aria-live="polite">${raceBetMsg('openings')}</div><button type="button" class="race-go pxbox" id="raceGo" disabled>START THE RACE ▶</button></div><div class="race-lanes">${lanes}<div class="race-count" id="raceCount" aria-hidden="true"></div></div><div class="race-foot"><div><span>2025</span><span class="race-rule" id="raceRule">${RACE_RULE.openings}</span><span>2035</span></div></div></div>${nav({hideNext:true})}</section>`;
}
function bindRace(){
 const root=stage.querySelector('.race-page'); if(!root) return;
 const lanes=[...root.querySelectorAll('[data-race-lane]')], go=root.querySelector('#raceGo'), msg=root.querySelector('#raceMsg'), count=root.querySelector('#raceCount'), rule=root.querySelector('#raceRule'), next=root.querySelector('.navbar [data-nav="next"]');
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 const alive=()=>document.body.contains(root);
 const R={bet:null,metric:'openings',phase:'bet'};   // phase: bet → racing → done
 const runners=lanes.map((l,i)=>({lane:l,el:l.querySelector('.rl-runner'),img:l.querySelector('.rl-runner img'),val:l.querySelector('.rl-val'),key:meta[families[i]].key,frame:'idle',x:0}));
 runners.forEach(r=>['run1','run2','run3','jump','land2'].forEach(fr=>{const im=new Image(); im.src=`assets/fellows/${r.key}-${fr}.webp`;}));
 const setFrame=(r,fr)=>{if(r.frame!==fr){r.frame=fr; r.img.src=`assets/fellows/${r.key}-${fr}.webp`;}};
 // big pixel text over the track: the 3-2-1 countdown, GO!, and YOU WIN! / YOU LOSE after each race
 const show=(t,cls='')=>{count.className='race-count'+(cls?' '+cls:''); count.textContent=t; void count.offsetWidth; count.classList.add('pop');};
 const results=metric=>{const vals=families.map(f=>Math.max(0,DOOR_METRICS[metric].val(f))||0); const max=Math.max(...vals)||1; const order=vals.map((v,i)=>i).sort((a,b)=>vals[b]-vals[a]); return {vals,max,order,rank:i=>order.indexOf(i)+1};};
 lanes.forEach((l,i)=>l.addEventListener('click',()=>{
  if(R.phase!=='bet') return;
  R.bet=i; lanes.forEach(x=>x.classList.toggle('bet',x===l));
  // the fellow you bet on hops: jump frame up and down, a landing frame, then idle again
  const r=runners[i]; if(!reduce){ setFrame(r,'jump'); r.img.animate([{transform:'translateY(0)'},{transform:'translateY(-22px)'},{transform:'translateY(0)'}],{duration:420,easing:'ease-out'});
   setTimeout(()=>{ if(!alive()||R.phase!=='bet') return; setFrame(r,'land2'); setTimeout(()=>{ if(alive()&&R.phase==='bet') setFrame(r,'idle'); },180); },420); }
  msg.innerHTML=raceMsg(R.metric,`YOUR BET: <b>${esc(DOOR_SHORT[i])}</b> · ${esc(meta[families[i]].name.toUpperCase())} — PRESS START`,RACE_EXPLAIN[R.metric]);
  go.disabled=false;
 }));
 go.addEventListener('click',()=>{
  if(R.phase==='bet'){ if(R.bet==null) return; lanes.forEach(l=>{l.classList.add('locked'); l.setAttribute('aria-disabled','true'); l.tabIndex=-1;}); start(); }
  else if(R.phase==='done') enterBet('openings');   // PLAY AGAIN: back to betting
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
  go.textContent='START THE RACE ▶'; go.disabled=true;
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
  const top='★ FINISH ★', line1=`${S(w)} HAS THE MOST OPENINGS · ${fmt(res.vals[w])} JOBS A YEAR`, line2=betLine;
  const showResults=()=>{ if(!alive()) return;
   R.phase='done';
   runners.forEach((r,i)=>setTimeout(()=>{ if(alive()) r.val.classList.add('show'); },140*(res.rank(i)-1)));
   win.lane.classList.add('winner');
   go.textContent='PLAY AGAIN ▶';
   go.disabled=false;
   // Next appears once the race has been run
   if(next&&next.hidden){ next.hidden=false; next.animate([{opacity:0},{opacity:1}],{duration:300,easing:'steps(3)'}); }
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
 s+=`<text x="${W/2}" y="36" text-anchor="middle" class="pf" style="font-size:14px">JOB OPENINGS EACH YEAR</text><text x="${W/2}" y="58" text-anchor="middle" class="lbl" style="font-size:12px">FOR EVERY 1,000 JOBS · HOVER OR CLICK A LINE</text><text x="${W/2}" y="81" text-anchor="middle" class="lbl" style="font-size:12.5px;fill:#2b2140">E.G. 100 = 1 IN 10 JOBS OPENS UP EACH YEAR</text>`;
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

/* ---------- Page: Which industry pays the most, year by year? (BLS OEWS industry galaxy) ---------- */
// Same galaxy as the earlier H-1B employer version, with industries (NAICS sectors) in place of employers.
// Data: window.OEWS_IND (data/oews-industry.js, built by data/build_oews_industry.py from BLS OEWS national
// industry-specific estimates, May 2015–May 2025; 2015–2020 use the closest older SOC codes, see the build script).
// One bubble = one industry × one career in one year:
// x = jobs (log), y = median annual wage. For careers made of several occupations the median is the job-weighted
// average of the BLS occupation medians (≈). Per career the same industries are shown in every year (galSet): only
// industries with BLS data (jobs and a median) in all 11 years 2015–2025, the GAL.top with the most jobs over those years.
// The internal names galEmployer / data-emp are kept from the employer version; they now hold a NAICS sector code.
const GAL={W:1060,H:680,x0:90,x1:1020,y0:600,y1:60,years:[2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],top:10};
const GAL_SHORT=['DATA SCIENCE','AI & ML','DATA ENG','SOFTWARE','CLOUD & SEC','MANAGEMENT'];
// short sector names for bubble labels, the list and the banner (tooltips and the pinned title use the longer OEWS_IND name)
const GAL_IND={'11':'Agriculture','21':'Mining','22':'Utilities','23':'Construction','31-33':'Manufacturing','42':'Wholesale','44-45':'Retail','48-49':'Transport','51':'Information','52':'Finance','53':'Real Estate','54':'Prof. Services','55':'Mgmt of Cos.','56':'Admin Support','61':'Education','62':'Health Care','71':'Arts & Rec.','72':'Hotels & Food','81':'Other Services','99':'Government'};
function galJobs(n){return n>=1000?Math.round(n/1000)+'k':String(n)}
state.galYear=state.galYear||2025; state.galEmployer=state.galEmployer||null;
if(state.galCareer===undefined) state.galCareer=null;   // career filter: index into families, or null = all careers
function galShort(n){return GAL_IND[n]||(window.OEWS_IND&&OEWS_IND.sectors[n]&&OEWS_IND.sectors[n].short)||n}
function galLong(n){return (window.OEWS_IND&&OEWS_IND.sectors[n]&&OEWS_IND.sectors[n].short)||galShort(n)}
function galCell(y,n,k){const d=OEWS_IND.data[y], c=d&&d[n]&&d[n][families[k]]; return c&&c.emp>0&&c.median?c:null}
function galAll(y,k){return OEWS_IND.national[y][families[k]]}
// A career's industries, fixed across the years so no bubble pops in or out during PLAY: an industry BLS suppresses (or
// does not report) for that career in any year from 2015 to 2025 is left out entirely. Ranked by total jobs over the years.
let galSetCache=null;
function galSet(k){
 if(!galSetCache) galSetCache=families.map((f,i)=>Object.keys(OEWS_IND.data[GAL.years[GAL.years.length-1]])
  .filter(n=>GAL.years.every(y=>galCell(y,n,i)))
  .map(n=>({n,t:GAL.years.reduce((s,y)=>s+galCell(y,n,i).emp,0)})).sort((a,b)=>b.t-a.t).slice(0,GAL.top).map(o=>o.n));
 return galSetCache[k];
}
// allCareers: ignore the career filter (PLAY animates every career and only shows/hides them)
function galPoints(year,allCareers){const pts=[]; if(!window.OEWS_IND||!OEWS_IND.data[year]) return pts; families.forEach((f,k)=>{if(!allCareers&&state.galCareer!=null&&k!==state.galCareer) return; const all=galAll(year,k); galSet(k).map(n=>({n,c:galCell(year,n,k)})).filter(o=>o.c).sort((a,b)=>b.c.emp-a.c.emp).slice(0,GAL.top).forEach(({n,c})=>pts.push({id:('i'+k+'_'+n).replace(/[^a-z0-9_]/gi,'_'),e:n,s:galShort(n),m:c.median,c:c.emp,k,all:all.median,tot:all.emp}));}); return pts;}
function galX(c){const {x0,x1}=GAL; return x0+(Math.log10(Math.max(30,c))-1.5)/(6-1.5)*(x1-x0)}
// wage axis $60k–$210k: the shown medians run from about $62k to $201k (2015–2025), so the top point nearly reaches the top
function galY(m){const {y0,y1}=GAL, lo=60000, hi=210000; return y0-(Math.max(lo,Math.min(hi,m))-lo)/(hi-lo)*(y0-y1)}
// every dot is the same size: jobs are already shown by the x position, so a size encoding would only repeat it
function galR(){return 9}
function galaxySvg(){
 const {W,H,x0,x1,y0,y1}=GAL; const pts=galPoints(state.galYear); pts.forEach(p=>{p.x=galX(p.c);p.y=galY(p.m);p.r=galR(p.c)});
 let g='';
 [100,300,1000,3000,10000,30000,100000,300000].forEach(v=>{g+=`<line x1="${galX(v)}" y1="${y1}" x2="${galX(v)}" y2="${y0}" stroke="#2b2140" stroke-dasharray="3 5" opacity=".22"/><text x="${galX(v)}" y="${y0+26}" text-anchor="middle">${v.toLocaleString()}</text>`});
 [80000,120000,160000,200000].forEach(v=>{g+=`<line x1="${x0}" y1="${galY(v)}" x2="${x1}" y2="${galY(v)}" stroke="#2b2140" stroke-dasharray="3 5" opacity=".22"/><text x="${x0-10}" y="${galY(v)+5}" text-anchor="end">${money(v)}</text>`});
 g+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="#2b2140" stroke-width="3"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="#2b2140" stroke-width="3"/>`;
 // axis titles, same format: title + arrow (both arrows in one font), then the red note for that corner
 g+=`<text x="${x0-60}" y="${y1-20}" class="gal-axis">MEDIAN ANNUAL WAGE <tspan class="gal-arr">↑</tspan><tspan class="gal-quad" dx="22">TOP-LEFT = PAYS A LOT, HIRES FEW</tspan></text>`;
 g+=`<text x="${(x0+x1)/2}" y="${y0+62}" text-anchor="middle" class="gal-axis">JOBS IN THAT CAREER, <tspan class="gal-axis-year">${state.galYear}</tspan> (LOG SCALE) <tspan class="gal-arr">→</tspan><tspan class="gal-quad" dx="22">BOTTOM-RIGHT = HIRES MANY, PAYS LESS</tspan></text>`;
 g+=`<text class="gal-yearbig" x="${x1-10}" y="${y1+70}" text-anchor="end">${state.galYear}</text>`;   // the current year; PLAY swaps it for "2015 → 2016"…
 const byE={}; pts.forEach(p=>(byE[p.e]=byE[p.e]||[]).push(p));
 let links=''; Object.values(byE).filter(a=>a.length>1).forEach(a=>{a.sort((p,q)=>p.x-q.x); for(let i=1;i<a.length;i++) links+=`<line class="gal-link" data-emp="${esc(a[i].e)}" x1="${a[i-1].x}" y1="${a[i-1].y}" x2="${a[i].x}" y2="${a[i].y}"/>`});
 let bubbles=''; pts.slice().sort((a,b)=>b.c-a.c).forEach(p=>{bubbles+=`<g class="gal-b" data-emp="${esc(p.e)}" data-k="${p.k}" data-id="${p.id}" data-m="${p.m}" data-c="${p.c}" data-all="${p.all}" data-tot="${p.tot}" data-s="${esc(p.s)}"><circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${careerColor(families[p.k])}"><title>${esc(galLong(p.e))} · ${GAL_SHORT[p.k]} · ≈${money(p.m)} · ${p.c.toLocaleString()} jobs</title></circle></g>`});
 // two label sets per bubble, both hidden by default, so only one industry's labels are ever visible together:
 // .gal-lab = industry name, shown while its industry is hovered; .gal-clab = career name, shown while its industry
 // is pinned (CSS .gal-pinned). Each set avoids collisions within its industry and falls back to the right of the bubble.
 let labels='';
 const place=(a,txt,cls)=>{const placed=a.map(q=>({x:q.x-q.r,y:q.y-q.r,w:2*q.r,h:2*q.r}));   // the industry's own bubbles are obstacles too
  const fits=bx=>!placed.some(o=>!(bx.x+bx.w<o.x||o.x+o.w<bx.x||bx.y+bx.h<o.y||o.y+o.h<bx.y))&&bx.x>x0&&bx.x+bx.w<x1+36&&bx.y>y1-20&&bx.y+bx.h<y0;
  a.forEach(p=>{const s=txt(p), w=s.length*8.3+4,h=15; /* measured: the 12px pixel font is ~8.3 units per character */ const cands=[[p.x+p.r+4,p.y-6],[p.x-p.r-4-w,p.y-6],[p.x-w/2,p.y-p.r-17],[p.x-w/2,p.y+p.r+3],[p.x+p.r*.7+2,p.y-p.r*.7-15],[p.x+p.r*.7+2,p.y+p.r*.7],[p.x-p.r*.7-2-w,p.y-p.r*.7-15],[p.x-p.r*.7-2-w,p.y+p.r*.7]]; const [lx,ly]=cands.find(([cx,cy])=>fits({x:cx,y:cy,w,h}))||cands[0]; placed.push({x:lx,y:ly,w,h}); labels+=`<text class="${cls}" data-emp="${esc(p.e)}" data-k="${p.k}" x="${lx+2}" y="${ly+11}">${esc(s)}</text>`;});};
 Object.values(byE).forEach(a=>{place(a,p=>p.s,'gal-lab'); place(a,p=>GAL_SHORT[p.k],'gal-clab');});
 state._galByE=byE;
 return `<svg class="gal-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}${links}${bubbles}${labels}</svg>`;
}
// a career row's value: its median in all industries, or (with an industry pinned) that industry's median vs all
function galCarVal(y,k,sel){const all=galAll(y,k), c=sel&&galCell(y,sel,k); return sel?(c?`<b>${money(c.median)}</b> vs ${money(all.median)}`:`— vs ${money(all.median)}`):money(all.median);}
function galaxySide(){
 const y=state.galYear; const byE=state._galByE||{}; const sel=state.galEmployer&&byE[state.galEmployer]?state.galEmployer:null; const car=state.galCareer;
 // One panel for every state, so neither list ever disappears: career buttons filter the chart, industry buttons pin
 // an industry; both toggle off when clicked again. With an industry pinned, each career row shows that industry's
 // median next to the all-industry median (otherwise just the all-industry median).
 const careers=families.map((f,k)=>`<button class="gal-row gal-car${car===k?' on':''}" data-gal-career="${k}" style="border-left-color:${careerColor(f)}"><span>${GAL_SHORT[k]}</span><span>${galCarVal(y,k,sel)}</span></button>`).join('');
 // the industry list keeps its 2015 order in every year (careers in it, then 2015 jobs), so rows never swap places
 const ref=galGroup(galPoints(GAL.years[0])), jobs15=e=>(ref[e]||[]).reduce((s,p)=>s+p.c,0);
 const inds=Object.entries(byE).sort((a,b)=>b[1].length-a[1].length||jobs15(b[0])-jobs15(a[0]));
 return `<div class="px-side-title">Careers · ${y}</div><div class="game-stat small">${sel?`median: ${esc(galShort(sel))} vs all industries`:'median, all industries'} · click to filter</div><div class="gal-list gal-cars">${careers}</div><div class="px-side-title gal-sub">Industries</div><div class="gal-list gal-inds">${inds.map(([e,a])=>`<button class="gal-row${sel===e?' on':''}" data-gal-emp="${esc(e)}"><span>${esc(galShort(e))}</span><span>${a.sort((p,q)=>p.k-q.k).map(p=>`<i style="background:${careerColor(families[p.k])}"></i>`).join('')}</span></button>`).join('')}</div><div class="game-stat small">Click an industry to pin it, again to unpin. ≈ = job-weighted median.</div>`;
}
function renderGalaxy(){
 if(!window.OEWS_IND) return `<section class="page piles-page"><h1 class="px-title">Which industry pays the most, year by year?</h1><div class="game-stat">data/oews-industry.js not loaded.</div>${nav()}</section>`;
 const chips=`<button data-gal-play class="gal-play">▶ PLAY</button>`+GAL.years.map(y=>`<button data-gal-year="${y}" class="${y===state.galYear?'active':''}">${y}</button>`).join('');
 return `<section class="page piles-page gal-page"><h1 class="px-title">Which industry pays the most, year by year?</h1><div class="piles-layout gal-layout"><div class="gal-main"><div class="gal-canvas" id="galCanvas">${galaxySvg()}<div class="gal-tip" id="galTip" hidden></div></div><div class="door-chips gal-chips">${chips}</div></div><aside class="px-side" id="galInfo">${galaxySide()}</aside></div>${nav()}</section>`;
}
// Tooltip for one bubble (static or moving): p = {e,k,m,c,all,tot}
function galTipHtml(p,year){const k=p.k, diff=p.m-p.all; return `<div class="gt-name" style="border-color:${careerColor(families[k])}">${esc(galLong(p.e))}</div><div class="gt-row"><span>career</span><b>${GAL_SHORT[k]} · ${year}</b></div><div class="gt-row"><span>median wage</span><b>≈${money(p.m)}</b></div><div class="gt-row"><span>vs all industries</span><b style="color:${diff>=0?'#2f8f5b':'#d9343b'}">${diff>=0?'+':'−'}${money(Math.abs(diff))}</b> <small>(all industries ≈${money(p.all)})</small></div><div class="gt-row"><span>jobs</span><b>${p.c.toLocaleString()}</b> <small>= ${(100*p.c/p.tot).toFixed(1)}% of ${p.tot.toLocaleString()} U.S. ${GAL_SHORT[k].toLowerCase()} jobs</small></div>`;}
function galGroup(pts){const byE={}; pts.forEach(p=>(byE[p.e]=byE[p.e]||[]).push(p)); return byE;}
// Interactions are the same with or without PLAY. Each one goes through a root.gal* function: when the chart is still,
// it toggles classes on the drawn bubbles (or redraws them); while PLAY runs, it updates the playback (root._play),
// which recomputes every moving bubble's classes (apply) and keeps playing.
//  - hover an industry (row or bubble): only its bubbles stay, joined by a line and labelled with their careers
//  - hover a career row: only that career's bubbles stay (preview of the filter)
//  - click a career: filter to it; click an industry (row or bubble): pin it; click again / the background: clear
//  - once filtered or pinned, hover only rings a bubble in red (focus), nothing disappears
function bindGalaxy(){
 const root=stage.querySelector('.gal-page'); if(!root) return; const svg=root.querySelector('.gal-svg');
 const selecting=()=>!!state.galEmployer||state.galCareer!=null;
 const hi=e=>{ if(root._play){ root._play.hoverE=e; root._play.apply(); return; }
  root.querySelectorAll('[data-emp]').forEach(el=>{el.classList.toggle('dim',e!=null&&el.dataset.emp!==e); el.classList.toggle('hi',e!=null&&el.dataset.emp===e);}); };
 const focus=(e,k)=>{ if(root._play){ root._play.focusE=e; root._play.focusK=k; root._play.apply(); return; }
  root.querySelectorAll('.gal-b,.gal-lab,.gal-clab').forEach(el=>el.classList.toggle('focus',(e!=null||k!=null)&&(e==null||el.dataset.emp===e)&&(k==null||+el.dataset.k===k))); };
 const careerPreview=k=>{ if(root._play){ root._play.hoverK=k; root._play.apply(); return; }
  root.querySelectorAll('.gal-b,.gal-lab,.gal-clab').forEach(el=>el.classList.toggle('dim',k!=null&&+el.dataset.k!==k));
  root.querySelectorAll('.gal-link').forEach(el=>el.classList.toggle('dim',k!=null)); };
 const refreshSide=()=>{ state._galByE=galGroup(galPoints(state.galYear)); root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxySide(root); };
 const pin=e=>{ const P=root._play;
  if(P){ state.galEmployer=e; if(e) state.galCareer=null; P.hoverE=P.hoverK=P.focusE=P.focusK=null; P.apply(); refreshSide(); return; }
  if(e&&state.galCareer!=null){ state.galCareer=null; state.galEmployer=e; root.galRerender(); return; }
  focus(null,null); state.galEmployer=e; hi(e); refreshSide(); };
 const filter=k=>{ state.galCareer=k; if(k!=null) state.galEmployer=null; const P=root._play;
  if(P){ P.hoverE=P.hoverK=P.focusE=P.focusK=null; P.apply(); refreshSide(); return; }
  root.galRerender(); };
 Object.assign(root,{galHi:hi,galFocus:focus,galCareerPreview:careerPreview,galPin:pin,galFilter:filter});
 const tip=root.querySelector('#galTip'), cv=root.querySelector('#galCanvas');
 const moveTip=ev=>{const r=cv.getBoundingClientRect(); const k=stageScale(); let x=(ev.clientX-r.left)/k+16, y=(ev.clientY-r.top)/k-10; if(x+300>r.width/k) x-=330; if(y+130>r.height/k) y-=120; tip.style.left=x+'px'; tip.style.top=y+'px';};
 const showTip=(p,ev)=>{ tip.innerHTML=galTipHtml(p,state.galYear); tip.hidden=false; moveTip(ev); };
 if(!root._play){
  svg.querySelectorAll('.gal-b').forEach(b=>{const p={e:b.dataset.emp,k:+b.dataset.k,m:+b.dataset.m,c:+b.dataset.c,all:+b.dataset.all,tot:+b.dataset.tot};
   b.addEventListener('mouseenter',ev=>{ if(selecting()) focus(p.e,p.k); else hi(p.e); showTip(p,ev); });
   b.addEventListener('mousemove',moveTip);
   b.addEventListener('mouseleave',()=>{ if(selecting()) focus(null,null); else hi(null); tip.hidden=true; });
   b.addEventListener('click',ev=>{ ev.stopPropagation(); pin(state.galEmployer===p.e?null:p.e); }); });
  svg.addEventListener('click',()=>root.galPin(null));
 }
 // PLAY / STOP (bound once per page; bindGalaxy runs again after every redraw)
 const pb=root.querySelector('[data-gal-play]');
 const stopPlay=()=>{ const P=root._play; if(!P) return; cancelAnimationFrame(P.raf); const Y=GAL.years, yEnd=Y[Math.min(Y.length-1,Math.round(P.t))];
  root._play=null; pb.textContent='▶ PLAY'; tip.hidden=true; state.galYear=yEnd;
  const tmp=document.createElement('div'); tmp.innerHTML=galaxySvg(); root.querySelector('.gal-svg').replaceWith(tmp.firstChild);
  const yb=root.querySelector('.gal-svg .gal-yearbig'); if(yb) yb.animate([{opacity:0},{opacity:1}],{duration:900,easing:'ease-out'});
  root.querySelectorAll('[data-gal-year]').forEach(x=>x.classList.toggle('active',+x.dataset.galYear===yEnd));
  root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxy(); };
 const startPlay=()=>{
  pb.textContent='■ STOP'; tip.hidden=true;
  const Y=GAL.years, NS='http://www.w3.org/2000/svg', mk=(tag,cls)=>{const el=document.createElementNS(NS,tag); if(cls) el.setAttribute('class',cls); return el;};
  // every career is animated, whatever the filter, so filtering during PLAY only shows/hides bubbles
  const P=Y.map(y=>{const m={}; galPoints(y,true).forEach(p=>{p.x=galX(p.c);p.y=galY(p.m);p.r=galR(p.c); m[p.id]=p}); return m;});
  const ids=[...new Set(P.flatMap(m=>Object.keys(m)))];
  const svg=root.querySelector('.gal-svg'); svg.querySelectorAll('.gal-b,.gal-lab,.gal-clab,.gal-link').forEach(e=>e.remove());
  const link=mk('polyline','gal-link gal-plink hi'); link.style.display='none'; svg.appendChild(link);   // the highlighted industry's line, under the bubbles
  const layer=mk('g'); svg.appendChild(layer);
  // the big label at the top right: the still chart's year makes way for the step being played ("2015 → 2016"), fading in
  let yearTag=svg.querySelector('.gal-yearbig'); if(!yearTag){ yearTag=mk('text','gal-yearbig'); yearTag.setAttribute('x',GAL.x1-10); yearTag.setAttribute('y',GAL.y1+70); yearTag.setAttribute('text-anchor','end'); svg.appendChild(yearTag); }
  const i0=Y.indexOf(state.galYear);
  const play={t:i0<0||i0>=Y.length-1?0:i0, raf:0, nodes:{}, hoverE:null, hoverK:null, focusE:null, focusK:null, tipId:null, linkE:null};
  // first the still chart's year fades out while the bubbles hold still (play.hold); then the step label ("2021 → 2022")
  // fades in and the bubbles start moving, so the label always matches what is drawn
  const OUT=500; play.hold=true;
  yearTag.getAnimations().forEach(a=>a.cancel()); yearTag.animate([{opacity:1},{opacity:0}],{duration:OUT,easing:'ease-in',fill:'forwards'});
  setTimeout(()=>{ if(root._play!==play||!document.body.contains(root)) return;
   yearTag.getAnimations().forEach(a=>a.cancel()); yearTag.textContent=Y[Math.floor(play.t)]+' → '+Y[Math.floor(play.t)+1];
   yearTag.animate([{opacity:0},{opacity:1}],{duration:900,easing:'ease-out'});
   last=performance.now(); play.hold=false; },OUT);
  const cur=id=>P[Math.max(0,Y.indexOf(state.galYear))][id];
  ids.forEach(id=>{const any=P.find(m=>m[id])[id], g=mk('g','gal-b'), c=mk('circle'), t1=mk('text','gal-lab'), t2=mk('text','gal-clab');
   g.dataset.emp=t1.dataset.emp=t2.dataset.emp=any.e; g.dataset.k=t1.dataset.k=t2.dataset.k=any.k; g.dataset.id=id;
   c.setAttribute('fill',careerColor(families[any.k])); t1.textContent=any.s; t2.textContent=GAL_SHORT[any.k]; g.append(c,t1,t2); layer.appendChild(g);
   g.addEventListener('mouseenter',ev=>{ if(selecting()) focus(any.e,any.k); else hi(any.e); play.tipId=id; const p=cur(id); if(p) showTip(p,ev); });
   g.addEventListener('mousemove',moveTip);
   g.addEventListener('mouseleave',()=>{ if(selecting()) focus(null,null); else hi(null); play.tipId=null; tip.hidden=true; });
   g.addEventListener('click',ev=>{ ev.stopPropagation(); pin(state.galEmployer===any.e?null:any.e); });
   play.nodes[id]={g,c,t1,t2,e:any.e,k:any.k,x:0,y:0};});
  // which bubbles stay / are highlighted / ringed, from the filter, the pin and what is hovered
  play.apply=()=>{ const E=state.galEmployer, K=state.galCareer, sel=!!E||K!=null, {hoverE:hE,hoverK:hK,focusE:fE,focusK:fK}=play;
   root.classList.toggle('gal-pinned',!!E);
   ids.forEach(id=>{const n=play.nodes[id];
    const gone=(K!=null&&n.k!==K)||(!!E&&n.e!==E)||(!sel&&hK!=null&&n.k!==hK)||(!sel&&hE!=null&&n.e!==hE);
    const lit=(!!E&&n.e===E)||(!sel&&hE!=null&&n.e===hE);
    const ring=sel&&(fE!=null||fK!=null)&&(fE==null||n.e===fE)&&(fK==null||n.k===fK);
    [n.g,n.t1,n.t2].forEach(el=>{el.classList.toggle('dim',gone); el.classList.toggle('hi',lit); el.classList.toggle('focus',ring);});});
   play.linkE=E||(sel?null:hE); };
  const drawLink=()=>{ const ns=play.linkE?ids.map(id=>play.nodes[id]).filter(n=>n.e===play.linkE&&!n.g.classList.contains('dim')).sort((a,b)=>a.x-b.x):[];
   if(ns.length<2){ link.style.display='none'; return; } link.style.display=''; link.setAttribute('points',ns.map(n=>n.x.toFixed(1)+','+n.y.toFixed(1)).join(' ')); };
  root._play=play; play.apply(); svg.addEventListener('click',()=>{ if(root._play===play) pin(null); });
  const PER=1200; let last=performance.now();
  // dt is clamped at 0: the first rAF timestamp can be slightly earlier than `last`, which would push t below 0
  const frame=now=>{ if(!document.body.contains(root)||root._play!==play) return; const dt=Math.max(0,now-last); last=now; let t=play.t+(play.hold?0:dt/PER);
   const end=t>=Y.length-1; if(end) t=Y.length-1; play.t=t; const i=Math.min(Y.length-2,Math.floor(t)), f=Math.min(1,t-i), A=P[i], B=P[i+1];
   ids.forEach(id=>{const a=A[id]||B[id], b=B[id]||A[id], n=play.nodes[id]; if(!a){ n.g.style.display='none'; return; } n.g.style.display='';
    const x=a.x+(b.x-a.x)*f, y=a.y+(b.y-a.y)*f, r=a.r+(b.r-a.r)*f; n.x=x; n.y=y;
    n.c.setAttribute('cx',x); n.c.setAttribute('cy',y); n.c.setAttribute('r',r);
    [n.t1,n.t2].forEach(tx=>{tx.setAttribute('x',x+r+4); tx.setAttribute('y',y+4);});});
   drawLink();
   const yShow=Y[Math.min(Y.length-1,Math.round(t))]; if(!play.hold) yearTag.textContent=Y[i]+' → '+Y[i+1];
   if(yShow!==state.galYear){ state.galYear=yShow; root.querySelectorAll('[data-gal-year]').forEach(x=>x.classList.toggle('active',+x.dataset.galYear===yShow));
    // the year in the x-axis title and the career medians follow the playback (rows are updated in place, so hover keeps working)
    const ay=svg.querySelector('.gal-axis-year'); if(ay) ay.textContent=yShow;
    const st=root.querySelector('#galInfo .px-side-title'); if(st) st.textContent='Careers · '+yShow;
    root.querySelectorAll('[data-gal-career]').forEach(b=>{ if(b.lastElementChild) b.lastElementChild.innerHTML=galCarVal(yShow,+b.dataset.galCareer,state.galEmployer); });
    if(play.tipId&&!tip.hidden){ const p=cur(play.tipId); if(p) tip.innerHTML=galTipHtml(p,yShow); } }
   // at the end ("2024 → 2025" fully drawn) the label fades out, then the still chart returns with its year fading in
   if(end){ yearTag.animate([{opacity:1},{opacity:0}],{duration:900,easing:'ease-in',fill:'forwards'}).finished.then(()=>{ if(root._play===play) stopPlay(); },()=>{}); return; }
   play.raf=requestAnimationFrame(frame); };
  play.raf=requestAnimationFrame(frame); };
 if(!root.dataset.galPlayBound){ root.dataset.galPlayBound=1; pb.addEventListener('click',()=>{ if(root._play) stopPlay(); else startPlay(); }); }
 if(!root.dataset.galChips){ root.dataset.galChips=1; root.querySelectorAll('[data-gal-year]').forEach(btn=>btn.addEventListener('click',()=>{const y=+btn.dataset.galYear;
   if(root._play) stopPlay();   // a year button stops PLAY, then jumps to that year
   if(y===state.galYear) return; const svg=root.querySelector('.gal-svg'); const old={}; svg.querySelectorAll('.gal-b').forEach(b=>{const c=b.querySelector('circle'); old[b.dataset.id]=[+c.getAttribute('cx'),+c.getAttribute('cy')]}); state.galYear=y; const tmp=document.createElement('div'); tmp.innerHTML=galaxySvg(); const nu=tmp.firstChild; svg.replaceWith(nu); nu.querySelectorAll('.gal-b').forEach(b=>{const o=old[b.dataset.id]; const c=b.querySelector('circle'); if(o){const dx=o[0]-c.getAttribute('cx'),dy=o[1]-c.getAttribute('cy'); b.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:600,easing:'cubic-bezier(.3,.8,.4,1)'});} else b.animate([{opacity:0},{opacity:1}],{duration:500});}); root.querySelectorAll('[data-gal-year]').forEach(x=>x.classList.toggle('active',x===btn)); if(state.galEmployer&&!state._galByE[state.galEmployer]) state.galEmployer=null; root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxy(); })); }
 // redraw the chart and the side panel after the career filter changes (bindGalaxy rebinds the new svg and panel)
 root.galRerender=()=>{const tmp=document.createElement('div'); tmp.innerHTML=galaxySvg(); root.querySelector('.gal-svg').replaceWith(tmp.firstChild); if(state.galEmployer&&!state._galByE[state.galEmployer]) state.galEmployer=null; tip.hidden=true; root.querySelector('#galInfo').innerHTML=galaxySide(); bindGalaxy();};
 bindGalaxySide(root); if(!root._play&&state.galEmployer) hi(state.galEmployer);
}
function bindGalaxySide(root){
 // runs after every redraw of the panel. While an industry is pinned, its bubbles show their career names (.gal-pinned).
 // Career filter and industry pin are exclusive: choosing one clears the other. Works the same during PLAY.
 root.classList.toggle('gal-pinned',!!state.galEmployer);
 const F=(e,k)=>root.galFocus(e,k);
 root.querySelectorAll('[data-gal-emp]').forEach(b=>{const e=b.dataset.galEmp;
  b.addEventListener('mouseenter',()=>{ if(state.galCareer!=null) F(e,null); else if(!state.galEmployer) root.galHi(e); });
  b.addEventListener('mouseleave',()=>{ if(state.galCareer!=null) F(null,null); else if(!state.galEmployer) root.galHi(null); });
  b.addEventListener('click',()=>root.galPin(state.galEmployer===e?null:e)); });
 root.querySelectorAll('[data-gal-career]').forEach(b=>{const k=+b.dataset.galCareer;
  b.addEventListener('mouseenter',()=>{ if(state.galEmployer) F(state.galEmployer,k); else if(state.galCareer==null) root.galCareerPreview(k); });
  b.addEventListener('mouseleave',()=>{ if(state.galEmployer) F(null,null); else if(state.galCareer==null) root.galCareerPreview(null); });
  b.addEventListener('click',()=>{ root.galCareerPreview(null); root.galFilter(state.galCareer===k?null:k); }); });
}

/* ---------- Page 10: Why do some careers open more doors? (the six careers in race order, each with its reasons) ----------
   How many jobs open up each year (per 1,000 jobs, page 8 / page 9) depends on how fast the career grows and how often
   its people leave (retire, or switch to another occupation). One fellow at a time walks in and explains its career;
   the six careers (race order) are picked on the right.
   Sources (all 2025–35 unless noted):
     growth and its reasons: BLS Occupational Outlook Handbook, "Job Outlook" of each occupation;
     leaving: BLS Employment Projections Table 1.10 (labor force exit rate = retire / stop working; occupational transfer
       rate = switch occupation): CIS managers 1.6 / 4.2 % (highest transfer rate of the six careers' jobs), software
       developers 1.4 / 2.9 (lowest exit rate), database admins & architects 1.8 / 2.7 (Data Eng: lowest transfer rate of the six);
     median ages: BLS Current Population Survey 2025, table 11b (software developers 38.6, the youngest). */
const WHY_PAGE=11;   // 0-based index in render()'s list
const WHY_CARDS={
 'Data Science & Analytics':{head:'Data and AI demand is booming.',
  why:'Companies make more and more decisions with data and are building AI into their work, so data scientist jobs grow 35% by 2035, one of the fastest-growing jobs in the U.S.'},
 'Data & Technology Management':{head:'Growing, and managers move on.',
  why:'Every company relies more on cloud, security and AI and needs IT managers to run it (+16%). Managers also switch to other jobs more than anyone here (4.2% a year), which frees up their seats.'},
 'AI & Machine Learning':{head:'AI research is booming.',
  why:'New AI tools, data mining and cybersecurity research all need computer and information research scientists, so these jobs grow 22% by 2035.'},
 'Systems, Cloud & Security':{head:'Security up, admin work down.',
  why:'Cyberattacks keep rising, so security analyst jobs grow 21%. But automation and outsourcing cut network and systems admin jobs (−4%), so the career grows only 7% overall.'},
 'Software Engineering':{head:'AI automates coding, and people stay.',
  why:'Developer jobs grow 10%, but AI takes over routine coding and programmer jobs shrink 7%. Software workers are also the youngest group (median age 39), so few of them retire.'},
 'Data Engineering & Architecture':{head:'The cloud needs fewer admins.',
  why:'In the cloud, a few database admins can serve many companies, so their jobs stop growing (0%) and only architects grow (+9%). People also rarely switch out of this career.'}
};
function whyRows(){
 return families.map((f,i)=>({f,i,tot:Math.round(DATA.blsFamily[f].openingsPer1000)})).sort((a,b)=>b.tot-a.tot);
}
// what the fellow says: who it is, its openings and rank, then why (first person; the lines appear one by one)
function whySpeech(f){
 const rows=whyRows(), j=rows.findIndex(r=>r.f===f), r=rows[j], c=WHY_CARDS[f], m=meta[f];
 // no "I'm ..." line: the fellows introduced themselves on the cover and page 2
 return `<p class="wl" style="--d:.05s">In <b>${esc(shortName[f])}</b>, we open <b>${r.tot}</b> jobs a year for every 1,000 jobs: <b>#${j+1}</b> of six in the race.</p>`
  +`<p class="wl wy-why" style="--d:.5s"><b><span class="wy-q">Why?</span> ${esc(c.head)}</b> ${esc(c.why)}</p>`;
}
// The career's company building (middle-right of the stage, a street to its right), pixel art: a rooftop billboard
// with the career's name, a facade in the career's colour with a darker side for depth, framed windows (lit / dark),
// a striped awning over a glass double door, and two potted plants.
const WB2={W:300,H:360,DOOR:150};   // svg size; door centre x
function whyBuildingSvg(f){
 const R=(x,y,w,h,cls,st='')=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"${st?` style="${st}"`:''}/>`;
 let s=`<svg viewBox="0 0 ${WB2.W} ${WB2.H}" width="${WB2.W}" height="${WB2.H}" shape-rendering="crispEdges" aria-hidden="true">`;
 // billboard on the roof
 s+=R(70,36,6,22,'wb3-ink')+R(224,36,6,22,'wb3-ink')+R(36,0,228,40,'wb3-board')+`<text class="wb3-name" x="150" y="27" text-anchor="middle">${esc(DOOR_SHORT[families.indexOf(f)])}</text>`;
 // roof, side wall (depth), facade
 s+=R(0,56,296,14,'wb3-ink')+R(270,70,22,290,'wb3-side')+R(10,70,262,290,'wb3-wall');
 // windows: frame, pane (lit or dark; the pane is what lights up / goes dark), a glint and a sill
 for(let r=0;r<4;r++) for(let c=0;c<4;c++){ const x=26+c*60, y=86+r*48;
  s+=R(x,y,40,32,'wb3-ink')+R(x+4,y+4,32,24,'wb2-win lit')+R(x+6,y+6,8,4,'wb3-glint')+R(x-3,y+32,46,4,'wb3-sill'); }
 // awning (career colour and white stripes) over a glass double door, plants either side
 for(let k=0;k<8;k++) s+=R(96+k*14,268,14,18,k%2?'wb3-stripe-w':'wb3-stripe');
 s+=R(94,266,116,3,'wb3-ink')+R(94,286,116,3,'wb3-ink');
 s+=R(116,292,68,68,'wb3-ink')+R(120,296,28,64,'wb3-glass')+R(152,296,28,64,'wb3-glass')+R(124,300,6,20,'wb3-glint')+R(156,300,6,20,'wb3-glint')+R(142,326,4,10,'wb3-ink')+R(154,326,4,10,'wb3-ink');
 [[56],[214]].forEach(([x])=>{ s+=R(x+4,320,22,18,'wb3-leaf')+R(x,328,30,14,'wb3-leaf2')+R(x+2,340,26,20,'wb3-pot')+R(x+2,340,26,3,'wb3-ink'); });
 return s+'</svg>';
}
function renderWhy(){
 const rows=whyRows(), home=state.homeFamily||state.selectedFamily, pick=state.whyPick||home, m=meta[pick];
 // the career switch: the same chips as the other pages, in race order (#1 = most openings)
 const btns=rows.map((r,j)=>`<button type="button" data-why-f="${esc(r.f)}" class="${r.f===pick?'active':''}">#${j+1} ${esc(DOOR_SHORT[r.i])}${r.f===home?' · you':''}</button>`).join('');
 return `<section class="page piles-page why-page"><h1 class="px-title">Why do some careers open more doors?</h1><div class="wy-layout">`
  +`<div class="wy-stage" id="wyStage" style="--c:${careerColor(pick)}"><div class="ws-ground"></div><div class="wy-bld" id="wyBld">${whyBuildingSvg(pick)}</div>`
  +`<div class="wy-legend"><span><i class="in"></i>GOING IN: NEW HIRES</span><span><i class="out"></i>COMING OUT: PEOPLE WHO QUIT, RETIRE OR SWITCH CAREERS</span></div>`
  +`<div class="wy-fellow" id="wyFellow"><img src="assets/fellows/${m.key}-idle.webp" alt=""></div><div class="wy-bubble" id="wyBubble" aria-live="polite"></div></div>`
  +`<aside class="px-side wy-pick"><div class="px-side-title">Pick a career</div><h3>In race order · openings a year per 1,000 jobs</h3><div class="family-switch wy-chips">${btns}</div><p class="wy-src">Openings a year for every 1,000 jobs, in race order. Sources: BLS Occupational Outlook Handbook and Employment Projections, 2025–35; ages: BLS Current Population Survey, 2025.</p></aside>`
  +`</div>${nav()}</section>`;
}
// Our fellow (left, under its speech bubble) watches its career's company building, where people keep coming and going
// along the street on the right: new hires walk in from the right (a window lights up), people who quit, retire or switch
// careers walk out in grey and off to the right (a window goes dark). How often follows the data: in = job openings a
// year, out = people leaving a year (both per 1,000 jobs). Picking another career: no new passers-by, our fellow walks
// off to the left, and once the street is empty the building changes and the new fellow walks in. A newer click cancels
// an unfinished change (token).
function bindWhy(){
 const root=stage.querySelector('.why-page'); if(!root) return;
 const stg=root.querySelector('#wyStage'), bld=root.querySelector('#wyBld'), fel=root.querySelector('#wyFellow'), img=fel.querySelector('img'), bub=root.querySelector('#wyBubble');
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches), alive=()=>document.body.contains(root);
 const X_IN=70, X_OUT=-140, IN_MS=900, OUT_MS=800;
 let token=0, iv=null, cur=state.whyPick||state.homeFamily||state.selectedFamily, shown=cur;   // cur = picked; shown = the fellow on stage
 const run=(f,on)=>{ clearInterval(iv); const key=meta[f].key; if(!on){ img.src=`assets/fellows/${key}-idle.webp`; return; } let k=0;
  iv=setInterval(()=>{ if(!alive()){clearInterval(iv);return;} img.src=`assets/fellows/${key}-run${k++%3+1}.webp`; },110); };
 const move=(x,ms)=>{ fel.style.transition=`left ${ms}ms linear`; fel.style.left=x+'px'; };
 // the bubble sits above our fellow and reaches across to the building
 const fitBubble=()=>{ bub.style.width=Math.max(300,bld.offsetLeft-40-bub.offsetLeft)+'px'; };
 const speak=f=>{ bub.innerHTML=whySpeech(f); fitBubble(); bub.classList.add('show'); };
 // ---- people going in and out of the building ----
 let traffic=null;
 const frames=setInterval(()=>{ if(!alive()){clearInterval(frames);return;} const n=Math.floor(performance.now()/120)%3+1;
  stg.querySelectorAll('.wt').forEach(el=>{el.firstChild.src=`assets/fellows/${el.dataset.key}-run${n}.webp`;}); },120);
 const wins=()=>[...bld.querySelectorAll('.wb2-win')];
 // Windows change only when people come and go. A few desks always stand empty (VACANT dark windows = open positions):
 // someone leaving turns a random lit window dark; a new hire lights a random dark one, never the one that has just gone
 // dark if there is another, so it is a different window each time. Once only the empty desks are left dark, a new hire
 // is taking a brand-new desk and no window changes.
 const VACANT=3; let lastDark=null;
 const darken=()=>{ const w=wins().filter(x=>x.classList.contains('lit')); if(!w.length) return; const x=w[Math.floor(Math.random()*w.length)]; x.classList.remove('lit'); lastDark=x; };
 const relight=()=>{ const d=wins().filter(x=>!x.classList.contains('lit')); if(d.length<=VACANT) return; const p=d.filter(x=>x!==lastDark), pool=p.length?p:d; pool[Math.floor(Math.random()*pool.length)].classList.add('lit'); };
 const seedDark=()=>{ const w=wins(); w.forEach(x=>x.classList.add('lit')); for(let i=0;i<=VACANT;i++){ const l=w.filter(x=>x.classList.contains('lit')); l[Math.floor(Math.random()*l.length)].classList.remove('lit'); } lastDark=null; };
 const spawn=dir=>{ if(!alive()) return; const door=bld.offsetLeft+WB2.DOOR, W=stg.clientWidth, el=document.createElement('span');
  el.className='wt '+dir; el.dataset.key=stg.dataset.key; el.innerHTML=`<img src="assets/fellows/${el.dataset.key}-run1.webp" alt="">`; stg.appendChild(el);
  // everyone walks at a slightly different pace
  const sz=dir==='in'?60:56, a=dir==='in'?W+10:door-sz/2, b=dir==='in'?door-sz/2:W+10, ms=Math.abs(b-a)/(0.15+Math.random()*0.07);
  if(dir==='out') darken();   // someone leaves: a window goes dark
  const anim=el.animate([{left:a+'px',opacity:dir==='out'?0:1},{left:(a+(b-a)*.08)+'px',opacity:1,offset:.08},{left:(a+(b-a)*.92)+'px',opacity:1,offset:.92},{left:b+'px',opacity:dir==='in'?0:1}],{duration:ms,easing:'linear',fill:'forwards'});
  anim.finished.then(()=>{ el.remove(); if(dir==='in'&&alive()) relight(); }).catch(()=>el.remove()); };   // a new hire takes a desk
 // irregular arrivals: random gaps around the average (exponential, clamped), so people sometimes come in clusters
 const gap=mean=>Math.min(2.6*mean,Math.max(.25*mean,-Math.log(1-Math.random())*mean));
 const stopSpawning=()=>{ if(traffic){ clearTimeout(traffic.in); clearTimeout(traffic.out); } traffic=null; };
 const stopTraffic=()=>{ stopSpawning(); stg.querySelectorAll('.wt').forEach(e=>e.remove()); };
 // once everyone on the street has gone in or walked off (at most ~6 s), run `then`
 const whenClear=(t,then)=>{ const t0=performance.now(); const chk=()=>{ if(t!==token||!alive()) return; if(!stg.querySelector('.wt')||performance.now()-t0>6000) then(); else setTimeout(chk,120); }; chk(); };
 const startTraffic=f=>{ stopTraffic(); if(reduce) return; const b=DATA.blsFamily[f], tot=Math.round(b.openingsPer1000), g=Math.round((b.employment2035-b.employment)/10/b.employment*1000), l=Math.max(1,tot-g);
  const K=70000;   // on average: 81 openings a year → someone goes in every ~0.86 s; 54 leavers → someone comes out every ~1.3 s
  const tr=traffic={};
  const loop=(dir,mean,first)=>{ tr[dir]=setTimeout(()=>{ if(traffic!==tr||!alive()) return; spawn(dir); loop(dir,mean,gap(mean)); },first); };
  loop('in',K/tot,0); loop('out',K/l,gap(K/l)*.6); };
 // the building stays: on the first entrance its windows are seeded; on a switch its colours glide to the new career
 // (css transitions on the fills that use var(--c)) and the name on the billboard fades out and the new one fades in
 let built=false;
 const setBuilding=f=>{ stg.dataset.key=meta[f].key; stg.style.setProperty('--c',careerColor(f));
  const name=bld.querySelector('.wb3-name'), txt=DOOR_SHORT[families.indexOf(f)];
  if(!built||reduce){ built=true; name.textContent=txt; if(!reduce) seedDark(); return; }
  if(name.textContent===txt) return;
  name.getAnimations().forEach(a=>a.cancel());
  name.animate([{opacity:1},{opacity:0}],{duration:400,easing:'ease-in',fill:'forwards'}).finished.then(()=>{ if(!alive()) return; name.textContent=txt;
   name.getAnimations().forEach(a=>a.cancel()); name.animate([{opacity:0},{opacity:1}],{duration:500,easing:'ease-out'}); },()=>{}); };
 // ---- our fellow ----
 const enter=(f,t)=>{ shown=f; setBuilding(f); startTraffic(f); fel.style.transition='none'; fel.style.left=X_OUT+'px'; fel.classList.remove('flip'); run(f,false); void fel.offsetWidth;
  if(reduce){ fel.style.left=X_IN+'px'; speak(f); return; }
  run(f,true); move(X_IN,IN_MS);
  setTimeout(()=>{ if(t!==token||!alive()) return; run(f,false); speak(f); },IN_MS+30); };
 const leave=(f,t,then)=>{ bub.classList.remove('show'); stopSpawning();
  if(reduce){ then(); return; }
  fel.classList.add('flip'); run(f,true); move(X_OUT,OUT_MS);
  setTimeout(()=>{ if(t!==token||!alive()) return; run(f,false); then(); },OUT_MS+30); };
 let exiting=false;
 root.querySelectorAll('[data-why-f]').forEach(b=>b.addEventListener('click',()=>{ const f=b.dataset.whyF; if(exiting||f===cur) return;
  const old=shown, t=++token; cur=f; state.whyPick=f;
  root.querySelectorAll('[data-why-f]').forEach(x=>x.classList.toggle('active',x===b));
  leave(old,t,()=>whenClear(t,()=>enter(f,t))); }));
 // Next is the plain page turn: no exit animation on this page.
 stg.dataset.key=meta[cur].key;
 const t=++token; requestAnimationFrame(()=>{ if(alive()) enter(cur,t); });
}
// Page 10's story: from the race to the reasons
function whyStoryHtml(){
 const rows=whyRows();
 return storyHtml(`Same race, different <mark>reasons</mark>.`,[
  `In the race, <b>${esc(shortName[rows[0].f])}</b> opened the most doors and <b>${esc(shortName[rows[rows.length-1].f])}</b> the fewest. But why?`,
  `Two things decide how many jobs open up each year: how fast a career <b>grows</b>, and how often its people <b>leave</b>, to retire or to switch careers. Together, they show where demand is heading.`],
  `Guess: why does Software, the biggest career, open so few doors?`);
}
/* ---------- Page 11: You made it! Drag the key into the door; it opens onto your career summary (radar) ---------- */
// One spoke per stop of the journey. Score = this career's value ÷ the highest of the six careers, so the outer ring is
// the top career on that spoke. Every spoke is "more = more options", so a bigger shape = more options, not a better fit.
// The spokes will change as the earlier pages settle: edit SUMMARY_AXES only (val = raw value, short = label on the chart,
// fmt = sentence in the side panel).
const SUMMARY_AXES=[
 {stop:'Jobs',name:'Title variety',
  val:f=>{const r=DATA.familyData[f].roles.slice(0,10),t=r.reduce((s,x)=>s+(x.records||0),0)||1;return 100*(1-Math.max(...r.map(x=>x.records||0))/t);},
  short:v=>Math.round(v)+'%',
  fmt:(v,f)=>{const r=DATA.familyData[f].roles.slice(0,10),top=r.reduce((a,b)=>(b.records||0)>(a.records||0)?b:a);return `${Math.round(v)}% of its jobs are not titled “${top.title}”`;}},
 {stop:'Places',name:'Spread across states',
  val:f=>{const g=(DATA.geography[f]||[]).map(r=>r.employment||0).sort((a,b)=>b-a),t=g.reduce((s,x)=>s+x,0)||1;return 100*(1-g.slice(0,5).reduce((s,x)=>s+x,0)/t);},
  short:v=>Math.round(v)+'%', fmt:v=>`${Math.round(v)}% of its jobs are outside the top 5 states`},
 {stop:'Pay',name:'Median salary', val:f=>DATA.familyData[f].median, short:v=>money(v), fmt:v=>`${money(v)} median salary (2024 salary records)`},
 {stop:'Industries',name:'Industry reach',
  val:f=>{const d=window.OEWS_IND&&OEWS_IND.data[2025]; if(!d) return 0; const e=Object.values(d).map(x=>(x&&x[f]&&x[f].emp)||0),t=e.reduce((s,x)=>s+x,0)||1; return e.filter(x=>x/t>=.02).length;},
  short:v=>String(v), fmt:v=>`${v} industries each employ 2%+ of its workers`},
 // Levels (pages 8-9): the share of the career's salary records at Entry level, i.e. room for newcomers (more = more options)
 {stop:'Levels',name:'Room for newcomers',
  val:f=>{const e=(DATA.familyData[f].experience||[]).find(x=>x.code==='EN'); return e?e.share:0;},
  short:v=>Math.round(v)+'%', fmt:v=>`${Math.round(v)} of every 100 salary records are Entry level`},
 {stop:'2035',name:'Job growth', val:f=>DATA.blsFamily[f].growth, short:v=>'+'+Math.round(v)+'%', fmt:v=>`+${Math.round(v)}% more jobs by 2035`},
 {stop:'2035',name:'Openings', val:f=>DATA.blsFamily[f].openingsPer1000, short:v=>Math.round(v)+'/1k', fmt:v=>`${Math.round(v)} openings a year for every 1,000 jobs`}
];
const UNLOCK_PAGE=12;   // 0-based index of this page in render()'s list
function summaryScores(f){return SUMMARY_AXES.map(a=>{const v=a.val(f),max=Math.max(...families.map(g=>a.val(g)))||1;return {a,v,s:Math.max(0,v)/max};});}
function summaryRadarSvg(grow){
 const f=state.selectedFamily, cmp=state.summaryCompare, W=900,H=600,cx=450,cy=300,R=185,n=SUMMARY_AXES.length;
 const ang=i=>-Math.PI/2+i*2*Math.PI/n, pt=(i,r)=>[cx+Math.cos(ang(i))*r,cy+Math.sin(ang(i))*r], P=a=>a.map(v=>v.toFixed(1)).join(',');
 const poly=(g,cls)=>`<polygon class="${cls}" style="--c:${careerColor(g)}" points="${summaryScores(g).map((o,i)=>P(pt(i,R*o.s))).join(' ')}"/>`;
 let s=`<svg class="sum-radar" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Radar chart: ${esc(shortName[f])} on ${n} measures, each compared with the top career of the six">`;
 [.25,.5,.75,1].forEach(q=>{s+=`<polygon class="sum-ring${q===1?' outer':''}" points="${SUMMARY_AXES.map((_,i)=>P(pt(i,R*q))).join(' ')}"/>`;});
 SUMMARY_AXES.forEach((_,i)=>{s+=`<line class="sum-spoke" x1="${cx}" y1="${cy}" x2="${pt(i,R)[0].toFixed(1)}" y2="${pt(i,R)[1].toFixed(1)}"/>`;});
 if(cmp&&cmp!==f) s+=poly(cmp,'sum-shape cmp');
 s+=`<g class="${grow?'sum-grow':''}" style="transform-origin:${cx}px ${cy}px">${poly(f,'sum-shape me')}`;
 summaryScores(f).forEach((o,i)=>{const [x,y]=pt(i,R*o.s); s+=`<rect class="sum-pt" x="${(x-7).toFixed(1)}" y="${(y-7).toFixed(1)}" width="14" height="14"><title>${esc(o.a.stop)} · ${esc(o.a.name)}: ${esc(o.a.short(o.v))} (${Math.round(o.s*100)} of 100)</title></rect>`;});
 s+='</g>';
 summaryScores(f).forEach((o,i)=>{const [x,y]=pt(i,R+40), c=Math.cos(ang(i)), anchor=Math.abs(c)<.2?'middle':c>0?'start':'end', y0=y+(Math.sin(ang(i))<-.5?-30:Math.sin(ang(i))>.5?14:-8);
  s+=`<text class="sum-lab" x="${x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${anchor}"><tspan class="sum-lab-stop">${esc(o.a.stop)} · </tspan><tspan class="sum-lab-name">${esc(o.a.name)}</tspan><tspan class="sum-lab-val" x="${x.toFixed(1)}" dy="30">${esc(o.a.short(o.v))}</tspan></text>`;});
 return s+'</svg>';
}
function summarySideHtml(){
 const f=state.selectedFamily, cmp=state.summaryCompare;
 const rows=summaryScores(f).map(o=>`<div class="sum-row"><span class="sum-chip">${esc(o.a.stop)}</span><span class="sum-txt">${esc(o.a.fmt(o.v,f))}</span></div>`).join('');
 const btns=families.filter(g=>g!==f).map(g=>`<button data-sum-cmp="${esc(g)}" class="${cmp===g?'active':''}" style="--c:${careerColor(g)}">${esc(shortName[g])}</button>`).join('');
 return `<div class="px-side-title">${esc(meta[f].name)}'s summary · ${esc(shortName[f])}</div>${rows}<h3>Compare with another career</h3><div class="family-switch sum-cmp">${btns}</div><p class="sum-note">Each spoke = this career's value ÷ the highest of the six careers, so the outer ring is the top career on that spoke. A bigger shape means more options, not a better fit.</p>`;
}
function summaryHtml(grow){
 return `<div class="sum-layout"><div class="sum-card"><div class="sum-stamp">★ LEVEL CLEAR ★</div><div class="sum-radar-wrap" id="sumRadar">${summaryRadarSvg(grow)}</div><div class="sum-ring-note">OUTER RING = THE TOP CAREER OF THE SIX</div></div><aside class="px-side" id="sumSide">${summarySideHtml()}</aside></div>`;
}
// pixel art: a wooden door (26 x 45 cells; hinged on the right, so the keyhole plate is on the left) and a gold key
// (24 x 9 cells, tip on the right)
function doorPanelSvg(){
 const R=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`, ink='#2b2140';
 return `<svg viewBox="0 0 26 45" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">`
  +R(0,0,26,45,ink)+R(1,1,24,44,'#c98b4a')+R(1,1,24,1,'#e3ad70')+R(1,1,1,44,'#e3ad70')
  +R(9,4,14,16,ink)+R(10,5,12,14,'#a96d33')+R(10,5,12,1,'#8a5526')
  +R(9,24,14,18,ink)+R(10,25,12,16,'#a96d33')+R(10,25,12,1,'#8a5526')
  +R(1,20,7,10,ink)+R(2,21,5,8,'#f2c94c')+R(2,21,5,1,'#fff1b0')+R(3.5,23,2,2,ink)+R(4,25,1,2,ink)+'</svg>';
}
function keySvg(){
 const map=['..XXXXX.................','.XGGGGGX................','XGGXXXGGXXXXXXXXXXXXXXX.','XGX...XGGGGGGGGGGGGGGGGX','XGX...XGDDDDDDDDDDDDDDDX','XGGXXXGGXXXXXXXXXGGXGGXX','.XGGGGGX........XGGXGGX.','..XXXXX.........XDDXDDX.','................XXXXXXX.'];
 const col={X:'#2b2140',G:'#f2c94c',D:'#c9962e'}; let r='';
 map.forEach((row,y)=>[...row].forEach((ch,x)=>{if(col[ch]) r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col[ch]}"/>`;}));
 return `<svg viewBox="0 0 24 9" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
// The door scene uses the same parts as the company buildings on "Why do some careers open more doors?" (wb3-* colours in
// the career's colour): the ground floor of the career's building, with the job title on the roof sign, lit windows, a
// striped awning and plants by the door. The wooden door (.key-door) sits in the opening at x 190-410, y 100-400.
function keyFacadeSvg(f){
 const R=(x,y,w,h,cls)=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
 let s=`<svg viewBox="0 0 600 400" width="600" height="400" shape-rendering="crispEdges" aria-hidden="true">`;
 // roof sign with the job title, on two posts
 s+=R(196,40,6,22,'wb3-ink')+R(398,40,6,22,'wb3-ink')+R(90,0,420,44,'wb3-board')+`<text class="wb3-name kf-name" x="300" y="29" text-anchor="middle">${esc(WELCOME[f].role.toUpperCase())}</text>`;
 // roof, side wall (depth), facade
 s+=R(0,60,600,14,'wb3-ink')+R(574,74,22,326,'wb3-side')+R(8,74,566,326,'wb3-wall');
 // two columns of lit windows on each side of the door
 [42,112,440,510].forEach(x=>[104,188].forEach(y=>{ s+=R(x,y,48,38,'wb3-ink')+R(x+4,y+4,40,30,'wb2-win lit')+R(x+6,y+6,10,5,'wb3-glint')+R(x-3,y+38,54,4,'wb3-sill'); }));
 // striped awning over the door, the doorway, and a plant on each side
 for(let k=0;k<13;k++) s+=R(170+k*20,78,20,18,k%2?'wb3-stripe-w':'wb3-stripe');
 s+=R(168,76,264,3,'wb3-ink')+R(168,96,264,3,'wb3-ink')+R(186,100,228,300,'wb3-ink');
 [140,430].forEach(x=>{ s+=R(x+4,348,22,18,'wb3-leaf')+R(x,356,30,14,'wb3-leaf2')+R(x+2,370,26,30,'wb3-pot')+R(x+2,370,26,3,'wb3-ink'); });
 return s+'</svg>';
}
// The journey so far: the same path as "The journey ahead" on the welcome page, every stop ticked except the last one
// (Summary), which is locked: that lock is this door.
function keyJourneyHtml(){
 const ck=`<svg class="kj-ck" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><path d="M6 1h2v1h-2z M5 2h2v1h-2z M4 3h2v1h-2z M0 4h2v1h-2z M3 4h2v1h-2z M1 5h3v1h-3z M2 6h1v1h-1z"/></svg>`;
 const lk=`<svg class="kj-lk" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 0h4v1h-4z M1 1h1v3h-1z M6 1h1v3h-1z M0 4h8v4h-8z"/><path class="kj-hole" d="M3 5h2v2h-2z"/></svg>`;
 const stops=JOURNEY.map(([t],i)=>{ const last=i===JOURNEY.length-1;
  return `<li class="${last?'lock':''}" style="--d:${(.15+i*.08).toFixed(2)}s"><span class="wj-n">${last?lk:ck}</span><b>${esc(t)}</b></li>`; }).join('');
 return `<div class="kj" id="keyJourney"><div class="wj-title">The journey so far</div><ol class="wj-path kj-path">${stops}</ol></div>`;
}
function keyDoorHtml(){
 const f=state.homeFamily||state.selectedFamily, m=meta[state.selectedFamily], role=WELCOME[f].role;
 return `<div class="key-scene" id="keyScene" style="--c:${careerColor(f)}"><div class="key-ground"></div>${keyJourneyHtml()}`
  +`<div class="key-bld">${keyFacadeSvg(f)}</div>`
  +`<div class="key-door" id="keyDoor"><div class="kd-light"></div><div class="kd-panel" id="kdPanel">${doorPanelSvg()}<div class="kd-lock"></div></div></div><div class="key-mat"></div>`
  +`<div class="key-fellow" id="keyFellow"><img src="assets/fellows/${m.key}-idle.webp" alt="${esc(m.name)}"></div>`
  +`<div class="key-bubble">We cleared all six stops! This door leads to your career as a <b>${esc(role)}</b>. Here's your key: unlock it!</div>`
  +`<button type="button" class="key-key kk-wait" id="keyKey" aria-label="Use the key to open the door">${keySvg()}</button>`
  +`<div class="key-hint" id="keyHint" aria-hidden="true"><svg viewBox="0 0 250 80" width="250" height="80"><path class="kh-line" d="M4 17 Q 100 70 222 66"/><path class="kh-head" d="M238 66 L224 59 L224 73 Z"/></svg><span>DRAG ME</span></div></div>`;
}
function renderUnlock(){
 return `<section class="page piles-page unlock-page" style="--c:${careerColor(state.selectedFamily)}"><h1 class="px-title">You made it! Unlock your summary</h1><div class="unlock-body" id="unlockBody">${state.unlocked?summaryHtml(false):keyDoorHtml()}</div>${nav({hideNext:!state.unlocked})}</section>`;
}
function bindUnlock(){
 const root=stage.querySelector('.unlock-page'); if(!root) return;
 const body=root.querySelector('#unlockBody'), next=root.querySelector('.navbar [data-nav="next"]'), alive=()=>document.body.contains(root);
 const bindSummary=()=>body.querySelectorAll('[data-sum-cmp]').forEach(b=>b.addEventListener('click',()=>{
  state.summaryCompare=state.summaryCompare===b.dataset.sumCmp?null:b.dataset.sumCmp;
  body.querySelector('#sumRadar').innerHTML=summaryRadarSvg(false); body.querySelector('#sumSide').innerHTML=summarySideHtml(); bindSummary(); }));
 if(state.unlocked){ bindSummary(); return; }
 const scene=body.querySelector('#keyScene'), key=scene.querySelector('#keyKey'), door=scene.querySelector('#keyDoor'), lock=scene.querySelector('.kd-lock'),
  fellow=scene.querySelector('#keyFellow'), img=fellow.querySelector('img'), hint=scene.querySelector('#keyHint'), fkey=meta[state.selectedFamily].key;
 ['run1','run2','run3'].forEach(fr=>{const i=new Image(); i.src=`assets/fellows/${fkey}-${fr}.webp`;});
 const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 const tip=()=>{const r=key.getBoundingClientRect(); return [r.right-r.width*.04, r.top+r.height*.45];};   // the key's tip, in screen px
 const mid=el=>{const r=el.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];};
 // close enough when the key's tip or its middle is over the lock (people drag either way)
 const near=()=>{const [c,d]=mid(lock); return [tip(),mid(key)].some(([a,b])=>Math.hypot(a-c,b-d)<70*stageScale());};
 let ox=0, oy=0, drag=null, busy=false;
 const later=(ms,fn)=>setTimeout(()=>{ if(alive()) fn(); },ms);
 // the journey so far: the six stops are ticked one by one, the locked last stop lights up, then the key pops out and
 // settles above the fellow's head (bobbing), and the dashed "drag me" arrow to the lock appears. Until then it is hidden.
 const stops=[...scene.querySelectorAll('.kj-path li')], lockStop=stops[stops.length-1];
 const giveKey=()=>{ key.classList.remove('kk-wait'); lockStop.classList.add('ready');
  if(reduce){ hint.classList.add('show'); return; }
  key.animate([{transform:'translateY(-40px)',opacity:0},{transform:'translateY(-40px)',opacity:1,offset:.2},{transform:'translateY(0)',opacity:1}],{duration:420,easing:'cubic-bezier(.55,0,.85,.55)'});
  const sp=document.createElement('img'); sp.className='key-spark'; sp.alt=''; sp.src='assets/fellows/spark0.webp';
  sp.style.left=(key.offsetLeft+key.offsetWidth/2-48)+'px'; sp.style.top=(key.offsetTop+key.offsetHeight/2-88)+'px'; scene.appendChild(sp);
  let j=0; const t=setInterval(()=>{ j++; if(j>3||!alive()){ clearInterval(t); sp.remove(); return; } sp.src=`assets/fellows/spark${j}.webp`; },90);
  later(620,()=>hint.classList.add('show')); };
 if(reduce){ stops.slice(0,-1).forEach(li=>li.classList.add('done')); giveKey(); }
 else { stops.slice(0,-1).forEach((li,k)=>later(700+k*260,()=>li.classList.add('done'))); later(700+(stops.length-1)*260+150,giveKey); }
 function reveal(){
  state.unlocked=true; body.innerHTML=summaryHtml(!reduce); bindSummary();
  body.firstElementChild.animate([{opacity:0},{opacity:1}],{duration:450,easing:'ease-out'}); if(next&&state.page<TOTAL-1) next.hidden=false;
 }
 function unlock(){
  if(busy) return; busy=true; hint.style.visibility='hidden'; door.classList.remove('near');
  if(reduce){ reveal(); return; }
  // 1) the key flies so its tip sits in the keyhole, shrinking a little
  key.classList.add('dragging'); key.getAnimations().forEach(an=>an.cancel()); void key.offsetWidth;   // stop the bobbing first, so the tip is measured where it rests
  const k=stageScale(), [tx,ty]=tip(), [lx,ly]=mid(lock);
  key.style.transition='transform .35s ease-in';
  const w=key.offsetWidth, sc=.7; ox+= (lx-tx)/k + w*(1-sc)/2*0.96; oy+=(ly-ty)/k;
  key.style.transform=`translate(${ox}px,${oy}px) scale(${sc})`;
  // 2) it turns in the lock (a flat key seen edge-on), 3) the door swings open onto the light
  later(420,()=>{ key.style.transition='transform .3s steps(3,end)'; key.style.transform=`translate(${ox}px,${oy}px) scale(${sc},${sc*.15})`; door.classList.add('turn'); });
  later(800,()=>{ key.style.opacity='0'; door.classList.add('open'); });
  // 4) the fellow runs into the doorway and disappears into the light; the speech bubble and the journey fade out with it
  later(1550,()=>{ scene.querySelectorAll('.key-bubble,#keyJourney').forEach(el=>el.animate([{opacity:1},{opacity:0}],{duration:300,easing:'steps(3)',fill:'forwards'}));
   const [fx]=mid(fellow), [dx]=mid(door); let f=0; const run=setInterval(()=>{ if(!alive()){clearInterval(run);return;} img.src=`assets/fellows/${fkey}-run${f++%3+1}.webp`; },110);
   fellow.classList.add('going'); fellow.style.transform=`translateX(${(dx-fx)/stageScale()}px)`;
   later(950,()=>{ clearInterval(run); fellow.style.opacity='0'; }); });
  // 5) the view zooms into the bright doorway, as if walking through it; then the summary appears
  later(2600,()=>{ body.style.overflow='hidden'; scene.style.transformOrigin=`${door.offsetLeft+door.offsetWidth/2}px ${door.offsetTop+door.offsetHeight*.55}px`;
   scene.animate([{transform:'scale(1)',opacity:1},{transform:'scale(2.2)',opacity:1,offset:.65},{transform:'scale(3.2)',opacity:0}],{duration:750,easing:'ease-in',fill:'forwards'}).finished
    .then(()=>{ if(alive()){ body.style.overflow=''; reveal(); } },()=>{}); });
 }
 key.addEventListener('pointerdown',e=>{ if(busy) return; e.preventDefault(); try{ key.setPointerCapture(e.pointerId); }catch(_){} drag={x:e.clientX,y:e.clientY,ox,oy,moved:false}; key.classList.add('dragging'); key.style.transition='none'; });
 key.addEventListener('pointermove',e=>{ if(!drag) return; const k=stageScale(), dx=(e.clientX-drag.x)/k, dy=(e.clientY-drag.y)/k; if(Math.hypot(dx,dy)>6) drag.moved=true;
  ox=drag.ox+dx; oy=drag.oy+dy; key.style.transform=`translate(${ox}px,${oy}px)`; door.classList.toggle('near',near()); });
 const drop=()=>{ if(!drag) return; const d=drag; drag=null;
  if(!d.moved || near()){ unlock(); return; }
  // missed the lock: the key springs back to the fellow and bobs again
  door.classList.remove('near'); ox=oy=0; key.style.transition='transform .3s ease-out'; key.style.transform='';
  later(320,()=>{ key.style.transition=''; key.classList.remove('dragging'); }); };
 key.addEventListener('pointerup',drop); key.addEventListener('pointercancel',drop);
 key.addEventListener('click',e=>{ if(e.detail===0) unlock(); });   // keyboard (Enter / Space)
}
/* ---------- Page 14: References, data and team (the last page, after the unlocked summary) ----------
   Every dataset the 13 story pages use, what it is used for and on which pages, with a link; a few notes on reading the
   numbers; and who made the site. TEAM holds the names: until it is filled in, the page shows a placeholder. */
const TEAM=['Marco Ren','Helen Jin','Daniel Wei'];   // the team's names, in this order
const REFS=[
 {name:'AI, ML & data salary records',by:'aijobs.net salary dataset · U.S. residents · work year 2024',use:'job titles, salaries, experience levels',pages:'3, 5–6, 8–9, 13',url:'https://aijobs.net/salaries/'},
 {name:'Occupational Employment and Wage Statistics (OEWS), state estimates',by:'U.S. Bureau of Labor Statistics · May 2025',use:'where the jobs are, state by state',pages:'4, 13',url:'https://www.bls.gov/oes/'},
 {name:'OEWS national industry-specific estimates',by:'U.S. Bureau of Labor Statistics · May 2015 – May 2025',use:'jobs and pay in each industry, year by year',pages:'7, 13',url:'https://www.bls.gov/oes/tables.htm'},
 {name:'Employment Projections 2025–35 (incl. Table 1.10)',by:'U.S. Bureau of Labor Statistics',use:'job growth, openings, people retiring or switching jobs',pages:'10–13',url:'https://www.bls.gov/emp/data/occupational-data.htm'},
 {name:'Employment Projections 2016–26 (archived, Table 1.10)',by:'U.S. Bureau of Labor Statistics',use:'job openings in the past ten years',pages:'11',url:'https://www.bls.gov/emp/data/projections-archive.htm'},
 {name:'Occupational Outlook Handbook, “Job Outlook”',by:'U.S. Bureau of Labor Statistics · 2025',use:'why each career is growing',pages:'12',url:'https://www.bls.gov/ooh/'},
 {name:'Current Population Survey, table 11b',by:'U.S. Bureau of Labor Statistics · 2025',use:'median age of the people in each job',pages:'12',url:'https://www.bls.gov/cps/cpsaat11b.htm'},
 {name:'O*NET OnLine',by:'U.S. Department of Labor',use:'role descriptions and the closest matching occupations',pages:'3',url:'https://www.onetonline.org/'}
];
const REF_NOTES=[
 'Pay figures are medians of the salary records. Shares of people (such as “21 of 100”) describe those records, not the whole U.S. workforce.',
 'BLS has no machine-learning-engineer occupation, so on the map AI & ML adds an estimated share of Data Science jobs.',
 'OEWS is not designed for year-to-year comparison, and job codes changed in 2019–21, so small yearly moves may be noise.',
 'Projections are BLS estimates for 2025–35, not promises about any one person’s job or salary.'
];
function renderCredits(){
 const host=u=>u.replace(/^https:\/\/(www\.)?/,'').split('/')[0];
 const rows=REFS.map((r,i)=>`<li class="cr-ref"><span class="cr-n">${String(i+1).padStart(2,'0')}</span><div><b>${esc(r.name)}</b><small>${esc(r.by)}</small>`
  +`<span class="cr-use">${esc(r.use)} · <i>page${/[,–]/.test(r.pages)?'s':''} ${esc(r.pages)}</i></span></div>`
  +`<a href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(r.url)}">${esc(host(r.url))} ↗</a></li>`).join('');
 const team=TEAM.length?TEAM.map(n=>`<li>${esc(n)}</li>`).join(''):`<li class="cr-todo">Names to be added</li>`;
 return `<section class="page piles-page credits-page"><h1 class="px-title">References, data and team</h1>`
  +`<div class="cr-layout"><div class="cr-card"><h2>DATA SOURCES</h2><ol class="cr-refs">${rows}</ol></div>`
  +`<div class="cr-side"><div class="cr-card cr-team"><h2>MADE BY</h2><ul>${team}</ul></div>`
  +`<div class="cr-card"><h2>HOW TO READ THE NUMBERS</h2><ul class="cr-notes">${REF_NOTES.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></div></div>${nav({restart:true})}</section>`;
}
function render(opts){
 if(!DATA)return; nextHook=null; const pages=[renderCover,renderWelcome,renderTree,renderMap,renderSalaryGame,renderQuartiles,renderGalaxy,renderLevel,renderLvmap,renderRace,renderFlower,renderWhy,renderUnlock,renderCredits]; stage.innerHTML=state.storyOpen===state.page&&PAGE_STORIES[state.page]?storyPageHtml(state.page):pages[state.page](); updateSidePager(); introToken++; if(!(opts&&opts.intro&&playTitleIntro())) bind();
}
function bind(){
 if(window.bindCoverV16)window.bindCoverV16({stage,state,families,meta,shortName,esc,setPage,total:TOTAL});
 stage.querySelectorAll('[data-restart]').forEach(b=>b.addEventListener('click',restartStory));
 stage.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;const d=btn.dataset.nav;if(d==='next'&&state.storyOpen===state.page){openStoryPage();return;}if(d==='next'&&nextHook&&nextHook())return;setPage(state.page+(d==='next'?1:-1))}));
 stage.querySelectorAll('[data-family]').forEach(btn=>btn.addEventListener('click',async()=>{const f=btn.dataset.family;state.selectedFamily=f;state.flowerFamily=f;state.waterfallFamily=f;state.futureFamily=f;state.compareFamily=null;state.selectedRole=0;btn.animate([{transform:'translateY(-8px) scale(1)'},{transform:'translateY(-14px) scale(1.035)'},{transform:'translateY(-8px) scale(1)'}],{duration:300});await wait(210);setPage(2)}));
 fitPiles();
 stage.querySelectorAll('[data-role]').forEach(btn=>{const i=+btn.dataset.role;btn.addEventListener('click',()=>{if(i===state.selectedRole)return;const st=btn.querySelector('.pile-stack');if(st)st.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'translateY(0)'}],{duration:260});updateTreeRole(i)})});
 bindTreeFamilyButtons();
 stage.querySelectorAll('[data-state]').forEach(p=>p.addEventListener('click',()=>updateMapState(p.dataset.state)));
 bindPlaceFall();
 bindSalaryGame();
 bindRidge();
 bindLevel();
 bindLvmap();
 bindRace();
 bindDoors();
 bindGalaxy();
 bindWhy();
 bindUnlock();
 stage.querySelectorAll('[data-place-family]').forEach(b=>b.addEventListener('click',()=>{const f=b.dataset.placeFamily;if(f===state.selectedFamily)return;state.selectedFamily=f;state.flowerFamily=f;state.waterfallFamily=f;state.futureFamily=f;state.benchmarkFamily=f;state.compareFamily=null;state.selectedRole=0;render()}));
 stage.querySelectorAll('[data-map-mode]').forEach(b=>b.addEventListener('click',()=>updateMapMode(b.dataset.mapMode)));
 bindFlower();
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
