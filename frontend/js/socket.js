// Real-time Communication
var socket = null;

function initSocket() {
  if (!window.io) return;
  if (socket) socket.disconnect();
  socket = io(API, { auth: { token: token } });
  
  socket.on('new_message', function(m) {
    if (typeof currentConvId !== 'undefined' && currentConvId === (m.conversation_id || m.conversationId)) {
      if (typeof appendBubble === 'function') appendBubble(m);
    } else {
      if (typeof toast === 'function') toast('New message from ' + (m.sender_name || 'User'), 'info');
    }
  });

  socket.on('notification', function(n) {
    if (typeof toast === 'function') toast(n.message, 'info');
  });

  socket.on('update_wallpaper', function(d) {
    if (typeof currentConvId !== 'undefined' && currentConvId === (d.conversationId || d.conversation_id)) {
      if (typeof applyWallpaperStyle === 'function') applyWallpaperStyle(d.wallpaper);
    }
  });
}
