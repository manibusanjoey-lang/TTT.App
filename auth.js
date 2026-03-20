/* ═══════════════════════════════════════════════════
   TTT APP — AUTH + PHOTO MODULE v3
   Train. Travel. Transform.
═══════════════════════════════════════════════════ */

/* ── YOUR SUPABASE CREDENTIALS ── */
const SUPABASE_URL = 'https://ykvifrnypfmvkstxjedp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YHG1Oo-b5g4j1kV8KbJ09A_m6yG0b6U';

/* ── SUPABASE CLIENT ── */
let supabase = null;
function initSupabase(){
  try {
    if(typeof window.supabase !== 'undefined'){
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('✓ Supabase connected');
    }
  } catch(e){ console.log('Supabase error:', e); }
}

/* ══════════════════════════════════════
   AUTH STATE
══════════════════════════════════════ */
const AUTH = { user:null, profile:null, isLoggedIn:false };
let authMode = 'login';
let selectedPillar = 'train';
let selectedAvatar = '💪';
const AVATARS = ['💪','🏋️','🌍','✈️','🧠','📚','🔥','⚡','🎯','🏔️','🌅','👑','🦁','🐺','🦅'];

/* ══════════════════════════════════════
   CORE FLOW: Age Gate → Login → App
══════════════════════════════════════ */
function initAuth(){
  initSupabase();
  /* Always show age gate first if not confirmed */
  if(!localStorage.getItem('ttt_age')){
    document.getElementById('age-gate').classList.remove('gone');
    return;
  }
  /* Check Supabase for an active session */
  if(supabase){
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session && session.user){
        loadUserProfile(session.user.id);
      } else {
        showAuthScreen();
      }
    }).catch(()=>showAuthScreen());
  } else {
    showAuthScreen();
  }
}

async function loadUserProfile(userId){
  const {data:p} = await supabase.from('profiles').select('*').eq('id',userId).single();
  completeLogin({
    id: userId,
    displayName: p?.display_name || 'TTT Member',
    username: p?.username || 'ttt_user',
    avatar: p?.avatar_emoji || '💪',
    avatarUrl: p?.avatar_url || null,
    bio: p?.bio || '',
    dominantPillar: p?.dominant_pillar || 'train',
    verified: false,
    followers: p?.followers || 0,
    following: p?.following || 0,
    postCount: p?.post_count || 0,
    countries: p?.countries || 0,
  }, false);
}

/* ── Age Gate ── */
function confirmAge(over13){
  if(over13){
    localStorage.setItem('ttt_age','1');
    document.getElementById('age-gate').classList.add('gone');
    showAuthScreen();
  } else {
    document.getElementById('age-gate').innerHTML=`
      <div style="text-align:center;padding:3rem 2rem;position:relative;z-index:1">
        <div style="font-size:3rem;margin-bottom:1rem">🔒</div>
        <p style="color:var(--muted);font-size:.9rem;line-height:1.7">
          You must be 13 or older to use TTT.<br>Come back when you're ready to grow.
        </p>
      </div>`;
  }
}

/* ── Show/Hide Auth Screen ── */
function showAuthScreen(){
  document.getElementById('auth-screen')?.classList.remove('gone');
  renderAvatarPicker();
}
function hideAuthScreen(){
  document.getElementById('auth-screen')?.classList.add('gone');
}

/* ── Toggle Login / Signup ── */
function switchAuthMode(mode){
  authMode = mode;
  document.querySelectorAll('.auth-tog-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  document.getElementById('login-form').classList.toggle('hidden', mode!=='login');
  document.getElementById('signup-form').classList.toggle('hidden', mode!=='signup');
  clearAuthErrors();
}

function selectPillarAuth(pillar){
  selectedPillar = pillar;
  document.querySelectorAll('.pillar-pick-btn').forEach(b=>{
    b.className='pillar-pick-btn';
    if(b.dataset.pillar===pillar) b.classList.add('active-'+pillar);
  });
}

function renderAvatarPicker(){
  const picker = document.getElementById('avatar-picker');
  if(!picker) return;
  picker.innerHTML = AVATARS.map(av=>`
    <div class="avatar-opt ${av===selectedAvatar?'selected':''}" onclick="selectAvatar('${av}')">${av}</div>
  `).join('');
}
function selectAvatar(av){
  selectedAvatar=av;
  document.querySelectorAll('.avatar-opt').forEach(el=>el.classList.toggle('selected',el.textContent.trim()===av));
}
function clearAuthErrors(){
  document.querySelectorAll('.auth-err').forEach(e=>{e.classList.remove('show');e.textContent='';});
  document.querySelectorAll('.auth-input').forEach(i=>i.classList.remove('error'));
}
function showAuthError(formId,msg){
  const err=document.getElementById(formId+'-err');
  if(err){err.textContent=msg;err.classList.add('show');}
}

/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */
async function handleLogin(){
  clearAuthErrors();
  const email=document.getElementById('login-email').value.trim();
  const pw=document.getElementById('login-pw').value;
  if(!email||!email.includes('@')){document.getElementById('login-email').classList.add('error');showAuthError('login','Enter a valid email address.');return;}
  if(!pw||pw.length<6){document.getElementById('login-pw').classList.add('error');showAuthError('login','Password must be at least 6 characters.');return;}
  const btn=document.getElementById('login-submit');
  btn.classList.add('loading');btn.textContent='Logging in…';
  if(!supabase){btn.classList.remove('loading');btn.textContent='Log In →';showAuthError('login','Connection error. Please refresh.');return;}
  const {data,error}=await supabase.auth.signInWithPassword({email,password:pw});
  if(error){
    btn.classList.remove('loading');btn.textContent='Log In →';
    showAuthError('login',error.message==='Invalid login credentials'?'Wrong email or password.':error.message||'Login failed.');
    return;
  }
  const {data:p}=await supabase.from('profiles').select('*').eq('id',data.user.id).single();
  completeLogin({
    id:data.user.id,
    displayName:p?.display_name||email.split('@')[0],
    username:p?.username||email.split('@')[0],
    avatar:p?.avatar_emoji||'💪',
    avatarUrl:p?.avatar_url||null,
    bio:p?.bio||'',
    dominantPillar:p?.dominant_pillar||'train',
    verified:false,
    followers:p?.followers||0,
    following:p?.following||0,
    postCount:p?.post_count||0,
    countries:p?.countries||0,
  });
}

/* ══════════════════════════════════════
   SIGN UP
══════════════════════════════════════ */
async function handleSignup(){
  clearAuthErrors();
  const name=document.getElementById('signup-name').value.trim();
  const username=document.getElementById('signup-username').value.trim().toLowerCase().replace(/\s/g,'');
  const email=document.getElementById('signup-email').value.trim();
  const pw=document.getElementById('signup-pw').value;
  const pw2=document.getElementById('signup-pw2').value;
  if(!name||name.length<2){document.getElementById('signup-name').classList.add('error');showAuthError('signup','Enter your full name.');return;}
  if(!username||username.length<3){document.getElementById('signup-username').classList.add('error');showAuthError('signup','Username must be at least 3 characters.');return;}
  if(!/^[a-z0-9._]+$/.test(username)){document.getElementById('signup-username').classList.add('error');showAuthError('signup','Letters, numbers, dots and underscores only.');return;}
  if(!email||!email.includes('@')){document.getElementById('signup-email').classList.add('error');showAuthError('signup','Enter a valid email address.');return;}
  if(!pw||pw.length<8){document.getElementById('signup-pw').classList.add('error');showAuthError('signup','Password must be at least 8 characters.');return;}
  if(pw!==pw2){document.getElementById('signup-pw2').classList.add('error');showAuthError('signup','Passwords do not match.');return;}
  if(!document.getElementById('signup-consent').checked){showAuthError('signup','You must agree to the Terms of Service and Privacy Policy.');return;}
  const btn=document.getElementById('signup-submit');
  btn.classList.add('loading');btn.textContent='Creating account…';
  if(!supabase){btn.classList.remove('loading');btn.textContent='Create Account →';showAuthError('signup','Connection error. Please refresh.');return;}
  const {data,error}=await supabase.auth.signUp({email,password:pw,options:{data:{username,displayName:name}}});
  if(error){btn.classList.remove('loading');btn.textContent='Create Account →';showAuthError('signup',error.message||'Signup failed. Try again.');return;}
  await supabase.from('profiles').insert({id:data.user.id,username,display_name:name,avatar_emoji:selectedAvatar,dominant_pillar:selectedPillar,bio:''});
  completeLogin({id:data.user.id,displayName:name,username,email,avatar:selectedAvatar,avatarUrl:null,bio:'',dominantPillar:selectedPillar,verified:false,followers:0,following:0,postCount:0,countries:0});
}

/* ══════════════════════════════════════
   COMPLETE LOGIN
══════════════════════════════════════ */
function completeLogin(profile, welcome=true){
  AUTH.user=profile; AUTH.profile=profile; AUTH.isLoggedIn=true;
  localStorage.setItem('ttt_profile',JSON.stringify(profile));
  hideAuthScreen();
  updateUIForUser(profile);
  haptic('success');
  if(welcome) setTimeout(()=>toast(`✦ Welcome, ${profile.displayName||profile.username}!`),400);
  if(profile.postCount===0&&!localStorage.getItem('ttt_onboarded')){
    setTimeout(()=>document.getElementById('onboarding')?.classList.remove('gone'),600);
  }
}

/* ══════════════════════════════════════
   LOGOUT
══════════════════════════════════════ */
function logout(){
  AUTH.user=null; AUTH.profile=null; AUTH.isLoggedIn=false;
  localStorage.removeItem('ttt_profile');
  localStorage.removeItem('ttt_onboarded');
  if(supabase) supabase.auth.signOut();
  setTimeout(()=>window.location.reload(),300);
}

/* ══════════════════════════════════════
   UPDATE UI
══════════════════════════════════════ */
function updateUIForUser(profile){
  if(!profile) return;
  const compAv=document.getElementById('comp-avatar-display');
  if(compAv){compAv.innerHTML=profile.avatarUrl?`<img src="${profile.avatarUrl}" class="post-av-img"/>`:profile.avatar||'💪';}
  const profAv=document.getElementById('profile-photo-wrap');
  if(profAv){profAv.innerHTML=(profile.avatarUrl?`<img src="${profile.avatarUrl}" class="post-av-img"/>`:profile.avatar||'💪')+`<div class="online-dot"></div>`;}
  const profName=document.querySelector('.profile-name');
  if(profName) profName.textContent=profile.displayName||profile.username||'TTT Member';
  const profBio=document.querySelector('.profile-bio');
  if(profBio&&profile.bio) profBio.textContent=profile.bio;
  updateProfileStats(profile);
}
function updateProfileStats(profile){
  if(!profile) return;
  const cells=document.querySelectorAll('.stat-cell');
  if(cells.length>=4){
    cells[0].querySelector('.stat-n').textContent=profile.postCount||0;
    cells[1].querySelector('.stat-n').textContent=formatCount(profile.followers||0);
    cells[2].querySelector('.stat-n').textContent=formatCount(profile.following||0);
    cells[3].querySelector('.stat-n').textContent=profile.countries||0;
  }
}
function formatCount(n){return n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':n.toString();}

/* ══════════════════════════════════════
   EDIT PROFILE
══════════════════════════════════════ */
function openEditProfile(){
  const p=AUTH.profile||{};
  const n=document.getElementById('edit-name'); if(n) n.value=p.displayName||'';
  const b=document.getElementById('edit-bio'); if(b) b.value=p.bio||'';
  const u=document.getElementById('edit-username'); if(u) u.value=p.username||'';
  const av=document.querySelector('.current-avatar');
  if(av) av.innerHTML=p.avatarUrl?`<img src="${p.avatarUrl}" class="post-av-img"/>`:p.avatar||'💪';
  openModal('edit-profile-modal');
}
async function saveProfile(){
  const name=document.getElementById('edit-name')?.value.trim();
  const bio=document.getElementById('edit-bio')?.value.trim();
  const username=document.getElementById('edit-username')?.value.trim();
  if(!name){toast('Name cannot be empty');return;}
  if(AUTH.profile){AUTH.profile.displayName=name;AUTH.profile.bio=bio||'';if(username)AUTH.profile.username=username;localStorage.setItem('ttt_profile',JSON.stringify(AUTH.profile));}
  if(supabase&&AUTH.user){await supabase.from('profiles').update({display_name:name,bio:bio||'',username:username||AUTH.profile?.username}).eq('id',AUTH.user.id);}
  updateUIForUser(AUTH.profile);
  closeModal('edit-profile-modal');
  haptic('success');
  toast('✓ Profile updated!');
}

/* ══════════════════════════════════════
   ONBOARDING
══════════════════════════════════════ */
let obSlide=0;
function nextSlide(){
  obSlide++;
  if(obSlide>=4){finishOnboarding();return;}
  document.querySelectorAll('.ob-slide').forEach((s,i)=>s.classList.toggle('active',i===obSlide));
  document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('active',i===obSlide));
  haptic('light');
}
function finishOnboarding(){
  localStorage.setItem('ttt_onboarded','1');
  document.getElementById('onboarding')?.classList.add('gone');
  toast('✦ Welcome to TTT. Let\'s build.');
}

/* ══════════════════════════════════════
   PASSWORD TOGGLE
══════════════════════════════════════ */
function togglePwVisibility(id){
  const el=document.getElementById(id);
  if(el) el.type=el.type==='password'?'text':'password';
}

/* ══════════════════════════════════════
   PHOTO UPLOAD
══════════════════════════════════════ */
const PHOTO_STATE={postPhoto:null,postPhotoUrl:null,storyPhoto:null,storyPhotoUrl:null,selectedFilter:'none',activeMediaTab:'none'};
const FILTERS=[
  {id:'none',label:'Original',style:'none'},
  {id:'vivid',label:'Vivid',style:'saturate(1.4) contrast(1.1)'},
  {id:'moody',label:'Moody',style:'brightness(.85) contrast(1.2) saturate(.8)'},
  {id:'warm',label:'Warm',style:'sepia(.3) saturate(1.2) brightness(1.05)'},
  {id:'cold',label:'Cold',style:'saturate(.7) hue-rotate(20deg) brightness(.95)'},
  {id:'noir',label:'Noir',style:'grayscale(.8) contrast(1.3)'},
  {id:'faded',label:'Faded',style:'opacity(.85) contrast(.9) brightness(1.1) saturate(.7)'},
  {id:'sharp',label:'Sharp',style:'contrast(1.25) brightness(.95) saturate(1.15)'},
];
function triggerPhotoUpload(type='post'){document.getElementById(type==='story'?'story-file-input':'photo-file-input')?.click();}
function triggerCameraCapture(type='post'){const input=document.getElementById(type==='story'?'story-file-input':'photo-file-input');if(input){input.setAttribute('capture','environment');input.click();}}
function handlePhotoSelect(e){
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){toast('Please select an image 📸');return;}
  if(file.size>10*1024*1024){toast('Image must be under 10MB');return;}
  if(PHOTO_STATE.postPhotoUrl)URL.revokeObjectURL(PHOTO_STATE.postPhotoUrl);
  PHOTO_STATE.postPhoto=file;PHOTO_STATE.postPhotoUrl=URL.createObjectURL(file);
  const preview=document.getElementById('post-photo-preview');
  if(preview){preview.src=PHOTO_STATE.postPhotoUrl;preview.classList.add('show');}
  const zone=document.getElementById('post-upload-zone');
  if(zone){zone.classList.add('has-photo');zone.querySelector('.puz-ico').style.display='none';zone.querySelector('.puz-title').style.display='none';zone.querySelector('.puz-sub').style.display='none';}
  document.getElementById('photo-remove-btn')?.classList.add('show');
  document.getElementById('filter-strip-wrap')?.classList.add('show');
  renderFilterStrip();haptic('light');e.target.value='';
}
function handleStoryPhotoSelect(e){
  const file=e.target.files?.[0];if(!file)return;
  if(PHOTO_STATE.storyPhotoUrl)URL.revokeObjectURL(PHOTO_STATE.storyPhotoUrl);
  PHOTO_STATE.storyPhoto=file;PHOTO_STATE.storyPhotoUrl=URL.createObjectURL(file);
  const preview=document.getElementById('story-photo-preview');
  if(preview){preview.src=PHOTO_STATE.storyPhotoUrl;preview.classList.add('show');}
  haptic('light');e.target.value='';
}
function removePostPhoto(){
  if(PHOTO_STATE.postPhotoUrl)URL.revokeObjectURL(PHOTO_STATE.postPhotoUrl);
  PHOTO_STATE.postPhoto=null;PHOTO_STATE.postPhotoUrl=null;
  const preview=document.getElementById('post-photo-preview');
  if(preview){preview.src='';preview.classList.remove('show');}
  const zone=document.getElementById('post-upload-zone');
  if(zone){zone.classList.remove('has-photo');zone.querySelector('.puz-ico').style.display='';zone.querySelector('.puz-title').style.display='';zone.querySelector('.puz-sub').style.display='';}
  document.getElementById('photo-remove-btn')?.classList.remove('show');
  document.getElementById('filter-strip-wrap')?.classList.remove('show');
}
function switchMediaTab(tab){
  PHOTO_STATE.activeMediaTab=tab;
  document.querySelectorAll('.media-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  const zone=document.getElementById('post-upload-zone');if(zone)zone.classList.toggle('show',tab!=='none');
  const row=document.getElementById('upload-options-row');if(row)row.style.display=tab!=='none'?'flex':'none';
  document.querySelectorAll('.upload-prompt').forEach(p=>p.classList.remove('show'));
  if(tab!=='none')document.getElementById('prompt-'+tab)?.classList.add('show');
  haptic('light');
}
function renderFilterStrip(){
  const strip=document.getElementById('filter-strip');if(!strip)return;
  strip.innerHTML=FILTERS.map(f=>`<div class="filter-btn ${f.id===PHOTO_STATE.selectedFilter?'selected':''}" onclick="selectFilter('${f.id}','${f.style}')"><div class="filter-swatch" style="filter:${f.style}">📷</div><div class="filter-lbl">${f.label}</div></div>`).join('');
}
function selectFilter(id,style){
  PHOTO_STATE.selectedFilter=id;
  const preview=document.getElementById('post-photo-preview');if(preview)preview.style.filter=style;
  renderFilterStrip();haptic('light');
}
async function uploadPhotoToSupabase(file,bucket='posts'){
  if(!supabase||!AUTH.user)return null;
  const ext=file.name.split('.').pop()||'jpg';
  const path=`${AUTH.user.id}/${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
  if(error){console.error('Upload error:',error);return null;}
  const {data:{publicUrl}}=supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

/* ══════════════════════════════════════
   SUBMIT POST
══════════════════════════════════════ */
async function submitPostWithPhoto(){
  if(!AUTH.isLoggedIn){toast('Please log in to post');showAuthScreen();return;}
  const txt=document.getElementById('comp-ta')?.value.trim();
  if(!txt&&!PHOTO_STATE.postPhoto){toast('Add a caption or photo ✍️');return;}
  const btn=document.querySelector('.comp-post-btn');
  if(btn){btn.textContent='Posting…';btn.style.opacity='.6';btn.style.pointerEvents='none';}
  let photoUrl=PHOTO_STATE.postPhotoUrl;
  if(supabase&&PHOTO_STATE.postPhoto&&AUTH.user){const up=await uploadPhotoToSupabase(PHOTO_STATE.postPhoto);if(up)photoUrl=up;}
  const user=AUTH.profile;
  const bgs={train:'linear-gradient(135deg,#1a0404,#0d0608)',travel:'linear-gradient(135deg,#101010,#080608)',transform:'linear-gradient(135deg,#0c0416,#080608)'};
  const icos={train:'💪',travel:'🌍',transform:'✨'};
  const tags={train:'<span class="post-tag tag-red">#TTTTrain</span>',travel:'<span class="post-tag tag-grey">#TTTTravel</span>',transform:'<span class="post-tag">#TTTTransform</span>'};
  STATE.postCount++;const id=STATE.postCount;
  const post=document.createElement('div');post.className='post';post.dataset.id=id;
  const avatarHtml=user.avatarUrl?`<img src="${user.avatarUrl}" class="post-av-img"/>`:user.avatar||'💪';
  const fs=PHOTO_STATE.selectedFilter==='none'?'none':(FILTERS.find(f=>f.id===PHOTO_STATE.selectedFilter)?.style||'none');
  const mediaHtml=photoUrl?`<div class="post-media"><img src="${photoUrl}" class="post-photo" style="filter:${fs}"/></div>`:`<div class="post-media" style="background:${bgs[STATE.currentPillar]};min-height:220px"><div class="post-media-bg" style="background:radial-gradient(ellipse at 50% 50%,${STATE.currentPillar==='train'?'rgba(139,26,26,.2)':STATE.currentPillar==='travel'?'rgba(80,80,80,.15)':'rgba(59,26,90,.2)'},transparent)"></div><div class="post-media-emoji">${icos[STATE.currentPillar]}</div></div>`;
  post.innerHTML=`<div class="post-head"><div class="post-av">${avatarHtml}</div><div class="post-meta"><div class="post-name">${user.displayName||user.username}${user.verified?'<span class="verified">✦</span>':''}</div><div class="post-info"><span class="type-badge ${STATE.currentPillar==='train'?'tb-train':STATE.currentPillar==='travel'?'tb-travel':'tb-transform'}">${STATE.currentPillar}</span> · Just now</div></div><div class="post-more" onclick="openCtxMenu(event,${id})">•••</div></div>${mediaHtml}${txt?`<div class="post-body"><p class="post-text">${txt} ${tags[STATE.currentPillar]||''}</p></div>`:''}<div class="post-actions"><div class="post-act" onclick="toggleLike(this,${id})"><span class="act-ico">🤍</span> 0</div><div class="post-act" onclick="toast('Comments coming soon!')"><span class="act-ico">💬</span> 0</div><div class="post-act" onclick="sharePost(${id})"><span class="act-ico">↗️</span></div><div class="post-spacer"></div><div class="post-act" onclick="toggleSave(this,${id})"><span class="act-ico">🔖</span></div></div>`;
  const container=document.getElementById('feed-posts');const firstPill=container?.querySelector('.pills-wrap');
  firstPill?container.insertBefore(post,firstPill.nextSibling):container?.prepend(post);
  if(supabase&&AUTH.user){
    await supabase.from('posts').insert({user_id:AUTH.user.id,caption:txt||'',photo_url:photoUrl||null,pillar:STATE.currentPillar,filter:PHOTO_STATE.selectedFilter});
    await supabase.from('profiles').update({post_count:(user.postCount||0)+1}).eq('id',AUTH.user.id);
  }
  if(AUTH.profile){AUTH.profile.postCount=(AUTH.profile.postCount||0)+1;localStorage.setItem('ttt_profile',JSON.stringify(AUTH.profile));}
  updateProfileStats(AUTH.profile);
  document.getElementById('comp-ta').value='';removePostPhoto();switchMediaTab('none');
  if(btn){btn.textContent='Post';btn.style.opacity='';btn.style.pointerEvents='';}
  closeModal('post-modal');switchTab('feed');haptic('success');
  setTimeout(()=>toast('✦ Posted to TTT feed!'),200);
}

/* ══════════════════════════════════════
   AVATAR UPLOAD
══════════════════════════════════════ */
async function handleAvatarUpload(e){
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){toast('Please select an image 📸');return;}
  const url=URL.createObjectURL(file);
  const av=document.querySelector('.current-avatar');if(av)av.innerHTML=`<img src="${url}" class="post-av-img"/>`;
  let publicUrl=url;
  if(supabase&&AUTH.user){const up=await uploadPhotoToSupabase(file,'avatars');if(up){publicUrl=up;await supabase.from('profiles').update({avatar_url:publicUrl}).eq('id',AUTH.user.id);}}
  if(AUTH.profile){AUTH.profile.avatarUrl=publicUrl;localStorage.setItem('ttt_profile',JSON.stringify(AUTH.profile));}
  updateUIForUser(AUTH.profile);toast('✓ Profile photo updated!');e.target.value='';
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded',()=>{
  window.submitPost=submitPostWithPhoto;
  setTimeout(initAuth,150);
  document.getElementById('photo-file-input')?.addEventListener('change',handlePhotoSelect);
  document.getElementById('story-file-input')?.addEventListener('change',handleStoryPhotoSelect);
  document.getElementById('avatar-file-input')?.addEventListener('change',handleAvatarUpload);
  switchMediaTab('none');
});
