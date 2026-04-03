// Real-time Communication
export var socket = null;

export async function initSocket() {
  if (!window.io) {
    try {
      if (!document.getElementById('socket-io-script')) {
        const sc = document.createElement('script');
        sc.id = 'socket-io-script';
        sc.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        const p = new Promise(res => {
          sc.onload = res;
          sc.onerror = () => {
            console.error('Failed to load socket.io script');
            res();
          };
        });
        document.head.appendChild(sc);
        await p;
      }
    } catch (e) {
      console.error('Failed to load socket.io', e);
      return;
    }
  }
  
  if (window.socket) window.socket.disconnect();
  
  if (typeof io !== 'undefined') {
    window.socket = io(API, { 
      auth: { token: localStorage.getItem('sc_token') || (typeof token !== 'undefined' ? token : '') } 
    });
    
    window.socket.on('new_message', function(m) {
      if (window.currentConvId && window.currentConvId === (m.conversation_id || m.conversationId)) {
        if (typeof appendBubble === 'function') appendBubble(m);
      } else {
        if (typeof toast === 'function') toast('New message from ' + (m.sender_name || 'User'), 'info');
      }
    });

    window.socket.on('notification', function(n) {
      if (typeof toast === 'function') toast(n.message, 'info');
    });

    window.socket.on('update_wallpaper', function(d) {
      if (window.currentConvId && window.currentConvId === (d.conversationId || d.conversation_id)) {
        if (typeof applyWallpaperStyle === 'function') applyWallpaperStyle(d.wallpaper);
      }
    });
  }
}

// Attach to window
window.socket = socket;
window.initSocket = initSocket;
