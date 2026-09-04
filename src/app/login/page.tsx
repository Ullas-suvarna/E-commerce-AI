'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, KeyRound, X, Eye, EyeOff, Sparkles, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function ParticleMatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particleCount = Math.min(85, Math.floor((width * height) / 16000));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.4 ? 'rgba(6, 182, 212,' : 'rgba(139, 92, 246,',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p1.color} 0.85)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p1.color.includes('6, 182') ? '#06b6d4' : '#8b5cf6';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const alpha = (1 - dist / 135) * 0.35;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${p1.color} ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        const mdx = p1.x - mouse.x;
        const mdy = p1.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 170) {
          const mAlpha = (1 - mdist / 170) * 0.65;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(6, 182, 212, ${mAlpha})`;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}

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
    <div className="min-h-screen bg-[#02050e] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* Live Animated Interactive Particle Matrix Canvas */}
      <ParticleMatrixCanvas />

      {/* Cyber Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />

      {/* 3D Holographic AI Robot Head with Interactive Dynamic Tilt */}
      <div className="absolute right-0 top-0 bottom-0 h-full w-full lg:w-[48%] pointer-events-none z-0 flex items-center justify-end overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%)]">
        <img
          src="/images/ai-head-clean.png"
          alt="AI Robot Head"
          className="h-[90%] w-auto object-contain object-right opacity-95 transition-transform duration-200 ease-out drop-shadow-[0_0_70px_rgba(6,182,212,0.5)]"
          style={{
            transform: `translate3d(${mousePos.x * 24}px, ${mousePos.y * 18}px, 0) rotateY(${mousePos.x * 10}deg) rotateX(${mousePos.y * -8}deg)`,
          }}
        />
      </div>

      {/* Mouse-Responsive Glowing Ambient Glow Orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-cyan-500/20 via-indigo-600/25 to-purple-600/20 blur-[130px] transition-all duration-300 ease-out pointer-events-none z-0"
        style={{
          left: `calc(50% + ${mousePos.x * 260}px - 250px)`,
          top: `calc(50% + ${mousePos.y * 180}px - 250px)`,
        }}
      />

      <div className="w-full max-w-[460px] space-y-6 relative z-10 my-auto animate-fade-in py-6">
        {/* Header Branding */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 opacity-75 blur-md group-hover:opacity-100 transition duration-300 animate-pulse"></div>
            <div className="relative w-14 h-14 rounded-2xl bg-[#080d1a] border border-cyan-500/40 flex items-center justify-center shadow-2xl">
              <Zap className="w-7 h-7 text-cyan-400 stroke-[2.5] drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-md">
            AI Return Intelligence
          </h1>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#080d1a]/90 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 backdrop-blur-xl shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Firebase & Cloud Firestore Connected</span>
          </div>
        </div>

        {/* Outer Glowing Border Card Container */}
        <div className="p-[1px] rounded-[2.5rem] bg-gradient-to-b from-cyan-400/50 via-indigo-500/30 to-purple-500/50 shadow-[0_0_80px_rgba(6,182,212,0.25)]">
          {/* Main Glassmorphism Card */}
          <div className="bg-[#080e1d]/90 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 space-y-6 relative overflow-hidden">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Welcome Back
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Sign in to your e-commerce return analytics workspace
              </p>
            </div>

            {/* Success Banner */}
            {successBanner && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3 text-xs text-emerald-300 font-medium backdrop-blur-md animate-fade-in">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successBanner}</span>
              </div>
            )}

            {/* Auth Error Banner */}
            {authError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-xs text-rose-300 font-medium backdrop-blur-md animate-fade-in">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 tracking-wide">Email Address</label>
                <div className="relative group">
                  <Mail className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-300 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-[#0e172a]/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-[#121f38] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition-all duration-300 shadow-inner"
                    placeholder="name@store.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 tracking-wide">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStatus(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-300 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3.5 bg-[#0e172a]/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-[#121f38] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition-all duration-300 shadow-inner"
                    placeholder="Enter your password"
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
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs tracking-wider uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_45px_rgba(139,92,246,0.6)] flex items-center justify-center space-x-2 transition-all duration-300 transform active:scale-[0.985] cursor-pointer"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 rounded-full bg-[#02050e] border border-slate-800">
                OR
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div className="space-y-3">
              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting || isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0e172a]/90 hover:bg-[#13213b] border border-slate-700/90 hover:border-slate-500 text-slate-200 font-bold text-xs shadow-lg flex items-center justify-center space-x-3 transition duration-300 cursor-pointer disabled:opacity-50"
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

              {/* Explore Demo Workspace Button */}
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2.5 transition duration-300 shadow-[0_0_25px_rgba(16,185,129,0.2)] cursor-pointer"
              >
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 stroke-[2.5]" />
                <span>Explore Demo Workspace (Instant Access)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs font-medium text-slate-400">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline transition">
            Register your store
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-[#02050e]/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="p-[1px] rounded-[2.5rem] bg-gradient-to-b from-cyan-400/50 via-indigo-500/30 to-purple-500/50 shadow-[0_0_80px_rgba(6,182,212,0.35)] w-full max-w-md">
            <div className="bg-[#080e1d]/95 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 space-y-6 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Reset Password</h3>
                    <p className="text-xs text-slate-400 font-medium">We will email you a password reset link</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowForgotModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotStatus && (
                <div
                  className={`p-4 rounded-2xl text-xs font-medium flex items-start space-x-3 ${
                    forgotStatus.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {forgotStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{forgotStatus.msg}</span>
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-[#0e172a]/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-[#121f38] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 font-medium transition"
                      placeholder="name@store.com"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="w-1/2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 transition"
                  >
                    {isSendingForgot ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#02050e]" />}>
      <LoginContent />
    </Suspense>
  );
}
