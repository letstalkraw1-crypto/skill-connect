// Utility Functions

export var SKILLS_DATA = {
  'Running': { icon: '🏃', subs: ['Fitness Running', 'Marathon / Endurance', 'Sprinting'] },
  'Cycling': { icon: '🚴', subs: ['Road Cycling', 'Mountain Biking', 'Fitness Cycling'] },
  'Swimming': { icon: '🏊', subs: ['Fitness Swimming', 'Competitive Swimming', 'Coaching'] },
  'Gym / Fitness': { icon: '💪', subs: ['Weight Training', 'Calisthenics', 'Personal Training'] },
  'Content Creation': { icon: '🎬', subs: ['Short-form (Reels)', 'Long-form (YouTube)', 'Personal Branding'] },
  'Coding': { icon: '💻', subs: ['Web Development', 'App Development', 'DSA / Competitive Programming'] },
  'Professional Communication': { icon: '🎤', subs: ['Public Speaking', 'Debate / Discussion', 'Hosting (Webinar / Seminar)'] },
  'Photography / Videography': { icon: '📸', subs: ['Photography', 'Videography', 'Editing'] },
  'Research': { icon: '🔬', subs: ['Academic Research', 'Technical Research', 'Market Research'] },
  'Design': { icon: '🎨', subs: ['UI/UX Design', 'Graphic Design', 'Thumbnail Design'] },
  'Business / Entrepreneurship': { icon: '🚀', subs: ['Marketing', 'Sales', 'Startup Building'] },
  'Personal Development': { icon: '🌱', subs: ['Leadership', 'Time Management', 'Problem Solving'] },
  'Yoga': { icon: '🧘', subs: ['Hatha Yoga', 'Power Yoga', 'Meditation'] },
  'Hiking': { icon: '🥾', subs: ['Trail Hiking', 'Mountain Trekking', 'Backpacking'] }
};

export function skillEmoji(name) {
  if (!name) return '';
  for (var k in SKILLS_DATA) {
    if (k === name || SKILLS_DATA[k].subs.includes(name)) return SKILLS_DATA[k].icon;
  }
  return '🏆';
}

export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function timeAgo(date) {
  if (!date) return '';
  var seconds = Math.floor((new Date() - new Date(date)) / 1000);
  var interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm';
  return Math.floor(seconds) + 's';
}

export function toast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  var item = document.createElement('div');
  item.className = 'toast-item ' + (type || 'info');
  item.textContent = msg;
  el.appendChild(item);
  setTimeout(function() {
    item.style.opacity = '0';
    item.style.transform = 'translateY(-10px)';
    setTimeout(function() { if (item.parentNode) item.parentNode.removeChild(item); }, 300);
  }, 3000);
}

export function avatarLetter(u) {
  return (u.name || u.author_name || '?').charAt(0).toUpperCase();
}

export function avatarEl(u) {
  var url = u.avatar_url || u.avatarUrl || u.author_avatar;
  if (url) {
    if (url.startsWith('uploads/') && typeof API !== 'undefined') {
      url = API + '/' + url;
    }
    return '<img src="' + url + '" onerror="this.src=\'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name || u.author_name || '?') + '&background=random\'" />';
  }
  return avatarLetter(u);
}

export function toggleCollapse(id, forceOpen) {
  var body = document.getElementById(id);
  var arrow = document.getElementById(id + '-arrow');
  if (!body) return;

  if (forceOpen === true) {
    body.classList.add('open');
    if (arrow) arrow.innerHTML = '&#9650;';
    return;
  }

  if (body.classList.contains('open')) {
    body.classList.remove('open');
    if (arrow) arrow.innerHTML = '&#9660;';
  } else {
    body.classList.add('open');
    if (arrow) arrow.innerHTML = '&#9650;';
  }
}
 
export function togglePw(btn) {
  var i = btn.previousElementSibling;
  var on = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  var off = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  if (i.type === 'password') {
    i.type = 'text';
    btn.innerHTML = off;
  } else {
    i.type = 'password';
    btn.innerHTML = on;
  }
}

// Attach to window
window.SKILLS_DATA = SKILLS_DATA;
window.skillEmoji = skillEmoji;
window.esc = esc;
window.timeAgo = timeAgo;
window.toast = toast;
window.avatarLetter = avatarLetter;
window.avatarEl = avatarEl;
window.toggleCollapse = toggleCollapse;
window.togglePw = togglePw;
