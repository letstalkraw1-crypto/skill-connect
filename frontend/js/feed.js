// Activity Feed and Social Interactions

async function loadFeed() {
  var el = document.getElementById('feed-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:64px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/posts', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    renderFeed(d);
  } catch (err) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">' + esc(err.message) + '</div>'; }
}

function renderFeed(posts) {
  var el = document.getElementById('feed-list');
  if (!el) return;
  if (!posts || !posts.length) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:64px;">No activities yet.<br>Be the first to post!</div>'; return; }
  el.innerHTML = posts.map(function(p) {
    var isLiked = (p.likes || []).includes(userId);
    var images = '';
    if (p.image_urls) {
      try {
        var urls = typeof p.image_urls === 'string' ? JSON.parse(p.image_urls) : p.image_urls;
        images = urls.map(function(url) { 
          var src = url.startsWith('/') ? API + url : url; 
          return '<img src="' + src + '" style="width:100%;border-radius:12px;margin-top:10px;cursor:pointer;" onclick="openMediaPreview(\'' + src + '\')"/>'; 
        }).join('');
      } catch(e){}
    }
    return '<div class="card" id="post-' + p.id + '">' +
      '<div style="display:flex;justify-content:space-between;">' +
      '<div style="display:flex;gap:10px;align-items:center;">' +
      '<div class="avatar av-md">' + avatarEl(p.author || {name: p.author_name, avatar_url: p.author_avatar}) + '</div>' +
      '<div><div style="font-weight:700;">' + esc(p.author_name) + '</div><div style="font-size:0.75rem;color:var(--text2);">' + timeAgo(p.created_at) + '</div></div>' +
      '</div><i onclick="openPostOptions(\'' + p.id + '\', ' + (p.user_id === userId) + ')" style="cursor:pointer;opacity:.5;">&#8942;</i></div>' +
      '<div style="margin-top:12px;font-size:0.95rem;white-space:pre-wrap;">' + esc(p.caption) + '</div>' + images +
      '<div style="display:flex;gap:20px;margin-top:16px;">' +
      '<div class="feed-stat ' + (isLiked ? 'active' : '') + '" onclick="toggleLike(\'' + p.id + '\', this)"><span>' + (isLiked ? '❤️' : '🤍') + '</span> ' + (p.likes_count || 0) + '</div>' +
      '<div class="feed-stat" onclick="openComments(\'' + p.id + '\')"><span>💬</span> ' + (p.comments_count || 0) + '</div>' +
      '<div class="feed-stat" onclick="openCustomShare(\'' + p.id + '\')"><span>↗️</span> Share</div>' +
      '</div></div>';
  }).join('');
}

async function toggleLike(postId, el) {
  try {
    var r = await fetch(API + '/posts/' + postId + '/like', { method: 'POST', headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    var countEl = el.childNodes[2]; var iconEl = el.childNodes[0];
    if (d.liked) { el.classList.add('active'); iconEl.textContent = '❤️'; } else { el.classList.remove('active'); iconEl.textContent = '🤍'; }
    countEl.textContent = ' ' + d.likes_count;
  } catch (err) { toast(err.message, 'error'); }
}

var activeOptionsPostId = null;
function openPostOptions(postId, isAuthor) {
  activeOptionsPostId = postId;
  var sheet = document.getElementById('post-options-sheet');
  if (sheet) sheet.classList.add('open');
  var authorEl = document.getElementById('post-options-author');
  var viewerEl = document.getElementById('post-options-viewer');
  if (authorEl) authorEl.style.display = isAuthor ? 'flex' : 'none';
  if (viewerEl) viewerEl.style.display = isAuthor ? 'none' : 'flex';
}

function closePostOptionsSheet(e) {
  var sheet = document.getElementById('post-options-sheet');
  if (!e || (sheet && e.target === sheet)) {
    if (sheet) sheet.classList.remove('open');
    activeOptionsPostId = null;
  }
}

async function deletePost() {
  if (!activeOptionsPostId) return;
  try {
    var r = await fetch(API + '/posts/' + activeOptionsPostId, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error || 'Failed'); }
    toast('Post deleted', 'success');
    closePostOptionsSheet(); loadFeed();
  } catch (err) { toast(err.message, 'error'); }
}
