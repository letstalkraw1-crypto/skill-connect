// API Configuration
var API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://skill-connect-backend.onrender.com';

var token = localStorage.getItem('sc_token') || '';
var userId = localStorage.getItem('sc_userId') || '';
var userName = '';

function authHeaders() {
  var t = localStorage.getItem('sc_token') || token;
  return { 'Authorization': 'Bearer ' + t };
}
