// Main Application Logic and Navigation

function goScreen(s) {
  document.querySelectorAll('.screen').forEach(function(el) { el.classList.remove('active'); });
  var target = document.getElementById('screen-' + s);
  if (target) target.classList.add('active');
}

function switchTab(t) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('tab-' + t);
  if (btn) btn.classList.add('active');
  
  if (t === 'login') {
    document.getElementById('form-login-email').style.display = 'block';
    document.getElementById('form-signup-email').style.display = 'none';
  } else {
    document.getElementById('form-login-email').style.display = 'none';
    document.getElementById('form-signup-email').style.display = 'block';
  }
}

function switchTab2(tab) {
  document.querySelectorAll('.nav-tab').forEach(function (b) { b.classList.remove('active'); });
  var btn = document.getElementById('nav-' + tab);
  if (btn) btn.classList.add('active');
  
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var screen = document.getElementById('screen-' + tab);
  if (screen) screen.classList.add('active');
  
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.add('visible');
  
  if (tab === 'home') loadFeed();
  if (tab === 'chat') { if (typeof loadConversations === 'function') loadConversations(); }
  if (tab === 'discover') { if (typeof loadSuggestions === 'function') loadSuggestions(); }
  if (tab === 'profile') { if (typeof loadProfile === 'function') loadProfile(); }
  if (tab === 'connections') { if (typeof loadConnections === 'function') loadConnections(); }
  if (tab === 'meetups') {
    if (typeof switchMeetupsTab === 'function') switchMeetupsTab('events');
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

async function showUserInfoCard(id) {
  var modal = document.getElementById('user-info-modal');
  if (!modal) return;

  try {
    var r = await fetch(API + '/profile/' + id, { headers: authHeaders() });
    var u = await r.json();
    if (!r.ok) throw new Error(u.error);

    var avatarDiv = document.getElementById('modal-user-avatar') || document.getElementById('infocard-avatar');
    if (avatarDiv) avatarDiv.innerHTML = (typeof avatarEl === 'function' ? avatarEl(u) : '?');

    var nameDiv = document.getElementById('modal-user-name') || document.getElementById('infocard-name');
    if (nameDiv) nameDiv.textContent = u.name;

    var idDiv = document.getElementById('modal-user-id') || document.getElementById('infocard-id');
    if (idDiv) idDiv.textContent = 'ID: ' + (u.short_id || u.shortId || '--');

    var locDiv = document.getElementById('modal-user-location') || document.getElementById('infocard-location');
    if (locDiv) locDiv.textContent = u.location || 'Location hidden';

    var bioDiv = document.getElementById('modal-user-bio') || document.getElementById('infocard-bio');
    if (bioDiv) bioDiv.textContent = u.bio || 'No bio provided';

    var skillsList = document.getElementById('modal-user-skills') || document.getElementById('infocard-skills');
    if (skillsList) {
      if (u.skills && u.skills.length) {
        skillsList.innerHTML = u.skills.map(function(s) {
          return '<span class="pill" style="font-size:0.75rem;padding:4px 10px;">' + (typeof skillEmoji === 'function' ? skillEmoji(s.name) : '') + ' ' + esc(s.name) + '</span>';
        }).join('');
      } else {
        skillsList.innerHTML = '<span style="color:var(--text2);font-size:0.8rem;">No skills listed</span>';
      }
    }

    var btnWrap = document.getElementById('modal-user-action-btn') || document.getElementById('infocard-connect-btn');
    if (btnWrap) {
      var status = u.connectionStatus || u.connection_status || 'none';
      if (id === userId) {
        btnWrap.innerHTML = '<button class="btn btn-secondary btn-sm" onclick="switchTab2(\'profile\');closeUserInfoModal();">Edit My Profile</button>';
      } else if (status === 'connected') {
        btnWrap.innerHTML = '<button class="btn btn-primary btn-sm" onclick="startChatWith(\'' + u.id + '\', \'' + esc(u.name) + '\');closeUserInfoModal();">Message</button>';
      } else if (status === 'requested') {
        btnWrap.innerHTML = '<button class="btn btn-secondary btn-sm" disabled>Request Sent</button>';
      } else if (status === 'pending') {
        btnWrap.innerHTML = '<button class="btn btn-primary btn-sm" onclick="switchTab2(\'connections\');closeUserInfoModal();">Respond to Request</button>';
      } else {
        btnWrap.innerHTML = '<button class="btn btn-primary btn-sm" onclick="requestConnection(\'' + u.id + '\');">Connect</button>';
      }
    }

    modal.style.display = 'flex';
  } catch (err) { 
    toast(err.message, 'error'); 
    closeUserInfoModal();
  }
}

function closeUserInfoModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  var modal = document.getElementById('user-info-modal');
  if (modal) modal.style.display = 'none';
}

window.showUserInfoCard = showUserInfoCard;
window.closeUserInfoModal = closeUserInfoModal;

function goAuth(mode) {
  goScreen('auth');
  switchTab(mode);
}

// Initial Setup
(function init() {
  if (token && userId) {
    if (typeof initSocket === 'function') initSocket();
    switchTab2('home');
  } else {
    goScreen('landing');
  }
  
  // Handle deep links
  var params = new URLSearchParams(window.location.search);
  var deepId = params.get('id');
  if (deepId && token && userId) {
    setTimeout(function() {
      const input = document.getElementById('connect-id-input');
      if (input) { 
        input.value = deepId; 
        if (typeof findUser === 'function') findUser(); 
      }
    }, 1000);
  }
})();

// UI Helpers for sheets
function openCreateEventSheet() { document.getElementById('create-event-sheet').classList.add('open'); if (typeof initVenueAutocomplete === 'function') initVenueAutocomplete(); }
function closeCreateEventSheet(e) { if (!e || e.target === document.getElementById('create-event-sheet')) document.getElementById('create-event-sheet').classList.remove('open'); }
function openCreateCommunitySheet() { document.getElementById('create-community-sheet').classList.add('open'); }
function closeCreateCommunitySheet(e) { if (!e || e.target === document.getElementById('create-community-sheet')) document.getElementById('create-community-sheet').classList.remove('open'); }
function openSettingsSheet() { document.getElementById('settings-sheet').classList.add('open'); }
function closeSettingsSheet(e) { if (!e || e.target === document.getElementById('settings-sheet')) document.getElementById('settings-sheet').classList.remove('open'); }
function openSecuritySheet() { document.getElementById('security-sheet').classList.add('open'); }
function closeSecuritySheet(e) { if (!e || e.target === document.getElementById('security-sheet')) document.getElementById('security-sheet').classList.remove('open'); }

function openWallpaperSheet() { if (typeof currentConvId !== 'undefined' && currentConvId) document.getElementById('wallpaper-sheet').classList.add('open'); }
function closeWallpaperSheet(e) { if (!e || e.target === document.getElementById('wallpaper-sheet')) document.getElementById('wallpaper-sheet').classList.remove('open'); }

function openStickersSheet() { document.getElementById('stickers-sheet').classList.add('open'); }
function closeStickersSheet(e) { if (!e || e.target === document.getElementById('stickers-sheet')) document.getElementById('stickers-sheet').classList.remove('open'); }

function openMediaPreview(src) {
  var modal = document.getElementById('media-preview-modal');
  var img = document.getElementById('media-preview-img');
  if (modal && img) {
    img.src = src;
    modal.style.display = 'flex';
  }
}

function closeMediaPreview() {
  var modal = document.getElementById('media-preview-modal');
  if (modal) modal.style.display = 'none';
}
