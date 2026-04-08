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
      await authService.sendOtp(formData.email);
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

  // ── Reset Password ───────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const code = otpCode.join('');
    if (code.length !== 6) return setError('Enter the 6-digit code');
    if (!formData.newPassword || formData.newPassword.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(formData.email, code, formData.newPassword);
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
                      placeholder="Phone Number"
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
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <strong>{formData.email}</strong></p>
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, i) => (
                      <input key={i} ref={el => (otpInputRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1}
                        value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-background border-2 border-border focus:border-primary outline-none"
                        autoFocus={i === 0} />
                    ))}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <input type="password" placeholder="New password (min 6 chars)"
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                      value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} required />
                  </div>
                  {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>}
                  {success && <div className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm border border-green-500/20">{success}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold disabled:opacity-50">
                    {loading ? 'Resetting...' : 'Reset Password'}
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
