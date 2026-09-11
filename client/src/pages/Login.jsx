import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, UserPlus, LogIn, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // Mode: 'signin' or 'register'
  const [mode, setMode] = useState('signin');

  // Sign In Form State (Empty by default - no autofill)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Form State (Empty by default)
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('staff');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSwitchMode = (targetMode) => {
    setMode(targetMode);
    setError('');
    setSuccessMsg('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const res = await login(username.trim(), password);
    setSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Sign in failed. Please verify credentials.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword) {
      setError('Username and password are required.');
      return;
    }

    if (regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const res = await register({
      name: regName.trim() || regUsername.trim(),
      username: regUsername.trim(),
      password: regPassword,
      role: regRole
    });

    setSubmitting(false);

    if (res.success) {
      setSuccessMsg('Account registered successfully! Redirecting to counter...');
      setTimeout(() => {
        navigate('/');
      }, 700);
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-6 sm:p-8 space-y-5 border border-[#E2E8F0]">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" showText={true} />
          </div>
          <div>
            <p className="text-xs text-[#15803D] font-bold tracking-wide mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
              Simplify. Manage. Grow.
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">
              Store management operating system for Owner & Counter Staff
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('register')}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Register User</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#0F172A] mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0F172A] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl shadow-xs hover:shadow-md flex items-center justify-center space-x-2 text-sm transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In to Counter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className="text-[11px] text-[#64748B] hover:text-[#15803D] font-medium transition cursor-pointer"
              >
                Don't have an account? <span className="font-bold text-[#15803D] underline">Register New User</span>
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#0F172A] mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0F172A] mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                  placeholder="Choose a unique username"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block font-bold text-[#0F172A] mb-1.5">Supermarket Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('staff')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    regRole === 'staff'
                      ? 'bg-emerald-50 border-emerald-500 text-[#0F172A] ring-1 ring-emerald-500'
                      : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-[#0F172A] flex items-center gap-1">
                    <span>🏷️</span>
                    <span>Billing Staff</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-0.5">POS & billing counter</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('owner')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    regRole === 'owner'
                      ? 'bg-emerald-50 border-emerald-500 text-[#0F172A] ring-1 ring-emerald-500'
                      : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-[#0F172A] flex items-center gap-1">
                    <span>👑</span>
                    <span>Store Owner</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Full admin & reports</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0F172A] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                  placeholder="At least 4 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0F172A] mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-xl shadow-xs hover:shadow-md flex items-center justify-center space-x-2 text-sm transition active:scale-95 cursor-pointer disabled:opacity-60 mt-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Registering...' : 'Register & Access Counter'}</span>
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="text-[11px] text-[#64748B] hover:text-[#15803D] font-medium transition cursor-pointer"
              >
                Already have an account? <span className="font-bold text-[#15803D] underline">Sign In here</span>
              </button>
            </div>
          </form>
        )}

        {/* GST & Secure Footnote */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#15803D] font-medium pt-2 border-t border-[#E2E8F0]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
          <span>GSTIN & Khata Audit Compliant</span>
        </div>
      </div>
    </div>
  );
}
