'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';

export const NavigationLoader: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Hide loading screen when route change finishes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Intercept navigation link clicks to trigger IMMEDIATE loading overlay on click (0ms delay)
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const targetUrl = new URL(link.href);
        const targetPath = targetUrl.pathname;
        if (targetPath !== window.location.pathname || targetUrl.search !== window.location.search) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-5 animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Glow Effect */}
        <div className="absolute w-28 h-28 bg-indigo-600/30 blur-2xl rounded-full animate-pulse" />

        {/* Outer Rotating Ring */}
        <div className="w-24 h-24 rounded-3xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />

        {/* Center Logo Icon */}
        <div className="absolute w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
          <Zap className="w-7 h-7 text-white animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-base font-bold text-slate-100 tracking-wide flex items-center justify-center space-x-2">
          <span>Switching Workspace View</span>
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
        </h3>
        <p className="text-xs text-slate-400">Loading Return Intelligence analytics & charts...</p>
      </div>
    </div>
  );
};
