'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData } from '@/context/DataContext';
import {
  Package,
  Search,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  Percent,
} from 'lucide-react';
import { EmptyState, CardSkeleton } from '@/components/ui/StateViews';

export interface CalculatedProductMetric {
  sku: string;
  productName: string;
  category: string;
  price: number;
  totalReturns: number;
  mostCommonReturnReason: string;
  topReasonCount: number;
  topReasonPercentage: number;
  highSeverityCount: number;
  riskLevel: 'Critical Issue' | 'High Risk' | 'Medium Risk' | 'Low Risk';
}

export default function ProductsPage() {
  const { returns, isLoading } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  // Native Application Calculation (0% Gemini Counting) over live Cloud Firestore snapshot
  const productMetrics = useMemo<CalculatedProductMetric[]>(() => {
    const map: Record<
      string,
      {
        sku: string;
        productName: string;
        category: string;
        price: number;
        totalReturns: number;
        highSeverityCount: number;
        reasons: Record<string, number>;
      }
    > = {};

    returns.forEach((r) => {
      const key = r.sku || r.productName;
      if (!map[key]) {
        map[key] = {
          sku: r.sku,
          productName: r.productName || r.sku,
          category: r.category || 'General',
          price: r.price || 0,
          totalReturns: 0,
          highSeverityCount: 0,
          reasons: {},
        };
      }

      const item = map[key];
      item.totalReturns += 1;

      const isHighSev =
        r.severity === 'High' ||
        r.severity === 'Critical' ||
        r.severity.toString().toLowerCase() === 'high' ||
        r.severity.toString().toLowerCase() === 'critical';

      if (isHighSev) {
        item.highSeverityCount += 1;
      }

      const reasonKey = r.reasonCategory || 'General Feedback';
      item.reasons[reasonKey] = (item.reasons[reasonKey] || 0) + 1;
    });

    return Object.values(map).map((item) => {
      let mostCommonReturnReason = 'Customer Feedback';
      let topReasonCount = 0;

      Object.entries(item.reasons).forEach(([rsn, cnt]) => {
        if (cnt > topReasonCount) {
          topReasonCount = cnt;
          mostCommonReturnReason = rsn;
        }
      });

      const topReasonPercentage = item.totalReturns
        ? Math.round((topReasonCount / item.totalReturns) * 100)
        : 0;

      let riskLevel: CalculatedProductMetric['riskLevel'] = 'Low Risk';
      if (item.highSeverityCount > 1 || item.totalReturns >= 4) {
        riskLevel = 'Critical Issue';
      } else if (item.highSeverityCount === 1 || item.totalReturns === 3) {
        riskLevel = 'High Risk';
      } else if (item.totalReturns === 2) {
        riskLevel = 'Medium Risk';
      }

      return {
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        price: item.price,
        totalReturns: item.totalReturns,
        mostCommonReturnReason,
        topReasonCount,
        topReasonPercentage,
        highSeverityCount: item.highSeverityCount,
        riskLevel,
      };
    }).sort((a, b) => b.totalReturns - a.totalReturns);
  }, [returns]);

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set(productMetrics.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [productMetrics]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return productMetrics.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.productName.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchReason = p.mostCommonReturnReason.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat && !matchReason) return false;
      }

      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      if (selectedRisk !== 'all' && p.riskLevel !== selectedRisk) {
        return false;
      }

      return true;
    });
  }, [productMetrics, searchQuery, selectedCategory, selectedRisk]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Health & Return Intelligence</h1>
            <p className="text-xs text-slate-500 mt-1">
              Calculated statistics aggregated from live Cloud Firestore return data
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm font-mono">
              Total Products Tracked: <strong className="text-indigo-600">{productMetrics.length}</strong>
            </span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, SKU, category, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-end text-xs">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Risk Level:</span>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="bg-white text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="all">All Risk Levels</option>
                <option value="Critical Issue">Critical Issue</option>
                <option value="High Risk">High Risk</option>
                <option value="Medium Risk">Medium Risk</option>
                <option value="Low Risk">Low Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid / Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No Matching Product Returns Found"
            description="No product return metrics match your search query or filter selection."
            icon={Package}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => (
              <div
                key={prod.sku}
                className="glass-panel p-6 rounded-3xl border border-slate-200 hover:border-indigo-300 transition-all group flex flex-col justify-between space-y-6 shadow-sm"
              >
                {/* Header: Name, SKU, Category, Risk Level Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                        {prod.productName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-semibold">
                          {prod.sku}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">{prod.category}</span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 ${
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
                  </div>
                </div>

                {/* Metrics Breakdown Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Total Returns */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Returns</span>
                    <p className="text-lg font-bold text-slate-900">{prod.totalReturns}</p>
                  </div>

                  {/* High Severity Count */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">High Severity</span>
                    <p className={`text-lg font-bold ${prod.highSeverityCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {prod.highSeverityCount}
                    </p>
                  </div>
                </div>

                {/* Top Return Reason & Percentage */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-semibold">Most Common Reason</span>
                    <span className="font-bold text-indigo-600">{prod.topReasonPercentage}% of returns</span>
                  </div>

                  <p className="font-semibold text-slate-900 truncate">{prod.mostCommonReturnReason}</p>

                  {/* Progress Bar for Percentage */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${prod.topReasonPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Action Trigger: [View Product Insights] */}
                <div className="pt-2 border-t border-slate-200">
                  <Link
                    href={`/returns?search=${encodeURIComponent(prod.sku)}`}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold shadow-sm transition duration-200"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Product Insights</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
