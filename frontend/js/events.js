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
      var btns = ev.creator_id === userId ? '<button class="btn btn-ghost btn-xs" onclick="viewPendingRsvps(\'' + ev.id + '\')">Manage RSVPs</button>' : (ev.my_rsvp_status === 'pending' ? '<button class="btn btn-secondary btn-xs" onclick="requestRsvp(\'' + ev.id + '\')">Cancel</button>' : (ev.my_rsvp_status === 'accepted' ? '✅ Going' : '<button class="btn btn-primary btn-xs" onclick="requestRsvp(\'' + ev.id + '\')">Join</button>'));
      return '<div class="card" id="event-card-' + ev.id + '"><h3>' + esc(ev.title) + '</h3><div style="font-size:0.8rem;color:var(--purple-l);">' + dt + ' • ' + esc(ev.venue_name || 'No venue') + '</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;"><span>By ' + esc(ev.creator_name) + '</span>' + btns + '</div></div>';
    }).join('');
  } catch (err) { el.innerHTML = '<div style="color:var(--red);">' + esc(err.message) + '</div>'; }
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
    toast('Event published!', 'success'); closeCreateEventSheet(); loadEvents();
  } catch (err) { toast(err.message, 'error'); } finally { btn.innerHTML = 'Publish Notice'; btn.disabled = false; }
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
      var btn = c.is_member ? '<button class="btn btn-secondary btn-xs" onclick="joinCommunity(\'' + c.id + '\')">Leave</button>' : '<button class="btn btn-primary btn-xs" onclick="joinCommunity(\'' + c.id + '\')">Join</button>';
      return '<div class="card" style="display:flex;align-items:center;gap:12px;"><div class="avatar av-md">#</div><div style="flex:1;"><strong>' + esc(c.name) + '</strong><br><small>' + c.member_count + ' members</small></div>' + btn + '</div>';
    }).join('');
  } catch (err) { el.innerHTML = '<div style="color:var(--red);">' + esc(err.message) + '</div>'; }
}

async function joinCommunity(id) {
  try {
    var r = await fetch(API + '/communities/' + id + '/join', { method: 'POST', headers: authHeaders() });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error); }
    loadCommunities();
  } catch (err) { toast(err.message, 'error'); }
}

async function handleRsvp(targetUserId, status) {
  if (!activeEventId) return;
  try {
    var r = await fetch(API + '/events/' + activeEventId + '/rsvp/' + targetUserId, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ status }) });
    if (!r.ok) { var d = await r.json(); throw new Error(d.error); }
    toast('Request ' + status, 'success'); viewPendingRsvps(activeEventId);
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
