// Discovery and Search Features
var discoverSkillFilter = 'all';

async function searchAthletes() {
  var q = document.getElementById('discover-search-input').value.trim();
  var el = document.getElementById('discover-results');
  if (!el) return;
  
  if (!q) {
    return loadSuggestions();
  }

  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/discover/search?q=' + encodeURIComponent(q), { headers: authHeaders() });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Search failed');
    renderDiscoverCards(d);
  } catch (err) { 
    el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">' + esc(err.message) + '</div>'; 
  }
}

async function loadSuggestions() {
  var el = document.getElementById('discover-results');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/discover/suggestions', { headers: authHeaders() });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    renderDiscoverCards(Array.isArray(d) ? d : (d.users || []));
  } catch (err) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">' + esc(err.message) + '</div>'; }
}

async function searchNearby() {
  var el = document.getElementById('discover-results');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  var radius = document.getElementById('radius-slider').value;
  var url = API + '/discover?radius=' + radius;
  if (discoverSkillFilter !== 'all') url += '&skill=' + discoverSkillFilter;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (pos) { url += '&lat=' + pos.coords.latitude + '&lng=' + pos.coords.longitude; await doDiscover(url, el); },
      async function () { await doDiscover(url, el); }
    );
  } else { await doDiscover(url, el); }
}

async function doDiscover(url, el) {
  try {
    var r = await fetch(url, { headers: authHeaders() });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    renderDiscoverCards(Array.isArray(d) ? d : (d.users || []));
  } catch (err) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">' + esc(err.message) + '</div>'; }
}

function filterSkill(btn) {
  document.querySelectorAll('.chip-row .pill').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  discoverSkillFilter = btn.dataset.skill;
  
  // If a skill is selected, put it in the search box and search
  if (discoverSkillFilter !== 'all') {
    document.getElementById('discover-search-input').value = discoverSkillFilter;
    searchAthletes();
  } else {
    document.getElementById('discover-search-input').value = '';
    loadSuggestions();
  }
}

function renderDiscoverCards(users) {
  var el = document.getElementById('discover-results');
  if (!el) return;
  if (!users.length) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">No athletes found</div>'; return; }
  
  el.innerHTML = users.map(function (u) {
    var skills = (u.skills || []).slice(0, 3).map(function (s) { 
      var sn = s.skillName || s.name || '';
      return '<span class="pill" style="font-size:.7rem;padding:4px 8px;">' + (typeof skillEmoji === 'function' ? skillEmoji(sn) : '') + ' ' + esc(sn) + '</span>'; 
    }).join('');

    var status = u.connectionStatus || u.connection_status || 'none';
    var btnText = 'Connect';
    var btnClass = 'btn-primary';
    var btnDisabled = '';

    if (status === 'requested') {
      btnText = 'Requested';
      btnClass = 'btn-secondary';
      btnDisabled = 'disabled';
    } else if (status === 'connected') {
      btnText = 'Connected';
      btnClass = 'btn-secondary';
      btnDisabled = 'disabled';
    } else if (status === 'pending') {
      btnText = 'Respond';
      btnClass = 'btn-primary';
      btnDisabled = ''; // Allow clicking to go to connections
    }

    var uid = u._id || u.id;
    var clickAction = status === 'pending' ? 'switchTab2(\'connections\')' : 'requestConnection(\'' + uid + '\')';

    return '<div class="card" style="margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
      '<div class="avatar av-md" onclick="showUserInfoCard(\'' + uid + '\')">' + avatarEl(u) + '</div>' +
      '<div style="flex:1;"><div style="font-weight:700;font-size:1rem;cursor:pointer;" onclick="showUserInfoCard(\'' + uid + '\')">' + esc(u.name) + '</div>' +
      '<div style="font-size:0.8rem;color:var(--text2);">' + esc(u.location || 'Unknown') + '</div></div>' +
      '<button id="conn-btn-' + uid + '" class="btn ' + btnClass + ' btn-xs" ' + btnDisabled + ' onclick="' + clickAction + '">' + btnText + '</button>' +
      '</div><div style="display:flex;flex-wrap:wrap;gap:6px;">' + skills + '</div></div>';
  }).join('');
}

async function requestConnection(targetId) {
  var btn = document.getElementById('conn-btn-' + targetId);
  if (btn) {
    btn.textContent = 'Sending...';
    btn.disabled = true;
  }
  try {
    var r = await fetch(API + '/connections/request', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ targetUserId: targetId })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    toast('Connection request sent!', 'success');
    if (btn) {
      btn.textContent = 'Requested';
      btn.className = 'btn btn-outline btn-xs';
    }
  } catch (err) { 
    toast(err.message, 'error'); 
    if (btn) {
      btn.textContent = 'Connect';
      btn.disabled = false;
    }
  }
}

