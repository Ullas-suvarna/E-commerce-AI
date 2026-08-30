'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, loginWithGoogle, resetPassword, loginDemoUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSendingForgot, setIsSendingForgot] = useState(false);

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

  useEffect(() => {
    const isRegistered = searchParams.get('registered');
    const paramEmail = searchParams.get('email');

    if (paramEmail) {
      setEmail(paramEmail);
    }

    if (isRegistered === 'true') {
      setSuccessBanner('Account registered successfully! A verification email has been sent. Please sign in below.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessBanner(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Authentication failed. Please check your email and password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again or click "Forgot Password?".';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Access disabled due to many failed attempts. Reset your password or try again later.';
      }
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSuccessBanner(null);
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

  const handleDemoLogin = () => {
    setIsSubmitting(true);
    loginDemoUser();
    router.push('/dashboard');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsSendingForgot(true);
    setForgotStatus(null);

    try {
      await resetPassword(forgotEmail);
      setForgotStatus({
        type: 'success',
        msg: `Password reset email sent to ${forgotEmail}. Please check your inbox!`,
      });
    } catch (err: any) {
      setForgotStatus({
        type: 'error',
        msg: err.message || 'Failed to send password reset email. Please check your email address.',
      });
    } finally {
      setIsSendingForgot(false);
    }
  };

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

      <div className="w-full max-w-[440px] space-y-5 relative z-10 my-auto animate-fade-in py-6">
        {/* Header Icon & Titles */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#5850ec] items-center justify-center shadow-lg shadow-indigo-500/30 mb-0.5">
            <Zap className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            AI Return Intelligence
          </h1>
          <p className="text-[11px] font-semibold text-slate-600/90">
            Firebase Authentication & Cloud Firestore Connected
          </p>
        </div>

        {/* Main Glass White Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-2xl shadow-indigo-900/10 p-7 sm:p-9 space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs font-medium text-slate-500">
              Sign in to your e-commerce return analytics workspace
            </p>
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Auth Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Email Address</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#f8fafc] border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                  placeholder="name@store.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotStatus(null);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-[#5850ec] hover:text-indigo-700 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[#f8fafc] border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                  placeholder="Enter your password"
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3.5 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="space-y-2.5">
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm flex items-center justify-center space-x-2.5 transition duration-200 cursor-pointer disabled:opacity-50"
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

            {/* Explore Demo Workspace Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3 px-4 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition"
            >
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 stroke-[2.5]" />
              <span>Explore Demo Workspace (Instant Access)</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs font-semibold text-slate-600">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="text-[#5850ec] font-bold hover:underline">
            Register your store
          </Link>
        </p>
      </div>

      {/* Clean Light Theme Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500 font-medium">We will email you a password reset link</p>
                </div>
              </div>

              <button
                onClick={() => setShowForgotModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotStatus && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-medium flex items-start space-x-3 ${
                  forgotStatus.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {forgotStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{forgotStatus.msg}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition"
                    placeholder="name@store.com"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-1/2 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingForgot}
                  className="w-1/2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition"
                >
                  {isSendingForgot ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <LoginContent />
    </Suspense>
  );
}
