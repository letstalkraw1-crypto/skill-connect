// Messaging and Chat Logic
var currentConvId = null;
var pendingVoiceBlob = null;
var isVoiceRecording = false;
var isUploadingMedia = false;

async function loadConversations() {
  var el = document.getElementById('chat-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/messaging/conversations', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    renderConversations(d);
  } catch (err) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:16px;">' + esc(err.message) + '</div>'; }
}

function renderConversations(convs) {
  var el = document.getElementById('chat-list');
  if (!el || !convs) return;
  if (!convs.length) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:32px;">No active chats</div>'; return; }
  el.innerHTML = convs.map(function (c) {
    var other = c.other_user || {};
    var last = c.last_message || 'Start a conversation';
    var unread = c.unread_count > 0 ? '<div class="unread-badge">' + c.unread_count + '</div>' : '';
    return '<div class="user-row" onclick="openChatThread(\'' + (c._id || c.id) + '\', \'' + esc(other.name) + '\')">' +
      '<div class="avatar av-md">' + avatarEl(other) + '</div>' +
      '<div class="user-info"><div class="user-name">' + esc(other.name) + '</div><div class="user-sub">' + esc(last) + '</div></div>' +
      unread + '</div>';
  }).join('');
}

async function openChatThread(convId, otherName) {
  currentConvId = convId;
  document.getElementById('chat-thread-title').textContent = otherName;
  document.getElementById('chat-thread-view').style.display = 'flex';
  var el = document.getElementById('chat-messages');
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/messaging/conversations/' + convId, { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    if (typeof applyWallpaperStyle === 'function') applyWallpaperStyle(d.wallpaper);
    el.innerHTML = '';
    (d.messages || []).forEach(appendBubble);
    el.scrollTop = el.scrollHeight;
    if (socket) socket.emit('join_room', { conversationId: convId });
  } catch (err) { toast(err.message, 'error'); }
}

function closeChatThread() {
  document.getElementById('chat-thread-view').style.display = 'none';
  if (socket && currentConvId) socket.emit('leave_room', { conversationId: currentConvId });
  currentConvId = null; loadConversations();
}

function appendBubble(m) {
  var el = document.getElementById('chat-messages');
  if (!el) return;
  var isMe = m.sender_id === userId || m.senderId === userId;
  var bubble = document.createElement('div');
  bubble.className = 'message ' + (isMe ? 'me' : 'them');
  var content = esc(m.content);
  if (typeof m.content === 'string' && m.content.startsWith('http')) {
    if (['.jpg', '.png', '.webp', '.jpeg'].some(ext => m.content.toLowerCase().includes(ext))) {
       content = '<img src="' + m.content + '" style="max-width:100%;border-radius:12px;" onclick="openMediaPreview(\'' + m.content + '\')"/>';
    } else if (['.mp3', '.webm', '.ogg', '.wav'].some(ext => m.content.toLowerCase().includes(ext))) {
       content = '<audio controls src="' + m.content + '" style="width:100%;height:32px;"></audio>';
    }
  }
  bubble.innerHTML = '<div class="message-bubble">' + content + '<div class="message-time">' + (m.created_at ? timeAgo(m.created_at) : 'now') + '</div></div>';
  el.appendChild(bubble); el.scrollTop = el.scrollHeight;
}

async function sendMessage() {
  var input = document.getElementById('chat-input');
  var content = input.value.trim();
  if (!content && !pendingVoiceBlob) return;
  var msgData = { conversationId: currentConvId, senderId: userId, content: content || '🎤 Voice message' };
  if (pendingVoiceBlob) {
    var fd = new FormData(); fd.append('file', pendingVoiceBlob, 'voice.webm');
    try {
      var r = await fetch(API + '/upload/chat', { method: 'POST', headers: authHeaders(), body: fd });
      var d = await r.json(); if (!r.ok) throw new Error(d.error);
      msgData.content = d.url;
    } catch (err) { return toast('Voice upload failed', 'error'); }
    finally { pendingVoiceBlob = null; updateChatInputUI(); }
  }
  if (socket) socket.emit('send_message', msgData);
  appendBubble({ sender_id: userId, content: msgData.content, created_at: new Date() });
  input.value = ''; updateChatInputUI();
}

function applyWallpaperStyle(wallpaper) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  if (!wallpaper) {
    el.style.background = 'var(--bg)';
    el.style.backgroundImage = '';
  } else if (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('rgba')) {
    el.style.background = wallpaper;
    el.style.backgroundImage = '';
  } else {
    const src = (wallpaper.startsWith('http') || wallpaper.startsWith('data:')) ? wallpaper : (API + (wallpaper.startsWith('/') ? '' : '/') + wallpaper);
    el.style.background = 'url(' + src + ') center/cover no-repeat fixed';
  }
}

function updateChatInputUI() {
  var micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.style.color = isVoiceRecording ? 'var(--red)' : 'var(--text2)';
    micBtn.innerHTML = isVoiceRecording ? '⏹' : '🎤';
  }
  var sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    var input = document.getElementById('chat-input');
    sendBtn.disabled = !(input.value.trim() || pendingVoiceBlob);
  }
}

async function toggleMicRecording() {
  if (!navigator.mediaDevices) return toast('Media devices not supported', 'error');
  isVoiceRecording = !isVoiceRecording;
  updateChatInputUI();
  if (isVoiceRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        pendingVoiceBlob = new Blob(audioChunks, { type: 'audio/webm' });
        isVoiceRecording = false; updateChatInputUI();
      };
      mediaRecorder.start();
      // Store recorder instance globally if needed for stopping
      window._currentRecorder = mediaRecorder;
    } catch (e) { isVoiceRecording = false; updateChatInputUI(); toast('Mic access denied', 'error'); }
  } else { if (window._currentRecorder && window._currentRecorder.state === 'recording') window._currentRecorder.stop(); }
}
