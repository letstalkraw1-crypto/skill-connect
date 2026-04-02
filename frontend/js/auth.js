// Authentication and Profile Logic

async function handleLogin(e) {
  if (e) e.preventDefault();
  var b = document.getElementById('btn-login');
  b.innerHTML = '<span class="spinner"></span>'; b.disabled = true;
  var email = document.getElementById('login-email').value;
  var password = document.getElementById('login-password').value;
  try {
    var r = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    onLoginSuccess(d);
  } catch (err) {
    toast(err.message, 'error');
    b.innerHTML = 'Log In'; b.disabled = false;
  }
}

async function handleSignup(e) {
  if (e) e.preventDefault();
  var b = document.getElementById('btn-signup');
  b.innerHTML = '<span class="spinner"></span>'; b.disabled = true;
  var n = document.getElementById('signup-name').value;
  var em = document.getElementById('signup-email').value;
  var p = document.getElementById('signup-password').value;
  try {
    var r = await fetch(API + '/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, email: em, password: p })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    onLoginSuccess(d);
  } catch (err) {
    toast(err.message, 'error');
    b.innerHTML = 'Sign Up'; b.disabled = false;
  }
}

async function onLoginSuccess(d) {
  token = d.token; userId = d.userId;
  localStorage.setItem('sc_token', token);
  localStorage.setItem('sc_userId', userId);
  if (typeof initSocket === 'function') initSocket();
  if (typeof loadAvailableSkills === 'function') await loadAvailableSkills();
  try {
    var profileRes = await fetch(API + '/profile/' + userId, { headers: authHeaders() });
    var profileData = await profileRes.json();
    if (!profileData.onboardingComplete) { 
      if (typeof showOnboarding === 'function') showOnboarding(); 
      return; 
    }
  } catch(e) {}
  if (typeof switchTab2 === 'function') switchTab2('home');
  toast('Welcome back!', 'success');
}

function logout() {
  token = ''; userId = ''; userName = '';
  localStorage.removeItem('sc_token'); localStorage.removeItem('sc_userId');
  if (socket) { socket.disconnect(); socket = null; }
  if (typeof goScreen === 'function') goScreen('landing');
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.remove('visible');
}

// OTP Related logic
var otpRequestId = null;
async function sendLoginOtp() {
  var phone = document.getElementById('login-phone').value;
  if (!phone) return toast('Phone number required', 'error');
  var b = document.getElementById('btn-send-otp');
  b.innerHTML = '<span class="spinner"></span>'; b.disabled = true;
  try {
    var r = await fetch(API + '/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    otpRequestId = d.requestId || d.request_id;
    document.getElementById('phone-login-step1').style.display = 'none';
    document.getElementById('phone-login-step2').style.display = 'block';
    document.getElementById('otp-sent-msg').textContent = 'Code sent to ' + phone;
  } catch(err) {
    toast(err.message, 'error');
  } finally { b.innerHTML = 'Send OTP'; b.disabled = false; }
}

async function verifyLoginOtp() {
  var otp = document.getElementById('login-otp').value;
  if (otp.length < 4) return toast('Invalid OTP', 'error');
  var b = document.getElementById('btn-verify-otp');
  b.innerHTML = '<span class="spinner"></span>'; b.disabled = true;
  try {
    var r = await fetch(API + '/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: otpRequestId, code: otp })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    onLoginSuccess(d);
  } catch(err) {
    toast(err.message, 'error');
  } finally { b.innerHTML = 'Verify &amp; Log In'; b.disabled = false; }
}

function resetOtpStep() {
  document.getElementById('phone-login-step1').style.display = 'block';
  document.getElementById('phone-login-step2').style.display = 'none';
  document.getElementById('login-otp').value = '';
}
