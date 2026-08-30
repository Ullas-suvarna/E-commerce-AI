'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData } from '@/context/DataContext';
import { analyzeReturn } from '@/services/aiService';
import { AIAnalysisResult } from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Package,
  DollarSign,
  AlertTriangle,
  Sparkles,
  User,
  MessageSquare,
  Star,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  Lightbulb,
  ShieldCheck,
  Tag,
  Info,
  FlaskConical,
} from 'lucide-react';
import { EmptyState, PageSkeleton } from '@/components/ui/StateViews';

export default function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id || '';
  const { getReturnById, updateReturnRecord, isLoading, formatCurrency } = useData();

  const record = getReturnById(id);

  // AI Execution State Machine: 'idle' | 'loading' | 'success' | 'error'
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(record?.aiAnalysis || null);

  const handleRunAiAnalysis = async () => {
    if (!record) return;

    setAiState('loading');
    setErrorMessage(null);

    try {
      const result = await analyzeReturn({
        productName: record.productName,
        category: record.category,
        rating: record.rating || 3,
        customerComment: record.customerComment,
      });

      setAnalysisResult(result);
      setAiState('success');

      // Update record in DataContext and Cloud Firestore
      await updateReturnRecord(record.id, {
        status: 'Analyzed',
        severity:
          result.severity === 'high'
            ? 'High'
            : result.severity === 'medium'
            ? 'Medium'
            : 'Low',
        aiAnalysis: result,
      });
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAiState('error');
      setErrorMessage(
        err.message || 'An unexpected error occurred while analyzing the return with Gemini AI.'
      );
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  if (!record) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            href="/returns"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Returns Directory</span>
          </Link>

          <EmptyState
            title="Return Record Not Found"
            description={`No return record matching ID "${id}" was found in your workspace database.`}
            actionText="Return to All Returns"
            onAction={() => { window.location.href = '/returns'; }}
          />
        </div>
      </AppLayout>
    );
  }

  const currentAnalysis = analysisResult || record.aiAnalysis;

  return (
    <AppLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/returns"
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Returns</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-mono">ID: {record.id}</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                record.status === 'Analyzed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {record.status}
            </span>
          </div>
        </div>

        {/* Page Title & Main Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600">
              <Package className="w-4 h-4" />
              <span>{record.category}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500">{record.sku}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{record.productName}</h1>
          </div>

          <button
            onClick={handleRunAiAnalysis}
            disabled={aiState === 'loading'}
            className="flex items-center justify-center space-x-2.5 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition transform active:scale-95"
          >
            <Sparkles className={`w-4 h-4 ${aiState === 'loading' ? 'animate-spin' : ''}`} />
            <span>
              {aiState === 'loading'
                ? 'Running Gemini AI Model...'
                : currentAnalysis
                ? 'Re-Run AI Analysis'
                : 'Analyze Return with Gemini AI'}
            </span>
          </button>
        </div>

        {/* 2-Column Grid Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Customer Feedback & Product Specs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Return Request Details Card */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center space-x-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Customer Return Request</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Name</span>
                  <span className="font-semibold text-slate-900">{record.customerName || 'Anonymous Customer'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Order Number</span>
                  <span className="font-mono text-indigo-600 font-bold">{record.orderId}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-y border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Refund Value</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {formatCurrency(record.refundAmount || record.price || 0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Return Date</span>
                    <span className="text-slate-700 font-medium">{record.returnDate}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Rating Given</span>
                  <div className="flex items-center space-x-1 mt-1 text-amber-600 font-bold">
                    <span>★ {record.rating || 3}.0 / 5.0</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Customer Return Feedback Comment</span>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 italic leading-relaxed text-xs">
                    &quot;{record.customerComment}&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Gemini AI Analysis Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Error Alert */}
            {aiState === 'error' && errorMessage && (
              <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 space-y-3 animate-fade-in">
                <div className="flex items-start space-x-3 text-xs text-rose-900">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-900">AI Analysis Execution Failed</h4>
                    <p className="mt-1 leading-relaxed text-rose-700">{errorMessage}</p>
                  </div>
                </div>
                <button
                  onClick={handleRunAiAnalysis}
                  className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs transition border border-rose-200"
                >
                  Retry Gemini AI Analysis
                </button>
              </div>
            )}

            {/* AI Analysis Result Card */}
            {currentAnalysis ? (
              <div className="glass-panel p-6 rounded-3xl border border-indigo-200 shadow-sm space-y-6 relative overflow-hidden bg-indigo-50/20">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Gemini AI Return Intelligence</h3>
                      <p className="text-xs text-slate-500">
                        Analyzed on {currentAnalysis.analyzedAt || 'Just Now'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Confidence: {Math.round((currentAnalysis.confidence || 0.95) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Key Metrics Pill Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium">Issue Category</span>
                    <p className="text-xs font-bold text-indigo-600">
                      {currentAnalysis.category || currentAnalysis.suggestedCategory || record.reasonCategory}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium">Assessed Severity</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        (currentAnalysis.severity || '').toString().toLowerCase() === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : (currentAnalysis.severity || '').toString().toLowerCase() === 'medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {currentAnalysis.severity || record.severity}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium">Customer Sentiment</span>
                    <p className="text-xs font-bold capitalize text-slate-800">
                      {currentAnalysis.sentiment || currentAnalysis.customerSentiment || 'Negative'}
                    </p>
                  </div>
                </div>

                {/* Main Return Reason */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identified Root Cause Reason</h4>
                  <p className="text-xs text-slate-900 leading-relaxed font-semibold p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    {currentAnalysis.reason || currentAnalysis.mainReason || currentAnalysis.identifiedReason}
                  </p>
                </div>

                {/* Short Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Executive Summary</h4>
                  <p className="text-xs text-slate-700 leading-relaxed p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    {currentAnalysis.summary || currentAnalysis.shortSummary || currentAnalysis.rootCause}
                  </p>
                </div>

                {/* Recommended Action */}
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-700">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <span>Recommended Business Action</span>
                  </div>
                  <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                    {currentAnalysis.recommendedAction}
                  </p>
                </div>
              </div>
            ) : (
              /* Unanalyzed Call-to-Action Card */
              <div className="glass-panel p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                  <FlaskConical className="w-7 h-7" />
                </div>

                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold text-slate-900">AI Intelligence Ready</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Click below to trigger Gemini AI Model to analyze customer sentiment, classify issue root cause, and generate actionable business recommendations.
                  </p>
                </div>

                <button
                  onClick={handleRunAiAnalysis}
                  disabled={aiState === 'loading'}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition transform active:scale-95 inline-flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Analysis Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
