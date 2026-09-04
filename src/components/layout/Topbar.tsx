'use client';

import React, { useState } from 'react';
import { Menu, Search, Upload, CloudUpload, LogOut, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onOpenImportModal: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu, onOpenImportModal }) => {
  const { user, logout } = useAuth();
  const { filterState, setFilterState, syncAllReturnsToFirestore, isLoading } = useData();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  const handleConfirmSignout = async () => {
    setShowSignoutConfirm(false);
    setUserDropdownOpen(false);
    await logout();
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-400 px-4 lg:px-8 flex items-center justify-between shadow-2xs">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Bar */}
          <div className="relative w-52 sm:w-80 md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search return ID, SKU, customer..."
              value={filterState.searchQuery}
              onChange={(e) => setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-100/90 border border-slate-400 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-3">
          {/* Sync All Local Data to Firestore Button */}
          <button
            onClick={() => syncAllReturnsToFirestore()}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-300 text-sm font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            title="Push all local & imported return dataset to Cloud Firestore"
          >
            <CloudUpload className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Sync to Firestore</span>
          </button>

          {/* CSV Import Button */}
          <button
            onClick={onOpenImportModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-800 border border-indigo-300 text-sm font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          {/* System Status Pill */}
          <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-800 font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Spark Connected</span>
          </div>

          {/* User Account Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-300 transition active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-extrabold text-slate-900 leading-tight">
                  {user?.storeName || 'My Store'}
                </div>
                <div className="text-xs text-slate-600 font-semibold">{user?.email || 'admin@store.com'}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
            </button>

            {/* User Dropdown */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.storeName}</p>
                  <p className="text-[11px] text-slate-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setShowSignoutConfirm(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      {showSignoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Sign Out</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to sign out of your AI Return Intelligence store workspace?
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowSignoutConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignout}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
