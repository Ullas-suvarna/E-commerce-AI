'use client';

import React from 'react';
import { Zap, Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-5 animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Glow Effect */}
        <div className="absolute w-24 h-24 bg-indigo-600/30 blur-2xl rounded-full animate-pulse" />

        {/* Outer Rotating Ring */}
        <div className="w-20 h-20 rounded-3xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />

        {/* Center Logo Icon */}
        <div className="absolute w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/40">
          <Zap className="w-6 h-6 text-white animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center justify-center space-x-2">
          <span>Loading AI Return Intelligence</span>
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
        </h3>
        <p className="text-xs text-slate-400">Synchronizing workspace analytics & models...</p>
      </div>
    </div>
  );
}
