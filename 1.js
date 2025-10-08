// storage keys
const LS_USERS = 'se_users';
const LS_POSTS = 'se_posts';
const LS_CURRENT = 'se_current';
const LS_DRAFT = 'se_draft';
const LS_SAVED_ITEMS = 'se_saved_items';

// app state
let users = JSON.parse(localStorage.getItem(LS_USERS) || '{}');
let posts = JSON.parse(localStorage.getItem(LS_POSTS) || '[]');
let savedMarket = JSON.parse(localStorage.getItem(LS_SAVED_ITEMS) || '[]');
let currentUser = localStorage.getItem(LS_CURRENT) || null;

// sample market items (persisted if user interacts)
const MARKET_ITEMS_DEFAULT = [
  { id: 'm1', title: 'Used Math Textbook', desc: 'Calculus 1, good condition', price: '₱250', img: 'https://picsum.photos/seed/book1/400/300' },
  { id: 'm2', title: 'Laptop Sleeve', desc: '15-inch, padded', price: '₱350', img: 'https://picsum.photos/seed/sleeve/400/300' },
  { id: 'm3', title: 'Sticker Pack', desc: 'College-themed stickers', price: '₱80', img: 'https://picsum.photos/seed/stickers/400/300' },
  { id: 'm4', title: 'USB Flash Drive', desc: '32GB, fast', price: '₱150', img: 'https://picsum.photos/seed/usb/400/300' }
];
let marketItems = JSON.parse(localStorage.getItem('se_market') || 'null') || MARKET_ITEMS_DEFAULT;

/* -----------------------
   Toast & UI utilities
   ----------------------- */
function showToast(msg, timeout=2200){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), timeout);
}

function saveUsers(){ localStorage.setItem(LS_USERS, JSON.stringify(users)); }
function savePosts(){ localStorage.setItem(LS_POSTS, JSON.stringify(posts)); }
function saveMarketState(){ localStorage.setItem('se_market', JSON.stringify(marketItems)); }
function saveSavedItems(){ localStorage.setItem(LS_SAVED_ITEMS, JSON.stringify(savedMarket)); }

function setCurrent(user){
  currentUser = user;
  if(user) localStorage.setItem(LS_CURRENT, user);
  else localStorage.removeItem(LS_CURRENT);
}

/* -----------------------
   Auth: register/login
   ----------------------- */
function onRegister(){
  const u = document.getElementById('authUser').value.trim();
  const p = document.getElementById('authPass').value;
  if(!u || !p) return showToast('Please enter username & password');
  if(users[u]) return showToast('Username already taken');
  users[u] = { password: p, bio: '', pic:'', stats:{posts:0, likes:0, comments:0} };
  saveUsers();
  showToast('Registered 🎉 — please log in');
  document.getElementById('authUser').value = u;
}
function onLogin(){
  const u = document.getElementById('authUser').value.trim();
  const p = document.getElementById('authPass').value;
  if(!u || !p) return showToast('Enter username & password');
  if(!users[u] || users[u].password !== p) return showToast('Invalid credentials');
  setCurrent(u);
  openApp();
  showToast('Welcome back, ' + u + ' 👋');
}

/* -----------------------
   App open / UI wiring
   ----------------------- */
function openApp(){
  document.getElementById('authWrap').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  refreshProfileUI();
  renderPosts();
  loadDraft();
  updateCounts();
  showPage('feed', true);
  renderMarket();
  renderExplore();
  renderSavedItems();
}

/* -----------------------
   Page switching
   ----------------------- */
function clearActiveNav(){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
}
function showPage(page, instant=false){
  const pages = ['feed','profile','explore','market'];
  pages.forEach(p => {
    const el = document.getElementById(p + 'Page');
    if(el) el.classList.add('hidden');
  });

  clearActiveNav();
  if(page === 'profile'){
    document.getElementById('profilePage').classList.remove('hidden');
    document.getElementById('navProfile').classList.add('active');
    document.querySelectorAll('#navBottom .nav-btn')[3]?.classList.add('active');
    renderProfilePosts();
    refreshProfileUI();
  } else if(page === 'explore'){
    document.getElementById('explorePage').classList.remove('hidden');
    document.getElementById('navExplore').classList.add('active');
    document.querySelectorAll('#navBottom .nav-btn')[1]?.classList.add('active');
    renderExplore();
  } else if(page === 'market'){
    document.getElementById('marketPage').classList.remove('hidden');
    document.getElementById('navMarket').classList.add('active');
    document.querySelectorAll('#navBottom .nav-btn')[2]?.classList.add('active');
    renderMarket();
    renderSavedItems();
  } else {
    document.getElementById('feedPage').classList.remove('hidden');
    document.getElementById('navHome').classList.add('active');
    document.querySelectorAll('#navBottom .nav-btn')[0]?.classList.add('active');
    renderPosts();
  }

  window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
}

/* -----------------------
   Draft handling
   ----------------------- */
function saveDraft(){
  if(!currentUser) return;
  const text = document.getElementById('txtPost').value;
  localStorage.setItem(LS_DRAFT + '_' + currentUser, text);
  document.getElementById('draftNotice').textContent = text ? 'Draft saved' : '';
}
function loadDraft(){
  if(!currentUser) return;
  const val = localStorage.getItem(LS_DRAFT + '_' + currentUser) || '';
  document.getElementById('txtPost').value = val;
  document.getElementById('draftNotice').textContent = val ? 'Draft loaded' : '';
}
function clearDraft(){
  if(currentUser) localStorage.removeItem(LS_DRAFT + '_' + currentUser);
  document.getElementById('txtPost').value = '';
  document.getElementById('filePost').value = '';
  document.getElementById('draftNotice').textContent = '';
}

/* -----------------------
   Create post (with image -> DataURL)
   ----------------------- */
function onCreatePost(){
  if(!currentUser) return showToast('Please login first');
  const text = document.getElementById('txtPost').value.trim();
  const file = document.getElementById('filePost').files[0];
  if(!text && !file) return showToast('Write something or attach an image');

  if(file){
    const reader = new FileReader();
    reader.onload = () => createPostObject(text, reader.result);
    reader.readAsDataURL(file);
  } else {
    createPostObject(text, null);
  }
}

function createPostObject(text, imageDataURL){
  const p = {
    id: Date.now(),
    user: currentUser,
    text: text,
    image: imageDataURL,
    likedBy: [],
    comments: [],
    createdAt: new Date().toISOString(),
    editedAt: null
  };
  posts.unshift(p);
  if(!users[currentUser].stats) users[currentUser].stats = {posts:0,likes:0,comments:0};
  users[currentUser].stats.posts++;
  saveUsers(); savePosts(); renderPosts(); clearDraft(); showToast('✅ Post shared successfully!'); updateCounts(); renderProfilePosts();
}

/* -----------------------
   Render posts
   ----------------------- */
function renderPosts(filter=''){
  const container = document.getElementById('postsList');
  container.innerHTML = '';
  const filtered = posts.filter(post => {
    if(!filter) return true;
    const q = filter.toLowerCase();
    return post.user.toLowerCase().includes(q) || (post.text && post.text.toLowerCase().includes(q));
  });
  filtered.forEach(post => {
    const el = document.createElement('div');
    el.className = 'card post';
    const userObj = users[post.user] || {bio:'',pic:''};
    const avatar = userObj.pic || `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(post.user)}`;
    const liked = currentUser && post.likedBy.includes(currentUser);

    const commentsHtml = (post.comments || []).map(c => `<p><strong>@${escapeHtml(c.user)}</strong>: ${escapeHtml(c.text)}</p>`).join('');

    el.innerHTML = `
      <div class="meta">
        <img class="user-avatar" src="${avatar}" alt="avatar">
        <div style="flex:1">
          <div style="display:flex;gap:8px;align-items:center">
            <div class="username" onclick="showProfile('${escapeHtml(post.user)}')">${escapeHtml(post.user)}</div>
            <div style="font-size:12px;color:var(--muted)">${new Date(post.createdAt).toLocaleString()} ${post.editedAt ? '(edited)' : ''}</div>
          </div>
          <div class="bio muted">${escapeHtml(userObj.bio || '')}</div>
        </div>
      </div>
      <div class="post-content"><div class="text">${escapeHtml(post.text)}</div>
        ${post.image ? `<img class="media" src="${post.image}" alt="post image">` : ''}
      </div>
      <div class="actions" style="display:flex;gap:12px;margin-top:10px">
        <button onclick="toggleLike(${post.id})">${liked ? '💔 Unlike' : '❤️ Like'} (${post.likedBy.length})</button>
        <button onclick="toggleCommentsArea(${post.id})">💬 Comment (${post.comments.length})</button>
        ${post.user === currentUser ? `<button onclick="onEditPost(${post.id})">✏️ Edit</button> <button onclick="onDeletePost(${post.id})" class="danger">🗑 Delete</button>` : ''}
        <button onclick="openPostModalById(${post.id})" class="small-btn">View</button>
      </div>
      <div id="comments-area-${post.id}" class="comments" style="display:none">
        ${commentsHtml}
        <div class="comment-input" style="display:flex;gap:8px;margin-top:8px">
          <input id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') addComment(${post.id})" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--white)">
          <button onclick="addComment(${post.id})" class="small-btn">Send</button>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
  refreshProfileUI();
}

/* -----------------------
   Like / comment / edit / delete
   ----------------------- */
function toggleLike(postId){
  if(!currentUser) { showToast('Please login to like'); return; }
  const post = posts.find(p => p.id === postId);
  if(!post) return;
  const idx = post.likedBy.indexOf(currentUser);
  if(idx >= 0){
    post.likedBy.splice(idx,1);
    if(users[post.user] && users[post.user].stats) users[post.user].stats.likes = Math.max(0, users[post.user].stats.likes - 1);
  } else {
    post.likedBy.push(currentUser);
    if(users[post.user]){
      if(!users[post.user].stats) users[post.user].stats = {posts:0,likes:0,comments:0};
      users[post.user].stats.likes = (users[post.user].stats.likes || 0) + 1;
    }
  }
  savePosts(); saveUsers(); renderPosts(); renderProfilePosts(); updateCounts();
}
function toggleCommentsArea(postId){
  const el = document.getElementById('comments-area-' + postId);
  if(!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function addComment(postId){
  if(!currentUser) { showToast('Please login to comment'); return; }
  const input = document.getElementById('comment-input-' + postId);
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;
  const post = posts.find(p => p.id === postId);
  if(!post) return;
  post.comments.push({ user: currentUser, text, at: new Date().toISOString() });
  if(!users[currentUser].stats) users[currentUser].stats = {posts:0,likes:0,comments:0};
  users[currentUser].stats.comments = (users[currentUser].stats.comments || 0) + 1;
  savePosts(); saveUsers();
  input.value = '';
  renderPosts(); renderProfilePosts(); showToast('💬 Comment added');
}
function onEditPost(postId){
  const post = posts.find(p => p.id === postId);
  if(!post || post.user !== currentUser) return showToast('Cannot edit');
  const newText = prompt('Edit your post', post.text);
  if(newText === null) return;
  post.text = newText;
  post.editedAt = new Date().toISOString();
  savePosts(); renderPosts(); renderProfilePosts(); showToast('✏️ Post edited');
}
function onDeletePost(postId){
  const idx = posts.findIndex(p => p.id === postId);
  if(idx === -1) return;
  if(posts[idx].user !== currentUser) return showToast('Cannot delete');
  if(!confirm('Delete this post?')) return;
  posts.splice(idx,1);
  if(users[currentUser] && users[currentUser].stats) users[currentUser].stats.posts = Math.max(0, users[currentUser].stats.posts - 1);
  savePosts(); saveUsers(); renderPosts(); renderProfilePosts(); showToast('🗑 Post deleted'); updateCounts();
}

/* -----------------------
   Profile functions
   ----------------------- */
function showProfile(username){
  if(!username) username = currentUser;
  if(!users[username]) return showToast('User not found');
  showPage('profile');
  refreshProfileUI(username);
  renderProfilePosts(username);
}
function refreshProfileUI(viewUser){
  const u = viewUser || currentUser;
  if(!u) return;
  const userObj = users[u] || {bio:'',pic:''};
  const pic = userObj.pic || `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(u)}`;
  document.getElementById('miniUser').textContent = u;
  document.getElementById('miniBio').textContent = userObj.bio || '';
  document.getElementById('composerAvatar').src = pic;
  document.getElementById('miniPic').src = pic;
  document.getElementById('miniPicRight').src = pic;
  document.getElementById('profilePicBig').src = pic;
  document.getElementById('profileUser').textContent = u;
  document.getElementById('profileUserRight').textContent = u;
  document.getElementById('profileBioMini').textContent = userObj.bio || "No bio yet";
  document.getElementById('profileBioMiniRight').textContent = userObj.bio || "No bio yet";
  document.getElementById('profileUsername').value = u;
  document.getElementById('bio').value = userObj.bio || '';

  if(!users[u].stats) users[u].stats = {posts:0,likes:0,comments:0};
  const postsCount = users[u].stats.posts || 0;
  const likes = users[u].stats.likes || 0;
  const comments = users[u].stats.comments || 0;
  document.getElementById('statPosts').textContent = postsCount;
  document.getElementById('statLikes').textContent = likes;
  document.getElementById('statComments').textContent = comments;
  document.getElementById('statPostsRight').textContent = postsCount;
  document.getElementById('statLikesRight').textContent = likes;
  document.getElementById('statCommentsRight').textContent = comments;

  const profilePosts = posts.filter(p => p.user === u).length;
  document.getElementById('profilePostCount').textContent = profilePosts;
}

/* profile bio/pic */
function updateBio(){
  const val = document.getElementById('bio').value.trim();
  if(!currentUser) return showToast('No current user');
  users[currentUser].bio = val;
  saveUsers(); renderPosts(); refreshProfileUI(); showToast('✏️ Bio updated!');
}
function updateProfilePic(e){
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    users[currentUser].pic = reader.result;
    saveUsers(); refreshProfileUI(); renderPosts(); showToast('🖼️ Profile picture updated'); renderProfilePosts();
  }
  reader.readAsDataURL(f);
}

/* -----------------------
   Profile grid rendering
   ----------------------- */
function renderProfilePosts(viewUser){
  const u = viewUser || currentUser;
  if(!u) return;
  const grid = document.getElementById('profileGrid');
  grid.innerHTML = '';
  const userPosts = posts.filter(p => p.user === u);
  document.getElementById('profilePostCount').textContent = userPosts.length;
  userPosts.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'grid-item';
    if(p.image){
      div.innerHTML = `<img src="${p.image}" alt="post">`;
    } else {
      div.innerHTML = `<div style="padding:12px"><div style="font-weight:700;color:var(--muted)">${escapeHtml((p.text||'').slice(0,120) || '(no image)')}</div></div>`;
    }
    div.onclick = ()=> openPostModal(p);
    grid.appendChild(div);
  });
}

/* modal */
function openPostModal(post){
  const modalRoot = document.getElementById('viewModal');
  const likedText = post.likedBy.includes(currentUser) ? '💔 Unlike' : '❤️ Like';
  const avatar = (users[post.user] && users[post.user].pic) ? users[post.user].pic : `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(post.user)}`;

  modalRoot.innerHTML = `
    <div class="modal" id="modal-${post.id}">
      <div class="modal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-weight:700">${escapeHtml(post.user)}</div>
            <div style="font-size:12px;color:var(--muted)">${new Date(post.createdAt).toLocaleString()} ${post.editedAt ? '(edited)' : ''}</div>
          </div>
          <div><button class="small-btn" onclick="closePostModal(${post.id})">Close</button></div>
        </div>
        <div style="margin-bottom:8px;color:var(--white)">${escapeHtml(post.text)}</div>
        ${post.image ? `<img src="${post.image}" alt="post image" style="max-width:100%;border-radius:8px">` : ''}
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center;">
          <button onclick="toggleLike(${post.id})">${likedText} (${post.likedBy.length})</button>
          <button onclick="toggleCommentsArea(${post.id})">💬 Comments (${post.comments.length})</button>
        </div>
        <div id="modal-comments-${post.id}" style="margin-top:8px">
          ${(post.comments || []).map(c=>`<div style="padding:6px 0"><strong>@${escapeHtml(c.user)}</strong>: ${escapeHtml(c.text)}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
  modalRoot.style.display = 'block';
}
function closePostModal(id){
  const modalRoot = document.getElementById('viewModal');
  modalRoot.innerHTML = '';
  modalRoot.style.display = 'none';
}
function openPostModalById(id){
  const post = posts.find(p => p.id === id);
  if(post) openPostModal(post);
}

/* -----------------------
   Search / counts
   ----------------------- */
function onSearchChange(e){
  const val = e.target.value.trim();
  renderPosts(val);
}
function updateCounts(){
  if(!currentUser) return;
  const pCount = posts.filter(p=>p.user === currentUser).length;
  const likeCount = posts.filter(p => p.user === currentUser).reduce((s,p)=>s + p.likedBy.length,0);
  const commentCount = posts.reduce((s,p)=> s + p.comments.filter(c=>c.user === currentUser).length,0);
  if(!users[currentUser].stats) users[currentUser].stats = {posts:0,likes:0,comments:0};
  users[currentUser].stats.posts = pCount;
  users[currentUser].stats.likes = likeCount;
  users[currentUser].stats.comments = commentCount;
  saveUsers();
  refreshProfileUI();
}

/* -----------------------
   Logout / compose
   ----------------------- */
function logout(){
  if(!confirm('Are you sure you want to logout?')) return;
  setCurrent(null);
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('authWrap').style.display = 'flex';
  showToast('👋 Logged out successfully.');
}
function enterCompose(){
  showPage('feed');
  document.getElementById('txtPost').focus();
}

/* helpers */
function escapeHtml(str){
  if(!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

/* wire profile pic input */
document.addEventListener('change', (e)=>{
  if(e.target && e.target.id === 'profilePicInput') updateProfilePic(e);
});

/* ensure stats exist */
(function ensureUserStats(){ Object.keys(users).forEach(u=>{ if(!users[u].stats) users[u].stats = {posts:0,likes:0,comments:0}; }); saveUsers(); })();

/* auto login if current user in storage */
(function init(){
  const cur = localStorage.getItem(LS_CURRENT);
  if(cur && users[cur]){ setCurrent(cur); openApp(); }
  // wire saved market items
  renderMarket();
})();

/* notify dot toggler (demo) */
function toggleNotifDot(btn){
  const d = document.getElementById('notifDot');
  if(d.style.display === 'none' || !d.style.display) { d.style.display='inline-block'; showToast('You have new notifications'); }
  else { d.style.display='none'; showToast('Notifications cleared'); }
}

/* Scroll hide/show nav logic (hidden when scrolling down) */
(function navScrollHandler(){
  let lastY = window.scrollY;
  let ticking = false;
  const navTop = document.getElementById('navTop');
  const navBottom = document.getElementById('navBottom');
  function onScroll(){
    const y = window.scrollY;
    if(y > lastY + 8){ // scrolling down -> hide
      document.body.classList.remove('nav-visible-top'); document.body.classList.add('nav-hidden-top');
      navTop.classList.add('hidden');
      navBottom.classList.add('hidden');
    } else if(y < lastY - 8){ // scrolling up -> show
      document.body.classList.remove('nav-hidden-top'); document.body.classList.add('nav-visible-top');
      navTop.classList.remove('hidden');
      navBottom.classList.remove('hidden');
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', ()=>{ if(!ticking){ window.requestAnimationFrame(onScroll); ticking = true; } }, {passive:true});

  function adaptNav(){
    if(window.innerWidth <= 720){ navTop.style.display='none'; navBottom.style.display='block'; }
    else { navTop.style.display='block'; navBottom.style.display='none'; }
  }
  window.addEventListener('resize', adaptNav);
  adaptNav();
})();

/* storage sync */
window.addEventListener('storage', ()=> { users = JSON.parse(localStorage.getItem(LS_USERS) || '{}'); posts = JSON.parse(localStorage.getItem(LS_POSTS) || '[]'); savedMarket = JSON.parse(localStorage.getItem(LS_SAVED_ITEMS) || '[]'); updateCounts(); });

/* ============================
   EXPLORE (search across posts)
   ============================ */
function renderExplore(){
  const q = document.getElementById('exploreSearch').value.trim().toLowerCase();
  const resultsRoot = document.getElementById('exploreResults');
  resultsRoot.innerHTML = '';
  const filtered = posts.filter(p => {
    if(!q) return true;
    return p.user.toLowerCase().includes(q) || (p.text && p.text.toLowerCase().includes(q));
  });
  document.getElementById('exploreCount').textContent = filtered.length + ' results';
  if(filtered.length === 0){
    resultsRoot.innerHTML = '<div class="panel muted">No results</div>';
    return;
  }
  filtered.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    const userObj = users[p.user] || {bio:'',pic:''};
    const pic = userObj.pic || `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(p.user)}`;
    div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start">
        <img src="${pic}" style="width:48px;height:48px;border-radius:10px;object-fit:cover" />
        <div style="flex:1">
          <div style="display:flex;gap:8px;align-items:center">
            <div style="font-weight:700;cursor:pointer" onclick="showProfile('${escapeHtml(p.user)}')">${escapeHtml(p.user)}</div>
            <div style="font-size:12px;color:var(--muted)">${new Date(p.createdAt).toLocaleString()}</div>
          </div>
          <div style="margin-top:6px">${escapeHtml(p.text)}</div>
          ${p.image ? `<img src="${p.image}" style="margin-top:8px;border-radius:8px;max-width:100%;">` : ''}
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="small-btn" onclick="toggleLike(${p.id})">${p.likedBy.includes(currentUser) ? '💔' : '❤️'} ${p.likedBy.length}</button>
            <button class="small-btn" onclick="openPostModalById(${p.id})">View</button>
          </div>
        </div>
      </div>
    `;
    resultsRoot.appendChild(div);
  });
}

/* ============================
   MARKETPLACE (mini catalog)
   ============================ */
function renderMarket(){
  const q = document.getElementById('marketSearch').value.trim().toLowerCase();
  const root = document.getElementById('marketList');
  root.innerHTML = '';
  const filtered = marketItems.filter(it => {
    if(!q) return true;
    return it.title.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q);
  });
  if(filtered.length === 0){
    root.innerHTML = '<div class="panel muted">No items found</div>';
    return;
  }
  filtered.forEach(it => {
    const el = document.createElement('div');
    el.className = 'card market-card';
    const isSaved = savedMarket.includes(it.id);
    el.innerHTML = `
      <img src="${it.img}" alt="${escapeHtml(it.title)}" />
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(it.title)} <span style="font-weight:600;color:var(--muted);font-size:13px">· ${escapeHtml(it.price)}</span></div>
        <div class="muted" style="margin-top:6px">${escapeHtml(it.desc)}</div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
          <button class="small-btn" onclick="viewMarketItem('${it.id}')">View</button>
          <button class="fav" onclick="toggleSaveItem('${it.id}')">${isSaved ? 'Saved ✓' : 'Save'}</button>
        </div>
      </div>
    `;
    root.appendChild(el);
  });

  renderSavedItems();
}

function viewMarketItem(id){
  const it = marketItems.find(m=>m.id===id);
  if(!it) return;
  const modalRoot = document.getElementById('viewModal');
  modalRoot.innerHTML = `
    <div class="modal">
      <div class="modal-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">${escapeHtml(it.title)} <span class="muted" style="font-weight:600;font-size:13px">· ${escapeHtml(it.price)}</span></div>
          <div><button class="small-btn" onclick="closeMarketModal()">Close</button></div>
        </div>
        <img src="${it.img}" style="width:100%;max-height:320px;object-fit:cover;border-radius:8px;margin-top:8px"/>
        <div style="margin-top:8px">${escapeHtml(it.desc)}</div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="primary" onclick="toggleSaveItem('${it.id}')">${savedMarket.includes(it.id) ? 'Unsave' : 'Save'}</button>
          <button class="small-btn" onclick="fakeBuy('${it.id}')">Buy</button>
        </div>
      </div>
    </div>
  `;
  modalRoot.style.display = 'block';
}
function closeMarketModal(){ document.getElementById('viewModal').innerHTML=''; document.getElementById('viewModal').style.display='none'; }

function fakeBuy(id){
  showToast('🛒 Purchase simulated — this is a demo');
  closeMarketModal();
}

function toggleSaveItem(id){
  const idx = savedMarket.indexOf(id);
  if(idx >= 0){
    savedMarket.splice(idx,1);
    showToast('Removed from saved items');
  } else {
    savedMarket.unshift(id);
    showToast('Saved to your items');
  }
  saveSavedItems();
  renderMarket();
  renderSavedItems();
}

function renderSavedItems(){
  const root = document.getElementById('savedList');
  const count = document.getElementById('savedCount');
  root.innerHTML = '';
  count.textContent = savedMarket.length + ' saved';
  if(savedMarket.length === 0){ root.innerHTML = '<div class="muted">No saved items yet</div>'; return; }
  savedMarket.forEach(id => {
    const it = marketItems.find(m=>m.id===id);
    if(!it) return;
    const div = document.createElement('div');
    div.className = 'grid-item';
    div.innerHTML = `<img src="${it.img}" alt="${escapeHtml(it.title)}"/><div style="position:absolute;left:8px;bottom:8px;color:var(--white);font-weight:700">${escapeHtml(it.title)}</div>`;
    div.onclick = ()=> viewMarketItem(it.id);
    root.appendChild(div);
  });
}

/* ============================
   Saved helpers / initialization
   ============================ */
function ensureSavedInit(){ if(!Array.isArray(savedMarket)) savedMarket = []; }
ensureSavedInit();

/* small helper to open profile editing (simple UX) */
function enterEditProfile(){
  showPage('profile');
  document.getElementById('bio').focus();
}
function cancelEditProfile(){
  if(currentUser && users[currentUser]) document.getElementById('bio').value = users[currentUser].bio || '';
  showToast('Edit cancelled');
}

// expose some to window for inline handlers
window.showPage = showPage;
window.onRegister = onRegister;
window.onLogin = onLogin;
window.onCreatePost = onCreatePost;
window.clearDraft = clearDraft;
window.saveDraft = saveDraft;
window.enterCompose = enterCompose;
window.logout = logout;
window.toggleNotifDot = toggleNotifDot;
window.toggleLike = toggleLike;
window.toggleCommentsArea = toggleCommentsArea;
window.addComment = addComment;
window.onEditPost = onEditPost;
window.onDeletePost = onDeletePost;
window.showProfile = showProfile;
window.updateBio = updateBio;
window.updateProfilePic = updateProfilePic;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.openPostModalById = openPostModalById;
window.toggleSaveItem = toggleSaveItem;
window.viewMarketItem = viewMarketItem;

// persist market array if it's default and not already in storage
saveMarketState();
