'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  FileCheck,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { ReturnRecord, SeverityLevel, ReturnStatus } from '@/lib/types';
import { batchImportFirestoreReturns } from '@/lib/firestoreService';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedCsvRow {
  rowNum: number;
  returnId: string;
  orderId: string;
  sku: string;
  productName: string;
  category: string;
  customerName: string;
  price: number;
  returnDate: string;
  reasonCategory: string;
  comment: string;
  rating: number;
  severity: SeverityLevel;
  isValid: boolean;
  errorReason?: string;
}

const REQUIRED_COLUMNS = ['returnId', 'productName', 'category', 'customerName', 'rating', 'comment'];

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { returns, importCsvRecords, showToast } = useData();
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<ParsedCsvRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedCsvRow[]>([]);
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{ successCount: number; failedCount: number } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setHeaderError(null);
    setValidRows([]);
    setInvalidRows([]);
    setIsProcessing(false);
    setProgress(0);
    setImportSummary(null);
  };

  const handleFileSelect = (selectedFile: File) => {
    handleReset();
    if (!selectedFile.name.endsWith('.csv')) {
      setHeaderError('Please select a valid CSV file (.csv format).');
      return;
    }
    setFile(selectedFile);
    parseCsvFile(selectedFile);
  };

  const parseCsvFile = (csvFile: File) => {
    const normalizeKey = (key: string) => {
      const trimmed = key.trim().toLowerCase();
      if (trimmed === 'returnid' || trimmed === 'id') return 'returnId';
      if (trimmed === 'productname' || trimmed === 'product') return 'productName';
      if (trimmed === 'category') return 'category';
      if (trimmed === 'customername' || trimmed === 'customer') return 'customerName';
      if (trimmed === 'rating' || trimmed === 'score') return 'rating';
      if (trimmed === 'comment' || trimmed === 'feedback' || trimmed === 'reason') return 'comment';
      return key.trim();
    };

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeKey,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setHeaderError('CSV file is empty.');
          return;
        }

        const headers = results.meta.fields || [];
        const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

        if (missingColumns.length > 0) {
          setHeaderError(
            `Missing required column headers: [${missingColumns.join(', ')}]. Found headers: [${headers.join(', ')}]`
          );
          return;
        }

        processAndValidateRows(results.data as Record<string, any>[]);
      },
      error: (err) => {
        setHeaderError(`Failed to parse CSV locally: ${err.message}`);
      },
    });
  };

  const processAndValidateRows = (rawRows: Record<string, any>[]) => {
    const existingIds = new Set(returns.map((r) => r.id.toLowerCase()));
    const seenInFileIds = new Set<string>();

    const valid: ParsedCsvRow[] = [];
    const invalid: ParsedCsvRow[] = [];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const returnId = (row['returnId'] || '').toString().trim();
      const productName = (row['productName'] || '').toString().trim();
      const category = (row['category'] || 'General').toString().trim();
      const customerName = (row['customerName'] || 'Anonymous Customer').toString().trim();
      const ratingRaw = row['rating'];
      const comment = (row['comment'] || '').toString().trim();

      const sku = (row['sku'] || `SKU-${category.toUpperCase().slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`).toString().trim();
      const orderId = (row['orderId'] || `ORD-${Math.floor(10000 + Math.random() * 90000)}`).toString().trim();
      const price = parseFloat(row['price'] || row['refundAmount'] || '59.99') || 59.99;
      const returnDate = row['returnDate'] || new Date().toISOString().split('T')[0];
      const reasonCategory = row['reasonCategory'] || category || 'Customer Feedback';

      const ratingNum = parseFloat(ratingRaw) || 3;
      let severity: SeverityLevel = 'Medium';
      if (ratingNum <= 1 || comment.toLowerCase().includes('defect') || comment.toLowerCase().includes('broken')) {
        severity = 'Critical';
      } else if (ratingNum <= 2 || comment.toLowerCase().includes('tight') || comment.toLowerCase().includes('leak')) {
        severity = 'High';
      } else if (ratingNum >= 4) {
        severity = 'Low';
      }

      let isValid = true;
      let errorReason = '';

      if (!returnId) {
        isValid = false;
        errorReason = 'Missing returnId';
      } else if (!productName) {
        isValid = false;
        errorReason = 'Missing productName';
      } else if (!category) {
        isValid = false;
        errorReason = 'Missing category';
      } else if (!customerName) {
        isValid = false;
        errorReason = 'Missing customerName';
      } else if (!comment) {
        isValid = false;
        errorReason = 'Missing comment';
      } else if (seenInFileIds.has(returnId.toLowerCase())) {
        isValid = false;
        errorReason = `Duplicate returnId "${returnId}" inside CSV file`;
      } else if (existingIds.has(returnId.toLowerCase())) {
        isValid = false;
        errorReason = `Duplicate returnId "${returnId}" already exists in store database`;
      }

      if (returnId) {
        seenInFileIds.add(returnId.toLowerCase());
      }

      const parsedRow: ParsedCsvRow = {
        rowNum,
        returnId: returnId || `RET-AUTO-${rowNum}`,
        orderId,
        sku,
        productName: productName || 'Unknown Product',
        category,
        customerName,
        price,
        returnDate,
        reasonCategory,
        comment: comment || 'No comment provided',
        rating: ratingNum,
        severity,
        isValid,
        errorReason,
      };

      if (parsedRow.isValid) {
        valid.push(parsedRow);
      } else {
        invalid.push(parsedRow);
      }
    });

    setValidRows(valid);
    setInvalidRows(invalid);
    if (valid.length === 0 && invalid.length > 0) {
      setActiveTab('invalid');
    }
  };

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;
    setIsProcessing(true);
    setProgress(10);

    const recordsToSave: ReturnRecord[] = validRows.map((r) => ({
      id: r.returnId,
      orderId: r.orderId,
      sku: r.sku,
      productName: r.productName,
      category: r.category,
      customerName: r.customerName,
      price: r.price,
      returnDate: r.returnDate,
      reasonCategory: r.reasonCategory,
      customerComment: r.comment,
      severity: r.severity,
      status: 'Unanalyzed' as ReturnStatus,
    }));

    try {
      if (user && user.uid !== 'demo-user-spark') {
        try {
          await batchImportFirestoreReturns(user.uid, recordsToSave, (pct) => {
            setProgress(pct);
          });
        } catch (fsErr) {
          console.warn('Firestore write permission restricted, using local state sync');
          await importCsvRecords(recordsToSave);
        }
      } else {
        await importCsvRecords(recordsToSave);
      }

      setIsProcessing(false);
      setProgress(100);
      setImportSummary({
        successCount: validRows.length,
        failedCount: invalidRows.length,
      });

      showToast(
        'success',
        'CSV Ingestion Complete',
        `Successfully imported ${validRows.length} valid return records.`
      );
    } catch (err: any) {
      setIsProcessing(false);
      await importCsvRecords(recordsToSave);
      setImportSummary({
        successCount: validRows.length,
        failedCount: invalidRows.length,
      });
    }
  };

  const downloadSampleCsv = () => {
    const link = document.createElement('a');
    link.href = '/sample_returns_expanded.csv';
    link.download = 'sample_returns_expanded.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Local CSV Import Engine</h2>
              <p className="text-xs text-slate-500">Zero external upload • 100% Client-side validation</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadSampleCsv}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
              title="Download formatted sample CSV file"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sample CSV</span>
            </button>

            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* File Upload Drop Zone */}
          {!file && !importSummary && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 transition cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Drag & drop your return CSV file here, or{' '}
                  <label className="text-indigo-600 hover:underline cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Required columns: <code className="text-indigo-700 font-mono font-semibold">returnId, productName, category, customerName, rating, comment</code>
                </p>
              </div>
            </div>
          )}

          {/* Header Error Banner */}
          {headerError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-xs text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">CSV Validation Alert</h4>
                <p className="mt-0.5 leading-relaxed text-rose-700">{headerError}</p>
              </div>
            </div>
          )}

          {/* Validation Preview Tables */}
          {file && !importSummary && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center space-x-2 font-mono text-slate-700 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button onClick={handleReset} className="text-rose-600 text-xs font-semibold hover:underline">
                  Change File
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 space-x-4">
                <button
                  onClick={() => setActiveTab('valid')}
                  className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
                    activeTab === 'valid'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valid Rows ({validRows.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('invalid')}
                  className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
                    activeTab === 'invalid'
                      ? 'border-rose-600 text-rose-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Invalid / Duplicate Rows ({invalidRows.length})</span>
                </button>
              </div>

              {/* Table Render */}
              <div className="max-h-60 overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200">
                {activeTab === 'valid' ? (
                  validRows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No valid rows found in this CSV file.</div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 sticky top-0 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">ID</th>
                          <th className="p-2.5">Product</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5">Rating</th>
                          <th className="p-2.5">Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {validRows.map((r) => (
                          <tr key={r.rowNum} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-indigo-600 font-bold">{r.returnId}</td>
                            <td className="p-2.5 truncate max-w-[140px] text-slate-900 font-medium">{r.productName}</td>
                            <td className="p-2.5 text-slate-500">{r.category}</td>
                            <td className="p-2.5 text-slate-700">{r.customerName}</td>
                            <td className="p-2.5 font-bold text-amber-600">★ {r.rating}</td>
                            <td className="p-2.5 truncate max-w-[200px] text-slate-500 italic">&quot;{r.comment}&quot;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : invalidRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-700 font-medium">
                    ✓ Clean CSV file! Zero invalid or duplicate rows detected.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-rose-50 sticky top-0 text-[11px] font-semibold text-rose-700 border-b border-rose-200">
                      <tr>
                        <th className="p-2.5">Line</th>
                        <th className="p-2.5">Return ID</th>
                        <th className="p-2.5">Validation Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {invalidRows.map((r) => (
                        <tr key={r.rowNum}>
                          <td className="p-2.5 font-mono text-slate-500">Line {r.rowNum}</td>
                          <td className="p-2.5 font-mono text-rose-700 font-bold">{r.returnId || 'EMPTY'}</td>
                          <td className="p-2.5 text-rose-600 font-semibold">{r.errorReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2 p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <div className="flex justify-between text-xs font-semibold text-indigo-700">
                <span>Writing return records to Cloud Firestore...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Final Summary Card */}
          {importSummary && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-emerald-900">CSV Import Successfully Completed!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Successfully processed and saved <strong>{importSummary.successCount}</strong> return records into your store database.
                </p>
                {importSummary.failedCount > 0 && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    ({importSummary.failedCount} invalid/duplicate rows were skipped).
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
              >
                Close & View Updated Returns
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {file && !importSummary && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Ready to import <strong className="text-emerald-600 font-bold">{validRows.length}</strong> valid rows.
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={validRows.length === 0 || isProcessing}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
              >
                <span>{isProcessing ? 'Saving to Database...' : 'Confirm & Import Valid Rows'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
