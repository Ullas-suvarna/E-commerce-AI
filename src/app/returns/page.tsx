'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData, SortOption } from '@/context/DataContext';
import {
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  ArrowUpDown,
  Upload,
  Sparkles,
} from 'lucide-react';
import { CsvImportModal } from '@/components/returns/CsvImportModal';
import { AddReturnModal } from '@/components/returns/AddReturnModal';
import { EditReturnModal } from '@/components/returns/EditReturnModal';
import { EmptyState, TableSkeleton } from '@/components/ui/StateViews';
import { ReturnRecord } from '@/lib/types';
import { analyzeReturn } from '@/services/aiService';

export default function ReturnsPage() {
  const {
    filteredReturns,
    filterState,
    setFilterState,
    sortOption,
    setSortOption,
    deleteReturnRecord,
    updateReturnRecord,
    showToast,
    isLoading,
    resetToSampleData,
    formatCurrency,
    currencySymbol,
  } = useData();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReturnRecord | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const handleAnalyzeSingle = async (item: ReturnRecord) => {
    setAnalyzingId(item.id);
    try {
      const result = await analyzeReturn({
        productName: item.productName,
        category: item.reasonCategory,
        rating: item.rating || 3,
        customerComment: item.customerComment,
      });

      const normSev = (result.severity || '').toString().toLowerCase();
      const finalSev = normSev === 'critical' ? 'Critical' : normSev === 'high' ? 'High' : normSev === 'medium' ? 'Medium' : 'Low';

      await updateReturnRecord(item.id, {
        status: 'Analyzed',
        severity: finalSev,
        aiAnalysis: result,
      });

      showToast('success', 'AI Analysis Complete', `Return ${item.id} status updated to Analyzed.`);
    } catch (err: any) {
      showToast('error', 'Analysis Failed', err.message || 'Failed to analyze return with AI.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleEditClick = (rec: ReturnRecord) => {
    setEditingRecord(rec);
    setEditModalOpen(true);
  };

  const filterTabs = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Analyzed', value: 'Analyzed' },
    { label: 'High severity', value: 'High severity' },
    { label: 'Medium severity', value: 'Medium severity' },
    { label: 'Low severity', value: 'Low severity' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Return Records</h1>
            <p className="text-xs text-slate-500 mt-1">
              Firestore multi-tenant return data — Add, Edit, Delete, Search, Filter & Sort
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Return</span>
            </button>

            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
          <span className="text-slate-400 font-semibold mr-1 shrink-0">Filter:</span>
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterState((prev) => ({ ...prev, status: tab.value }))}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                filterState.status === tab.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Toolbar */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU, Order ID, Customer, Comment..."
              value={filterState.searchQuery}
              onChange={(e) => setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-white text-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              <option value="date-desc">Return Date (Newest First)</option>
              <option value="date-asc">Return Date (Oldest First)</option>
              <option value="price-desc">Refund Amount (Highest First)</option>
              <option value="price-asc">Refund Amount (Lowest First)</option>
              <option value="name-asc">Product Name (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : filteredReturns.length === 0 ? (
          <EmptyState
            title="No Matching Return Records"
            description={
              filterState.searchQuery || filterState.status !== 'all'
                ? "No Firestore records match your active search or filter criteria. Clear filters to view all records."
                : "No return records found in your Firestore database. Click 'Add Return' or 'Import CSV' to create records."
            }
            actionText="Add New Return"
            onAction={() => setAddModalOpen(true)}
            icon={FileSpreadsheet}
          />
        ) : (
          <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-mono">Return ID / Order</th>
                    <th className="py-3.5 px-4">Product Specs</th>
                    <th className="py-3.5 px-4">Customer Comment</th>
                    <th className="py-3.5 px-4">Refund ({currencySymbol})</th>
                    <th className="py-3.5 px-4">Reason Category</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReturns.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-mono">{item.id}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.orderId}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                        <div className="text-[11px] text-indigo-600 font-mono">{item.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[280px]">
                        <p className="text-slate-600 line-clamp-2 italic text-[11px]">
                          &quot;{item.customerComment}&quot;
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {formatCurrency(item.refundAmount || item.price || 0)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200 font-medium">
                          {item.reasonCategory}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.severity === 'Critical'
                              ? 'badge-severity-critical'
                              : item.severity === 'High'
                              ? 'badge-severity-high'
                              : item.severity === 'Medium'
                              ? 'badge-severity-medium'
                              : 'badge-severity-low'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.status === 'Analyzed' ? 'badge-status-analyzed' : 'badge-status-unanalyzed'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleAnalyzeSingle(item)}
                            disabled={analyzingId === item.id || item.status === 'Analyzed'}
                            className={`p-1.5 rounded-lg border transition ${
                              item.status === 'Analyzed'
                                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200'
                            }`}
                            title={item.status === 'Analyzed' ? 'Already Analyzed' : 'Analyze Return with AI'}
                          >
                            <Sparkles className={`w-4 h-4 ${analyzingId === item.id ? 'animate-spin' : ''}`} />
                          </button>

                          <Link
                            href={`/returns/${item.id}`}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => deleteReturnRecord(item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredReturns.length} Firestore return records</span>
              <div className="flex items-center space-x-2">
                <button disabled className="px-3 py-1 rounded-lg bg-white border border-slate-200 opacity-50 cursor-not-allowed text-slate-400">
                  Previous
                </button>
                <button disabled className="px-3 py-1 rounded-lg bg-white border border-slate-200 opacity-50 cursor-not-allowed text-slate-400">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddReturnModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <EditReturnModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} record={editingRecord} />
      <CsvImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </AppLayout>
  );
}
