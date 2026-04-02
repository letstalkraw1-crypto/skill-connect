// Profile Management and Endorsements
var activeSharePostId = null;
var selectedSkillToAdd = null;
var selectedSkillBtn = null;

async function loadProfile() {
  try {
    var r = await fetch(API + '/profile/' + userId, { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    renderProfile(d);
  } catch (err) { toast(err.message, 'error'); }
}

function renderProfile(u) {
  var avWrap = document.getElementById('profile-avatar-wrap');
  if (avWrap) avWrap.innerHTML = avatarEl(u);
  var nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = u.name;
  var bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.textContent = u.bio || 'New athlete on Collabro';
  var locEl = document.getElementById('profile-location');
  if (locEl) locEl.textContent = u.location || 'Secret Location';
  var sidEl = document.getElementById('profile-short-id');
  if (sidEl) sidEl.textContent = u.short_id || u.shortId || '--';
  var slEl = document.getElementById('profile-share-link');
  if (slEl) slEl.textContent = window.location.origin + '/?id=' + (u.short_id || u.shortId || u.id);
  var ccEl = document.getElementById('conn-count');
  if (ccEl) ccEl.textContent = u.connection_count || u.connectionCount || 0;
  
  // Sync edit fields
  var en = document.getElementById('edit-name'); if (en) en.value = u.name || '';
  var eb = document.getElementById('edit-bio'); if (eb) eb.value = u.bio || '';
  var el = document.getElementById('edit-location'); if (el) el.value = u.location || '';
  var es = document.getElementById('edit-strava'); if (es) es.value = u.strava_id || u.stravaId || '';
  var ei = document.getElementById('edit-instagram'); if (ei) ei.value = u.instagram_id || u.instagramId || '';
  
  var sList = document.getElementById('my-skills-list');
  if (sList) {
    if (u.skills && u.skills.length) {
      sList.innerHTML = u.skills.map(function(s) {
        return '<div class="skill-pill-large"><span>' + (typeof skillEmoji === 'function' ? skillEmoji(s.name) : '') + ' ' + esc(s.name) + '</span><span onclick="removeSkill(\'' + (s.skill_id || s.skillId) + '\')" style="margin-left:8px;opacity:.5;cursor:pointer;">&times;</span></div>';
      }).join('');
    } else { sList.innerHTML = '<div style="color:var(--text2);padding:10px;">No skills added yet</div>'; }
  }
  
  if (typeof generateQR === 'function') generateQR(window.location.origin + '/?id=' + (u.short_id || u.shortId || u.id));
  loadVerifications(); loadEndorsements();
  if (typeof populateVerificationSkills === 'function') populateVerificationSkills(u.skills || []);
}

async function saveBasicInfo() {
  try {
    var p = { name: document.getElementById('edit-name').value, bio: document.getElementById('edit-bio').value, location: document.getElementById('edit-location').value };
    var r = await fetch(API + '/profile/' + userId, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(p) });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Profile updated!', 'success'); renderProfile(d);
  } catch (err) { toast(err.message, 'error'); }
}

async function saveSocialLinks() {
  try {
    var p = { strava_id: document.getElementById('edit-strava').value, garmin_id: document.getElementById('edit-garmin').value, instagram_id: document.getElementById('edit-instagram').value };
    var r = await fetch(API + '/profile/' + userId, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(p) });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Links saved!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function addSkill() {
  if (!selectedSkillToAdd) return;
  var proficiency = document.getElementById('skill-level-select') ? document.getElementById('skill-level-select').value : 'Beginner';
  try {
    var r = await fetch(API + '/profile/skills', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ skills: [{ name: selectedSkillToAdd, proficiency: proficiency }] }) });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Skill added!', 'success');
    selectedSkillToAdd = null;
    if (selectedSkillBtn) { selectedSkillBtn.classList.remove('active'); selectedSkillBtn = null; }
    document.getElementById('skill-level-wrap').style.display = 'none';
    document.getElementById('btn-add-skill').style.display = 'none';
    loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

async function removeSkill(skillId) {
  try {
    var r = await fetch(API + '/profile/skills/' + skillId, { method: 'DELETE', headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Skill removed', 'info'); loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

function renderVerifications(verifications) {
  var el = document.getElementById('verifications-list');
  if (!el) return;
  if (!verifications.length) { el.innerHTML = '<span style="color:var(--text2);font-size:.9rem;">No verifications submitted</span>'; return; }
  el.innerHTML = verifications.map(function (v) { 
    var statusIcon = v.status === 'verified' ? '✅' : v.status === 'pending' ? '⏳' : '❌';
    return '<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><strong>' + esc(v.skillName || v.skill_name) + '</strong> - ' + esc(v.verificationType || v.verification_type) + ' ' + statusIcon + '<br><small>' + esc(v.url || '') + '</small></div>';
  }).join('');
}

async function loadVerifications() {
  try {
    var r = await fetch(API + '/profile/verifications', { headers: authHeaders() });
    var d = await r.json(); if (r.ok) renderVerifications(d);
  } catch (err) {}
}

function renderEndorsements(endorsements) {
  var el = document.getElementById('endorsements-list');
  if (!el) return;
  if (!endorsements.length) { el.innerHTML = '<span style="color:var(--text2);font-size:.9rem;">No endorsements received</span>'; return; }
  el.innerHTML = endorsements.map(function (e) { 
    return '<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><strong>' + esc(e.endorserName || e.endorser_name) + '</strong> endorsed <strong>' + esc(e.skillName || e.skill_name) + '</strong><br><small>' + esc(e.comment || '') + '</small></div>';
  }).join('');
}

async function loadEndorsements() {
  try {
    var r = await fetch(API + '/profile/' + userId + '/endorsements');
    var d = await r.json(); if (r.ok) renderEndorsements(d);
  } catch (err) {}
}

function generateQR(url) {
  var el = document.getElementById('profile-qr');
  if (!el || !window.QRCode) return;
  el.innerHTML = '';
  new QRCode(el, { text: url, width: 140, height: 140, colorDark: "#ffffff", colorLight: "#00000000", correctLevel: QRCode.CorrectLevel.H });
}
