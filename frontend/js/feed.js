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
    var isLiked = p.isLiked || p.is_liked || false;
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
      (p.note ? '<div style="margin-top:12px;font-size:1.1rem;font-weight:800;color:var(--purple-l);">' + esc(p.note) + '</div>' : '') +
      '<div style="margin-top:8px;font-size:0.95rem;white-space:pre-wrap;">' + esc(p.caption) + '</div>' + images +
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

// Post Sheet and Submission Logic
var postPhotos = [];

function openPostSheet() {
  var sheet = document.getElementById('post-sheet');
  if (sheet) sheet.classList.add('open');
}
window.openPostSheet = openPostSheet;

function closePostSheet(e) {
  var sheet = document.getElementById('post-sheet');
  if (sheet && (!e || e.target === sheet)) {
    sheet.classList.remove('open');
    resetPostForm();
  }
}
window.closePostSheet = closePostSheet;

function resetPostForm() {
  var note = document.getElementById('post-note'); if (note) note.value = '';
  var cap = document.getElementById('post-caption'); if (cap) cap.value = '';
  var verix = document.getElementById('post-verification'); if (verix) verix.value = '';
  postPhotos = [];
  renderPostPhotoPreview();
}

function requestMediaAccess() {
  var popup = document.getElementById('media-popup');
  if (popup) popup.classList.add('open');
}
window.requestMediaAccess = requestMediaAccess;

function closeMediaPopup(e) {
  var popup = document.getElementById('media-popup');
  if (popup && (!e || e.target === popup)) {
    popup.classList.remove('open');
  }
}
window.closeMediaPopup = closeMediaPopup;

function grantFullAccess() {
  closeMediaPopup();
  document.getElementById('post-photo-input').click();
}
window.grantFullAccess = grantFullAccess;

function grantLimitedAccess() {
  closeMediaPopup();
  document.getElementById('post-photo-input').click();
}
window.grantLimitedAccess = grantLimitedAccess;

function previewPostPhoto(input) {
  if (input.files) {
    Array.from(input.files).forEach(file => {
      postPhotos.push(file);
    });
    renderPostPhotoPreview();
  }
}
window.previewPostPhoto = previewPostPhoto;

function renderPostPhotoPreview() {
  var container = document.getElementById('post-photo-preview');
  var header = document.getElementById('post-photo-header');
  if (!container || !header) return;

  if (postPhotos.length > 0) {
    container.style.display = 'flex';
    header.style.display = 'flex';
    container.innerHTML = postPhotos.map((file, idx) => {
      var url = URL.createObjectURL(file);
      return '<div style="position:relative;flex-shrink:0;width:80px;height:80px;">' +
                '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>' +
                '<div onclick="removeSpecificPhoto(' + idx + ')" style="position:absolute;top:-5px;right:-5px;background:var(--red);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">&times;</div>' +
              '</div>';
    }).join('');
  } else {
    container.style.display = 'none';
    header.style.display = 'none';
  }
}

function removePostPhoto() {
  postPhotos = [];
  renderPostPhotoPreview();
}
window.removePostPhoto = removePostPhoto;

function removeSpecificPhoto(idx) {
  postPhotos.splice(idx, 1);
  renderPostPhotoPreview();
}
window.removeSpecificPhoto = removeSpecificPhoto;

async function submitPost() {
  var note = document.getElementById('post-note').value.trim();
  var caption = document.getElementById('post-caption').value.trim();
  var visibility = document.getElementById('post-visibility').value;
  var verification = document.getElementById('post-verification').value.trim();

  if (!note && !caption && postPhotos.length === 0) {
    return toast('Please add a headline, caption, or photos', 'error');
  }

  var btn = document.querySelector('#post-sheet .btn-primary');
  var originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    var formData = new FormData();
    formData.append('note', note);
    formData.append('caption', caption);
    formData.append('visibility', visibility);
    formData.append('verificationLink', verification);
    
    postPhotos.forEach(file => {
      formData.append('images', file);
    });

    var r = await fetch(API + '/posts', {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });

    if (r.ok) {
      toast('Success! Post shared.', 'success');
      closePostSheet();
      loadFeed();
    } else {
      var d = await r.json();
      throw new Error(d.error || 'Post failed');
    }
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}
window.submitPost = submitPost;
