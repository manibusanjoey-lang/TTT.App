/* ═══════════════════════════════════════════
   TTT APP — OPTIMIZED JS v2
   Train. Travel. Transform.
═══════════════════════════════════════════ */

/* ── STATE ── */
const STATE = {
  currentTab: 'feed',
  currentPillar: 'train',
  likedPosts: new Set(),
  savedPosts: new Set(),
  habits: {1:true,2:true,3:true,4:false,5:false},
  journalEntries: [],
  followers: new Set(['leila.k','jordan_r']),
  storyTimer: null,
  storyDuration: 5000,
  postCount: 3,
  notifCount: 4,
};

/* ── STORAGE HELPERS ── */
const Store = {
  get(k, def=null){ try{const v=localStorage.getItem('ttt_'+k);return v?JSON.parse(v):def;}catch{return def;}},
  set(k,v){ try{localStorage.setItem('ttt_'+k,JSON.stringify(v));}catch{} },
};

/* ── TOAST ── */
function toast(msg, duration=2200){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=msg;el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),duration);
}

/* ── HAPTIC (where supported) ── */
function haptic(type='light'){
  if(navigator.vibrate){
    const p={light:20,medium:40,heavy:80,success:[30,50,30],error:[50,30,50]};
    navigator.vibrate(p[type]||20);
  }
}

/* ── TAB NAVIGATION ── */
function switchTab(tab){
  if(STATE.currentTab===tab) return;
  STATE.currentTab=tab;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const scr=document.getElementById('screen-'+tab);
  const tabEl=document.getElementById('tab-'+tab);
  if(scr) scr.classList.add('active');
  if(tabEl) tabEl.classList.add('active');
  document.getElementById('main-scroll').scrollTop=0;
  haptic('light');
  // Lazy init screens
  if(tab==='travel') initTravelMap();
  if(tab==='train') animateProgressRing();
  if(tab==='profile') initLeaderboard();
}

/* ── PULL TO REFRESH ── */
function initPullToRefresh(){
  const scroll=document.getElementById('main-scroll');
  let startY=0,pulling=false;
  const ptr=document.getElementById('ptr');
  scroll.addEventListener('touchstart',e=>{if(scroll.scrollTop===0)startY=e.touches[0].pageY;},{passive:true});
  scroll.addEventListener('touchmove',e=>{
    if(!startY)return;
    const dy=e.touches[0].pageY-startY;
    if(dy>40&&scroll.scrollTop===0){pulling=true;ptr.classList.add('pulling');}
  },{passive:true});
  scroll.addEventListener('touchend',()=>{
    if(pulling){ptr.classList.add('refreshing');setTimeout(()=>{ptr.classList.remove('pulling','refreshing');pulling=false;startY=0;toast('✓ Feed updated');},1200);}
    else{startY=0;}
  });
}

/* ── INFINITE SCROLL ── */
function initInfiniteScroll(){
  const scroll=document.getElementById('main-scroll');
  let loading=false;
  scroll.addEventListener('scroll',()=>{
    if(STATE.currentTab!=='feed')return;
    const{scrollTop,scrollHeight,clientHeight}=scroll;
    if(scrollTop+clientHeight>scrollHeight-200&&!loading){
      loading=true;
      setTimeout(()=>{loadMorePosts();loading=false;},800);
    }
  },{passive:true});
}

function loadMorePosts(){
  const feed=document.getElementById('feed-posts');
  if(!feed)return;
  const newPosts=[
    {user:'ethan_w',avatar:'🧔',pillar:'travel',icon:'🏔️',bg:'linear-gradient(135deg,#101010,#080608)',caption:'<strong>Atlas Mountains day 2.</strong> 4,000m above sea level. No signal. Just mountains and the realisation that your problems are smaller than you think. <span class="post-tag tag-grey">#TTTTravel</span>',likes:88,comments:14},
    {user:'nia_s',avatar:'👩‍🦰',pillar:'transform',icon:'🪞',bg:'linear-gradient(135deg,#0c0416,#080608)',caption:'<strong>Identity-based change works.</strong> I stopped trying to quit bad habits and started being the kind of person who doesn\'t need them. Different game. <span class="post-tag">#TTTTransform</span>',likes:201,comments:33},
  ];
  newPosts.forEach(p=>feed.appendChild(createPostEl(p)));
}

/* ── POST CREATION ── */
function createPostEl(p){
  STATE.postCount++;
  const id=STATE.postCount;
  const badges={train:'tb-train',travel:'tb-travel',transform:'tb-transform'};
  const div=document.createElement('div');
  div.className='post';div.dataset.id=id;
  div.innerHTML=`
    <div class="post-head">
      <div class="post-av">${p.avatar}</div>
      <div class="post-meta">
        <div class="post-name">${p.user}${p.verified?'<span class="verified">✦</span>':''}</div>
        <div class="post-info"><span class="type-badge ${badges[p.pillar]}">${p.pillar}</span> · Just now</div>
      </div>
      <div class="post-more" onclick="openCtxMenu(event,${id})" data-id="${id}">•••</div>
    </div>
    <div class="post-media" style="background:${p.bg}">
      <div class="post-media-bg" style="background:radial-gradient(ellipse at 50% 50%,${p.pillar==='train'?'rgba(139,26,26,.2)':p.pillar==='travel'?'rgba(80,80,80,.15)':'rgba(59,26,90,.2)'},transparent)"></div>
      <div class="post-media-emoji">${p.icon}</div>
    </div>
    <div class="post-body"><p class="post-text">${p.caption}</p></div>
    <div class="post-actions">
      <div class="post-act" onclick="toggleLike(this,${id})" id="like-${id}"><span class="act-ico">🤍</span> ${p.likes||0}</div>
      <div class="post-act" onclick="toast('Comments coming soon!')"><span class="act-ico">💬</span> ${p.comments||0}</div>
      <div class="post-act" onclick="sharePost(${id})"><span class="act-ico">↗️</span></div>
      <div class="post-spacer"></div>
      <div class="post-act" onclick="toggleSave(this,${id})" id="save-${id}"><span class="act-ico">🔖</span></div>
    </div>`;
  return div;
}

/* ── LIKE / SAVE ── */
function toggleLike(el,id){
  haptic('light');
  const liked=STATE.likedPosts.has(id);
  if(liked){STATE.likedPosts.delete(id);el.classList.remove('liked');const n=parseInt(el.textContent.replace(/\D/g,''));el.innerHTML=`<span class="act-ico">🤍</span> ${n-1}`;}
  else{STATE.likedPosts.add(id);el.classList.add('liked');const n=parseInt(el.textContent.replace(/\D/g,''));el.innerHTML=`<span class="act-ico">❤️</span> ${n+1}`;}
  Store.set('likes',[...STATE.likedPosts]);
}
function toggleSave(el,id){
  haptic('light');
  const saved=STATE.savedPosts.has(id);
  if(saved){STATE.savedPosts.delete(id);el.classList.remove('saved');el.querySelector('.act-ico').textContent='🔖';}
  else{STATE.savedPosts.add(id);el.classList.add('saved');el.querySelector('.act-ico').textContent='🔖';toast('✦ Saved to collection');}
  Store.set('saves',[...STATE.savedPosts]);
}
function sharePost(id){
  if(navigator.share){navigator.share({title:'TTT Post',text:'Check this out on TTT',url:window.location.href}).catch(()=>{});}
  else{toast('Link copied! 🔗');}
}

/* ── CONTEXT MENU (Report etc) ── */
let ctxPostId=null;
function openCtxMenu(e,id){
  ctxPostId=id;e.stopPropagation();
  const menu=document.getElementById('ctx-menu');
  const rect=e.target.getBoundingClientRect();
  menu.style.top=(rect.bottom+8)+'px';menu.style.right=(window.innerWidth-rect.right+rect.width/2)+'px';
  menu.classList.add('open');
  setTimeout(()=>document.addEventListener('click',closeCtxMenu,{once:true}),50);
}
function closeCtxMenu(){document.getElementById('ctx-menu')?.classList.remove('open');}
function reportPost(){
  closeCtxMenu();
  openModal('report-modal');
}
function submitReport(reason){
  closeModal('report-modal');
  haptic('success');
  toast('✓ Report submitted. Thank you for keeping TTT safe.');
}

/* ── POST COMPOSER ── */
function openPost(pillar){
  STATE.currentPillar=pillar||'train';
  // Set active pillar button
  document.querySelectorAll('.pillar-btn').forEach(b=>b.className='pillar-btn');
  document.querySelector(`.pillar-btn[data-pillar="${STATE.currentPillar}"]`)?.classList.add('sel-'+STATE.currentPillar);
  openModal('post-modal');
  setTimeout(()=>document.getElementById('comp-ta')?.focus(),300);
}
function selectPillar(btn,pillar){
  STATE.currentPillar=pillar;
  document.querySelectorAll('.pillar-btn').forEach(b=>b.className='pillar-btn');
  btn.classList.add('sel-'+pillar);
}
function submitPost(){
  const txt=document.getElementById('comp-ta')?.value.trim();
  if(!txt){toast('Write something first ✍️');return;}
  haptic('success');
  const bgs={train:'linear-gradient(135deg,#1a0404,#0d0608)',travel:'linear-gradient(135deg,#101010,#080608)',transform:'linear-gradient(135deg,#0c0416,#080608)'};
  const icos={train:'💪',travel:'🌍',transform:'✨'};
  const tags={train:'<span class="post-tag tag-red">#TTTTrain</span>',travel:'<span class="post-tag tag-grey">#TTTTravel</span>',transform:'<span class="post-tag">#TTTTransform</span>'};
  const post=createPostEl({user:'Joey Manibusan',avatar:'👑',verified:true,pillar:STATE.currentPillar,icon:icos[STATE.currentPillar],bg:bgs[STATE.currentPillar],caption:`${txt} ${tags[STATE.currentPillar]}`,likes:0,comments:0});
  const container=document.getElementById('feed-posts');
  const firstPill=container?.querySelector('.pills-wrap');
  firstPill?container.insertBefore(post,firstPill.nextSibling):container?.prepend(post);
  document.getElementById('comp-ta').value='';
  closeModal('post-modal');
  switchTab('feed');
  setTimeout(()=>toast('✦ Posted to TTT feed!'),200);
}

/* ── FILTER PILLS ── */
function initPills(){
  document.querySelectorAll('.pill').forEach(p=>{
    p.addEventListener('click',()=>{
      const group=p.closest('.pills-wrap');
      group?.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
      haptic('light');
    });
  });
}

/* ── TRAIN PROGRESS RING ── */
function animateProgressRing(){
  const pct=Math.round((5/7)*100);
  const fill=document.getElementById('prog-fill');
  const pctEl=document.getElementById('prog-pct');
  if(!fill||fill._animated)return;
  fill._animated=true;
  const circ=2*Math.PI*48;
  fill.setAttribute('stroke-dasharray',circ);
  setTimeout(()=>{
    fill.setAttribute('stroke-dashoffset',circ-(circ*(pct/100)));
    let c=0;const iv=setInterval(()=>{c=Math.min(c+2,pct);if(pctEl)pctEl.textContent=c+'%';if(c>=pct)clearInterval(iv);},18);
  },350);
}

/* ── HABIT TRACKER ── */
function toggleHabit(btn,id){
  haptic('light');
  STATE.habits[id]=!STATE.habits[id];
  btn.classList.toggle('done',STATE.habits[id]);
  btn.textContent=STATE.habits[id]?'✓':'';
  Store.set('habits',STATE.habits);
  renderHabitDots();
  if(STATE.habits[id]) toast('✓ Habit logged!');
}
function renderHabitDots(){
  const configs={1:[1,1,1,1,1,1,1],2:[1,1,1,1,1,1,0],3:[1,1,1,1,1,0,0],4:[1,1,1,0,0,0,0],5:[1,1,1,1,1,0,0]};
  Object.entries(configs).forEach(([id,cfg])=>{
    const el=document.getElementById('dots-'+id);
    if(el) el.innerHTML=cfg.map(d=>`<div class="hdot ${d?'on':''}"></div>`).join('');
  });
}

/* ── JOURNAL ── */
function saveJournal(){
  const ta=document.querySelector('.journal-ta');
  if(!ta||!ta.value.trim()){toast('Write something first ✍️');return;}
  STATE.journalEntries.push({date:new Date().toISOString(),text:ta.value.trim()});
  Store.set('journal',STATE.journalEntries);
  ta.value='';haptic('success');toast('✦ Journal entry saved. Keep growing.');
}

/* ── STORY VIEWER ── */
const STORIES={
  joey:{name:'@ttt.joey',avatar:'👑',color:'#8B1A1A',text:'5AM. The day starts before the world wakes up. That\'s your edge. 🔥',sub:'#TTTTrain · 2h ago'},
  marcus:{name:'marcus_t',avatar:'🏋️',color:'#444',text:'225 bench. New PR. The bar doesn\'t lie. Keep showing up.',sub:'#Train · 4h ago'},
  leila:{name:'leila.k',avatar:'✈️',color:'#333',text:'Somewhere between Seoul and Bali. The world keeps getting bigger. ✈️',sub:'#TTTTravel · 6h ago'},
  jordan:{name:'jordan_r',avatar:'🧠',color:'#3B1A5A',text:'Day 90. I barely recognise day 1 me. The protocol works.',sub:'#TTTTransform · 8h ago'},
  priya:{name:'priya.m',avatar:'🌍',color:'#2a2a2a',text:'Tokyo in 3 days. Bucket list is becoming a life list. 🗺️',sub:'#TTTTravel · 10h ago'},
  your:{name:'Your Story',avatar:'➕',color:'#3B1A5A',text:'Share your TTT moment today',sub:'Tap to add story'},
};
function openStory(who){
  const d=STORIES[who];
  if(!d)return;
  document.getElementById('story-uname').textContent=d.name;
  document.getElementById('story-av-inner').textContent=d.avatar;
  document.getElementById('story-modal').classList.add('open');
  drawStory(d);
  // Progress bar
  const prog=document.getElementById('story-prog-bar');
  prog.innerHTML='<div class="spb"><div class="spb-fill" id="spb-fill"></div></div>';
  clearTimeout(STATE.storyTimer);
  setTimeout(()=>{const f=document.getElementById('spb-fill');if(f){f.classList.add('running');f.style.transitionDuration=STATE.storyDuration+'ms';f.style.width='100%';}},60);
  STATE.storyTimer=setTimeout(closeStory,STATE.storyDuration+100);
}
function drawStory(d){
  const cv=document.getElementById('story-cv');
  const W=cv.width=window.innerWidth;const H=cv.height=window.innerHeight;
  const ctx=cv.getContext('2d');
  const g=ctx.createRadialGradient(W/2,H*.4,0,W/2,H/2,Math.max(W,H));
  g.addColorStop(0,d.color+'55');g.addColorStop(.5,d.color+'18');g.addColorStop(1,'#080608');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.font=`${Math.min(W,H)*.16}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(d.avatar,W/2,H*.37);
  ctx.font=`500 ${Math.min(W*.05,22)}px 'DM Sans',sans-serif`;
  ctx.fillStyle='rgba(255,255,255,.9)';
  wrapText(ctx,d.text,W/2,H*.55,W*.82,Math.min(W*.065,28));
  ctx.font=`400 ${Math.min(W*.034,15)}px 'DM Sans',sans-serif`;
  ctx.fillStyle=d.color||'rgba(123,79,168,.9)';
  ctx.fillText(d.sub,W/2,H*.72);
}
function wrapText(ctx,text,x,y,maxW,lh){
  const words=text.split(' ');let line='';const lines=[];
  words.forEach(w=>{const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line){lines.push(line.trim());line=w+' ';}else line=t;});
  lines.push(line.trim());
  lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lh));
}
function closeStory(){
  clearTimeout(STATE.storyTimer);
  document.getElementById('story-modal').classList.remove('open');
}

/* ── TRAVEL MAP ── */
let mapAnimId=null;
function initTravelMap(){
  const cv=document.getElementById('travel-map');
  if(!cv||cv._init)return;cv._init=true;
  let t=0;
  const cities=[
    {x:.35,y:.38,col:'#C0302A',v:true,n:'Germany'},{x:.78,y:.32,col:'#C0302A',v:true,n:'Seoul'},
    {x:.22,y:.44,col:'#C0302A',v:true,n:'New York'},{x:.32,y:.42,col:'#C0302A',v:true,n:'Paris'},
    {x:.64,y:.38,col:'#C0302A',v:true,n:'Dubai'},{x:.74,y:.54,col:'#C0302A',v:true,n:'Bali'},
    {x:.79,y:.40,col:'#888',v:false,n:'Tokyo'},{x:.18,y:.65,col:'#7B4FA8',v:false,n:'Patagonia'},
    {x:.37,y:.48,col:'#7B4FA8',v:false,n:'Morocco'},{x:.50,y:.60,col:'#888',v:false,n:'Cape Town'},
  ];
  function draw(){
    mapAnimId=requestAnimationFrame(draw);t+=.018;
    const W=cv.width=cv.offsetWidth||360;const H=cv.height=200;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#0f0d13';ctx.fillRect(0,0,W,H);
    // Grid
    for(let gx=0;gx<W;gx+=22){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=.5;ctx.stroke();}
    for(let gy=0;gy<H;gy+=22){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=.5;ctx.stroke();}
    // Connections
    const vis=cities.filter(c=>c.v);
    for(let i=0;i<vis.length-1;i++){
      ctx.beginPath();ctx.moveTo(W*vis[i].x,H*vis[i].y);ctx.lineTo(W*vis[i+1].x,H*vis[i+1].y);
      ctx.strokeStyle='rgba(192,48,42,.12)';ctx.lineWidth=.7;ctx.stroke();
    }
    // Dots
    cities.forEach(c=>{
      const cx=W*c.x,cy=H*c.y,pulse=Math.sin(t*1.8+cx)*.5+.5;
      if(c.v){
        ctx.beginPath();ctx.arc(cx,cy,6+pulse*3,0,Math.PI*2);
        ctx.fillStyle=c.col+'1a';ctx.fill();
        ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);
        ctx.fillStyle=c.col;ctx.fill();
      } else {
        ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);
        ctx.strokeStyle=c.col+'66';ctx.lineWidth=1;ctx.stroke();
      }
    });
  }
  draw();
}

/* ── LEADERBOARD ── */
function initLeaderboard(){
  document.querySelectorAll('.lb-tab').forEach(t=>{
    t.addEventListener('click',()=>{
      document.querySelectorAll('.lb-tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');haptic('light');
    });
  });
}

/* ── FOLLOW ── */
function toggleFollow(btn,user){
  haptic('light');
  const following=STATE.followers.has(user);
  if(following){STATE.followers.delete(user);btn.textContent='Follow';btn.classList.remove('following');}
  else{STATE.followers.add(user);btn.textContent='Following ✓';btn.classList.add('following');toast(`✦ Following ${user}`);}
}

/* ── COUNTDOWN ── */
function startCountdown(){
  const launch=Store.get('launchDate')||new Date(Date.now()+90*24*60*60*1000).toISOString();
  Store.set('launchDate',launch);
  const ids=['scd-d','scd-h','scd-m','scd-s'];
  function tick(){
    const diff=new Date(launch)-new Date();
    if(diff<=0){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='00';});return;}
    const vals=[Math.floor(diff/864e5),Math.floor((diff%864e5)/36e5),Math.floor((diff%36e5)/6e4),Math.floor((diff%6e4)/1e3)];
    vals.forEach((v,i)=>{const el=document.getElementById(ids[i]);if(el)el.textContent=String(v).padStart(2,'0');});
  }
  tick();setInterval(tick,1000);
}

/* ── NOTIFICATIONS ── */
function openNotif(){openModal('notif-modal');}
function markAllRead(){
  document.querySelectorAll('#notif-modal .notif-row.unread').forEach(r=>r.classList.remove('unread'));
  document.querySelectorAll('#notif-modal .unread-dot').forEach(d=>d.remove());
  const badge=document.getElementById('notif-badge');
  if(badge)badge.style.display='none';
  STATE.notifCount=0;
}

/* ── MODAL HELPERS ── */
function openModal(id){
  const m=document.getElementById(id);
  if(!m)return;
  m.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(id){
  const m=document.getElementById(id);
  if(!m)return;
  m.classList.remove('open');
  document.body.style.overflow='';
}

/* ── AGE GATE ── */
function initAgeGate(){
  if(Store.get('ageVerified'))return;
  document.getElementById('age-gate').classList.remove('gone');
}
function confirmAge(over13){
  if(over13){
    Store.set('ageVerified',true);
    document.getElementById('age-gate').classList.add('gone');
    checkOnboarding();
  } else {
    document.getElementById('age-gate').innerHTML='<div style="text-align:center;padding:2rem"><div style="font-size:3rem;margin-bottom:1rem">🔒</div><p style="color:var(--muted);line-height:1.7;font-size:.9rem">You must be 13 or older to use TTT.<br>Come back when you\'re ready to grow.</p></div>';
  }
}

/* ── ONBOARDING ── */
let obSlide=0;
const obSlides=4;
function checkOnboarding(){
  if(Store.get('onboarded'))return;
  document.getElementById('onboarding').classList.remove('gone');
}
function nextSlide(){
  obSlide++;
  if(obSlide>=obSlides){finishOnboarding();return;}
  document.querySelectorAll('.ob-slide').forEach((s,i)=>s.classList.toggle('active',i===obSlide));
  document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('active',i===obSlide));
  haptic('light');
}
function finishOnboarding(){
  Store.set('onboarded',true);
  document.getElementById('onboarding').classList.add('gone');
  toast('✦ Welcome to TTT. Let\'s build.');
}

/* ── SERVICE WORKER ── */
function registerSW(){
  if('serviceWorker' in navigator){
    // SW inline blob so no extra file needed
    const swCode=`
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.destination==='image'||e.request.url.includes('fonts.googleapis')){
    e.respondWith(caches.open('ttt-v1').then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(res=>{c.put(e.request,res.clone());return res;}))));
  }
});`;
    const blob=new Blob([swCode],{type:'application/javascript'});
    const url=URL.createObjectURL(blob);
    navigator.serviceWorker.register(url).catch(()=>{});
  }
}

/* ── FEED CANVAS (Joey's animated post) ── */
function initFeedCanvas(){
  const cv=document.getElementById('post-canvas-1');
  if(!cv)return;
  let t=0;
  (function loop(){
    requestAnimationFrame(loop);t+=.02;
    const W=cv.width=cv.offsetWidth||360;const H=cv.height=220;
    const ctx=cv.getContext('2d');
    ctx.clearRect(0,0,W,H);
    const g=ctx.createRadialGradient(W*.42,H*.5,0,W*.42,H*.5,W*.7);
    g.addColorStop(0,'rgba(70,6,6,.7)');g.addColorStop(.6,'rgba(25,2,2,.4)');g.addColorStop(1,'rgba(8,6,8,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    [.25,.42,.6].forEach((rf,i)=>{
      const r=W*.5*rf+Math.sin(t*1.2+i)*4;
      ctx.beginPath();ctx.arc(W*.42,H*.5,r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(192,48,42,${.12-i*.03})`;ctx.lineWidth=1;ctx.stroke();
    });
    // Barbell
    ctx.save();ctx.globalAlpha=.22+Math.sin(t*.8)*.04;
    const bx=W*.42,by=H*.5;
    ctx.strokeStyle='rgba(192,48,42,.8)';ctx.lineWidth=2;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(bx-W*.28,by);ctx.lineTo(bx+W*.28,by);ctx.stroke();
    [[-.28,-.23],[-.15,-.1],[-.04,.01],[.04,.09],[.14,.19],[.23,.28]].forEach(([x1,x2])=>{
      ctx.fillStyle='rgba(192,48,42,.55)';ctx.fillRect(bx+W*x1,by-H*.09,W*(x2-x1),H*.18);
    });
    ctx.restore();
    for(let i=0;i<14;i++){
      const ang=t*.7+i*(Math.PI*2/14);const r2=W*.16+Math.sin(t*2+i)*W*.03;
      const px=bx+Math.cos(ang)*r2,py=by+Math.sin(ang)*r2*.55;
      ctx.beginPath();ctx.arc(px,py,1.4,0,Math.PI*2);
      ctx.fillStyle=`rgba(220,60,40,${.25+Math.sin(t+i)*.18})`;ctx.fill();
    }
  })();
}

/* ── PROFILE TABS ── */
function initProfileTabs(){
  document.querySelectorAll('.ptab').forEach(t=>{
    t.addEventListener('click',()=>{
      document.querySelectorAll('.ptab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');haptic('light');
    });
  });
}

/* ── SEARCH ── */
function initSearch(){
  const inputs=document.querySelectorAll('.search-input');
  inputs.forEach(inp=>{
    inp.addEventListener('input',()=>{
      const q=inp.value.toLowerCase().trim();
      if(!q)return;
      // Highlight matching user rows
      document.querySelectorAll('.user-row,.dest-row,.ex-row').forEach(row=>{
        const match=row.textContent.toLowerCase().includes(q);
        row.style.opacity=match||!q?'1':'.3';
      });
    });
  });
}

/* ── KEYBOARD HANDLING ── */
function initKeyboard(){
  // Adjust viewport when keyboard opens
  if('visualViewport' in window){
    window.visualViewport.addEventListener('resize',()=>{
      const app=document.getElementById('app');
      app.style.height=window.visualViewport.height+'px';
    });
  }
}

/* ── INIT ── */
window.addEventListener('DOMContentLoaded',()=>{
  // Age gate first
  initAgeGate();
  // Then check onboarding
  if(Store.get('ageVerified')) checkOnboarding();
  // Core init
  initPullToRefresh();
  initInfiniteScroll();
  initPills();
  renderHabitDots();
  startCountdown();
  initFeedCanvas();
  initProfileTabs();
  initSearch();
  initKeyboard();
  registerSW();
  // Animate ring when train tab visited
  document.getElementById('tab-train')?.addEventListener('click',animateProgressRing);
  // Restore saved state
  const savedLikes=Store.get('likes',[]);
  savedLikes.forEach(id=>STATE.likedPosts.add(id));
  const savedHabits=Store.get('habits',{});
  Object.assign(STATE.habits,savedHabits);
  STATE.journalEntries=Store.get('journal',[]);
});

window.addEventListener('resize',()=>{
  const cv=document.getElementById('story-cv');
  if(cv&&document.getElementById('story-modal')?.classList.contains('open')){
    cv.width=window.innerWidth;cv.height=window.innerHeight;
  }
});
