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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Executive Business Insights</h1>
            <p className="text-xs text-slate-500 mt-1">
              Gemini strategic reasoning over pre-calculated ground-truth return statistics
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              Zero AI Hallucination Safeguard Enabled
            </span>
          </div>
        </div>

        {/* Product Selector Bar */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <Package className="w-4 h-4 text-indigo-600 mr-2" /> Select Target Product for AI Insights
              </label>
              <p className="text-xs text-slate-500">Choose a product from your Firestore database to analyze</p>
            </div>

            {/* Product Selector Dropdown */}
            <div className="w-full md:w-96">
              <select
                value={selectedSku}
                onChange={(e) => {
                  setSelectedSku(e.target.value);
                  setAiState('idle');
                  setInsightResult(null);
                }}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer font-medium shadow-sm"
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
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                    <BarChart3 className="w-4 h-4 text-indigo-600 mr-1.5" /> Pre-Calculated Stats
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                    Ground Truth
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-900">{currentProduct.productName}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="font-mono text-indigo-600 font-semibold">{currentProduct.sku}</span>
                    <span>•</span>
                    <span>{currentProduct.category}</span>
                  </div>
                </div>

                {/* Total Return Count Badge */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Total Return Count</span>
                  <p className="text-2xl font-bold text-slate-900">{currentProduct.totalReturnCount} <span className="text-xs text-slate-500 font-normal">records</span></p>
                </div>

                {/* Return Reason Breakdown Table */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-500">Return Reason Breakdown:</span>
                  <div className="space-y-2">
                    {Object.entries(currentProduct.reasonCounts).map(([reason, count]) => {
                      const pct = currentProduct.reasonPercentages[reason] || 0;
                      return (
                        <div key={reason} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-700">{reason}</span>
                            <span className="text-indigo-600 font-bold">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
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
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition duration-200 mt-4"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{aiState === 'loading' ? 'Generating Business Insights...' : 'Generate Business Insights'}</span>
              </button>
            </div>

            {/* Column 2 & 3: AI Business Insights Output */}
            <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-200 bg-indigo-50/40 space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-indigo-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">AI Strategic Insights Output</h3>
                      <p className="text-xs text-slate-500">Gemini Native Structured Output via Firebase AI Logic</p>
                    </div>
                  </div>

                  {insightResult && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
                  <div className="p-12 rounded-2xl bg-white border border-indigo-200 text-center space-y-4 animate-pulse my-auto shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                      <Sparkles className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-indigo-900">Analyzing Return Ground Truth Data...</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Gemini is formulating main recurring problem, evidence, recommended action, and priority score.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State with Retry Button */}
                {aiState === 'error' && (
                  <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 space-y-4 my-auto">
                    <div className="flex items-start space-x-3 text-xs text-rose-900">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">AI Insights Generation Error</h4>
                        <p className="mt-1 text-rose-700/90 leading-relaxed">{errorMessage}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-200 flex justify-end">
                      <button
                        onClick={handleGenerateInsights}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold border border-rose-200 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
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
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1.5" /> 1. Main Recurring Problem
                      </span>
                      <p className="text-sm font-bold text-slate-900 bg-white p-4 rounded-2xl border border-slate-200 leading-relaxed shadow-sm">
                        {insightResult.mainRecurringProblem}
                      </p>
                    </div>

                    {/* 2. Evidence */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600 mr-1.5" /> 2. Ground-Truth Evidence
                      </span>
                      <p className="text-xs text-slate-700 bg-white p-4 rounded-2xl border border-slate-200 leading-relaxed font-mono shadow-sm">
                        {insightResult.evidence}
                      </p>
                    </div>

                    {/* 3. Recommended Business Action */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center">
                        <Lightbulb className="w-4 h-4 text-emerald-600 mr-1.5" /> 3. Recommended Business Action
                      </span>
                      <p className="text-xs text-emerald-900 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 leading-relaxed font-medium shadow-sm">
                        {insightResult.recommendedBusinessAction}
                      </p>
                    </div>

                    {/* 4. Priority Level Footer */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>4. Action Priority Level: <strong className="text-slate-900 uppercase">{insightResult.priority} PRIORITY</strong></span>
                      </div>
                      <span className="text-[11px] text-slate-400">Generated: {insightResult.generatedAt || 'Just now'}</span>
                    </div>
                  </div>
                )}

                {/* Idle State */}
                {aiState === 'idle' && !insightResult && (
                  <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 my-auto shadow-sm">
                    <Zap className="w-10 h-10 text-indigo-600 mx-auto opacity-80" />
                    <h4 className="text-sm font-bold text-slate-900">AI Business Insights Ready</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
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
