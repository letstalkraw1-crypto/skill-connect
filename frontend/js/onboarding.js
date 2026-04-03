// Onboarding Logic and Data
export var obSelectedSkills = {};
export var obSelectedLevel = '';
export var obSelectedIntent = '';
export var obCurrentStep = 1;

export function showOnboarding() {
  var overlay = document.getElementById('onboarding-overlay');
  if (overlay) overlay.style.display = 'block';
  if (typeof renderSkillsGrid === 'function') renderSkillsGrid();
}

export function renderSkillsGrid() {
  var grid = document.getElementById('ob-skills-grid');
  if (!grid) return;
  grid.innerHTML = Object.keys(SKILLS_DATA).map(function(skill) {
    var d = SKILLS_DATA[skill];
    return '<button onclick="toggleObSkill(this,\'' + skill.replace(/'/g, "\\'") + '\')" style="padding:16px 12px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.1);background:transparent;color:#f0f0ff;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;text-align:center;transition:all .2s;" data-skill="' + skill + '">' + d.icon + '<br/><span style="font-size:.8rem;">' + skill + '</span></button>';
  }).join('');
}

export function toggleObSkill(btn, skill) {
  if (window.obSelectedSkills[skill]) {
    delete window.obSelectedSkills[skill];
    btn.style.background = 'transparent';
    btn.style.borderColor = 'rgba(255,255,255,0.1)';
    btn.style.color = '#f0f0ff';
  } else {
    window.obSelectedSkills[skill] = { subSkills: [] };
    btn.style.background = 'rgba(139,92,246,0.2)';
    btn.style.borderColor = '#8b5cf6';
    btn.style.color = '#a78bfa';
  }
  var continueBtn = document.getElementById('ob-btn-1');
  if (continueBtn) continueBtn.disabled = Object.keys(window.obSelectedSkills).length === 0;
}

export function obNextStep(step) {
  var currentStepEl = document.getElementById('ob-step-' + window.obCurrentStep);
  if (currentStepEl) currentStepEl.style.display = 'none';
  window.obCurrentStep = step;
  var nextStepEl = document.getElementById('ob-step-' + step);
  if (nextStepEl) nextStepEl.style.display = 'block';
  for (var i = 1; i <= 4; i++) {
    var bar = document.getElementById('ob-step-' + i + '-bar');
    if (bar) bar.style.background = i <= step ? '#8b5cf6' : 'rgba(255,255,255,0.1)';
  }
  if (step === 2 && typeof renderSubSkills === 'function') renderSubSkills();
}

export function renderSubSkills() {
  var container = document.getElementById('ob-subskills-container');
  if (!container) return;
  container.innerHTML = Object.keys(window.obSelectedSkills).map(function(skill) {
    var d = SKILLS_DATA[skill];
    return '<div style="margin-bottom:20px;"><div style="font-weight:700;margin-bottom:10px;">' + d.icon + ' ' + skill + '</div><div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      d.subs.map(function(sub) {
        var selected = window.obSelectedSkills[skill].subSkills.includes(sub);
        return '<button onclick="toggleSubSkill(this,\'' + skill.replace(/'/g, "\\'") + '\',\'' + sub.replace(/'/g, "\\'") + '\')" style="padding:8px 14px;border-radius:999px;border:1.5px solid ' + (selected ? '#8b5cf6' : 'rgba(255,255,255,0.1)') + ';background:' + (selected ? 'rgba(139,92,246,0.2)' : 'transparent') + ';color:' + (selected ? '#a78bfa' : '#f0f0ff') + ';font-family:inherit;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .2s;">' + sub + '</button>';
      }).join('') + '</div></div>';
  }).join('');
}

export function toggleSubSkill(btn, skill, sub) {
  var arr = window.obSelectedSkills[skill].subSkills;
  var idx = arr.indexOf(sub);
  if (idx > -1) {
    arr.splice(idx, 1);
    btn.style.background = 'transparent';
    btn.style.borderColor = 'rgba(255,255,255,0.1)';
    btn.style.color = '#f0f0ff';
  } else {
    arr.push(sub);
    btn.style.background = 'rgba(139,92,246,0.2)';
    btn.style.borderColor = '#8b5cf6';
    btn.style.color = '#a78bfa';
  }
}

export function selectLevel(btn) {
  document.querySelectorAll('.ob-level-btn').forEach(function(b) {
    b.style.background = 'transparent';
    b.style.borderColor = 'rgba(255,255,255,0.1)';
    b.style.color = '#f0f0ff';
  });
  btn.style.background = 'rgba(139,92,246,0.2)';
  btn.style.borderColor = '#8b5cf6';
  btn.style.color = '#a78bfa';
  window.obSelectedLevel = btn.dataset.level;
  if (typeof checkStep3 === 'function') checkStep3();
}

export function selectIntent(btn) {
  document.querySelectorAll('.ob-intent-btn').forEach(function(b) {
    b.style.background = 'transparent';
    b.style.borderColor = 'rgba(255,255,255,0.1)';
    b.style.color = '#f0f0ff';
  });
  btn.style.background = 'rgba(139,92,246,0.2)';
  btn.style.borderColor = '#8b5cf6';
  btn.style.color = '#a78bfa';
  window.obSelectedIntent = btn.dataset.intent;
  if (typeof checkStep3 === 'function') checkStep3();
}

export function checkStep3() {
  var btn = document.getElementById('ob-btn-3');
  if (btn) btn.disabled = !(window.obSelectedLevel && window.obSelectedIntent);
}

export async function completeOnboarding(skip) {
  var btn = document.getElementById('ob-btn-finish');
  if (btn) { btn.innerHTML = 'Saving...'; btn.disabled = true; }

  var skills = [];
  Object.keys(window.obSelectedSkills).forEach(function(skillName) {
    var subSkills = window.obSelectedSkills[skillName].subSkills;
    if (subSkills.length === 0) {
      skills.push({ skillName: skillName, subSkill: null, level: window.obSelectedLevel || 'Beginner' });
    } else {
      subSkills.forEach(function(sub) {
        skills.push({ skillName: skillName, subSkill: sub, level: window.obSelectedLevel || 'Beginner' });
      });
    }
  });

  try {
    var body = {
      skills: skills,
      lookingFor: window.obSelectedIntent || 'learn',
      verificationLinks: skip ? {} : {
        strava: document.getElementById('ob-strava') ? document.getElementById('ob-strava').value : '',
        github: document.getElementById('ob-github') ? document.getElementById('ob-github').value : '',
        portfolio: document.getElementById('ob-portfolio') ? document.getElementById('ob-portfolio').value : ''
      }
    };

    var r = await fetch(API + '/profile/onboarding', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify(body)
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');

    var overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.style.display = 'none';
    if (typeof switchTab2 === 'function') switchTab2('home');
    toast('Profile set up! Welcome', 'success');
  } catch(err) {
    toast(err.message, 'error');
    if (btn) { btn.innerHTML = 'Finish Setup'; btn.disabled = false; }
  }
}

// Attach to window
window.obSelectedSkills = obSelectedSkills;
window.obSelectedLevel = obSelectedLevel;
window.obSelectedIntent = obSelectedIntent;
window.obCurrentStep = obCurrentStep;
window.showOnboarding = showOnboarding;
window.renderSkillsGrid = renderSkillsGrid;
window.toggleObSkill = toggleObSkill;
window.obNextStep = obNextStep;
window.renderSubSkills = renderSubSkills;
window.toggleSubSkill = toggleSubSkill;
window.selectLevel = selectLevel;
window.selectIntent = selectIntent;
window.checkStep3 = checkStep3;
window.completeOnboarding = completeOnboarding;
