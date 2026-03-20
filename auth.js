/* ═══════════════════════════════════════════════════
   TTT APP — AUTH + PHOTO MODULE v3
   Supabase backend integration
   Account creation, login, profile, photo uploads
═══════════════════════════════════════════════════ */

/* ── SUPABASE CONFIG ──
const SUPABASE_URL = 'https://ykvifrnypfmvkstxjedp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YHG1Oo-b5g4j1kV8KbJO9A_m6yG0b6U';
/* ── SUPABASE CLIENT (loaded from CDN in HTML) ── */
let supabase = null;
function initSupabase(){
  if(typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL'){
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✓ Supabase connected');
  } else {
    console.log('ℹ Demo mode — Supabase not yet configured');
  }
}

/* ══════════════════════════════════════
   AUTH STATE
══════════════════════════════════════ */
const AUTH = {
  user: null,          // Supabase auth user
  profile: null,       // TTT profile from DB
  isLoggedIn: false,
  demoMode: true,      // true until Supabase is configured
};

/* Demo user for testing before Supabase is set up */
const DEMO_USER = {
  id: 'demo-user-1',
  username: 'joey_ttt',
  displayName: 'Joey Manibusan',
  avatar: '👑',
  avatarUrl: null,
  bio: 'Founder of TTT · Train. Travel. Transform.',
  dominantPillar: 'train',
  verified: true,
  followers: 12400,
  following: 348,
  postCount: 284,
  countries: 23,
};

/* ══════════════════════════════════════
   AUTH SCREEN LOGIC
══════════════════════════════════════ */
let authMode = 'login'; // 'login' or 'signup'
let selectedPillar = 'train';
let selectedAvatar = '💪';

const AVATARS = ['💪','🏋️','🌍','✈️','🧠','📚','🔥','⚡','🎯','🏔️','🌅','👑','🦁','🐺','🦅'];

function initAuth(){
  initSupabase();
  // Check age verification first
  if(!Store.get('ageVerified')){
    document.getElementById('age-gate').classList.remove('gone');
    return;
  }
  // Only restore session if Supabase is connected
  if(supabase){
    const saved = Store.get('ttt_user');
    if(saved && saved.id && !saved.id.startsWith('demo')){
      AUTH.user = saved;
      AUTH.profile = saved;
      AUTH.isLoggedIn = true;
      hideAuthScreen();
      updateUIForUser(saved);
      return;
    }
  }
  // Always show auth screen if not properly logged in
  showAuthScreen();
}

function showAuthScreen(){
  const screen = document.getElementById('auth-screen');
  if(screen) screen.classList.remove('gone');
  renderAvatarPicker();
}
function hideAuthScreen(){
  const screen = document.getElementById('auth-screen');
  if(screen) screen.classList.add('gone');
}

function switchAuthMode(mode){
  authMode = mode;
  document.querySelectorAll('.auth-tog-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  document.getElementById('login-form').classList.toggle('hidden', mode !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', mode !== 'signup');
  clearAuthErrors();
}

function selectPillarAuth(pillar){
  selectedPillar = pillar;
  document.querySelectorAll('.pillar-pick-btn').forEach(b=>{
    b.className = 'pillar-pick-btn';
    if(b.dataset.pillar === pillar) b.classList.add(`active-${pillar}`);
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
  selectedAvatar = av;
  document.querySelectorAll('.avatar-opt').forEach(el=>{
    el.classList.toggle('selected', el.textContent === av);
  });
}

function clearAuthErrors(){
  document.querySelectorAll('.auth-err').forEach(e=>{e.classList.remove('show');e.textContent='';});
  document.querySelectorAll('.auth-input').forEach(i=>i.classList.remove('error'));
}

function showAuthError(formId, msg){
  const err = document.getElementById(formId+'-err');
  if(err){err.textContent=msg;err.classList.add('show');}
}

/* ── LOGIN ── */
async function handleLogin(){
  clearAuthErrors();
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-pw').value;

  if(!email || !email.includes('@')){
    document.getElementById('login-email').classList.add('error');
    showAuthError('login','Please enter a valid email address.');return;
  }
  if(!pw || pw.length < 6){
    document.getElementById('login-pw').classList.add('error');
    showAuthError('login','Password must be at least 6 characters.');return;
  }

  const btn = document.getElementById('login-submit');
  btn.classList.add('loading');btn.textContent='Logging in…';

  if(supabase){
    // Real Supabase login
    const {data,error} = await supabase.auth.signInWithPassword({email,password:pw});
    if(error){
      btn.classList.remove('loading');btn.textContent='Log In →';
      showAuthError('login', error.message || 'Login failed. Check your credentials.');
      return;
    }
    // Fetch profile
    const {data:profile} = await supabase.from('profiles').select('*').eq('id',data.user.id).single();
    completeLogin(profile || {id:data.user.id, displayName:email.split('@')[0], avatar:'💪'});
  } else {
    // Demo mode — simulate login
    setTimeout(()=>{
      completeLogin({...DEMO_USER, email});
    }, 800);
  }
}

/* ── SIGNUP ── */
async function handleSignup(){
  clearAuthErrors();
  const name = document.getElementById('signup-name').value.trim();
  const username = document.getElementById('signup-username').value.trim().toLowerCase().replace(/\s/g,'');
  const email = document.getElementById('signup-email').value.trim();
  const pw = document.getElementById('signup-pw').value;
  const pw2 = document.getElementById('signup-pw2').value;

  // Validation
  if(!name || name.length < 2){
    document.getElementById('signup-name').classList.add('error');
    showAuthError('signup','Please enter your full name.');return;
  }
  if(!username || username.length < 3){
    document.getElementById('signup-username').classList.add('error');
    showAuthError('signup','Username must be at least 3 characters.');return;
  }
  if(!/^[a-z0-9._]+$/.test(username)){
    document.getElementById('signup-username').classList.add('error');
    showAuthError('signup','Username can only contain letters, numbers, dots and underscores.');return;
  }
  if(!email || !email.includes('@')){
    document.getElementById('signup-email').classList.add('error');
    showAuthError('signup','Please enter a valid email address.');return;
  }
  if(!pw || pw.length < 8){
    document.getElementById('signup-pw').classList.add('error');
    showAuthError('signup','Password must be at least 8 characters.');return;
  }
  if(pw !== pw2){
    document.getElementById('signup-pw2').classList.add('error');
    showAuthError('signup','Passwords do not match.');return;
  }
  if(!document.getElementById('signup-consent').checked){
    showAuthError('signup','You must agree to the Terms of Service and Privacy Policy.');return;
  }

  const btn = document.getElementById('signup-submit');
  btn.classList.add('loading');btn.textContent='Creating account…';

  const newProfile = {
    displayName: name,
    username,
    email,
    avatar: selectedAvatar,
    avatarUrl: null,
    dominantPillar: selectedPillar,
    bio: '',
    verified: false,
    followers: 0,
    following: 0,
    postCount: 0,
    countries: 0,
    joinDate: new Date().toISOString(),
  };

  if(supabase){
    // Real Supabase signup
    const {data,error} = await supabase.auth.signUp({email,password:pw,options:{data:{username,displayName:name}}});
    if(error){
      btn.classList.remove('loading');btn.textContent='Create Account →';
      showAuthError('signup', error.message || 'Signup failed. Please try again.');return;
    }
    // Insert profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      display_name: name,
      avatar_emoji: selectedAvatar,
      dominant_pillar: selectedPillar,
      bio: '',
    });
    completeLogin({...newProfile, id: data.user.id});
  } else {
    // Demo mode
    setTimeout(()=>{
      completeLogin({...newProfile, id:'demo-'+Date.now()});
    }, 900);
  }
}

function completeLogin(profile){
  AUTH.user = profile;
  AUTH.profile = profile;
  AUTH.isLoggedIn = true;
  Store.set('ttt_user', profile);
  hideAuthScreen();
  updateUIForUser(profile);
  haptic('success');
  setTimeout(()=>toast(`✦ Welcome back, ${profile.displayName||profile.username}!`), 300);
  // Show onboarding for new users
  if(profile.postCount === 0 && !Store.get('onboarded')){
    setTimeout(()=>document.getElementById('onboarding').classList.remove('gone'), 500);
  }
}

/* ── LOGOUT ── */
function logout(){
  if(!confirm('Sign out of TTT?')) return;
  AUTH.user = null; AUTH.profile = null; AUTH.isLoggedIn = false;
  Store.set('ttt_user', null);
  if(supabase) supabase.auth.signOut();
  location.reload();
}

/* ── UPDATE UI FOR LOGGED IN USER ── */
function updateUIForUser(profile){
  // Update post composer avatar
  const compAv = document.querySelector('.comp-av');
  if(compAv){
    if(profile.avatarUrl) compAv.innerHTML = `<img src="${profile.avatarUrl}" class="post-av-img"/>`;
    else compAv.textContent = profile.avatar || '👑';
  }
  // Update profile screen
  const profAv = document.querySelector('.profile-av');
  if(profAv){
    if(profile.avatarUrl) profAv.innerHTML = `<img src="${profile.avatarUrl}" class="post-av-img"/>`;
    else profAv.textContent = profile.avatar || '👑';
  }
  // Update profile name
  const profName = document.querySelector('.profile-name');
  if(profName) profName.textContent = profile.displayName || profile.username;
  // Update profile bio
  const profBio = document.querySelector('.profile-bio');
  if(profBio && profile.bio) profBio.textContent = profile.bio;
  // Update stats
  updateProfileStats(profile);
}

function updateProfileStats(profile){
  const cells = document.querySelectorAll('.stat-cell');
  if(cells.length >= 4){
    cells[0].querySelector('.stat-n').textContent = profile.postCount || 0;
    cells[1].querySelector('.stat-n').textContent = formatCount(profile.followers || 0);
    cells[2].querySelector('.stat-n').textContent = formatCount(profile.following || 0);
    cells[3].querySelector('.stat-n').textContent = profile.countries || 0;
  }
}

function formatCount(n){
  if(n>=1000000) return (n/1000000).toFixed(1)+'M';
  if(n>=1000) return (n/1000).toFixed(1)+'K';
  return n.toString();
}

/* ══════════════════════════════════════
   PHOTO UPLOAD SYSTEM
══════════════════════════════════════ */

const PHOTO_STATE = {
  postPhoto: null,       // File object for post
  postPhotoUrl: null,    // Object URL for preview
  storyPhoto: null,
  storyPhotoUrl: null,
  selectedFilter: 'none',
  activeMediaTab: 'none', // 'train','travel','transform','none'
};

const FILTERS = [
  {id:'none', label:'Original', style:'none'},
  {id:'vivid', label:'Vivid', style:'saturate(1.4) contrast(1.1)'},
  {id:'moody', label:'Moody', style:'brightness(.85) contrast(1.2) saturate(.8)'},
  {id:'warm', label:'Warm', style:'sepia(.3) saturate(1.2) brightness(1.05)'},
  {id:'cold', label:'Cold', style:'saturate(.7) hue-rotate(20deg) brightness(.95)'},
  {id:'noir', label:'Noir', style:'grayscale(.8) contrast(1.3)'},
  {id:'faded', label:'Faded', style:'opacity(.85) contrast(.9) brightness(1.1) saturate(.7)'},
  {id:'sharp', label:'Sharp', style:'contrast(1.25) brightness(.95) saturate(1.15)'},
];

const UPLOAD_PROMPTS = {
  train: '<strong>📸 Train Post</strong> — Add a photo of your workout, gym session, meal prep, or body progress. Let the community see your grind.',
  travel: '<strong>🌍 Travel Post</strong> — Add a photo from your destination — landscapes, street food, culture moments, or your passport stamps.',
  transform: '<strong>🧠 Transform Post</strong> — Add a photo of your journal, morning ritual, book notes, or a moment of clarity. Show your inner work.',
};

/* Open file picker */
function triggerPhotoUpload(type='post'){
  const inputId = type === 'story' ? 'story-file-input' : 'photo-file-input';
  document.getElementById(inputId)?.click();
}

function triggerCameraCapture(type='post'){
  const input = document.getElementById(type==='story'?'story-file-input':'photo-file-input');
  if(input){input.setAttribute('capture','environment');input.click();}
}

/* Handle file selection — post */
function handlePhotoSelect(e){
  const file = e.target.files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){toast('Please select an image file 📸');return;}
  if(file.size > 10*1024*1024){toast('Image must be under 10MB');return;}

  if(PHOTO_STATE.postPhotoUrl) URL.revokeObjectURL(PHOTO_STATE.postPhotoUrl);
  PHOTO_STATE.postPhoto = file;
  PHOTO_STATE.postPhotoUrl = URL.createObjectURL(file);

  // Show preview
  const preview = document.getElementById('post-photo-preview');
  if(preview){preview.src = PHOTO_STATE.postPhotoUrl;preview.classList.add('show');}
  // Hide upload zone icons, show remove btn
  const zone = document.getElementById('post-upload-zone');
  if(zone){
    zone.classList.add('has-photo');
    zone.querySelector('.puz-ico').style.display='none';
    zone.querySelector('.puz-title').style.display='none';
    zone.querySelector('.puz-sub').style.display='none';
  }
  document.getElementById('photo-remove-btn')?.classList.add('show');
  // Show filter strip
  document.getElementById('filter-strip-wrap')?.classList.add('show');
  renderFilterStrip();
  haptic('light');
  e.target.value='';// reset input so same file can be re-selected
}

/* Handle file selection — story */
function handleStoryPhotoSelect(e){
  const file = e.target.files?.[0];
  if(!file) return;
  if(PHOTO_STATE.storyPhotoUrl) URL.revokeObjectURL(PHOTO_STATE.storyPhotoUrl);
  PHOTO_STATE.storyPhoto = file;
  PHOTO_STATE.storyPhotoUrl = URL.createObjectURL(file);
  const preview = document.getElementById('story-photo-preview');
  if(preview){preview.src=PHOTO_STATE.storyPhotoUrl;preview.classList.add('show');}
  haptic('light');
  e.target.value='';
}

/* Remove photo */
function removePostPhoto(){
  if(PHOTO_STATE.postPhotoUrl) URL.revokeObjectURL(PHOTO_STATE.postPhotoUrl);
  PHOTO_STATE.postPhoto = null;PHOTO_STATE.postPhotoUrl = null;
  const preview = document.getElementById('post-photo-preview');
  if(preview){preview.src='';preview.classList.remove('show');}
  const zone = document.getElementById('post-upload-zone');
  if(zone){
    zone.classList.remove('has-photo');
    zone.querySelector('.puz-ico').style.display='';
    zone.querySelector('.puz-title').style.display='';
    zone.querySelector('.puz-sub').style.display='';
  }
  document.getElementById('photo-remove-btn')?.classList.remove('show');
  document.getElementById('filter-strip-wrap')?.classList.remove('show');
}

/* Media tabs in composer (Train / Travel / Transform / None) */
function switchMediaTab(tab){
  PHOTO_STATE.activeMediaTab = tab;
  document.querySelectorAll('.media-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  // Show/hide upload zone
  const zone = document.getElementById('post-upload-zone');
  if(zone) zone.classList.toggle('show', tab !== 'none');
  // Show pillar-specific prompt
  document.querySelectorAll('.upload-prompt').forEach(p=>p.classList.remove('show'));
  if(tab !== 'none'){
    const prompt = document.getElementById('prompt-'+tab);
    if(prompt) prompt.classList.add('show');
  }
  haptic('light');
}

/* Filter strip */
function renderFilterStrip(){
  const strip = document.getElementById('filter-strip');
  if(!strip) return;
  strip.innerHTML = FILTERS.map(f=>`
    <div class="filter-btn ${f.id===PHOTO_STATE.selectedFilter?'selected':''}" onclick="selectFilter('${f.id}','${f.style}')">
      <div class="filter-swatch" style="filter:${f.style}">📷</div>
      <div class="filter-lbl">${f.label}</div>
    </div>
  `).join('');
}

function selectFilter(id, style){
  PHOTO_STATE.selectedFilter = id;
  const preview = document.getElementById('post-photo-preview');
  if(preview) preview.style.filter = style;
  renderFilterStrip();
  haptic('light');
}

/* Upload photo to Supabase Storage */
async function uploadPhotoToSupabase(file, bucket='posts'){
  if(!supabase || !AUTH.user) return null;
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${AUTH.user.id}/${Date.now()}.${ext}`;
  const {data, error} = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if(error){console.error('Upload error:',error);return null;}
  const {data:{publicUrl}} = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

/* ══════════════════════════════════════
   EXTENDED POST SUBMISSION (with photo + auth)
══════════════════════════════════════ */
async function submitPostWithPhoto(){
  if(!AUTH.isLoggedIn && !AUTH.demoMode){
    toast('Please log in to post');
    showAuthScreen();return;
  }
  const txt = document.getElementById('comp-ta')?.value.trim();
  if(!txt && !PHOTO_STATE.postPhoto){toast('Add a caption or photo ✍️');return;}

  const btn = document.querySelector('.comp-post-btn');
  if(btn){btn.textContent='Posting…';btn.style.opacity='.6';btn.style.pointerEvents='none';}

  let photoUrl = PHOTO_STATE.postPhotoUrl;
  let uploadedUrl = null;

  // Upload to Supabase if configured
  if(supabase && PHOTO_STATE.postPhoto && AUTH.user){
    uploadedUrl = await uploadPhotoToSupabase(PHOTO_STATE.postPhoto);
    if(uploadedUrl) photoUrl = uploadedUrl;
  }

  const user = AUTH.profile || DEMO_USER;
  const bgs = {train:'linear-gradient(135deg,#1a0404,#0d0608)',travel:'linear-gradient(135deg,#101010,#080608)',transform:'linear-gradient(135deg,#0c0416,#080608)'};
  const icos = {train:'💪',travel:'🌍',transform:'✨'};
  const tags = {train:'<span class="post-tag tag-red">#TTTTrain</span>',travel:'<span class="post-tag tag-grey">#TTTTravel</span>',transform:'<span class="post-tag">#TTTTransform</span>'};

  // Build post element
  STATE.postCount++;
  const id = STATE.postCount;
  const post = document.createElement('div');
  post.className='post';post.dataset.id=id;

  const avatarHtml = user.avatarUrl
    ? `<img src="${user.avatarUrl}" class="post-av-img"/>`
    : (user.avatar || '👤');

  const mediaHtml = photoUrl
    ? `<div class="post-media"><img src="${photoUrl}" class="post-photo" style="filter:${PHOTO_STATE.selectedFilter==='none'?'none':FILTERS.find(f=>f.id===PHOTO_STATE.selectedFilter)?.style||'none'}"/></div>`
    : `<div class="post-media" style="background:${bgs[STATE.currentPillar]};min-height:220px"><div class="post-media-bg" style="background:radial-gradient(ellipse at 50% 50%,${STATE.currentPillar==='train'?'rgba(139,26,26,.2)':STATE.currentPillar==='travel'?'rgba(80,80,80,.15)':'rgba(59,26,90,.2)'},transparent)"></div><div class="post-media-emoji">${icos[STATE.currentPillar]}</div></div>`;

  post.innerHTML = `
    <div class="post-head">
      <div class="post-av">${avatarHtml}</div>
      <div class="post-meta">
        <div class="post-name">${user.displayName||user.username}${user.verified?'<span class="verified">✦</span>':''}</div>
        <div class="post-info"><span class="type-badge ${STATE.currentPillar==='train'?'tb-train':STATE.currentPillar==='travel'?'tb-travel':'tb-transform'}">${STATE.currentPillar}</span> · Just now</div>
      </div>
      <div class="post-more" onclick="openCtxMenu(event,${id})">•••</div>
    </div>
    ${mediaHtml}
    ${txt?`<div class="post-body"><p class="post-text">${txt} ${tags[STATE.currentPillar]||''}</p></div>`:''}
    <div class="post-actions">
      <div class="post-act" onclick="toggleLike(this,${id})"><span class="act-ico">🤍</span> 0</div>
      <div class="post-act" onclick="toast('Comments coming soon!')"><span class="act-ico">💬</span> 0</div>
      <div class="post-act" onclick="sharePost(${id})"><span class="act-ico">↗️</span></div>
      <div class="post-spacer"></div>
      <div class="post-act" onclick="toggleSave(this,${id})"><span class="act-ico">🔖</span></div>
    </div>`;

  // Add to feed
  const container = document.getElementById('feed-posts');
  const firstPill = container?.querySelector('.pills-wrap');
  firstPill ? container.insertBefore(post,firstPill.nextSibling) : container?.prepend(post);

  // Save to Supabase if configured
  if(supabase && AUTH.user){
    await supabase.from('posts').insert({
      user_id: AUTH.user.id,
      caption: txt || '',
      photo_url: uploadedUrl || null,
      pillar: STATE.currentPillar,
      filter: PHOTO_STATE.selectedFilter,
    });
    // Increment post count
    await supabase.from('profiles').update({post_count: (user.postCount||0)+1}).eq('id',AUTH.user.id);
  }

  // Update local profile count
  if(AUTH.profile) AUTH.profile.postCount = (AUTH.profile.postCount||0)+1;
  Store.set('ttt_user', AUTH.profile);
  updateProfileStats(AUTH.profile||DEMO_USER);

  // Reset composer
  document.getElementById('comp-ta').value='';
  removePostPhoto();
  switchMediaTab('none');
  if(btn){btn.textContent='Post';btn.style.opacity='';btn.style.pointerEvents='';}
  closeModal('post-modal');
  switchTab('feed');
  haptic('success');
  setTimeout(()=>toast('✦ Posted to TTT feed!'), 200);
}

/* ══════════════════════════════════════
   AVATAR UPLOAD (Edit Profile)
══════════════════════════════════════ */
async function handleAvatarUpload(e){
  const file = e.target.files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){toast('Please select an image 📸');return;}

  const url = URL.createObjectURL(file);
  // Preview immediately
  const av = document.querySelector('.current-avatar');
  if(av) av.innerHTML = `<img src="${url}" class="post-av-img"/>`;

  let publicUrl = url;
  if(supabase && AUTH.user){
    const uploaded = await uploadPhotoToSupabase(file, 'avatars');
    if(uploaded){
      publicUrl = uploaded;
      await supabase.from('profiles').update({avatar_url: publicUrl}).eq('id',AUTH.user.id);
    }
  }
  if(AUTH.profile){AUTH.profile.avatarUrl=publicUrl;Store.set('ttt_user',AUTH.profile);}
  updateUIForUser(AUTH.profile||DEMO_USER);
  toast('✓ Profile photo updated!');
  e.target.value='';
}

/* ══════════════════════════════════════
   EDIT PROFILE
══════════════════════════════════════ */
async function saveProfile(){
  const name = document.getElementById('edit-name')?.value.trim();
  const bio = document.getElementById('edit-bio')?.value.trim();
  const username = document.getElementById('edit-username')?.value.trim();

  if(!name){toast('Name cannot be empty');return;}

  if(AUTH.profile){
    AUTH.profile.displayName = name;
    AUTH.profile.bio = bio;
    if(username) AUTH.profile.username = username;
    Store.set('ttt_user', AUTH.profile);
  }

  if(supabase && AUTH.user){
    await supabase.from('profiles').update({
      display_name: name,
      bio: bio || '',
      username: username || AUTH.profile?.username,
    }).eq('id', AUTH.user.id);
  }

  updateUIForUser(AUTH.profile || DEMO_USER);
  closeModal('edit-profile-modal');
  haptic('success');
  toast('✓ Profile updated!');
}

function openEditProfile(){
  const profile = AUTH.profile || DEMO_USER;
  const nameInput = document.getElementById('edit-name');
  const bioInput = document.getElementById('edit-bio');
  const usernameInput = document.getElementById('edit-username');
  if(nameInput) nameInput.value = profile.displayName || '';
  if(bioInput) bioInput.value = profile.bio || '';
  if(usernameInput) usernameInput.value = profile.username || '';
  const av = document.querySelector('.current-avatar');
  if(av){
    if(profile.avatarUrl) av.innerHTML = `<img src="${profile.avatarUrl}" class="post-av-img"/>`;
    else av.textContent = profile.avatar || '👑';
  }
  openModal('edit-profile-modal');
}

/* ══════════════════════════════════════
   PASSWORD VISIBILITY TOGGLE
══════════════════════════════════════ */
function togglePwVisibility(inputId){
  const input = document.getElementById(inputId);
  if(!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', ()=>{
  // Override the old submitPost with the new photo-aware version
  window.submitPost = submitPostWithPhoto;
  // Init auth
  setTimeout(initAuth, 100);
  // Wire up file inputs
  document.getElementById('photo-file-input')?.addEventListener('change', handlePhotoSelect);
  document.getElementById('story-file-input')?.addEventListener('change', handleStoryPhotoSelect);
  document.getElementById('avatar-file-input')?.addEventListener('change', handleAvatarUpload);
  // Default media tab
  switchMediaTab('none');
});
