'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CsvImportModal } from '@/components/returns/CsvImportModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useData } from '@/context/DataContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { toasts, removeToast } = useData();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
          <Topbar
            onOpenMobileMenu={() => setMobileOpen(true)}
            onOpenImportModal={() => setImportModalOpen(true)}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>

        {/* CSV Importer Modal */}
        <CsvImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />

        {/* Toast Notification Container */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl animate-slide-up transition-all ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                  : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">{toast.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
};
