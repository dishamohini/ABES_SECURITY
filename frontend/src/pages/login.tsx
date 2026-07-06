import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, KeyRound, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import abesLogo from '../assets/abes_logo.png';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change Password States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changeEmail, setChangeEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please start the backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeEmail || !currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: changeEmail,
          currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccessMessage(data.message);
      setChangeEmail('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setIsChangingPassword(false);
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Theme Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-glass border border-white/10 relative overflow-hidden">
        
        {/* Logo and title header bar (spans complete width of the card) */}
        <div className="mx-[-2rem] mt-[-2rem] mb-6 px-8 py-5 bg-slate-950/20 dark:bg-slate-950/40 border-b border-slate-100 dark:border-white/5 flex items-center gap-4">
          <img src={abesLogo} alt="ABES Logo" className="h-16 w-auto object-contain shrink-0" />
          <div className="text-left min-w-0">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight uppercase font-sans">ABES GATE SECURITY</h2>
            <p className="text-[11px] text-slate-400 font-bold tracking-wider mt-0.5 leading-normal uppercase">Gate & Visitor Management</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start gap-2.5 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex items-start gap-2.5 mb-6">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-xs text-emerald-300 font-medium leading-relaxed">{successMessage}</span>
          </div>
        )}

        {!isChangingPassword ? (
          <>
            {/* Login form */}
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="operator@abes.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(true);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 hover:underline font-semibold"
                  >
                    Change password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-glow hover:shadow-none transition-all duration-300 mt-2 text-sm uppercase tracking-wider"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Authenticate'}
              </button>
            </form>


          </>
        ) : (
          <>
            {/* Change Password form */}
            <form onSubmit={handleChangePasswordSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="faculty@abes.edu.in"
                    value={changeEmail}
                    onChange={(e) => setChangeEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 font-semibold rounded-xl text-xs uppercase"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-glow text-xs uppercase"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Update Password'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Quick Testing Personas */}
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
          <div className="text-center">
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-0.5 rounded-full">
              Quick Test Personas
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('guard1@abes.edu.in', 'guard123')}
              className="flex justify-between items-center px-4 py-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl hover:border-brand-500/50 transition text-left text-xs"
            >
              <div>
                <p className="font-semibold text-slate-200">Security Guard (Gate operator)</p>
                <p className="text-[10px] text-slate-500">guard1@abes.edu.in</p>
              </div>
              <span className="text-[10px] font-medium text-brand-400">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('hod.cs@abes.edu.in', 'faculty123')}
              className="flex justify-between items-center px-4 py-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl hover:border-brand-500/50 transition text-left text-xs"
            >
              <div>
                <p className="font-semibold text-slate-200">HOD / Approver (Faculty)</p>
                <p className="text-[10px] text-slate-500">hod.cs@abes.edu.in</p>
              </div>
              <span className="text-[10px] font-medium text-brand-400">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('admin@abes.edu.in', 'admin123')}
              className="flex justify-between items-center px-4 py-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl hover:border-brand-500/50 transition text-left text-xs"
            >
              <div>
                <p className="font-semibold text-slate-200">Security Admin (Oversight/Settings)</p>
                <p className="text-[10px] text-slate-500">admin@abes.edu.in</p>
              </div>
              <span className="text-[10px] font-medium text-brand-400">Fill</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
