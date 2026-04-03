// Real-time Communication
var socket = null;

async function initSocket() {
  if (!window.io) {
    try {
      // Use dynamic import for socket.io if we are bundling, 
      // but since we are using CDN for now, let's inject script if not present
      if (!document.getElementById('socket-io-script')) {
        const sc = document.createElement('script');
        sc.id = 'socket-io-script';
        sc.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        const p = new Promise(res => sc.onload = res);
        document.head.appendChild(sc);
        await p;
      }
    } catch (e) {
      console.error('Failed to load socket.io', e);
      return;
    }
  }
  
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
