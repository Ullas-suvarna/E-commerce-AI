'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData } from '@/context/DataContext';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { CsvImportModal } from '@/components/returns/CsvImportModal';
import { EmptyState, CardSkeleton } from '@/components/ui/StateViews';

export default function DashboardPage() {
  const { returns, summaryMetrics, isLoading } = useData();
  const [importModalOpen, setImportModalOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-400 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Return Intelligence Dashboard
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600 mr-2 animate-pulse" />
                Live Firestore Sync
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 font-semibold">
              Calculated dynamically from real Cloud Firestore returns dataset
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setImportModalOpen(true)}
              className="btn-primary"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Import Return CSV</span>
            </button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : returns.length === 0 ? (
          /* Empty state handler when Firestore has 0 returns */
          <EmptyState
            title="No Firestore Return Records Found"
            description="Your Cloud Firestore return collection is empty. Import a CSV file or add a return record to compute live dashboard metrics."
            actionText="Import Return CSV"
            onAction={() => setImportModalOpen(true)}
            icon={RotateCcw}
          />
        ) : (
          <>
            {/* 5 Core Metric Cards (Responsive Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Metric 1: Total Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md hover:border-indigo-600 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Total Returns</span>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 group-hover:scale-110 transition-transform shadow-2xs">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {summaryMetrics.totalReturns}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">Total store returns recorded</p>
                </div>
              </div>

              {/* Metric 2: Analyzed Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md hover:border-emerald-600 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Analyzed Returns</span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:scale-110 transition-transform shadow-2xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
                    {summaryMetrics.analyzedReturns}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    <strong className="text-emerald-700 font-extrabold">{summaryMetrics.analyzedPercentage}%</strong> of total returns
                  </p>
                </div>
              </div>

              {/* Metric 3: Pending Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md hover:border-amber-600 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Pending Returns</span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 group-hover:scale-110 transition-transform shadow-2xs">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-amber-600 tracking-tight">
                    {summaryMetrics.pendingReturns}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">Awaiting AI categorization</p>
                </div>
              </div>

              {/* Metric 4: High Severity Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md hover:border-rose-600 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Critical Severity</span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 group-hover:scale-110 transition-transform shadow-2xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
                    {summaryMetrics.highSeverityReturns}
                  </div>
                  <p className="text-xs sm:text-sm text-rose-700 font-extrabold mt-1">Require factory intervention</p>
                </div>
              </div>

              {/* Metric 5: Number of Problematic Products */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md hover:border-cyan-600 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Problematic SKUs</span>
                  <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 group-hover:scale-110 transition-transform shadow-2xs">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-cyan-600 tracking-tight">
                    {summaryMetrics.numberOfProblematicProducts}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">Products with recurring issues</p>
                </div>
              </div>
            </div>

            {/* Main Content Grid (Responsive 3 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2 Cols): Problematic Products & Top Reasons */}
              <div className="lg:col-span-2 space-y-6">
                {/* Top Problematic Products Leaderboard */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-400 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="heading-card">Top Problematic Products</h3>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium">Products generating the most customer returns</p>
                      </div>
                    </div>
                    <Link href="/products" className="btn-ghost">
                      <span>View Catalog</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {summaryMetrics.topProblematicProducts.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-3">No problematic products identified yet.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {summaryMetrics.topProblematicProducts.slice(0, 4).map((prod, idx) => (
                        <div
                          key={prod.sku}
                          className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100 hover:border-slate-400 transition shadow-2xs"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-11 h-11 rounded-xl bg-white border border-slate-400 flex items-center justify-center text-slate-900 font-black text-sm shrink-0 shadow-sm mt-0.5">
                              #{idx + 1}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">{prod.name}</h4>
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xs font-mono text-indigo-600 font-extrabold">{prod.sku}</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs sm:text-sm text-slate-600 font-bold">{prod.category}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                                Primary Cause: <strong className="font-extrabold text-slate-900">{prod.topReason}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-300 pt-3 sm:pt-0">
                            <span className="text-xs sm:text-sm font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200 shadow-2xs">
                              {prod.returnCount} Returns
                            </span>
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-extrabold mt-1.5 ${
                                prod.riskStatus === 'Critical Issue'
                                  ? 'badge-severity-critical'
                                  : 'badge-severity-high'
                              }`}
                            >
                              {prod.riskStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Return Reasons Breakdown */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-400 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-2xs">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="heading-card">Top Return Reasons Frequency</h3>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium">Distribution of return categories across orders</p>
                      </div>
                    </div>
                    <Link href="/analytics" className="btn-ghost">
                      <span>Analytics Charts</span>
                    </Link>
                  </div>

                  <div className="space-y-4.5 pt-1">
                    {summaryMetrics.topReturnReasons.slice(0, 4).map((rsn) => (
                      <div key={rsn.reason} className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm text-slate-800">
                          <span className="font-extrabold">{rsn.reason}</span>
                          <span className="font-black text-indigo-600">
                            {rsn.count} returns ({rsn.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(rsn.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Returns Stream & AI Insights Summary */}
              <div className="space-y-6">
                {/* AI Insights Summary Card */}
                <div className="glass-panel p-6 rounded-3xl border border-indigo-400 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white shadow-sm space-y-4.5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-indigo-100/90 text-indigo-700 border border-indigo-300 flex items-center space-x-1.5 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>AI Insights Summary</span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-indigo-700 bg-white/90 px-3 py-1 rounded-xl border border-indigo-300 shadow-2xs">
                      {summaryMetrics.aiInsightsCount} Recommendations
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Firebase AI Logic Pattern Engine</h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">
                      Client-side Gemini API structure is configured on the free Spark plan to extract root causes and supplier recommendations directly from customer feedback.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-indigo-200 flex justify-end">
                    <Link
                      href="/ai-insights"
                      className="btn-ai text-sm"
                    >
                      <span>Explore AI Insights Hub</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Recent Returns Activity Stream */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-400 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-3.5">
                    <div className="flex items-center space-x-2.5">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <h3 className="heading-card">Recent Customer Returns</h3>
                    </div>
                    <Link href="/returns" className="btn-ghost">
                      <span>View All</span>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {summaryMetrics.recentReturns.map((ret) => (
                      <Link
                        key={ret.id}
                        href={`/returns/${ret.id}`}
                        className="block p-4 sm:p-4.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-300 hover:border-indigo-400 transition group shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-mono text-indigo-600 font-extrabold group-hover:underline">{ret.id}</span>
                          <span className="text-xs text-slate-600 font-bold">{ret.returnDate}</span>
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-1.5">{ret.productName}</h4>

                        <p className="text-xs sm:text-sm text-slate-700 line-clamp-2 mt-2 italic bg-white p-3 rounded-xl border border-slate-300 font-medium">
                          &quot;{ret.customerComment}&quot;
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-300">
                          <span className="text-xs text-slate-700 font-extrabold">{ret.reasonCategory}</span>
                          <span
                            className={`text-xs px-3 py-0.5 rounded-full font-extrabold ${
                              ret.severity === 'Critical'
                                ? 'badge-severity-critical'
                                : ret.severity === 'High'
                                ? 'badge-severity-high'
                                : 'badge-severity-medium'
                            }`}
                          >
                            {ret.severity}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <CsvImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </AppLayout>
  );
}
