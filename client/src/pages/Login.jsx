import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('kirana123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await login(username, password);
    setSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 border border-[#E2E8F0]">
        {/* Brand Header */}
        <div className="text-center space-y-3">
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

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#0F172A] mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#0F172A] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden transition"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl shadow-xs hover:shadow-md flex items-center justify-center space-x-2 text-sm transition active:scale-95 cursor-pointer"
          >
            <span>{submitting ? 'Signing in...' : 'Sign In to Counter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Role Switcher */}
        <div className="pt-4 border-t border-[#E2E8F0] text-center space-y-2.5">
          <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-[0.15em]">
            Select Supermarket Role
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'kirana123')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                username === 'admin'
                  ? 'bg-emerald-50 border-emerald-500 text-[#0F172A] shadow-xs ring-1 ring-emerald-500'
                  : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>👑</span>
                <span>Store Owner</span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 leading-tight">
                Full analytics, P&L, stock management & settings
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('staff', 'staff123')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                username === 'staff'
                  ? 'bg-emerald-50 border-emerald-500 text-[#0F172A] shadow-xs ring-1 ring-emerald-500'
                  : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>🏷️</span>
                <span>Billing Staff</span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 leading-tight">
                POS fast checkout, stock intake & customer Khata
              </p>
            </button>
          </div>
        </div>

        {/* GST & Secure Footnote */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#15803D] font-medium pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
          <span>GSTIN & Khata Audit Compliant</span>
        </div>
      </div>
    </div>
  );
}
