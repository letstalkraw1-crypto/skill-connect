// Discovery and Search Features
var discoverSkillFilter = 'all';

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

function renderDiscoverCards(users) {
  var el = document.getElementById('discover-results');
  if (!el) return;
  if (!users.length) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">No athletes found</div>'; return; }
  el.innerHTML = users.map(function (u) {
    var skills = (u.skills || []).slice(0, 3).map(function (s) { 
      return '<span class="pill" style="font-size:.7rem;padding:4px 8px;">' + (typeof skillEmoji === 'function' ? skillEmoji(s.name) : '') + ' ' + esc(s.name) + '</span>'; 
    }).join('');
    return '<div class="card" style="margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
      '<div class="avatar av-md" onclick="gotoProfile(\'' + (u.short_id || u.shortId || u.id) + '\')">' + avatarEl(u) + '</div>' +
      '<div style="flex:1;"><div style="font-weight:700;font-size:1rem;cursor:pointer;" onclick="gotoProfile(\'' + (u.short_id || u.shortId || u.id) + '\')">' + esc(u.name) + '</div>' +
      '<div style="font-size:0.8rem;color:var(--text2);">' + esc(u.location || 'Unknown') + '</div></div>' +
      '<button class="btn btn-primary btn-xs" onclick="requestConnection(\'' + u.id + '\')">Connect</button>' +
      '</div><div style="display:flex;flex-wrap:wrap;gap:6px;">' + skills + '</div></div>';
  }).join('');
}

async function requestConnection(targetId) {
  try {
    var r = await fetch(API + '/connections/request', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ targetUserId: targetId })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    toast('Connection request sent!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

