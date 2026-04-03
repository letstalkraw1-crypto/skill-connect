// Meetups, Events, and Communities logic
var venueLatLng = null;

async function loadEvents() {
  var el = document.getElementById('events-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/events', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    if (!d.length) { el.innerHTML = '<div style="text-align:center;color:var(--text2);padding:24px;">No upcoming events</div>'; return; }
    el.innerHTML = d.map(function (ev) {
      var dt = new Date(ev.datetime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      var btns = ev.creator_id === userId ? '<button class="btn btn-ghost btn-xs" onclick="viewPendingRsvps(\'' + (ev._id || ev.id) + '\')">Manage RSVPs</button>' : (ev.my_rsvp_status === 'pending' ? '<button class="btn btn-secondary btn-xs" onclick="requestRsvp(\'' + (ev._id || ev.id) + '\')">Cancel</button>' : (ev.my_rsvp_status === 'accepted' ? '✅ Going' : '<button class="btn btn-primary btn-xs" onclick="requestRsvp(\'' + (ev._id || ev.id) + '\')">Join</button>'));
      return '<div class="card" id="event-card-' + (ev._id || ev.id) + '">' +
             '<h3 style="cursor:pointer;" onclick="showEventInfoCard(\'' + (ev._id || ev.id) + '\')">' + esc(ev.title) + '</h3>' +
             '<div style="font-size:0.8rem;color:var(--purple-l);">' + dt + ' • ' + esc(ev.venue_name || 'No venue') + '</div>' +
             '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
               '<span>By <strong style="cursor:pointer;" onclick="showUserInfoCard(\'' + ev.creator_id + '\')">' + esc(ev.creator_name) + '</strong></span>' + 
               btns + 
             '</div>' +
           '</div>';
    }).join('');
  } catch (err) { el.innerHTML = '<div style="color:var(--red);">' + esc(err.message) + '</div>'; }
}

function switchMeetupsTab(tab) {
  var evtBtn = document.getElementById('tab-btn-events');
  var comBtn = document.getElementById('tab-btn-communities');
  var evtView = document.getElementById('meetups-events-view');
  var comView = document.getElementById('meetups-communities-view');

  if (tab === 'events') {
    if (evtBtn) evtBtn.classList.add('active');
    if (comBtn) comBtn.classList.remove('active');
    if (evtView) evtView.style.display = 'block';
    if (comView) comView.style.display = 'none';
    loadEvents();
  } else {
    if (comBtn) comBtn.classList.add('active');
    if (evtBtn) evtBtn.classList.remove('active');
    if (comView) comView.style.display = 'block';
    if (evtView) evtView.style.display = 'none';
    loadCommunities();
  }
}

async function openEventDetails(eventId) {
  // Highlight the event card if it exists, or just toast
  setTimeout(() => {
    var card = document.getElementById('event-card-' + eventId);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.border = '2px solid var(--purple-l)';
      setTimeout(() => card.style.border = '', 3000);
    }
  }, 500);
}

async function requestRsvp(eventId) {
  try {
    var r = await fetch(API + '/events/' + eventId + '/rsvp', { method: 'POST', headers: authHeaders() });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error); }
    loadEvents();
  } catch (err) { toast(err.message, 'error'); }
}

async function submitEvent() {
  var title = document.getElementById('event-title').value.trim();
  var dt = document.getElementById('event-datetime').value;
  var venue = document.getElementById('event-venue').value.trim();
  var guidelines = document.getElementById('event-guidelines').value;
  if (!title || !dt) return toast('Title and date required', 'error');
  var btn = document.querySelector('#create-event-sheet .btn-primary'); btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  try {
    var r = await fetch(API + '/events', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ title, datetime: dt, venue_name: venue, venue_coords: venueLatLng, guidelines }) });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error || 'Failed'); }
    toast('Event published!', 'success'); closeCreateEventSheet(); switchMeetupsTab('events');
  } catch (err) { toast(err.message, 'error'); } finally { btn.innerHTML = 'Publish Notice'; btn.disabled = false; }
}

function openCreateEventSheet() {
  var sheet = document.getElementById('create-event-sheet');
  if (sheet) sheet.classList.add('open');
}

function closeCreateEventSheet(e) {
  if (e && e.target !== e.currentTarget) return;
  var sheet = document.getElementById('create-event-sheet');
  if (sheet) sheet.classList.remove('open');
}

function openCreateCommunitySheet() {
  var sheet = document.getElementById('create-community-sheet');
  if (sheet) sheet.classList.add('open');
}

function closeCreateCommunitySheet(e) {
  if (e && e.target !== e.currentTarget) return;
  var sheet = document.getElementById('create-community-sheet');
  if (sheet) sheet.classList.remove('open');
}

async function submitCommunity() {
  var name = document.getElementById('community-name').value.trim();
  var desc = document.getElementById('community-desc').value.trim();
  if (!name) return toast('Community name required', 'error');
  
  var btn = document.querySelector('#create-community-sheet .btn-primary'); 
  var oldText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
  
  try {
    var r = await fetch(API + '/communities', { 
      method: 'POST', 
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), 
      body: JSON.stringify({ name, description: desc }) 
    });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error || 'Failed'); }
    toast('Community created!', 'success'); 
    closeCreateCommunitySheet(); 
    switchMeetupsTab('communities');
  } catch (err) { toast(err.message, 'error'); } 
  finally { btn.innerHTML = oldText; btn.disabled = false; }
}

async function loadCommunities() {
  var el = document.getElementById('communities-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/communities', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    if (!d.length) { el.innerHTML = '<div style="text-align:center;color:var(--text2);padding:24px;">No communities found</div>'; return; }
    el.innerHTML = d.map(function (c) {
      var btn = c.is_member || c.isMember ? '<button class="btn btn-secondary btn-xs" onclick="joinCommunity(\'' + (c._id || c.id) + '\')">Leave</button>' : '<button class="btn btn-primary btn-xs" onclick="joinCommunity(\'' + (c._id || c.id) + '\')">Join</button>';
      return '<div class="card" style="display:flex;align-items:center;gap:12px;">' +
             '<div class="avatar av-md" onclick="showCommunityInfoCard(\'' + (c._id || c.id) + '\')" style="cursor:pointer;">#</div>' +
             '<div style="flex:1;">' +
               '<strong style="cursor:pointer;" onclick="showCommunityInfoCard(\'' + (c._id || c.id) + '\')">' + esc(c.name) + '</strong><br>' +
               '<small>' + (c.member_count || c.memberCount || 0) + ' members</small>' +
             '</div>' +
             btn +
           '</div>';
    }).join('');
  } catch (err) { el.innerHTML = '<div style="color:var(--red);">' + esc(err.message) + '</div>'; }
}

async function showEventInfoCard(eventId) {
   try {
     var r = await fetch(API + '/events/' + eventId, { headers: authHeaders() });
     var ev = await r.json(); if (!r.ok) throw new Error(ev.error);
     
     // We will reuse the showUserInfoCard style/modal but with different content if needed
     // For now, let's toast details or open a specific modal if it exists
     var dt = new Date(ev.datetime).toLocaleString([], { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
     
     // Creating an ad-hoc modal for event info
     var modal = document.createElement('div');
     modal.className = 'sheet-overlay'; 
     modal.onclick = function(e) { if(e.target === modal) modal.remove(); };
     modal.innerHTML = '<div class="sheet" style="padding:24px;border-radius:24px 24px 0 0;">' +
       '<div class="sheet-handle"></div>' +
       '<h2 style="margin-bottom:8px;">' + esc(ev.title) + '</h2>' +
       '<div style="background:var(--purple-l);color:white;display:inline-block;padding:4px 12px;border-radius:12px;font-weight:800;font-size:0.9rem;margin-bottom:16px;">' + esc(ev.shortCode || ev.short_code || '---') + '</div>' +
       '<div style="margin-bottom:12px;font-size:1rem;">📅 <strong>' + dt + '</strong></div>' +
       '<div style="margin-bottom:12px;font-size:1rem;">📍 <strong>' + esc(ev.venueName || ev.venue_name || 'No Venue') + '</strong></div>' +
       '<div style="margin-bottom:20px;color:var(--text2);font-size:0.95rem;line-height:1.5;">' + esc(ev.guidelines || 'No guidelines provided.') + '</div>' +
       '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;background:var(--card);padding:12px;border-radius:16px;border:1px solid var(--border);">' +
         '<div class="avatar av-sm">' + avatarEl({name: ev.creator_name, avatar_url: ev.creator_avatar}) + '</div>' +
         '<div style="font-size:0.85rem;">Organized by <strong style="cursor:pointer;color:var(--purple-l);" onclick="showUserInfoCard(\'' + ev.creator_id + '\')">' + esc(ev.creator_name) + '</strong></div>' +
       '</div>' +
       '<button class="btn btn-secondary" style="width:100%;" onclick="this.closest(\'.sheet-overlay\').remove()">Close</button>' +
     '</div>';
     document.body.appendChild(modal);
     setTimeout(function() { modal.classList.add('open'); }, 10);
   } catch (err) { toast(err.message, 'error'); }
}

async function showCommunityInfoCard(communityId) {
  try {
     var r = await fetch(API + '/communities/' + communityId, { headers: authHeaders() });
     var c = await r.json(); if (!r.ok) throw new Error(c.error);
     
     var modal = document.createElement('div');
     modal.className = 'sheet-overlay'; 
     modal.onclick = function(e) { if(e.target === modal) modal.remove(); };
     modal.innerHTML = '<div class="sheet" style="padding:24px;border-radius:24px 24px 0 0;">' +
       '<div class="sheet-handle"></div>' +
       '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
         '<div class="avatar av-lg" style="background:var(--grad);color:white;font-weight:900;">#</div>' +
         '<div>' +
           '<h2 style="margin:0;">' + esc(c.name) + '</h2>' +
           '<div style="color:var(--text2);font-size:0.85rem;">' + (c.member_count || c.memberCount || 0) + ' active members</div>' +
         '</div>' +
       '</div>' +
       '<div style="margin-bottom:20px;color:var(--text);font-size:1rem;line-height:1.5;">' + esc(c.description || 'Welcome to this community!') + '</div>' +
       '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;background:var(--card);padding:12px;border-radius:16px;border:1px solid var(--border);">' +
         '<div class="avatar av-sm">' + avatarEl({name: c.creator_name, avatar_url: c.creator_avatar}) + '</div>' +
         '<div style="font-size:0.85rem;">Created by <strong style="cursor:pointer;color:var(--purple-l);" onclick="showUserInfoCard(\'' + c.creator_id + '\')">' + esc(c.creator_name) + '</strong></div>' +
       '</div>' +
       '<button class="btn btn-secondary" style="width:100%;" onclick="this.closest(\'.sheet-overlay\').remove()">Close</button>' +
     '</div>';
     document.body.appendChild(modal);
     setTimeout(function() { modal.classList.add('open'); }, 10);
  } catch (err) { toast(err.message, 'error'); }
}

async function joinCommunity(id) {
  try {
    var r = await fetch(API + '/communities/' + id + '/join', { method: 'POST', headers: authHeaders() });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error); }
    loadCommunities();
  } catch (err) { toast(err.message, 'error'); }
}

var activeEventId = null;

async function viewPendingRsvps(eventId) {
  activeEventId = eventId;
  try {
    var r = await fetch(API + '/events/' + eventId, { headers: authHeaders() });
    var ev = await r.json(); if (!r.ok) throw new Error(ev.error);

    if (!ev.pendingRequests || !ev.pendingRequests.length) {
      return toast('No pending requests for this event');
    }

    var modal = document.createElement('div');
    modal.className = 'sheet-overlay'; 
    modal.onclick = function(e) { if(e.target === modal) modal.remove(); };
    
    var listHtml = ev.pendingRequests.map(function(req) {
      return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;background:var(--card);padding:12px;border-radius:16px;border:1px solid var(--border);">' +
        '<div class="avatar av-md">' + avatarEl({name: req.name, avatar_url: req.avatarUrl}) + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-weight:700;font-size:0.9rem;">' + esc(req.name) + '</div>' +
          '<div style="font-size:0.7rem;color:var(--text2);">' + timeAgo(req.createdAt) + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-primary btn-xs" onclick="handleRsvp(\'' + req.userId + '\', \'accepted\'); this.closest(\'.sheet-overlay\').remove();">Accept</button>' +
          '<button class="btn btn-ghost btn-xs" style="color:var(--red);" onclick="handleRsvp(\'' + req.userId + '\', \'rejected\'); this.closest(\'.sheet-overlay\').remove();">Decline</button>' +
        '</div>' +
      '</div>';
    }).join('');

    modal.innerHTML = '<div class="sheet" style="padding:24px;border-radius:24px 24px 0 0;">' +
      '<div class="sheet-handle"></div>' +
      '<h2 style="margin-bottom:4px;">Pending Join Requests</h2>' +
      '<div style="font-size:0.85rem;color:var(--text2);margin-bottom:20px;">' + esc(ev.title) + '</div>' +
      '<div style="max-height:60vh;overflow-y:auto;margin-bottom:20px;">' + listHtml + '</div>' +
      '<button class="btn btn-secondary" style="width:100%;" onclick="this.closest(\'.sheet-overlay\').remove()">Close</button>' +
    '</div>';
    
    document.body.appendChild(modal);
    setTimeout(function() { modal.classList.add('open'); }, 10);
  } catch (err) { toast(err.message, 'error'); }
}

async function handleRsvp(targetUserId, status) {
  if (!activeEventId) return;
  try {
    var r = await fetch(API + '/events/' + activeEventId + '/rsvp/' + targetUserId, { 
      method: 'PUT', 
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), 
      body: JSON.stringify({ status: status }) 
    });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error); }
    toast('Request ' + status, 'success'); 
    loadEvents();
  } catch (err) { toast(err.message, 'error'); }
}


function initVenueAutocomplete(inputId) {
  var id = inputId || 'event-venue';
  var input = document.getElementById(id);
  if (!input || input._nominatimInit) return;
  input._nominatimInit = true;

  var dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  input.parentNode.style.position = 'relative'; 
  input.parentNode.appendChild(dropdown);

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    var q = input.value.trim();
    if (q.length < 3) { dropdown.style.display = 'none'; return; }
    
    debounceTimer = setTimeout(function() {
      fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=5&addressdetails=1')
        .then(r => r.json()).then(results => {
          if (!results || !results.length) { dropdown.style.display = 'none'; return; }
          
          dropdown.innerHTML = results.map(function(p) {
            var parts = p.display_name.split(',');
            var mainName = parts[0].trim();
            var subName = parts.slice(1).join(',').trim();
            
            return '<div class="autocomplete-item" data-lat="' + p.lat + '" data-lng="' + p.lon + '" data-name="' + esc(p.display_name) + '">' +
              '<div class="icon">📍</div>' +
              '<div class="text">' +
                '<div class="main">' + esc(mainName) + '</div>' +
                '<div class="sub">' + esc(subName) + '</div>' +
              '</div>' +
            '</div>';
          }).join('');

          dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
              e.preventDefault(); 
              input.value = item.dataset.name;
              venueLatLng = { lat: parseFloat(item.dataset.lat), lng: parseFloat(item.dataset.lng) };
              
              var status = document.getElementById('venue-status');
              if (status) status.style.display = 'block'; 
              
              dropdown.style.display = 'none';
            });
          });
          dropdown.style.display = 'block';
        });
    }, 400);
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { dropdown.style.display = 'none'; }, 200);
  });
}
