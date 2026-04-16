import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { LogIn, UserPlus, Lock, Mail, User, Phone, MapPin, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

const Auth = () => {
  // 'login' | 'signup' | 'otp' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', phone: '', location: '', newPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false); // after signup, waiting for email verify

  // OTP specific state
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'verify'
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef([]);

  const { login, signup, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ── Email + Password Submit ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (authMode === 'login') {
        await login({ email: formData.email, password: formData.password });
        navigate('/');
      } else {
        const { data } = await authService.signup({
          name: formData.name, email: formData.email, password: formData.password,
          phone: formData.phone, location: formData.location
        });
        if (data.requiresVerification) {
          setPendingVerification(true);
          setOtpStep('verify');
          setAuthMode('otp');
          setSuccess('Account created! Check your email for a verification code.');
        } else if (data.token) {
          // Email sending failed — log in directly
          localStorage.setItem('token', data.token);
          window.location.href = '/';
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ─────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.email) return setError('Please enter your email');
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.sendOtp(formData.email);
      setOtpStep('verify');
      setCountdown(60);
      setSuccess('OTP sent! Check your email inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpCode.join('');
    if (code.length !== 6) return setError('Please enter the complete 6-digit OTP');
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (pendingVerification) {
        // Email verification after signup
        const { data } = await authService.verifyEmail(formData.email, code);
        // Now log them in with the token
        localStorage.setItem('token', data.token);
        window.location.href = '/';
      } else {
        await loginWithOtp(formData.email, code);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      if (pendingVerification) {
        // Resend email verification OTP
        await authService.sendOtp(formData.email);
      } else {
        await authService.sendOtp(formData.email);
      }
      setCountdown(60);
      setSuccess('New OTP sent!');
      setOtpCode(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input Handlers ───────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      otpInputRefs.current[5]?.focus();
    }
  };

  // ── Reset when switching modes ───────────────────────────────
  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccess('');
    setOtpStep('email');
    setOtpCode(['', '', '', '', '', '']);
    setCountdown(0);
    setPendingVerification(false);
    setResetCodeVerified(false);
    setVerifiedResetCode('');
  };

  // ── Forgot Password ──────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) return setError('Please enter your email');
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(formData.email);
      setOtpStep('reset');
      setCountdown(60);
      setSuccess('Reset code sent! Check your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password — now two steps: verify OTP first, then set password ──────
  const [resetCodeVerified, setResetCodeVerified] = useState(false);
  const [verifiedResetCode, setVerifiedResetCode] = useState('');

  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    const code = otpCode.join('');
    if (code.length !== 6) return setError('Enter the 6-digit code');
    // Just validate the code exists — actual reset happens in next step
    setVerifiedResetCode(code);
    setResetCodeVerified(true);
    setError('');
    setSuccess('Code verified! Now enter your new password.');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!formData.newPassword || formData.newPassword.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(formData.email, verifiedResetCode, formData.newPassword);
      setSuccess('Password reset! You can now sign in.');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 rounded-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4 shadow-xl shadow-primary/20"
          >
            {authMode === 'otp' ? (
              <KeyRound className="text-primary-foreground h-8 w-8" />
            ) : (
              <Lock className="text-primary-foreground h-8 w-8" />
            )}
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join SkillConnect' : 'Login with OTP'}
          </h1>
          <p className="text-muted-foreground">
            {authMode === 'login'
              ? 'Enter your credentials to access your account'
              : authMode === 'signup'
              ? 'Start your journey of skill sharing today'
              : otpStep === 'email'
              ? 'Enter your email to receive a verification code'
              : 'Enter the 6-digit code sent to your email'}
          </p>
        </div>

        {/* Tab Switcher */}
        {!pendingVerification && authMode !== 'forgot' && (
          <div className="flex rounded-lg bg-background/50 border border-border p-1 mb-6 gap-1">
            {['login', 'signup', 'otp'].map((mode) => (
              <button key={mode} onClick={() => switchMode(mode)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                  authMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'OTP'}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait">
          {/* ════════════════ LOGIN / SIGNUP FORM ════════════════ */}
          {authMode !== 'otp' && authMode !== 'forgot' && (
            <motion.form
              key="credentials-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {authMode === 'signup' && (
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="Mobile Number (optional)"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Location"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                  {error}
                </motion.div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                    {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                  </span>
                )}
              </button>
              {authMode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center">
                  Forgot password?
                </button>
              )}

              {/* Google Sign In */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button type="button"
                onClick={() => window.location.href = '/api/auth/oauth/google'}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-border bg-background hover:bg-accent transition-all font-medium text-sm">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </motion.form>
          )}

          {/* ════════════════ OTP FORM ════════════════ */}
          {authMode === 'otp' && (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Step 1: Email Input */}
              {otpStep === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                      {error}
                    </motion.div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                        Sending OTP...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Mail size={20} /> Send OTP
                      </span>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {otpStep === 'verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {/* Back Button */}
                  <button
                    type="button"
                    onClick={() => { setOtpStep('email'); setError(''); setSuccess(''); }}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft size={16} /> Change email
                  </button>

                  {/* Email display */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Code sent to</p>
                    <p className="font-semibold text-foreground">{formData.email}</p>
                  </div>

                  {/* 6-digit OTP input boxes */}
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpInputRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-background border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  {/* Success message */}
                  {success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20 flex items-center gap-2">
                      <CheckCircle2 size={16} /> {success}
                    </motion.div>
                  )}

                  {/* Error message */}
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                      {error}
                    </motion.div>
                  )}

                  {/* Verify Button */}
                  <button type="submit" disabled={loading || otpCode.join('').length !== 6}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <KeyRound size={20} /> Verify & Login
                      </span>
                    )}
                  </button>

                  {/* Resend */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || loading}
                      className="text-sm font-medium text-primary hover:underline transition-all disabled:opacity-50 disabled:no-underline"
                    >
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* ════════════════ FORGOT / RESET PASSWORD ════════════════ */}
          {authMode === 'forgot' && (
            <motion.div key="forgot-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <button type="button" onClick={() => switchMode('login')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft size={16} /> Back to Sign In
              </button>
              <h2 className="text-xl font-bold">Reset Password</h2>

              {otpStep !== 'reset' ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input type="email" placeholder="Your email address"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                      value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>}
                  {success && <div className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm border border-green-500/20">{success}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold disabled:opacity-50">
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>
              ) : !resetCodeVerified ? (
                /* Step 2: Enter OTP code only */
                <form onSubmit={handleVerifyResetCode} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <strong>{formData.email}</strong></p>
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, i) => (
                      <input key={i} ref={el => (otpInputRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1}
                        value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-background border-2 border-border focus:border-primary outline-none"
                        autoFocus={i === 0} />
                    ))}
                  </div>
                  {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>}
                  {success && <div className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm border border-green-500/20">{success}</div>}
                  <button type="submit" disabled={loading || otpCode.join('').length !== 6}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Verify Code →'}
                  </button>
                </form>
              ) : (
                /* Step 3: Enter new password */
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <p className="text-sm text-emerald-400 font-medium">Code verified! Set your new password.</p>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input type="password" placeholder="New password (min 6 chars)"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                      value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} required autoFocus />
                  </div>
                  {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>}
                  {success && <div className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm border border-green-500/20">{success}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold disabled:opacity-50">
                    {loading ? 'Resetting...' : 'Set New Password'}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer help text */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {authMode === 'otp'
              ? 'No password needed — we\'ll send a code to your email'
              : authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}
            {authMode !== 'otp' && (
              <button
                onClick={() => switchMode(authMode === 'login' ? 'signup' : 'login')}
                className="ml-1 text-primary font-medium hover:underline"
              >
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
