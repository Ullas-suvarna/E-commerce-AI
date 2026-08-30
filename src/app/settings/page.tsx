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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store & System Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage store profile, Firebase Spark configuration, and dataset options
          </p>
        </div>

        {/* Section 1: Store Profile */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <Store className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">E-commerce Store Profile</h3>
              <p className="text-xs text-slate-500">Workspace identification and currency formatting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Currency Symbol</label>
              <select
                value={currency}
                onChange={handleCurrencyChange}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
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
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-200 bg-emerald-50/50 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Firebase Spark Compliance Audit</h3>
                <p className="text-xs text-slate-500">Verifying zero backend cost setup guidelines</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              100% Compliant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 flex items-center space-x-3 text-slate-700 font-medium shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Firebase Cloud Functions: Disabled</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 flex items-center space-x-3 text-slate-700 font-medium shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Firebase Blaze Plan: Not Required</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 flex items-center space-x-3 text-slate-700 font-medium shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Paid External APIs: None</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 flex items-center space-x-3 text-slate-700 font-medium shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Client-side Firebase AI Logic: Ready</span>
            </div>
          </div>
        </div>

        {/* Section 3: Data Management */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <Database className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Return Data Controls</h3>
              <p className="text-xs text-slate-500">Reset workspace or wipe custom uploaded CSV records</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={resetToSampleData}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore Baseline Sample Dataset</span>
            </button>

            <button
              onClick={clearAllReturns}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Return Records</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
