// Messaging and Chat Logic
export var currentConvId = null;
export var pendingVoiceBlob = null;
export var isVoiceRecording = false;
export var isUploadingMedia = false;

export async function loadConversations() {
  var el = document.getElementById('conv-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px;"><span class="spinner"></span></div>';
  try {
    var r = await fetch(API + '/conversations', { headers: authHeaders() });
    var d = await r.json(); if (!r.ok) throw new Error(d.error);
    renderConversations(d);
  } catch (err) { el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:16px;">' + esc(err.message) + '</div>'; }
}

export function renderConversations(convs) {
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

export async function openChatThread(convId, otherName) {
  window.currentConvId = convId;
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

export function closeChatThread() {
  var listView = document.getElementById('chat-list-view');
  var threadView = document.getElementById('chat-thread-view');
  if (threadView) threadView.style.display = 'none';
  if (listView) listView.style.display = 'flex';

  if (socket && window.currentConvId) socket.emit('leave_room', { conversationId: window.currentConvId });
  window.currentConvId = null; loadConversations();
}

export function appendBubble(m) {
  var el = document.getElementById('chat-messages');
  if (!el) return;
  var isMe = m.sender_id === userId || m.senderId === userId;
  var bubbleWrap = document.createElement('div');
  bubbleWrap.className = 'bubble-wrap ' + (isMe ? 'mine' : 'theirs');

  var rawContent = m.content || m.text || '';
  var content = esc(rawContent);

  if (typeof rawContent === 'string') {
    var isLocalUpload = rawContent.startsWith('uploads/');
    var url = isLocalUpload ? (API + '/' + rawContent) : rawContent;
    
    if (rawContent.startsWith('http') || isLocalUpload) {
      if (['.jpg', '.png', '.webp', '.jpeg'].some(ext => url.toLowerCase().includes(ext))) {
         content = '<img src="' + url + '" style="max-width:100%;border-radius:12px;" onclick="openMediaPreview(\'' + url + '\')"/>';
      } else if (['.mp3', '.webm', '.ogg', '.wav'].some(ext => url.toLowerCase().includes(ext))) {
         content = '<audio controls src="' + url + '" style="width:100%;height:32px;"></audio>';
      }
    }
  }

  bubbleWrap.innerHTML = '<div class="bubble ' + (isMe ? 'mine' : 'theirs') + '">' +
    content +
    '<div class="message-time">' +
    (m.created_at ? timeAgo(m.created_at) : 'now') +
    '</div></div>';
  el.appendChild(bubbleWrap); el.scrollTop = el.scrollHeight;
}

export async function sendMessage() {
  var input = document.getElementById('chat-input');
  var content = input.value.trim();
  if (!content && !window.pendingVoiceBlob) return;
  var msgData = { conversationId: window.currentConvId, senderId: userId, content: content || '🎤 Voice message' };
  if (window.pendingVoiceBlob) {
    var fd = new FormData(); fd.append('file', window.pendingVoiceBlob, 'voice.webm');
    try {
      var r = await fetch(API + '/upload/chat', { method: 'POST', headers: authHeaders(), body: fd });
      var d = await r.json(); if (!r.ok) throw new Error(d.error);
      msgData.content = d.url;
    } catch (err) { return toast('Voice upload failed', 'error'); }
    finally { 
      window.pendingVoiceBlob = null; 
      if (typeof updateChatInputUI === 'function') updateChatInputUI(); 
    }
  }
  if (socket) socket.emit('send_message', msgData);
  appendBubble({ sender_id: userId, content: msgData.content, created_at: new Date() });
  input.value = ''; 
  if (typeof updateChatInputUI === 'function') updateChatInputUI();
}

export function applyWallpaperStyle(wallpaper) {
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

export function updateChatInputUI() {
  var micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.style.color = window.isVoiceRecording ? 'var(--red)' : 'var(--text2)';
    micBtn.innerHTML = window.isVoiceRecording ? '⏹' : '🎤';
  }
  var sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    var input = document.getElementById('chat-input');
    sendBtn.disabled = !(input.value.trim() || window.pendingVoiceBlob);
  }
}

export async function toggleMicRecording() {
  if (!navigator.mediaDevices) return toast('Media devices not supported', 'error');
  window.isVoiceRecording = !window.isVoiceRecording;
  updateChatInputUI();
  if (window.isVoiceRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        window.pendingVoiceBlob = new Blob(audioChunks, { type: 'audio/webm' });
        window.isVoiceRecording = false; 
        updateChatInputUI();
      };
      mediaRecorder.start();
      window._currentRecorder = mediaRecorder;
    } catch (e) { 
      window.isVoiceRecording = false; 
      updateChatInputUI(); 
      toast('Mic access denied', 'error'); 
    }
  } else { 
    if (window._currentRecorder && window._currentRecorder.state === 'recording') window._currentRecorder.stop(); 
  }
}

export async function openNewChatModal() {
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

export async function handleNewChatAction(type) {
  var checks = document.querySelectorAll('.new-chat-check:checked');
  if (checks.length === 0) return toast('Please select at least one person', 'info');

  var selectedIds = Array.from(checks).map(c => c.value);
  
  if (type === 'community') {
    closeNewChatModal();
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
    closeNewChatModal();
    var msg = window.prompt("Message to send to all selected (" + selectedIds.length + "):");
    if (!msg) return;

    toast('Sending messages...', 'info');
    let successCount = 0;
    for (let i = 0; i < selectedIds.length; i++) {
        try {
            var r = await fetch(API + '/conversations', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
                body: JSON.stringify({ participantIds: [selectedIds[i]] })
            });
            var d = await r.json();
            if (!r.ok) continue;

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

export function closeNewChatModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  var modal = document.getElementById('new-chat-modal');
  if (modal) modal.style.display = 'none';
}

export async function openDirectChat(peerId, peerName) {
  try {
    if (typeof switchTab2 === 'function') switchTab2('chat');
    
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

// Attach to window
window.currentConvId = currentConvId;
window.pendingVoiceBlob = pendingVoiceBlob;
window.isVoiceRecording = isVoiceRecording;
window.isUploadingMedia = isUploadingMedia;
window.loadConversations = loadConversations;
window.openChatThread = openChatThread;
window.closeChatThread = closeChatThread;
window.appendBubble = appendBubble;
window.sendMessage = sendMessage;
window.toggleMicRecording = toggleMicRecording;
window.updateChatInputUI = updateChatInputUI;
window.openNewChatModal = openNewChatModal;
window.closeNewChatModal = closeNewChatModal;
window.handleNewChatAction = handleNewChatAction;
window.openDirectChat = openDirectChat;
window.applyWallpaperStyle = applyWallpaperStyle;
