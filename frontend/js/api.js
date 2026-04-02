// API Configuration
var API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://skill-connect-backend.onrender.com';

var token = localStorage.getItem('sc_token') || '';
var userId = localStorage.getItem('sc_userId') || '';
var userName = '';

function authHeaders() {
  return { 'Authorization': 'Bearer ' + token };
}
