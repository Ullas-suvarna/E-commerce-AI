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
    <div className="min-h-screen bg-[#eef2ff] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Clean Cyber Background Layer */}
      <div className="absolute inset-0 z-0 bg-[#eef2ff] overflow-hidden pointer-events-none">
        <img
          src="/images/ai-login-bg-clean.jpg"
          alt="AI Intelligence Background"
          className="w-full h-full object-cover object-center opacity-90"
        />

        {/* Single Interactive AI Robot Head Layer - Rotates & Tilts with Mouse Movement */}
        <div className="absolute right-0 top-0 bottom-0 h-full w-full lg:w-[48%] pointer-events-none z-0 flex items-center justify-end overflow-hidden">
          <img
            src="/images/ai-head-standalone.jpg"
            alt="AI Robot Head"
            className="h-full w-auto object-cover object-left opacity-95 transition-transform duration-150 ease-out mix-blend-multiply"
            style={{
              transform: `translate3d(${mousePos.x * 22}px, ${mousePos.y * 16}px, 0) rotateY(${mousePos.x * 8}deg) rotateX(${mousePos.y * -6}deg)`,
            }}
          />
        </div>

        {/* Soft Dynamic Ambient Glow */}
        <div
          className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/10 blur-[100px] transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: `calc(50% + ${mousePos.x * 250}px - 225px)`,
            top: `calc(50% + ${mousePos.y * 150}px - 225px)`,
          }}
        />
      </div>

      <div className="w-full max-w-[460px] space-y-5 relative z-10 my-auto animate-fade-in py-6">
        {/* Header Icon & Titles */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#5850ec] items-center justify-center shadow-lg shadow-indigo-500/30 mb-0.5">
            <Zap className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Create Workspace Account
          </h1>
          <p className="text-[11px] font-semibold text-slate-600/90">
            Connect your store with Cloud Firestore Return Intelligence
          </p>
        </div>

        {/* Main Glass White Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-2xl shadow-indigo-900/10 p-7 sm:p-9 space-y-4">
          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Store Name</label>
              <div className="relative">
                <Store className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                  placeholder="e.g. Apex Gear Store"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Industry Category</label>
              <div className="relative">
                <ShoppingBag className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                >
                  <option value="Electronics & Tech">Electronics & Tech</option>
                  <option value="Apparel & Fashion">Apparel & Fashion</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                  <option value="General Retail">General Retail</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Work Email</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                  placeholder="owner@store.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Password</label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 mt-2 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-600 mb-1">Password Requirements:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`flex items-center space-x-1.5 font-semibold ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    <span>8+ Characters</span>
                  </div>

                  <div className={`flex items-center space-x-1.5 font-semibold ${hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Uppercase (A-Z)</span>
                  </div>

                  <div className={`flex items-center space-x-1.5 font-semibold ${hasLowercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasLowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Lowercase (a-z)</span>
                  </div>

                  <div className={`flex items-center space-x-1.5 font-semibold ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Number (0-9)</span>
                  </div>

                  <div className={`col-span-2 flex items-center space-x-1.5 font-semibold ${hasSpecialChar ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Special Character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting || !isPasswordValid}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition mt-2"
            >
              <span>{isSubmitting ? 'Creating Account & Sending Email...' : 'Initialize Store Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-xs shadow-sm flex items-center justify-center space-x-3 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

        <p className="text-center text-xs font-semibold text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">
            Sign In to your workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
