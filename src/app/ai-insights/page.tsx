'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData } from '@/context/DataContext';
import { generateProductInsights, ProductInsightResult } from '@/services/aiService';
import {
  Sparkles,
  Package,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Zap,
  Info,
  CheckCircle2,
  BarChart3,
  Layers,
} from 'lucide-react';
import { EmptyState, CardSkeleton } from '@/components/ui/StateViews';

export default function AiInsightsPage() {
  const { returns, isLoading, updateReturnRecord, showToast } = useData();

  // Aggregate product list with pre-calculated statistics
  const productList = useMemo(() => {
    const map: Record<
      string,
      {
        sku: string;
        productName: string;
        category: string;
        totalReturnCount: number;
        reasonCounts: Record<string, number>;
        reasonPercentages: Record<string, number>;
        aiSummaries: string[];
      }
    > = {};

    returns.forEach((r) => {
      const key = r.sku || r.productName;
      if (!map[key]) {
        map[key] = {
          sku: r.sku,
          productName: r.productName || r.sku,
          category: r.category || 'General',
          totalReturnCount: 0,
          reasonCounts: {},
          reasonPercentages: {},
          aiSummaries: [],
        };
      }

      const item = map[key];
      item.totalReturnCount += 1;

      const reason = r.reasonCategory || 'General Issue';
      item.reasonCounts[reason] = (item.reasonCounts[reason] || 0) + 1;

      if (r.customerComment && !item.aiSummaries.includes(r.customerComment)) {
        item.aiSummaries.push(r.customerComment);
      }
    });

    return Object.values(map).map((item) => {
      const reasonPercentages: Record<string, number> = {};
      Object.entries(item.reasonCounts).forEach(([reason, count]) => {
        reasonPercentages[reason] = item.totalReturnCount
          ? Math.round((count / item.totalReturnCount) * 100)
          : 0;
      });

      return {
        ...item,
        reasonPercentages,
      };
    }).sort((a, b) => b.totalReturnCount - a.totalReturnCount);
  }, [returns]);

  // Selected Product State
  const [selectedSku, setSelectedSku] = useState<string>(productList[0]?.sku || '');
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [insightResult, setInsightResult] = useState<ProductInsightResult | null>(null);

  const currentProduct = useMemo(() => {
    return productList.find((p) => p.sku === selectedSku) || productList[0];
  }, [productList, selectedSku]);

  const handleGenerateInsights = async () => {
    if (!currentProduct) return;

    setAiState('loading');
    setErrorMessage(null);

    try {
      // Pass pre-calculated ground-truth statistics to Gemini
      const result = await generateProductInsights({
        productName: currentProduct.productName,
        sku: currentProduct.sku,
        category: currentProduct.category,
        totalReturnCount: currentProduct.totalReturnCount,
        reasonCounts: currentProduct.reasonCounts,
        reasonPercentages: currentProduct.reasonPercentages,
        aiSummaries: currentProduct.aiSummaries.slice(0, 5),
      });

      setInsightResult(result);
      setAiState('success');

      // Update matching return records for this product so their status becomes 'Analyzed'
      const matchingReturns = returns.filter(
        (r) => r.sku === currentProduct.sku || r.productName === currentProduct.productName
      );

      const targetSeverity =
        result.priority === 'high'
          ? 'High'
          : result.priority === 'medium'
          ? 'Medium'
          : 'Low';

      for (const ret of matchingReturns) {
        await updateReturnRecord(ret.id, {
          status: 'Analyzed',
          severity: targetSeverity,
          aiAnalysis: {
            reason: result.mainRecurringProblem,
            category: currentProduct.category,
            severity: targetSeverity,
            summary: result.evidence,
            recommendedAction: result.recommendedBusinessAction,
            analyzedAt: result.generatedAt || new Date().toLocaleString(),
          },
        });
      }

      showToast(
        'success',
        'Product Analyzed',
        `Analyzed ${currentProduct.productName}. Updated ${matchingReturns.length} return records to status "Analyzed".`
      );
    } catch (err: any) {
      console.error('generateProductInsights UI Error:', err);
      setAiState('error');
      setErrorMessage(err.message || 'Failed to generate AI Business Insights.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="heading-primary">AI Executive Business Insights</h1>
            <p className="subtext-muted mt-1">
              Gemini strategic reasoning over pre-calculated ground-truth return statistics
            </p>
          </div>

          <div className="flex items-center space-x-2 text-sm font-bold">
            <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-300">
              Zero AI Hallucination Safeguard Enabled
            </span>
          </div>
        </div>

        {/* Product Selector Bar */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-400 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center">
                <Package className="w-5 h-5 text-indigo-600 mr-2" /> Select Target Product for AI Insights
              </label>
              <p className="text-sm text-slate-600 font-medium">Choose a product from your Firestore database to analyze</p>
            </div>

            {/* Product Selector Dropdown */}
            <div className="w-full md:w-[420px]">
              <select
                value={selectedSku}
                onChange={(e) => {
                  setSelectedSku(e.target.value);
                  setAiState('idle');
                  setInsightResult(null);
                }}
                className="w-full bg-white border border-slate-400 text-slate-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-600 cursor-pointer font-bold shadow-sm"
              >
                {productList.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.productName} ({p.sku}) — {p.totalReturnCount} returns
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pre-Calculated Ground-Truth Statistics Preview Card */}
        {currentProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Pre-Calculated Application Stats */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-400 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wider flex items-center">
                    <BarChart3 className="w-4.5 h-4.5 text-indigo-600 mr-2" /> Pre-Calculated Stats
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono font-extrabold">
                    Ground Truth
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900">{currentProduct.productName}</h3>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-slate-600 font-semibold">
                    <span className="font-mono text-indigo-600 font-extrabold">{currentProduct.sku}</span>
                    <span>•</span>
                    <span>{currentProduct.category}</span>
                  </div>
                </div>

                {/* Total Return Count Badge */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-1">
                  <span className="text-xs uppercase font-extrabold text-slate-500">Total Return Count</span>
                  <p className="text-3xl font-black text-slate-900">{currentProduct.totalReturnCount} <span className="text-sm text-slate-600 font-semibold">records</span></p>
                </div>

                {/* Return Reason Breakdown Table */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-sm font-extrabold text-slate-700">Return Reason Breakdown:</span>
                  <div className="space-y-2.5">
                    {Object.entries(currentProduct.reasonCounts).map(([reason, count]) => {
                      const pct = currentProduct.reasonPercentages[reason] || 0;
                      return (
                        <div key={reason} className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm space-y-1.5">
                          <div className="flex justify-between font-extrabold">
                            <span className="text-slate-800">{reason}</span>
                            <span className="text-indigo-600 font-black">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Trigger Button */}
              <button
                onClick={handleGenerateInsights}
                disabled={aiState === 'loading'}
                className="btn-ai text-sm w-full py-3.5 mt-4"
              >
                <Zap className="w-5 h-5 text-amber-300" />
                <span>{aiState === 'loading' ? 'Generating Business Insights...' : 'Generate Business Insights'}</span>
              </button>
            </div>

            {/* Column 2 & 3: AI Business Insights Output */}
            <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-400 bg-indigo-50/40 space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-indigo-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700 shadow-2xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg sm:text-xl text-slate-900">AI Strategic Insights Output</h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">Gemini Native Structured Output via Firebase AI Logic</p>
                    </div>
                  </div>

                  {insightResult && (
                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        insightResult.priority === 'high'
                          ? 'badge-severity-high'
                          : insightResult.priority === 'medium'
                          ? 'badge-severity-medium'
                          : 'badge-severity-low'
                      }`}
                    >
                      Priority: {insightResult.priority}
                    </span>
                  )}
                </div>

                {/* Loading State */}
                {aiState === 'loading' && (
                  <div className="p-12 rounded-2xl bg-white border border-indigo-300 text-center space-y-4 animate-pulse my-auto shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
                      <Sparkles className="w-7 h-7 animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-extrabold text-indigo-900">Analyzing Return Ground Truth Data...</h4>
                      <p className="text-sm text-slate-600 max-w-md mx-auto font-medium">
                        Gemini is formulating main recurring problem, evidence, recommended action, and priority score.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State with Retry Button */}
                {aiState === 'error' && (
                  <div className="p-6 rounded-2xl bg-rose-50 border border-rose-300 space-y-4 my-auto">
                    <div className="flex items-start space-x-3 text-sm text-rose-900">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold">AI Insights Generation Error</h4>
                        <p className="mt-1 text-rose-700/90 leading-relaxed font-medium">{errorMessage}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-200 flex justify-end">
                      <button
                        onClick={handleGenerateInsights}
                        className="btn-danger text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry AI Insights</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Success State - Render 4 Structured Output Fields */}
                {(aiState === 'success' || insightResult) && insightResult && (
                  <div className="space-y-6 animate-fade-in">
                    {/* 1. Main Recurring Problem */}
                    <div className="space-y-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wider flex items-center">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" /> 1. Main Recurring Problem
                      </span>
                      <p className="text-base font-extrabold text-slate-900 bg-white p-5 rounded-2xl border border-slate-300 leading-relaxed shadow-sm">
                        {insightResult.mainRecurringProblem}
                      </p>
                    </div>

                    {/* 2. Evidence */}
                    <div className="space-y-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wider flex items-center">
                        <BarChart3 className="w-4 h-4 text-indigo-600 mr-2" /> 2. Ground-Truth Evidence
                      </span>
                      <p className="text-xs sm:text-sm text-slate-800 bg-white p-5 rounded-2xl border border-slate-300 leading-relaxed font-mono font-semibold shadow-sm">
                        {insightResult.evidence}
                      </p>
                    </div>

                    {/* 3. Recommended Business Action */}
                    <div className="space-y-2">
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-800 uppercase tracking-wider flex items-center">
                        <Lightbulb className="w-4.5 h-4.5 text-emerald-600 mr-2" /> 3. Recommended Business Action
                      </span>
                      <p className="text-xs sm:text-sm text-emerald-950 bg-emerald-50 p-5 rounded-2xl border border-emerald-300 leading-relaxed font-bold shadow-sm">
                        {insightResult.recommendedBusinessAction}
                      </p>
                    </div>

                    {/* 4. Priority Level Footer */}
                    <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-700 shadow-sm font-semibold">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span>4. Action Priority Level: <strong className="text-slate-900 uppercase font-black">{insightResult.priority} PRIORITY</strong></span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Generated: {insightResult.generatedAt || 'Just now'}</span>
                    </div>
                  </div>
                )}

                {/* Idle State */}
                {aiState === 'idle' && !insightResult && (
                  <div className="p-12 rounded-2xl bg-white border border-slate-300 text-center space-y-3 my-auto shadow-sm">
                    <Zap className="w-12 h-12 text-indigo-600 mx-auto opacity-90" />
                    <h4 className="text-base font-extrabold text-slate-900">AI Business Insights Ready</h4>
                    <p className="text-sm text-slate-600 max-w-md mx-auto font-medium">
                      Click <strong>[Generate Business Insights]</strong> to trigger Gemini reasoning over ground-truth return statistics.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
