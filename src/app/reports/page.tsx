'use client';

import React, { useState, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import {
  prepareBatchReportDataset,
  executeBatchAnalysis,
  BatchReportDataset,
  BatchProductItem,
} from '@/services/batchReportService';
import { generateBatchPdfReport } from '@/services/pdfReportGenerator';
import {
  Sparkles,
  Download,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Layers,
  StopCircle,
  Clock,
  Zap,
  Mail,
  MailCheck,
  MailMinus,
} from 'lucide-react';

export default function ReportsPage() {
  const { returns, showToast, formatCurrency } = useData();
  const { user } = useAuth();

  const storeName = user?.storeName || user?.displayName || 'AeroCraft Commerce';

  // Report state (isolated from unrelated dashboard/returns state)
  const [reportData, setReportData] = useState<BatchReportDataset>(() =>
    prepareBatchReportDataset(returns, storeName)
  );

  // Recalculate baseline if returns change and no fresh run has been performed
  const [isFreshRun, setIsFreshRun] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emailProgressText, setEmailProgressText] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'Critical Issue' | 'High Risk' | 'Medium Risk' | 'Low Risk' | 'failed'>('all');

  const [progress, setProgress] = useState({
    current: 0,
    total: reportData.products.length,
    productName: '',
    percentage: 0,
  });

  const abortControllerRef = useRef<{ aborted: boolean }>({ aborted: false });

  // Update baseline dataset when returns change (if not actively analyzing)
  React.useEffect(() => {
    if (!isFreshRun && !isAnalyzing) {
      setReportData(prepareBatchReportDataset(returns, storeName));
    }
  }, [returns, storeName, isFreshRun, isAnalyzing]);

  // Handle Analyse All Products
  const handleAnalyseAllProducts = async () => {
    if (reportData.products.length === 0) {
      showToast('error', 'No Products Available', 'Please import or select return records first.');
      return;
    }

    setIsAnalyzing(true);
    abortControllerRef.current = { aborted: false };

    // Fresh baseline dataset
    const freshDataset = prepareBatchReportDataset(returns, storeName);
    setReportData(freshDataset);

    try {
      const completedReport = await executeBatchAnalysis(
        freshDataset,
        (current, total, productName, percentage) => {
          setProgress({ current, total, productName, percentage });
        },
        abortControllerRef.current,
        {
          email: user?.email,
          name: user?.displayName || user?.storeName || 'Store Manager',
        },
        (statusText) => {
          setEmailProgressText(statusText);
        }
      );

      setReportData(completedReport);
      setIsFreshRun(true);
      setIsAnalyzing(false);
      setEmailProgressText(null);

      if (abortControllerRef.current.aborted) {
        showToast('info', 'Analysis Stopped', `Analysis was stopped early. Processed ${completedReport.successCount} products.`);
      } else {
        showToast(
          'success',
          'Batch AI Analysis Complete',
          `Successfully analyzed ${completedReport.successCount} of ${completedReport.distinctProductsCount} products.`
        );

        // Feedback on high-risk email alerts
        if (completedReport.emailSummary) {
          const { sentCount, alreadyNotifiedCount, failedCount, recipientEmail, totalHighRisk } = completedReport.emailSummary;
          if (sentCount > 0) {
            showToast(
              'success',
              'High-Risk Alerts Dispatched',
              `Dispatched ${sentCount} high-risk email alert(s) to ${recipientEmail}.`
            );
          } else if (alreadyNotifiedCount > 0 && totalHighRisk > 0) {
            showToast(
              'info',
              'Alerts Deduplicated',
              `All ${alreadyNotifiedCount} high-risk product(s) were already notified. Duplicate emails skipped.`
            );
          } else if (failedCount > 0) {
            showToast(
              'error',
              'Email Alert Notice',
              `${failedCount} alert(s) could not be sent: ${recipientEmail === 'Not Configured' ? 'Store notification email is not configured.' : 'Email service error.'}`
            );
          }
        }
      }
    } catch (err: any) {
      console.error('Batch analysis error:', err);
      setIsAnalyzing(false);
      setEmailProgressText(null);
      showToast('error', 'Batch Analysis Failed', err.message || 'An unexpected error occurred during batch analysis.');
    }
  };

  const handleStopAnalysis = () => {
    abortControllerRef.current.aborted = true;
  };

  // Handle PDF Generation
  const handleDownloadPdf = () => {
    if (reportData.products.length === 0) {
      showToast('error', 'Cannot Export', 'No product data available to generate report.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      generateBatchPdfReport(reportData);
      showToast('success', 'PDF Report Generated', 'Executive audit report downloaded successfully.');
    } catch (err: any) {
      console.error('PDF error:', err);
      showToast('error', 'PDF Generation Error', 'Failed to generate PDF. Please retry.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filtered Products for Display
  const filteredProducts = useMemo(() => {
    return reportData.products.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.productName.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }

      if (filterRisk === 'failed') {
        return p.status === 'failed';
      } else if (filterRisk !== 'all') {
        return p.riskLevel === filterRisk;
      }

      return true;
    });
  }, [reportData.products, searchQuery, filterRisk]);

  return (
    <AppLayout>
      <div className="space-y-8 pb-16">
        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-300">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Executive AI Report Center
                </h1>
                <p className="text-sm font-semibold text-slate-600">
                  Analyse all products in your dataset & generate a complete executive audit PDF report
                </p>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1.5" /> Batch Intelligence Engine
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> 100% Client-Side Ground Truth
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-extrabold flex items-center">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Executive PDF Ready
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isAnalyzing ? (
              <button
                onClick={handleStopAnalysis}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center shadow-md transition active:scale-95"
              >
                <StopCircle className="w-4 h-4 mr-2" /> Stop Analysis
              </button>
            ) : (
              <button
                onClick={handleAnalyseAllProducts}
                disabled={reportData.products.length === 0}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center shadow-lg shadow-indigo-600/25 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                {isFreshRun ? 'Re-Analyse All Products' : 'Analyse All Products'}
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={reportData.products.length === 0 || isAnalyzing || isGeneratingPdf}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm flex items-center shadow-md transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Complete PDF Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Tracker (Visible when analyzing) */}
        {isAnalyzing && (
          <div className="p-6 rounded-3xl bg-indigo-50/80 border-2 border-indigo-400 shadow-sm space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-indigo-950 text-base">
                    Analysing Product Catalog ({progress.current} of {progress.total})
                  </h3>
                  <p className="text-xs font-bold text-indigo-700">
                    {emailProgressText ? (
                      <span className="text-indigo-900 font-extrabold flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-1.5 text-indigo-600 animate-pulse" /> {emailProgressText}
                      </span>
                    ) : (
                      <>Currently inspecting: <strong className="text-indigo-950 font-black">{progress.productName || 'Initializing...'}</strong></>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xl font-black text-indigo-600 self-end sm:self-auto">
                {progress.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-indigo-200/60 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Analysis Status / Freshness Callout */}
        <div className="p-4 rounded-2xl bg-white border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isFreshRun ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <div className="text-xs sm:text-sm">
              <span className="font-extrabold text-slate-900">Analysis Status: </span>
              {isFreshRun ? (
                <span className="font-bold text-emerald-700">
                  Fresh Analysis Completed at {reportData.analyzedAt} ({reportData.successCount} analyzed successfully
                  {reportData.failedCount > 0 ? `, ${reportData.failedCount} disclosed failures` : ''})
                </span>
              ) : (
                <span className="font-bold text-slate-600">
                  Ready for Analysis ({reportData.distinctProductsCount} distinct products detected in current dataset). Click [Analyse All Products] above to start.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono font-extrabold text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Scope: {reportData.dateRange}</span>
          </div>
        </div>

        {/* Email Alert Summary Card (when analysis has run) */}
        {reportData.emailSummary && (
          <div className="p-6 rounded-3xl bg-white border border-slate-300 shadow-2xs space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    Automated High-Risk Email Alerts
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    Configured Recipient: <span className="font-mono font-bold text-slate-800">{reportData.emailSummary.recipientEmail}</span>
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black self-start sm:self-auto ${
                reportData.emailSummary.sentCount > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : reportData.emailSummary.alreadyNotifiedCount > 0
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  : reportData.emailSummary.failedCount > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}>
                {reportData.emailSummary.sentCount > 0
                  ? `${reportData.emailSummary.sentCount} Alert(s) Dispatched`
                  : reportData.emailSummary.alreadyNotifiedCount > 0
                  ? 'Alerts Deduplicated (Already Sent)'
                  : reportData.emailSummary.failedCount > 0
                  ? 'Dispatch Failed'
                  : 'Completed'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <span className="font-extrabold text-emerald-800 uppercase text-[10px] flex items-center">
                  <MailCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Newly Sent
                </span>
                <p className="text-xl font-black text-emerald-900">{reportData.emailSummary.sentCount}</p>
                <span className="text-[11px] text-emerald-700 font-medium">Delivered to store owner</span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                <span className="font-extrabold text-indigo-800 uppercase text-[10px] flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Already Notified
                </span>
                <p className="text-xl font-black text-indigo-900">{reportData.emailSummary.alreadyNotifiedCount}</p>
                <span className="text-[11px] text-indigo-700 font-medium">Duplicate skipped</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-300 space-y-1">
                <span className="font-extrabold text-slate-700 uppercase text-[10px] flex items-center">
                  <MailMinus className="w-3.5 h-3.5 mr-1 text-slate-500" /> Skipped (Low/Med)
                </span>
                <p className="text-xl font-black text-slate-900">{reportData.emailSummary.skippedCount}</p>
                <span className="text-[11px] text-slate-500 font-medium">Low/Medium risk items</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                <span className="font-extrabold text-rose-800 uppercase text-[10px] flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Dispatch Failed
                </span>
                <p className="text-xl font-black text-rose-900">{reportData.emailSummary.failedCount}</p>
                <span className="text-[11px] text-rose-700 font-medium">Missing config or error</span>
              </div>
            </div>

            {reportData.emailSummary.recipientEmail === 'Not Configured' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-800 font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Store notification email is not configured. High-risk email alerts could not be dispatched.</span>
              </div>
            )}
          </div>
        )}

        {/* Executive Overview KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="glass-panel p-5 rounded-3xl border border-slate-300 space-y-2 shadow-2xs">
            <span className="text-xs uppercase font-extrabold text-slate-500 flex items-center">
              <Package className="w-3.5 h-3.5 text-indigo-600 mr-1.5" /> Distinct Products
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{reportData.distinctProductsCount}</p>
            <span className="text-xs text-slate-500 font-semibold">In current dataset</span>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-300 space-y-2 shadow-2xs">
            <span className="text-xs uppercase font-extrabold text-slate-500 flex items-center">
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600 mr-1.5" /> Total Returns
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{reportData.totalReturns}</p>
            <span className="text-xs text-slate-500 font-semibold">Records audited</span>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-300 space-y-2 shadow-2xs">
            <span className="text-xs uppercase font-extrabold text-slate-500 flex items-center">
              <DollarSign className="w-3.5 h-3.5 text-rose-600 mr-1.5" /> Total Refunds
            </span>
            <p className="text-2xl sm:text-3xl font-black text-rose-600">
              ${reportData.totalRefundValue.toLocaleString()}
            </p>
            <span className="text-xs text-slate-500 font-semibold">Total refund exposure</span>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-300 space-y-2 shadow-2xs">
            <span className="text-xs uppercase font-extrabold text-slate-500 flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mr-1.5" /> Critical / High Risk
            </span>
            <p className="text-2xl sm:text-3xl font-black text-orange-600">
              {reportData.riskDistribution.critical + reportData.riskDistribution.high}
            </p>
            <span className="text-xs text-slate-500 font-semibold">Items needing immediate QC</span>
          </div>
        </div>

        {/* Cross-Product Quality Patterns (if detected) */}
        {reportData.crossProductPatterns.length > 0 && (
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-300 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 flex items-center">
                  <Layers className="w-5 h-5 text-indigo-600 mr-2" /> Cross-Product Quality Patterns
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Systemic defects recurring across multiple distinct product lines
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black">
                {reportData.crossProductPatterns.length} Patterns Detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {reportData.crossProductPatterns.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/90 border border-slate-300 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">
                      {pat.pattern}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-black ${
                        pat.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {pat.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-bold leading-relaxed">{pat.insight}</p>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase">Affected Lines:</span>
                    <p className="text-xs text-slate-900 font-bold line-clamp-1">
                      {pat.affectedProducts.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Intelligence Audit List */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Product-by-Product Intelligence Audit</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                Inspecting all {reportData.products.length} distinct products in current dataset
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs w-48 sm:w-60"
                />
              </div>

              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs cursor-pointer"
              >
                <option value="all">All Risks ({reportData.products.length})</option>
                <option value="Critical Issue">Critical Issue ({reportData.riskDistribution.critical})</option>
                <option value="High Risk">High Risk ({reportData.riskDistribution.high})</option>
                <option value="Medium Risk">Medium Risk ({reportData.riskDistribution.medium})</option>
                <option value="Low Risk">Low Risk ({reportData.riskDistribution.low})</option>
                {reportData.failedCount > 0 && (
                  <option value="failed">Failed AI ({reportData.failedCount})</option>
                )}
              </select>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 gap-5">
            {filteredProducts.map((prod, idx) => (
              <div
                key={prod.key}
                className="glass-panel p-6 rounded-3xl border border-slate-300 space-y-5 shadow-2xs hover:border-slate-400 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                        {prod.sku}
                      </span>
                      <span className="text-xs font-bold text-slate-500">•</span>
                      <span className="text-xs font-extrabold text-slate-600">{prod.category}</span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900">{prod.productName}</h4>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    {/* Status Pill */}
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black flex items-center ${
                        prod.status === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : prod.status === 'failed'
                          ? 'bg-rose-50 text-rose-800 border border-rose-300'
                          : prod.status === 'analyzing'
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {prod.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
                      {prod.status === 'failed' && <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />}
                      {prod.status === 'analyzing' && <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600 animate-spin" />}
                      {prod.status === 'success'
                        ? 'AI Analyzed'
                        : prod.status === 'failed'
                        ? 'Analysis Failed'
                        : prod.status === 'analyzing'
                        ? 'Analyzing...'
                        : 'Pending Analysis'}
                    </span>

                    {/* Risk Badge */}
                    <span
                      className={`px-3.5 py-1 rounded-full text-xs font-black ${
                        prod.riskLevel === 'Critical Issue'
                          ? 'badge-severity-critical'
                          : prod.riskLevel === 'High Risk'
                          ? 'badge-severity-high'
                          : prod.riskLevel === 'Medium Risk'
                          ? 'badge-severity-medium'
                          : 'badge-severity-low'
                      }`}
                    >
                      {prod.riskLevel}
                    </span>

                    {/* Email Outcome Pill */}
                    {prod.emailOutcome && (
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center ${
                          prod.emailOutcome.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : prod.emailOutcome.status === 'already-notified'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-300'
                            : prod.emailOutcome.status === 'failed'
                            ? 'bg-rose-50 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {prod.emailOutcome.status === 'sent' && <MailCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
                        {prod.emailOutcome.status === 'already-notified' && <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />}
                        {prod.emailOutcome.status === 'failed' && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />}
                        {prod.emailOutcome.status === 'skipped' && <MailMinus className="w-3.5 h-3.5 mr-1 text-slate-500" />}
                        {prod.emailOutcome.status === 'sent'
                          ? 'Alert Sent'
                          : prod.emailOutcome.status === 'already-notified'
                          ? 'Already Notified'
                          : prod.emailOutcome.status === 'failed'
                          ? 'Email Failed'
                          : 'Skipped (Low/Med)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ground Truth Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-500 uppercase text-[10px]">Total Returns:</span>
                    <p className="font-black text-slate-900 text-sm">{prod.totalReturns} units</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500 uppercase text-[10px]">Refund Amount:</span>
                    <p className="font-black text-slate-900 text-sm">${prod.refundTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500 uppercase text-[10px]">Primary Cause:</span>
                    <p className="font-black text-slate-900 text-sm truncate">{prod.topReason}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500 uppercase text-[10px]">High Severity Count:</span>
                    <p className="font-black text-slate-900 text-sm">{prod.highSeverityCount} cases</p>
                  </div>
                </div>

                {/* Sample Verified Customer Feedback */}
                {prod.comments.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-1">
                    <span className="font-extrabold text-slate-500 uppercase text-[10px]">Verified Customer Comment:</span>
                    <p className="text-slate-700 italic font-medium">"{prod.comments[0]}"</p>
                  </div>
                )}

                {/* AI Analysis Result Card (if success) */}
                {prod.status === 'success' && prod.insight && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Root Cause & Recommendation
                      </span>
                      <span className="text-[11px] font-mono font-bold text-indigo-600">
                        Priority: {prod.insight.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase">Main Recurring Problem:</span>
                      <p className="text-sm font-extrabold text-slate-900">{prod.insight.mainRecurringProblem}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase">Ground-Truth Evidence:</span>
                      <p className="text-xs font-medium text-slate-700">{prod.insight.evidence}</p>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-indigo-100">
                      <span className="text-[11px] font-extrabold text-indigo-700 uppercase">Actionable Recommendation:</span>
                      <p className="text-xs font-bold text-indigo-950">{prod.insight.recommendedBusinessAction}</p>
                    </div>
                  </div>
                )}

                {/* Failure Disclosure (if failed) */}
                {prod.status === 'failed' && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 text-rose-800 font-black">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>AI Analysis Could Not Complete</span>
                    </div>
                    <p className="text-rose-700 font-medium">
                      Reason: {prod.errorReason || 'Rate limit or connection timeout.'}
                    </p>
                    <p className="text-slate-500 font-medium pt-1 text-[11px]">
                      Pre-calculated ground-truth statistics above remain 100% verified and unaffected.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
