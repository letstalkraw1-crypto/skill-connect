// Messaging and Chat Logic
var currentConvId = null;
var pendingVoiceBlob = null;
var isVoiceRecording = false;
var isUploadingMedia = false;

async function loadConversations() {
  var el = document.getElementById('conv-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/conversations', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    renderConversations(d);
  } catch (err) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:16px;">' + esc(err.message) + '</div>'; }
}

function renderConversations(convs) {
  var el = document.getElementById('conv-list');
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
  var titleEl = document.getElementById('chat-thread-name');
  if (titleEl) titleEl.textContent = otherName;
  
  // Hide list, show thread for "Dedicated Interface"
  var listView = document.getElementById('chat-list-view');
  var threadView = document.getElementById('chat-thread-view');
  if (listView) listView.style.display = 'none';
  if (threadView) {
    threadView.style.display = 'flex';
    threadView.style.animation = 'slideInRight 0.3s ease-out';
  }

  var el = document.getElementById('chat-messages');
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/conversations/' + convId + '/messages', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    
    // d is now { messages: [], wallpaper: "" }
    if (typeof applyWallpaperStyle === 'function') applyWallpaperStyle(d.wallpaper);
    el.innerHTML = '';
    (d.messages || []).forEach(appendBubble);
    el.scrollTop = el.scrollHeight;
    if (socket) socket.emit('join_room', { conversationId: convId });
  } catch (err) { toast(err.message, 'error'); }
}

function closeChatThread() {
  var listView = document.getElementById('chat-list-view');
  var threadView = document.getElementById('chat-thread-view');
  if (threadView) threadView.style.display = 'none';
  if (listView) listView.style.display = 'flex';

  if (socket && currentConvId) socket.emit('leave_room', { conversationId: currentConvId });
  currentConvId = null; loadConversations();
}

function appendBubble(m) {
  var el = document.getElementById('chat-messages');
  if (!el) return;
  var isMe = m.sender_id === userId || m.senderId === userId;
  var bubbleWrap = document.createElement('div');
  bubbleWrap.className = 'bubble-wrap ' + (isMe ? 'mine' : 'theirs');

  var content = esc(m.content || m.text || '');
  if (typeof (m.content || m.text) === 'string' && (m.content || m.text).startsWith('http')) {
    var url = (m.content || m.text);
    if (['.jpg', '.png', '.webp', '.jpeg'].some(ext => url.toLowerCase().includes(ext))) {
       content = '<img src="' + url + '" style="max-width:100%;border-radius:12px;" onclick="openMediaPreview(\'' + url + '\')"/>';
    } else if (['.mp3', '.webm', '.ogg', '.wav'].some(ext => url.toLowerCase().includes(ext))) {
       content = '<audio controls src="' + url + '" style="width:100%;height:32px;"></audio>';
    }
  }

  bubbleWrap.innerHTML = '<div class="bubble ' + (isMe ? 'mine' : 'theirs') + '">' +
    content +
    '<div class="message-time">' +
    (m.created_at ? timeAgo(m.created_at) : 'now') +
    '</div></div>';
  el.appendChild(bubbleWrap); el.scrollTop = el.scrollHeight;
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
async function openNewChatModal() {
  var modal = document.getElementById('new-chat-modal');
  var list = document.getElementById('new-chat-list');
  if (!modal || !list) return;

  modal.style.display = 'flex';
  list.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span></div>';

  try {
    var r = await fetch(API + '/connections/' + userId, { headers: authHeaders() });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error);

    if (!d.connections || !d.connections.length) {
      list.innerHTML = '<div style="color:var(--text2);text-align:center;padding:20px;">No connections found. Find athletes in Discover!</div>';
      return;
    }

    list.innerHTML = d.connections.map(function(c) {
      return '<label class="user-row" style="padding:10px;border-radius:12px;background:var(--bg);cursor:pointer;display:flex;align-items:center;gap:12px;">' +
        '<input type="checkbox" class="new-chat-check" value="' + c.id + '" data-name="' + esc(c.name) + '" style="width:18px;height:18px;"/>' +
        '<div class="avatar av-sm">' + avatarEl(c) + '</div>' +
        '<div style="font-weight:600;font-size:0.95rem;flex:1;">' + esc(c.name) + '</div>' +
      '</label>';
    }).join('');
  } catch (err) {
    list.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px;">' + esc(err.message) + '</div>';
  }
}

async function handleNewChatAction(type) {
  var checks = document.querySelectorAll('.new-chat-check:checked');
  if (checks.length === 0) return toast('Please select at least one person', 'info');

  var selectedIds = Array.from(checks).map(c => c.value);
  var selectedNames = Array.from(checks).map(c => c.getAttribute('data-name'));

  if (type === 'community') {
    closeNewChatModal();
    // User wants a group for communities
    try {
      var name = window.prompt("Enter Community/Group Name:", "New Group");
      if (!name) return;
      
      var r = await fetch(API + '/conversations', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ 
          participantIds: selectedIds,
          isGroup: true,
          name: name
        })
      });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error);
      openChatThread(d._id || d.id, name);
    } catch (err) { toast(err.message, 'error'); }
  } else {
    // Individual messaging for multi-select
    closeNewChatModal();
    var msg = window.prompt("Message to send to all selected (" + selectedIds.length + "):");
    if (!msg) return;

    toast('Sending messages...', 'info');
    let successCount = 0;
    for (let i = 0; i < selectedIds.length; i++) {
        try {
            // 1. Create/Get conversation
            var r = await fetch(API + '/conversations', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
                body: JSON.stringify({ participantIds: [selectedIds[i]] })
            });
            var d = await r.json();
            if (!r.ok) continue;

            // 2. Send message manually via API instead of socket for bulk
            await fetch(API + '/conversations/' + (d._id || d.id) + '/messages', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
                body: JSON.stringify({ content: msg })
            });
            successCount++;
        } catch (e) { console.error(e); }
    }
    toast('Sent to ' + successCount + ' athletes', 'success');
    loadConversations();
  }
}

function closeNewChatModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  var modal = document.getElementById('new-chat-modal');
  if (modal) modal.style.display = 'none';
}

async function initiateConversation(peerId, peerName) {
  closeNewChatModal();
  openDirectChat(peerId, peerName);
}

async function openDirectChat(peerId, peerName) {
  try {
    // Switch to chat tab first
    switchTab2('chat');
    
    // Create/Find conversation
    var r = await fetch(API + '/conversations', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ participantIds: [peerId] })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error);
    
    openChatThread(d._id || d.id, peerName);
  } catch (err) {
    toast(err.message, 'error');
  }
}

window.openNewChatModal = openNewChatModal;
window.closeNewChatModal = closeNewChatModal;
window.handleNewChatAction = handleNewChatAction;
window.openDirectChat = openDirectChat;
