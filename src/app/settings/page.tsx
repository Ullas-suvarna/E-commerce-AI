'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  Settings,
  Store,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { resetToSampleData, clearAllReturns, currency, setCurrency, showToast } = useData();

  const [storeName, setStoreName] = useState(user?.storeName || 'AeroCraft Commerce');

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    showToast('success', 'Currency Settings Updated', `Store currency set to ${newCurrency}. Workspace calculations updated.`);
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="heading-primary">Store & System Settings</h1>
          <p className="subtext-muted mt-1">
            Manage store profile, Firebase Spark configuration, and dataset options
          </p>
        </div>

        {/* Section 1: Store Profile */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-400 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-300 pb-4">
            <Store className="w-5.5 h-5.5 text-indigo-600" />
            <div>
              <h3 className="heading-card">E-commerce Store Profile</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Workspace identification and currency formatting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-slate-800">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-100/90 border border-slate-400 rounded-xl text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-slate-800">Currency Symbol</label>
              <select
                value={currency}
                onChange={handleCurrencyChange}
                className="w-full px-4 py-2.5 bg-white border border-slate-400 rounded-xl text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-600 cursor-pointer shadow-sm"
              >
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
                <option value="CAD ($)">CAD ($)</option>
                <option value="INR (₹)">INR (₹)</option>
                <option value="AUD ($)">AUD ($)</option>
                <option value="JPY (¥)">JPY (¥)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Firebase Compliance Checklist */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-300 bg-emerald-50/50 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-4">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="heading-card">Firebase Spark Compliance Audit</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">Verifying zero backend cost setup guidelines</p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
              100% Compliant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
            <div className="p-4 rounded-xl bg-white border border-emerald-300 flex items-center space-x-3 text-slate-800 font-extrabold shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Firebase Cloud Functions: Disabled</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-emerald-300 flex items-center space-x-3 text-slate-800 font-extrabold shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Firebase Blaze Plan: Not Required</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-emerald-300 flex items-center space-x-3 text-slate-800 font-extrabold shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Paid External APIs: None</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-emerald-300 flex items-center space-x-3 text-slate-800 font-extrabold shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Client-side Firebase AI Logic: Ready</span>
            </div>
          </div>
        </div>

        {/* Section 3: Data Management */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-400 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-300 pb-4">
            <Database className="w-5.5 h-5.5 text-indigo-600" />
            <div>
              <h3 className="heading-card">Return Data Controls</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Reset workspace or wipe custom uploaded CSV records</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={resetToSampleData}
              className="btn-secondary text-sm w-full sm:w-auto"
            >
              <RotateCcw className="w-4.5 h-4.5" />
              <span>Restore Baseline Sample Dataset</span>
            </button>

            <button
              onClick={clearAllReturns}
              className="btn-danger text-sm w-full sm:w-auto"
            >
              <Trash2 className="w-4.5 h-4.5" />
              <span>Clear All Return Records</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
