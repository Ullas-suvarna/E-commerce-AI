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
  TrendingUp,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
  Zap,
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
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200/80 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Return Intelligence Dashboard
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1 animate-pulse" />
                Live Firestore Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Calculated dynamically from real Cloud Firestore returns dataset
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
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
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Returns</span>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {summaryMetrics.totalReturns}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Total store returns recorded</p>
                </div>
              </div>

              {/* Metric 2: Analyzed Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analyzed Returns</span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                    {summaryMetrics.analyzedReturns}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    <strong className="text-emerald-700">{summaryMetrics.analyzedPercentage}%</strong> of total returns
                  </p>
                </div>
              </div>

              {/* Metric 3: Pending Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Returns</span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
                    {summaryMetrics.pendingReturns}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Awaiting AI categorization</p>
                </div>
              </div>

              {/* Metric 4: High Severity Returns */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">High / Critical Severity</span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
                    {summaryMetrics.highSeverityReturns}
                  </div>
                  <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Require factory intervention</p>
                </div>
              </div>

              {/* Metric 5: Number of Problematic Products */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Problematic SKUs</span>
                  <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 group-hover:scale-110 transition-transform">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600 tracking-tight">
                    {summaryMetrics.numberOfProblematicProducts}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Products with recurring issues</p>
                </div>
              </div>
            </div>

            {/* Main Content Grid (Responsive 3 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2 Cols): Problematic Products & Top Reasons */}
              <div className="lg:col-span-2 space-y-6">
                {/* Top Problematic Products Leaderboard */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Top Problematic Products</h3>
                        <p className="text-xs text-slate-500">Products generating the most customer returns</p>
                      </div>
                    </div>
                    <Link href="/products" className="text-xs text-indigo-600 font-bold hover:underline flex items-center">
                      <span>View Catalog</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>

                  {summaryMetrics.topProblematicProducts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-3">No problematic products identified yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {summaryMetrics.topProblematicProducts.slice(0, 4).map((prod, idx) => (
                        <div
                          key={prod.sku}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-100/80 hover:border-slate-300 transition"
                        >
                          <div className="flex items-start space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 shadow-sm mt-0.5">
                              #{idx + 1}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{prod.name}</h4>
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] font-mono text-indigo-600 font-semibold">{prod.sku}</span>
                                <span className="text-[11px] text-slate-400">•</span>
                                <span className="text-[11px] text-slate-500 font-medium">{prod.category}</span>
                              </div>
                              <p className="text-[11px] text-amber-800">
                                Primary Cause: <strong className="font-semibold text-slate-900">{prod.topReason}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-200 pt-2.5 sm:pt-0">
                            <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                              {prod.returnCount} Returns
                            </span>
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold mt-1.5 ${
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
                <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Top Return Reasons Frequency</h3>
                        <p className="text-xs text-slate-500">Distribution of return categories across orders</p>
                      </div>
                    </div>
                    <Link href="/analytics" className="text-xs text-indigo-600 font-bold hover:underline">
                      Analytics Charts
                    </Link>
                  </div>

                  <div className="space-y-4 pt-1">
                    {summaryMetrics.topReturnReasons.slice(0, 4).map((rsn) => (
                      <div key={rsn.reason} className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-700">
                          <span className="font-semibold">{rsn.reason}</span>
                          <span className="font-bold text-indigo-600">
                            {rsn.count} returns ({rsn.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
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
                <div className="glass-panel p-6 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center space-x-1.5 shadow-xs">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>AI Insights Summary</span>
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {summaryMetrics.aiInsightsCount} Recommendations
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">Firebase AI Logic Pattern Engine</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Client-side Gemini API structure is configured on the free Spark plan to extract root causes and supplier recommendations directly from customer feedback.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-indigo-100/80 flex justify-end">
                    <Link
                      href="/ai-insights"
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 group"
                    >
                      <span>Explore AI Insights Hub</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Recent Returns Activity Stream */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900">Recent Customer Returns</h3>
                    </div>
                    <Link href="/returns" className="text-xs text-indigo-600 font-bold hover:underline">
                      View All
                    </Link>
                  </div>

                  <div className="space-y-3.5">
                    {summaryMetrics.recentReturns.map((ret) => (
                      <Link
                        key={ret.id}
                        href={`/returns/${ret.id}`}
                        className="block p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 transition group shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-indigo-600 font-bold group-hover:underline">{ret.id}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{ret.returnDate}</span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 truncate mt-1.5">{ret.productName}</h4>

                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-1.5 italic bg-white p-2.5 rounded-xl border border-slate-200/60">
                          &quot;{ret.customerComment}&quot;
                        </p>

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-semibold">{ret.reasonCategory}</span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
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
