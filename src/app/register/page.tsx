'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Mail,
  Lock,
  Store,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [industry, setIndustry] = useState('Electronics & Tech');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Password Real-Time Validation Requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!isPasswordValid) {
      setAuthError('Password must meet all 5 security requirements listed below.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password, storeName);
      router.push(`/login?registered=true&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      console.error('Registration error:', err);
      let msg = 'Registration failed. Please check your credentials and try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in or use a different email.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password is too weak. Please include letters, numbers, and special characters.';
      }
      setAuthError(msg);
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleSubmitting(true);

    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setIsGoogleSubmitting(false);
        return;
      }
      let msg = 'Google Sign-In failed. Please try again.';
      if (err.code === 'auth/account-exists-with-different-credential') {
        msg = 'An account already exists with the same email address using a different sign-in method.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (err.message) {
        msg = err.message;
      }
      setAuthError(msg);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#03060f] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* High-Tech Cyber Tech Background Canvas */}
      <div className="absolute inset-0 z-0 bg-[#03060f] overflow-hidden pointer-events-none">
        <img
          src="/images/ai-background-clean.png"
          alt="AI Intelligence Background"
          className="w-full h-full object-cover object-center opacity-60 mix-blend-screen"
        />

        {/* 3D Holographic AI Robot Head with Interactive Dynamic Motion */}
        <div className="absolute right-0 top-0 bottom-0 h-full w-full lg:w-[50%] pointer-events-none z-0 flex items-center justify-end overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_25%)]">
          <img
            src="/images/ai-head-clean.png"
            alt="AI Robot Head"
            className="h-[92%] w-auto object-contain object-right opacity-95 transition-transform duration-200 ease-out drop-shadow-[0_0_60px_rgba(6,182,212,0.45)]"
            style={{
              transform: `translate3d(${mousePos.x * 26}px, ${mousePos.y * 20}px, 0) rotateY(${mousePos.x * 12}deg) rotateX(${mousePos.y * -10}deg)`,
            }}
          />
        </div>

        {/* Floating Mouse-Responsive Orbs */}
        <div
          className="absolute w-[550px] h-[550px] rounded-full bg-gradient-to-r from-cyan-500/20 via-indigo-600/25 to-purple-600/20 blur-[130px] transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: `calc(50% + ${mousePos.x * 300}px - 275px)`,
            top: `calc(50% + ${mousePos.y * 200}px - 275px)`,
          }}
        />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      </div>

      <div className="w-full max-w-[480px] space-y-6 relative z-10 my-auto animate-fade-in py-6">
        {/* Header Branding */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 opacity-75 blur-md group-hover:opacity-100 transition duration-300 animate-pulse"></div>
            <div className="relative w-14 h-14 rounded-2xl bg-[#0b101d] border border-cyan-500/40 flex items-center justify-center shadow-2xl">
              <Zap className="w-7 h-7 text-cyan-400 stroke-[2.5] drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-md">
            Create Workspace Account
          </h1>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#0b101d]/90 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 backdrop-blur-xl shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cloud Firestore Return Intelligence</span>
          </div>
        </div>

        {/* Outer Glowing Gradient Border Container */}
        <div className="p-[1px] rounded-[2.5rem] bg-gradient-to-b from-cyan-400/50 via-indigo-500/30 to-purple-500/50 shadow-[0_0_80px_rgba(6,182,212,0.22)]">
          {/* Main Glassmorphism Card */}
          <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 space-y-5 relative overflow-hidden">
            {authError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-xs text-rose-300 font-medium backdrop-blur-md">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 tracking-wide">Store Name</label>
                <div className="relative group">
                  <Store className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-300 transition-colors" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-[#0e1626]/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-[#121c30] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition-all duration-300 shadow-inner"
                    placeholder="e.g. Apex Gear Store"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 tracking-wide">Industry Category</label>
                <div className="relative group">
                  <ShoppingBag className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-300 transition-colors" />
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-[#0e1626]/90 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:bg-[#121c30] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition-all duration-300 shadow-inner"
                  >
                    <option value="Electronics & Tech" className="bg-[#0e1626] text-white">Electronics & Tech</option>
                    <option value="Apparel & Fashion" className="bg-[#0e1626] text-white">Apparel & Fashion</option>
                    <option value="Home & Kitchen" className="bg-[#0e1626] text-white">Home & Kitchen</option>
                    <option value="Beauty & Personal Care" className="bg-[#0e1626] text-white">Beauty & Personal Care</option>
                    <option value="General Retail" className="bg-[#0e1626] text-white">General Retail</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 tracking-wide">Work Email</label>
                <div className="relative group">
                  <Mail className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-300 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-[#0e1626]/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-[#121c30] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition-all duration-300 shadow-inner"
                    placeholder="owner@store.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 tracking-wide">Password</label>
                <div className="relative group">
                  <Lock className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-300 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3.5 bg-[#0e1626]/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-[#121c30] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition-all duration-300 shadow-inner"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-4 mt-2 rounded-2xl bg-[#03060f]/80 border border-slate-800 space-y-2 text-[11px]">
                  <div className="font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Password Security Checklist:</span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center space-x-1.5 font-semibold ${hasMinLength ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                      <span>8+ Characters</span>
                    </div>

                    <div className={`flex items-center space-x-1.5 font-semibold ${hasUppercase ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                      <span>Uppercase (A-Z)</span>
                    </div>

                    <div className={`flex items-center space-x-1.5 font-semibold ${hasLowercase ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {hasLowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                      <span>Lowercase (a-z)</span>
                    </div>

                    <div className={`flex items-center space-x-1.5 font-semibold ${hasNumber ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                      <span>Number (0-9)</span>
                    </div>

                    <div className={`col-span-2 flex items-center space-x-1.5 font-semibold ${hasSpecialChar ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                      <span>Special Character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting || !isPasswordValid}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 text-white font-black text-xs tracking-wider uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_45px_rgba(139,92,246,0.6)] flex items-center justify-center space-x-2 transition-all duration-300 transform active:scale-[0.985] cursor-pointer mt-2"
              >
                <span>{isSubmitting ? 'Creating Account & Sending Email...' : 'Initialize Store Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 rounded-full bg-[#03060f] border border-slate-800">
                OR
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0e1626]/90 hover:bg-[#131f36] border border-slate-700/90 hover:border-slate-500 text-slate-200 font-bold text-xs shadow-lg flex items-center justify-center space-x-3 transition duration-300 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0 min-w-[20px] min-h-[20px]" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleSubmitting ? 'Connecting Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs font-medium text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline transition">
            Sign In to your workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
