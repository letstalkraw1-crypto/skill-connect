// API Configuration
export var API = window.location.origin + '/api';

export var token = localStorage.getItem('sc_token') || '';
export var userId = localStorage.getItem('sc_userId') || '';
export var userName = '';

export function authHeaders() {
  var t = localStorage.getItem('sc_token') || token;
  return { 'Authorization': 'Bearer ' + t };
}

// Attach to window just to be safe
window.API = API;
window.token = token;
window.userId = userId;
window.userName = userName;
window.authHeaders = authHeaders;
