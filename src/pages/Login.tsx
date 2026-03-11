import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/api';
import { ArrowRight, Mail, Lock, Shield, BarChart3, Users, Zap, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email'); return; }
    if (!password) { setError('Please enter your password'); return; }
    setLoading(true);
    setError('');

    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError('Invalid email or password. Please try again.');
    } else {
      navigate('/dashboard');
    }
  };

  const features = [
    { icon: <Shield size={22} />, title: 'Role-Based Access', desc: 'Multi-level permissions for admins, managers, brokers & employees' },
    { icon: <BarChart3 size={22} />, title: 'Real-Time Analytics', desc: 'Track applications, commissions & performance metrics live' },
    { icon: <Users size={22} />, title: 'Multi-Party Management', desc: 'Banks, NBFCs, brokers & customers — all in one place' },
    { icon: <Zap size={22} />, title: 'Streamlined Workflow', desc: 'Application to disbursement with full document tracking' },
  ];

  return (
    <div className="min-h-screen flex bg-transparent font-sans">
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden glass-panel m-4 lg:mr-2 rounded-[2.5rem]">
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full h-full">
          {/* Logo + brand */}
          <div className="flex items-center gap-3.5">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center -mt-8">
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                Management Portal
              </span>
            </div>
            <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-gray-900 dark:text-white leading-[1.15] mb-4 tracking-tight drop-shadow-sm">
              Car Loan Sales<br />
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                & Management
              </span>
            </h1>
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mb-8 font-medium">
              Complete loan lifecycle management — from lead generation to disbursement, all in one powerful platform.
            </p>

            {/* Features */}
            <div className="space-y-3.5">
              {features.map(f => (
                <div key={f.title} className="flex items-start gap-3 group">
                  <div className="shrink-0 w-9 h-9 rounded-xl glass-card flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-white/40 dark:group-hover:bg-white/10 transition-all duration-300 shadow-sm border border-white/50 dark:border-white/10">
                    {f.icon}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-0.5">{f.title}</h3>
                    <p className="text-gray-600 dark:text-slate-400 text-xs leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* APK Download - Desktop only */}
            <div className="mt-8 hidden lg:block">
              <a
                href="/finonest.apk"
                download
                className="inline-flex items-center gap-2.5 glass-card hover:bg-white/60 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 text-sm shadow-sm"
              >
                <Download size={16} className="text-blue-600 dark:text-blue-400" />
                Download Android App
              </a>
            </div>
          </div>

          <p className="text-gray-500 dark:text-slate-400 text-xs font-medium">© 2025 Finonest India. All rights reserved.</p>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-transparent">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md mb-3" />
          </div>

          {/* Card */}
          <div className="glass-card p-7 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">Welcome back</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">Sign in to continue to your dashboard</p>
            </div>

            {/* Mobile APK */}
            {!isStandalone && (
              <a
                href="/finonest.apk"
                download
                className="lg:hidden w-full flex items-center justify-center gap-2 bg-gradient-to-r from-secondary to-primary text-white font-semibold py-2.5 px-4 rounded-xl hover:shadow-lg transition-all text-sm mb-5 border border-white/20"
              >
                <Download size={16} />
                Download Android App
              </a>
            )}

            {error && (
              <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-red-100/80 dark:bg-red-900/40 border border-red-200 dark:border-red-800/40 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 drop-shadow-sm">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 drop-shadow-sm">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm backdrop-blur-md font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-secondary to-primary border border-white/20"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-200/50 dark:border-gray-700/50 text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Don't have an account?{' '}
                <a href="/signup" className="text-blue-700 dark:text-blue-400 font-bold hover:underline underline-offset-2">
                  Sign Up
                </a>
              </p>
              <a
                href="/customer-login"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary glass-card hover:bg-white/60 dark:hover:bg-white/10 transition-all shadow-sm border border-white/40 dark:border-white/10"
              >
                <Users size={16} />
                Customer Login
              </a>
            </div>
          </div>

          {/* Bottom trust */}
          <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-5 font-medium drop-shadow-sm">
            Secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
