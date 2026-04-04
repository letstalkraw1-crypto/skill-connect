// Profile Management and Endorsements
export var activeSharePostId = null;
export var selectedSkillToAdd = null;
export var selectedSkillBtn = null;

export async function loadProfile() {
  try {
    var r = await fetch(API + '/profile/' + userId, { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    renderProfile(d);
    loadConnections(); // Load connections whenever profile is loaded
  } catch (err) { toast(err.message, 'error'); }
}

export async function loadConnections() {
  var pendingEl = document.getElementById('pending-requests');
  var connectedEl = document.getElementById('connected-list');
  if (!pendingEl && !connectedEl) return;

  try {
    var r = await fetch(API + '/connections/' + userId, { headers: authHeaders() });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error);

    if (pendingEl) {
      var html = '';
      
      // Incoming
      if (d.pending && d.pending.length) {
        html += '<div class="sec-hdr" style="font-size:0.7rem;margin-top:10px;">Requests for you</div>';
        html += d.pending.map(function(c) {
          return '<div class="card" style="margin-bottom:8px;padding:10px;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div class="avatar av-sm" onclick="showUserInfoCard(\'' + c.id + '\')">' + avatarEl(c) + '</div>' +
              '<div style="flex:1;">' +
                '<div style="font-weight:700;font-size:0.88rem;cursor:pointer;" onclick="showUserInfoCard(\'' + c.id + '\')">' + esc(c.name) + '</div>' +
                '<div style="font-size:0.7rem;color:var(--text2);">' + (c.shortId || c.short_id || '') + '</div>' +
              '</div>' +
              '<div style="display:flex;gap:4px;">' +
                '<button class="btn btn-primary btn-xs" onclick="respondRequest(\'' + (c.connectionId || c.connection_id) + '\', \'accept\')">Accept</button>' +
                '<button class="btn btn-secondary btn-xs" onclick="respondRequest(\'' + (c.connectionId || c.connection_id) + '\', \'decline\')">Decline</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      // Outgoing
      if (d.outgoing && d.outgoing.length) {
        html += '<div class="sec-hdr" style="font-size:0.7rem;margin-top:10px;">Your Sent Requests</div>';
        html += d.outgoing.map(function(c) {
          return '<div class="card" style="margin-bottom:8px;padding:10px;opacity:0.8;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div class="avatar av-sm" onclick="showUserInfoCard(\'' + c.id + '\')">' + avatarEl(c) + '</div>' +
              '<div style="flex:1;">' +
                '<div style="font-weight:700;font-size:0.88rem;cursor:pointer;" onclick="showUserInfoCard(\'' + c.id + '\')">' + esc(c.name) + '</div>' +
                '<div style="font-size:0.7rem;color:var(--text2);">Waiting for response</div>' +
              '</div>' +
              '<button class="btn btn-ghost btn-xs" onclick="cancelRequest(\'' + (c.connectionId || c.connection_id) + '\')">Cancel</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      if (!html) html = '<div style="color:var(--text2);font-size:.9rem;padding:12px 0;">No pending requests</div>';
      pendingEl.innerHTML = html;
    }

    if (connectedEl) {
      if (!d.connections || !d.connections.length) {
        connectedEl.innerHTML = '<div style="color:var(--text2);font-size:.9rem;padding:12px 0;">No connections yet</div>';
      } else {
        connectedEl.innerHTML = d.connections.map(function(c) {
          return '<div class="card" style="margin-bottom:8px;padding:10px;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div class="avatar av-sm" onclick="showUserInfoCard(\'' + c.id + '\')">' + avatarEl(c) + '</div>' +
              '<div style="flex:1;">' +
                '<div style="font-weight:700;font-size:0.88rem;cursor:pointer;" onclick="showUserInfoCard(\'' + c.id + '\')">' + esc(c.name) + '</div>' +
                '<div style="font-size:0.7rem;color:var(--text2);">' + (c.location || '') + '</div>' +
              '</div>' +
              '<button class="btn btn-secondary btn-xs" onclick="startChatWith(\'' + c.id + '\', \'' + esc(c.name) + '\')">Message</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
  } catch (err) { console.error(err); }
}

export async function cancelRequest(connId) {
  if (!confirm('Cancel this request?')) return;
  try {
    var r = await fetch(API + '/connections/' + connId, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!r.ok) {
      var d = await r.json();
      throw new Error(d.error || 'Failed to cancel request');
    }
    toast('Request cancelled', 'info');
    loadConnections();
  } catch (err) { toast(err.message, 'error'); }
}

export async function respondRequest(connId, action) {
  try {
    var r = await fetch(API + '/connections/' + connId + '/' + action, {
      method: 'PUT',
      headers: authHeaders()
    });
    if (!r.ok) {
      var d = await r.json();
      throw new Error(d.error || 'Failed to ' + action);
    }
    toast('Request ' + action + 'ed', 'success');
    loadConnections();
    loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

export async function startChatWith(peerId, peerName) {
  if (typeof openDirectChat === 'function') {
    openDirectChat(peerId, peerName);
  } else {
    if (typeof switchTab2 === 'function') switchTab2('chat');
  }
}

export function renderProfile(u) {
  localStorage.setItem('sc_user', JSON.stringify(u));
  var avWrap = document.getElementById('profile-avatar-wrap');
  if (avWrap) avWrap.innerHTML = avatarEl(u);
  
  var avatarDisplay = document.getElementById('profile-avatar-display');
  if (avatarDisplay) {
    var url = u.avatar_url || u.avatarUrl;
    if (url) {
      if (url.startsWith('uploads/') && typeof API !== 'undefined') {
        url = API + '/' + url;
      }
      avatarDisplay.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\';this.parentNode.textContent=avatarLetter(' + JSON.stringify(u) + ')" />';
    } else {
      avatarDisplay.textContent = avatarLetter(u);
    }
  }

  var nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = u.name;
  var nameDisp = document.getElementById('profile-name-display');
  if (nameDisp) nameDisp.textContent = u.name;
  
  var emailDisp = document.getElementById('profile-email-display');
  if (emailDisp) emailDisp.textContent = u.email || '';

  var bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.textContent = u.bio || 'New athlete on SkillConnect';
  var locEl = document.getElementById('profile-location');
  if (locEl) locEl.textContent = u.location || 'Secret Location';
  
  var sidEl = document.getElementById('profile-short-id');
  if (sidEl) sidEl.textContent = u.short_id || u.shortId || '--';
  var slEl = document.getElementById('profile-share-link');
  if (slEl) slEl.textContent = window.location.origin + '/?id=' + (u.short_id || u.shortId || u.id);
  
  var ccEl = document.getElementById('conn-count');
  if (ccEl) ccEl.textContent = u.connection_count || u.connectionCount || 0;
  var pccEl = document.getElementById('profile-conn-count');
  if (pccEl) pccEl.textContent = u.connection_count || u.connectionCount || 0;
  
  var scEl = document.getElementById('profile-skill-count');
  if (scEl) scEl.textContent = (u.skills ? u.skills.length : 0);

  // Sync edit fields
  var en = document.getElementById('edit-name'); if (en) en.value = u.name || '';
  var eb = document.getElementById('edit-bio'); if (eb) eb.value = u.bio || '';
  var el = document.getElementById('edit-location'); if (el) el.value = u.location || '';
  var es = document.getElementById('edit-strava'); if (es) es.value = u.strava_id || u.stravaId || '';
  var ei = document.getElementById('edit-garmin'); if (ei) ei.value = u.garmin_id || u.garminId || '';
  var eins = document.getElementById('edit-instagram'); if (eins) eins.value = u.instagram_id || u.instagramId || '';
  
  var elf = document.getElementById('edit-looking-for'); if (elf) elf.value = u.lookingFor || u.looking_for || 'learn';
  
  var sList = document.getElementById('current-skills-list');
  if (sList) {
    if (u.skills && u.skills.length) {
      sList.innerHTML = u.skills.map(function(s) {
        var levelLabel = s.level || 'Beginner';
        return '<div class="skill-pill-large" style="flex-direction:column;align-items:flex-start;padding:10px 12px;">' +
                 '<div style="display:flex;justify-content:space-between;width:100%;margin-bottom:4px;">' +
                   '<span style="font-weight:700;font-size:0.85rem;">' + (typeof skillEmoji === 'function' ? skillEmoji(s.name) : '') + ' ' + esc(s.name) + '</span>' +
                   '<span onclick="removeSkill(\'' + (s.skill_id || s.skillId || s._id) + '\')" style="opacity:.5;cursor:pointer;">&times;</span>' +
                 '</div>' +
                 '<div style="display:flex;align-items:center;gap:6px;font-size:0.7rem;color:var(--text2);">' +
                   '<span>Lv: ' + levelLabel + '</span>' +
                   '<span onclick="editSkillLevel(\'' + (s.skill_id || s.skillId || s._id) + '\', \'' + levelLabel + '\')" style="color:var(--purple-l);cursor:pointer;font-weight:700;">Edit</span>' +
                 '</div>' +
               '</div>';
      }).join('');
    } else { sList.innerHTML = '<div style="color:var(--text2);padding:10px;">No skills added yet</div>'; }
  }
  
  if (typeof generateQR === 'function') generateQR(window.location.origin + '/?id=' + (u.short_id || u.shortId || u.id));
  loadVerifications(); 
  loadEndorsements();
  populateVerificationSkills(u.skills || []);
  renderSkillOptions();
}

export function renderSkillOptions() {
  var container = document.getElementById('skill-options-list');
  if (!container || !window.SKILLS_DATA) return;
  
  var u = JSON.parse(localStorage.getItem('sc_user') || '{}');
  var existingNames = (u.skills || []).map(function(s) { return s.name; });

  var html = '';
  for (var category in SKILLS_DATA) {
    if (existingNames.indexOf(category) === -1) {
      html += '<button class="pill" onclick="toggleSkillSelection(\'' + category + '\', this)">' + 
              SKILLS_DATA[category].icon + ' ' + category + '</button>';
    }
  }
  
  if (!html) html = '<div style="color:var(--text2);font-size:0.8rem;">All primary skills added</div>';
  container.innerHTML = html;
}

export function toggleSkillSelection(name, btn) {
  if (window.selectedSkillBtn) window.selectedSkillBtn.classList.remove('active');
  
  if (window.selectedSkillToAdd === name) {
    window.selectedSkillToAdd = null;
    window.selectedSkillBtn = null;
    document.getElementById('skill-level-wrap').style.display = 'none';
    document.getElementById('btn-add-skill').style.display = 'none';
  } else {
    window.selectedSkillToAdd = name;
    window.selectedSkillBtn = btn;
    btn.classList.add('active');
    document.getElementById('skill-level-wrap').style.display = 'block';
    document.getElementById('btn-add-skill').style.display = 'block';
  }
}

export function populateVerificationSkills(skills) {
  var select = document.getElementById('verification-skill-select');
  if (!select) return;
  select.innerHTML = '<option value="">Select skill</option>' + 
    skills.map(function(s) { return '<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>'; }).join('');
}

export async function saveBasicInfo() {
  try {
    var p = { 
      name: document.getElementById('edit-name').value, 
      bio: document.getElementById('edit-bio').value, 
      location: document.getElementById('edit-location').value,
      lookingFor: document.getElementById('edit-looking-for').value
    };
    var r = await fetch(API + '/profile/' + userId, { 
      method: 'PUT', 
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), 
      body: JSON.stringify(p) 
    });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Profile updated!', 'success'); 
    renderProfile(d);
  } catch (err) { toast(err.message, 'error'); }
}

export async function saveSocialLinks() {
  try {
    var p = { 
      strava_id: document.getElementById('edit-strava').value, 
      garmin_id: document.getElementById('edit-garmin').value, 
      instagram_id: document.getElementById('edit-instagram').value 
    };
    var r = await fetch(API + '/profile/' + userId, { 
      method: 'PUT', 
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), 
      body: JSON.stringify(p) 
    });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Links saved!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

export async function uploadAvatar(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var formData = new FormData();
  formData.append('avatar', file);

  try {
    var r = await fetch(API + '/upload/avatar', {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Upload failed');
    
    toast('Profile photo updated!', 'success');
    loadProfile(); 
  } catch (err) {
    toast(err.message, 'error');
  }
}

export async function addSkill() {
  if (!window.selectedSkillToAdd) return;
  var proficiency = document.getElementById('skill-level-select') ? document.getElementById('skill-level-select').value : 'Beginner';
  try {
    var r = await fetch(API + '/profile/skills', { 
      method: 'POST', 
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), 
      body: JSON.stringify({ skills: [{ name: window.selectedSkillToAdd, proficiency: proficiency }] }) 
    });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Skill added!', 'success');
    window.selectedSkillToAdd = null;
    if (window.selectedSkillBtn) { window.selectedSkillBtn.classList.remove('active'); window.selectedSkillBtn = null; }
    document.getElementById('skill-level-wrap').style.display = 'none';
    document.getElementById('btn-add-skill').style.display = 'none';
    loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

export async function removeSkill(skillId) {
  try {
    var r = await fetch(API + '/profile/skills/' + skillId, { method: 'DELETE', headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    toast('Skill removed', 'info'); loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

export async function editSkillLevel(skillId, currentLevel) {
  var newLevel = window.prompt("Enter new level (Beginner, Intermediate, Expert):", currentLevel);
  if (!newLevel) return;
  
  var validLevels = ['Beginner', 'Intermediate', 'Expert'];
  if (validLevels.indexOf(newLevel) === -1) {
    toast("Invalid level: Beginner, Intermediate, or Expert", "error");
    return;
  }
  
  if (newLevel === currentLevel) return;

  try {
    var u = JSON.parse(localStorage.getItem('sc_user') || '{}');
    var skill = u.skills.find(function(s) { return (s.skill_id || s.skillId || s._id) === skillId; });
    
    var r = await fetch(API + '/profile/skills', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ skills: [{ name: skill.name, level: newLevel }] })
    });
    
    if (r.ok) {
      toast("Skill level updated!", "success");
      loadProfile();
    } else {
      var d = await r.json();
      toast(d.error || "Failed to update level", "error");
    }
  } catch (e) {
    console.error(e);
    toast("Connection error", "error");
  }
}

export async function submitVerification() {
  var skillName = document.getElementById('verification-skill-select').value;
  var type = document.getElementById('verification-type-select').value;
  var url = document.getElementById('verification-url').value;
  
  if (!skillName || !url) return toast('Please fill all fields', 'error');

  try {
    var r = await fetch(API + '/profile/verifications', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ skillName: skillName, verificationType: type, url: url })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Submission failed');
    toast('Verification submitted!', 'success');
    document.getElementById('verification-url').value = '';
    loadVerifications();
  } catch (err) {
    toast(err.message, 'error');
  }
}

export function renderVerifications(verifications) {
  var el = document.getElementById('verifications-list');
  if (!el) return;
  if (!verifications.length) { el.innerHTML = '<span style="color:var(--text2);font-size:.9rem;">No verifications submitted</span>'; return; }
  el.innerHTML = verifications.map(function (v) { 
    var statusIcon = v.status === 'verified' ? '✅' : v.status === 'pending' ? '⏳' : '❌';
    return '<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><strong>' + esc(v.skillName || v.skill_name) + '</strong> - ' + esc(v.verificationType || v.verification_type) + ' ' + statusIcon + '<br><small>' + esc(v.url || '') + '</small></div>';
  }).join('');
}

export async function loadVerifications() {
  try {
    var r = await fetch(API + '/profile/verifications', { headers: authHeaders() });
    var d = await r.json(); if (r.ok) renderVerifications(d);
  } catch (err) {}
}

export function renderEndorsements(endorsements) {
  var el = document.getElementById('endorsements-list');
  if (!el) return;
  if (!endorsements.length) { el.innerHTML = '<span style="color:var(--text2);font-size:.9rem;">No endorsements received</span>'; return; }
  el.innerHTML = endorsements.map(function (e) { 
    return '<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><strong>' + esc(e.endorserName || e.endorser_name) + '</strong> endorsed <strong>' + esc(e.skillName || e.skill_name) + '</strong><br><small>' + esc(e.comment || '') + '</small></div>';
  }).join('');
}

export async function loadEndorsements() {
  try {
    var r = await fetch(API + '/profile/' + userId + '/endorsements');
    var d = await r.json(); if (r.ok) renderEndorsements(d);
  } catch (err) {}
}

export async function generateQR(url) {
  var el = document.getElementById('qr-code-container');
  if (!el) return;

  if (!window.QRCode) {
    try {
      if (!document.getElementById('qrcode-script')) {
        const sc = document.createElement('script');
        sc.id = 'qrcode-script';
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        const p = new Promise(res => sc.onload = res);
        document.head.appendChild(sc);
        await p;
      }
    } catch (e) {
      console.error('Failed to load QRCode library', e);
      return;
    }
  }

  if (!window.QRCode) return;
  el.innerHTML = '';
  new QRCode(el, { text: url, width: 140, height: 140, colorDark: "#333333", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
}

export function downloadQR() {
  var canvas = document.querySelector('#qr-code-container canvas');
  if (!canvas) return toast('QR code not ready', 'error');
  var link = document.createElement('a');
  link.download = 'skill-connect-qr.png';
  link.href = canvas.toDataURL();
  link.click();
}

export function copyShortId() {
  var id = document.getElementById('profile-short-id').textContent;
  if (!id || id === '--') return;
  navigator.clipboard.writeText(id);
  toast('ID copied to clipboard!', 'success');
}

export function copyShareLink() {
  var link = document.getElementById('profile-share-link').textContent;
  if (!link) return;
  navigator.clipboard.writeText(link);
  toast('Link copied to clipboard!', 'success');
}

export async function saveThemePreference() {
  var theme = document.getElementById('edit-theme').value;
  try {
    var r = await fetch(API + '/profile/' + userId, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ theme: theme })
    });
    if (!r.ok) throw new Error('Failed to save theme');
    toast('Theme preference saved!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

export async function saveAccountType() {
  var type = document.getElementById('edit-account-type').value;
  try {
    var r = await fetch(API + '/profile/' + userId, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ accountType: type })
    });
    if (!r.ok) throw new Error('Failed to save account type');
    toast('Account type updated!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

export async function changePassword() {
  var oldPw = document.getElementById('old-password').value;
  var newPw = document.getElementById('new-password').value;
  var confirmPw = document.getElementById('confirm-password').value;
  
  if (!oldPw || !newPw) return toast('Please fill all fields', 'error');
  if (newPw !== confirmPw) return toast('Passwords do not match', 'error');

  try {
    var r = await fetch(API + '/auth/change-password', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to change password');
    toast('Password changed successfully!', 'success');
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    if (typeof closeSecuritySheet === 'function') closeSecuritySheet();
  } catch (err) { toast(err.message, 'error'); }
}

export function applyThemePreview() {
  var theme = document.getElementById('edit-theme').value;
  if (theme === 'dark') {
    document.documentElement.style.setProperty('--bg', '#0F172A');
    document.documentElement.style.setProperty('--card', '#1E293B');
    document.documentElement.style.setProperty('--text', '#F8FAFC');
    document.documentElement.style.setProperty('--border', '#334155');
  } else {
    document.documentElement.style.setProperty('--bg', '#F8FAFC');
    document.documentElement.style.setProperty('--card', '#FFFFFF');
    document.documentElement.style.setProperty('--text', '#0F172A');
    document.documentElement.style.setProperty('--border', '#E2E8F0');
  }
}

// Attach to window
window.activeSharePostId = activeSharePostId;
window.selectedSkillToAdd = selectedSkillToAdd;
window.selectedSkillBtn = selectedSkillBtn;
window.loadProfile = loadProfile;
window.loadConnections = loadConnections;
window.cancelRequest = cancelRequest;
window.respondRequest = respondRequest;
window.startChatWith = startChatWith;
window.renderProfile = renderProfile;
window.renderSkillOptions = renderSkillOptions;
window.toggleSkillSelection = toggleSkillSelection;
window.populateVerificationSkills = populateVerificationSkills;
window.saveBasicInfo = saveBasicInfo;
window.saveSocialLinks = saveSocialLinks;
window.uploadAvatar = uploadAvatar;
window.addSkill = addSkill;
window.removeSkill = removeSkill;
window.editSkillLevel = editSkillLevel;
window.submitVerification = submitVerification;
window.renderVerifications = renderVerifications;
window.loadVerifications = loadVerifications;
window.renderEndorsements = renderEndorsements;
window.loadEndorsements = loadEndorsements;
window.generateQR = generateQR;
window.downloadQR = downloadQR;
window.copyShortId = copyShortId;
window.copyShareLink = copyShareLink;
window.saveThemePreference = saveThemePreference;
window.saveAccountType = saveAccountType;
window.changePassword = changePassword;
window.applyThemePreview = applyThemePreview;
