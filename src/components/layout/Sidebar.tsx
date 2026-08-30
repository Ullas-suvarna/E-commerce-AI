'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  RotateCcw,
  Package,
  BarChart3,
  Sparkles,
  Settings,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useData } from '@/context/DataContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const pathname = usePathname();
  const { summaryMetrics } = useData();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Returns',
      href: '/returns',
      icon: RotateCcw,
      badge: summaryMetrics.totalReturns > 0 ? summaryMetrics.totalReturns.toString() : undefined,
    },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'AI Insights', href: '/ai-insights', icon: Sparkles, highlight: true },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full bg-black border-r border-neutral-800 w-64 text-neutral-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-none text-base">
              AI Return <span className="text-indigo-400">IQ</span>
            </h1>
            <span className="text-[11px] text-neutral-400 font-medium">E-commerce Intelligence</span>
          </div>
        </Link>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span>{item.name}</span>
              </div>

              <div className="flex items-center space-x-2">
                {item.highlight && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    AI
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Spark Plan Card */}
      <div className="p-4 border-t border-neutral-800">
        <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-xs font-medium text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Firebase Spark Plan</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-snug">
            Free tier configuration active. Client-side AI Logic enabled.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 bottom-0 z-30">{content}</aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </div>
    </>
  );
};
