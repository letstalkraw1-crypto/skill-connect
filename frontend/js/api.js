// API Configuration
var API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : window.location.origin;

var token = localStorage.getItem('sc_token') || '';
var userId = localStorage.getItem('sc_userId') || '';
var userName = '';

function authHeaders() {
  var t = localStorage.getItem('sc_token') || token;
  return { 'Authorization': 'Bearer ' + t };
}
