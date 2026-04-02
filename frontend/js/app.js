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
  var btn = document.querySelector('[onclick="switchTab2(\'' + tab + '\')"]');
  if (btn) btn.classList.add('active');
  
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var screen = document.getElementById('screen-' + tab);
  if (screen) screen.classList.add('active');
  
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.add('visible');
  
  if (tab === 'home') loadFeed();
  if (tab === 'chat') loadConversations();
  if (tab === 'discover') loadSuggestions();
  if (tab === 'profile') loadProfile();
  if (tab === 'meetups') {
    if (typeof switchMeetupsTab === 'function') switchMeetupsTab('events');
  }
}

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
