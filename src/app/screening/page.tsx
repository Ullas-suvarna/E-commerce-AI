'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  SlidersHorizontal,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  ChevronRight,
  UserCheck,
  AlertCircle,
  FileCheck2,
  Check,
  X,
  History,
  Trash2,
  DollarSign,
  Undo2,
  ShieldAlert,
} from 'lucide-react';
import {
  CompanyRule,
  ComplaintScreeningRecord,
  RuleSeverity,
  ScreeningStatus,
} from '@/lib/screeningTypes';
import {
  DEFAULT_COMPANY_RULES,
  maskCustomerName,
} from '@/services/companyRulesEngine';
import {
  loadConfiguredRules,
  saveConfiguredRules,
  loadStoredScreeningRecords,
  saveStoredScreeningRecords,
  loadStoredRejectedRecords,
  saveStoredRejectedRecords,
  screenAllComplaints,
  recordReviewDecision,
  calculateScreeningMetrics,
} from '@/services/screeningService';
import {
  saveFirestoreScreeningRecord,
  deleteFirestoreScreeningRecord,
  saveFirestoreRejectedComplaint,
  deleteFirestoreRejectedComplaint,
  subscribeToUserScreenings,
  subscribeToUserRejectedComplaints,
  saveFirestoreCompanyRules,
  getFirestoreCompanyRules,
} from '@/lib/firestoreService';

export default function ComplaintScreeningPage() {
  const { returns, showToast, formatCurrency, deleteReturnRecord, addReturnRecord } = useData();
  const { user } = useAuth();

  // Primary Workspace Tab: 'active' (Active Screening) vs 'rejected' (Rejected Complaints Archive)
  const [activeTab, setActiveTab] = useState<'active' | 'rejected'>('active');

  // State management
  const [activeRules, setActiveRules] = useState<CompanyRule[]>(DEFAULT_COMPANY_RULES);
  const [screeningRecords, setScreeningRecords] = useState<ComplaintScreeningRecord[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<ComplaintScreeningRecord[]>([]);
  const [isScreeningRunning, setIsScreeningRunning] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState<{ current: number; total: number; returnId: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ScreeningStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | RuleSeverity>('all');
  const [maskCustomerData, setMaskCustomerData] = useState(true);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<ComplaintScreeningRecord | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [reviewerNote, setReviewerNote] = useState('');

  // 1. Initial Data Loading: Load rules, active screenings, and separate rejected archive
  useEffect(() => {
    const loadedRules = loadConfiguredRules(user?.uid);
    setActiveRules(loadedRules);

    const storedScreenings = loadStoredScreeningRecords(user?.uid);
    if (storedScreenings.length > 0) {
      // Ensure any rejected records in stored screenings are moved to rejected storage
      const activeOnly = storedScreenings.filter((r) => r.status !== 'rejected');
      setScreeningRecords(activeOnly);
    }

    const storedRejected = loadStoredRejectedRecords(user?.uid);
    if (storedRejected.length > 0) {
      setRejectedRecords(storedRejected);
    }

    // Attempt to load from Firestore when authenticated
    if (user?.uid) {
      getFirestoreCompanyRules(user.uid).then((remoteRules) => {
        if (remoteRules && remoteRules.length > 0) {
          setActiveRules(remoteRules);
          saveConfiguredRules(remoteRules, user.uid);
        }
      });

      // Subscribe to active screenings
      const unsubScreenings = subscribeToUserScreenings(user.uid, (remoteScreenings) => {
        if (remoteScreenings && remoteScreenings.length > 0) {
          const activeRemote = remoteScreenings.filter((r) => r.status !== 'rejected');
          setScreeningRecords((prev) => {
            const merged = new Map(prev.map((r) => [r.id, r]));
            activeRemote.forEach((rem) => merged.set(rem.id, rem));
            const list = Array.from(merged.values()).filter((r) => r.status !== 'rejected');
            saveStoredScreeningRecords(list, user.uid);
            return list;
          });
        }
      });

      // Subscribe to separate rejected complaints collection
      const unsubRejected = subscribeToUserRejectedComplaints(user.uid, (remoteRejected) => {
        if (remoteRejected && remoteRejected.length > 0) {
          setRejectedRecords((prev) => {
            const merged = new Map(prev.map((r) => [r.id, r]));
            remoteRejected.forEach((rem) => merged.set(rem.id, rem));
            const list = Array.from(merged.values());
            saveStoredRejectedRecords(list, user.uid);
            return list;
          });
        }
      });

      return () => {
        unsubScreenings();
        unsubRejected();
      };
    }
  }, [user?.uid]);

  // 2. Auto-initialize baseline screening if returns exist and no active screening records yet
  useEffect(() => {
    if (returns.length > 0 && screeningRecords.length === 0 && !isScreeningRunning) {
      handleRunScreening(false); // Fast baseline deterministic run without blocking on AI
    }
  }, [returns.length]);

  // Handle Full Complaint Screening Execution
  const handleRunScreening = async (enableAI: boolean = true) => {
    if (returns.length === 0) {
      showToast('info', 'No Returns Found', 'Import return records or load sample data to perform complaint screening.');
      return;
    }

    setIsScreeningRunning(true);
    setScreeningProgress({ current: 0, total: returns.length, returnId: '' });

    try {
      // Collect IDs of all rejected complaints so they are NEVER re-screened into active count
      const rejectedIds = new Set(rejectedRecords.map((r) => r.returnId));

      const results = await screenAllComplaints(
        returns,
        activeRules,
        screeningRecords,
        (current, total, returnId) => {
          setScreeningProgress({ current, total, returnId });
        },
        enableAI,
        rejectedIds
      );

      // Filter out any rejected items just in case
      const activeOnly = results.filter((r) => r.status !== 'rejected');
      setScreeningRecords(activeOnly);
      saveStoredScreeningRecords(activeOnly, user?.uid);

      if (user?.uid) {
        activeOnly.forEach((rec) => saveFirestoreScreeningRecord(user.uid, rec));
      }

      showToast(
        'success',
        'Screening Complete',
        `Successfully screened ${activeOnly.length} complaints against ${activeRules.filter((r) => r.enabled).length} active company rules.`
      );
    } catch (err: any) {
      console.error('Complaint screening failed:', err);
      showToast('error', 'Screening Failed', err?.message || 'Encountered an unexpected error while screening complaints.');
    } finally {
      setIsScreeningRunning(false);
      setScreeningProgress(null);
    }
  };

  // Toggle Company Rule
  const handleToggleRule = (ruleId: string) => {
    const updated = activeRules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    setActiveRules(updated);
    saveConfiguredRules(updated, user?.uid);
    if (user?.uid) {
      saveFirestoreCompanyRules(user.uid, updated);
    }

    showToast(
      'info',
      'Rule Updated',
      `Rule "${activeRules.find((r) => r.id === ruleId)?.name}" ${updated.find((r) => r.id === ruleId)?.enabled ? 'enabled' : 'disabled'}.`
    );
  };

  // Reviewer Decision Handlers
  const handleApprove = (record: ComplaintScreeningRecord) => {
    const { records: updatedRecords, result } = recordReviewDecision(screeningRecords, {
      screeningId: record.id,
      decision: 'approved',
      reason: reviewerNote.trim() || 'Verified complaint meets company policy guidelines.',
      reviewer: {
        uid: user?.uid,
        displayName: user?.displayName || user?.storeName,
        email: user?.email,
      },
    });

    if (result.success && result.updatedRecord) {
      setScreeningRecords(updatedRecords);
      saveStoredScreeningRecords(updatedRecords, user?.uid);
      if (user?.uid) saveFirestoreScreeningRecord(user.uid, result.updatedRecord);
      setSelectedRecord(result.updatedRecord);
      setReviewerNote('');
      showToast('success', 'Claim Approved', result.message);
    }
  };

  const handleOpenRejectModal = () => {
    setRejectionReason('');
    setRejectionError(null);
    setIsRejectConfirmOpen(true);
  };

  // Reject Claim: strictly saves copy in Rejected tab, deletes from active screens count, and permanently deletes all over the app, Total Returns, and Firestore
  const handleConfirmReject = async () => {
    if (!selectedRecord) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setRejectionError('A specific, factual rejection reason of at least 5 characters is required before finalizing.');
      return;
    }

    const { result } = recordReviewDecision([selectedRecord], {
      screeningId: selectedRecord.id,
      decision: 'rejected',
      reason: rejectionReason.trim(),
      reviewer: {
        uid: user?.uid,
        displayName: user?.displayName || user?.storeName,
        email: user?.email,
      },
    });

    if (result.success && result.updatedRecord) {
      const finalizedRejected = result.updatedRecord;
      const targetReturnId = selectedRecord.returnId;

      // 1. BEFORE DELETING: Save a permanent copy in the UI Rejected Tab & Firestore rejectedComplaints
      const updatedRejectedList = [finalizedRejected, ...rejectedRecords.filter((r) => r.id !== finalizedRejected.id)];
      setRejectedRecords(updatedRejectedList);
      saveStoredRejectedRecords(updatedRejectedList, user?.uid);

      if (user?.uid) {
        await saveFirestoreRejectedComplaint(user.uid, finalizedRejected);
      }

      // 2. PERMANENTLY DELETE FROM ACTIVE SCREENING
      const remainingActive = screeningRecords.filter((r) => r.id !== selectedRecord.id);
      setScreeningRecords(remainingActive);
      saveStoredScreeningRecords(remainingActive, user?.uid);

      if (user?.uid) {
        await deleteFirestoreScreeningRecord(user.uid, selectedRecord.id);
      }

      // 3. PERMANENTLY DELETE ALL OVER THE APP AND ALSO FIREBASE (DELETES FROM TOTAL RETURNS)
      await deleteReturnRecord(targetReturnId);

      // 4. Clean up modal states
      setIsRejectConfirmOpen(false);
      setSelectedRecord(null);
      setRejectionReason('');
      setRejectionError(null);
      setReviewerNote('');

      showToast(
        'info',
        'Claim Rejected & Return Deleted',
        `Return ${targetReturnId} has been permanently deleted from Total Returns and Firestore. A permanent copy is saved in the Rejected tab.`
      );
    } else {
      setRejectionError(result.message);
    }
  };

  // Restore a rejected claim back to Total Returns and active screening
  const handleRestoreToActive = async (record: ComplaintScreeningRecord) => {
    // 1. Remove from rejected list
    const remainingRejected = rejectedRecords.filter((r) => r.id !== record.id);
    setRejectedRecords(remainingRejected);
    saveStoredRejectedRecords(remainingRejected, user?.uid);

    if (user?.uid) {
      await deleteFirestoreRejectedComplaint(user.uid, record.id);
    }

    // 2. Restore return record back to Total Returns across the entire app and Cloud Firestore
    await addReturnRecord({
      id: record.returnId,
      orderId: record.orderId,
      customerName: record.customerName,
      customerEmail: record.customerEmail,
      sku: record.sku,
      productName: record.productName,
      category: record.category,
      price: record.price,
      rating: record.rating,
      returnDate: record.returnDate,
      reasonCategory: record.reasonCategory || 'Other',
      customerComment: record.customerComment,
      severity: record.severity,
      status: 'Analyzed',
      refundAmount: record.refundAmount,
    });

    // 3. Add back to active screening list as 'needs-review'
    const restoredRecord: ComplaintScreeningRecord = {
      ...record,
      status: 'needs-review',
      review: undefined,
      history: [
        ...(record.history || []),
        {
          timestamp: new Date().toLocaleString(),
          action: 'restored',
          details: 'Claim restored to active screening and Total Returns.',
          actor: user?.displayName || user?.storeName || 'Store Reviewer',
        },
      ],
      updatedAt: new Date().toLocaleString(),
    };

    const updatedActive = [restoredRecord, ...screeningRecords.filter((r) => r.id !== record.id)];
    setScreeningRecords(updatedActive);
    saveStoredScreeningRecords(updatedActive, user?.uid);

    if (user?.uid) {
      await saveFirestoreScreeningRecord(user.uid, restoredRecord);
    }

    if (selectedRecord?.id === record.id) {
      setSelectedRecord(null);
    }

    showToast(
      'success',
      'Claim Restored',
      `Claim ${record.returnId} has been restored to Total Returns and Active Screening.`
    );
  };

  // Permanently delete a rejected claim
  const handlePermanentlyDeleteRejected = async (record: ComplaintScreeningRecord) => {
    const remaining = rejectedRecords.filter((r) => r.id !== record.id);
    setRejectedRecords(remaining);
    saveStoredRejectedRecords(remaining, user?.uid);

    if (user?.uid) {
      await deleteFirestoreRejectedComplaint(user.uid, record.id);
    }

    if (selectedRecord?.id === record.id) {
      setSelectedRecord(null);
    }

    showToast('info', 'Record Deleted', `Rejected claim ${record.returnId} permanently deleted from archive.`);
  };

  const handleSetPending = (record: ComplaintScreeningRecord) => {
    const { records: updatedRecords, result } = recordReviewDecision(screeningRecords, {
      screeningId: record.id,
      decision: 'pending',
      reason: reviewerNote.trim() || 'Claim marked pending customer clarification.',
      reviewer: {
        uid: user?.uid,
        displayName: user?.displayName || user?.storeName,
        email: user?.email,
      },
    });

    if (result.success && result.updatedRecord) {
      setScreeningRecords(updatedRecords);
      saveStoredScreeningRecords(updatedRecords, user?.uid);
      if (user?.uid) saveFirestoreScreeningRecord(user.uid, result.updatedRecord);
      setSelectedRecord(result.updatedRecord);
      setReviewerNote('');
      showToast('info', 'Status Updated', 'Claim left pending review.');
    }
  };

  // Active Screens Metrics (strictly excludes rejected items)
  const metrics = useMemo(() => calculateScreeningMetrics(screeningRecords), [screeningRecords]);

  // Rejected Metrics
  const rejectedMetrics = useMemo(() => {
    const totalRejected = rejectedRecords.length;
    const totalValueSaved = rejectedRecords.reduce((sum, r) => sum + (Number(r.refundAmount) || Number(r.price) || 0), 0);
    const withViolations = rejectedRecords.filter((r) => r.triggeredRules && r.triggeredRules.length > 0).length;
    return {
      totalRejected,
      totalValueSaved,
      withViolations,
    };
  }, [rejectedRecords]);

  // Filtered Complaint Records for Active Tab
  const filteredActiveRecords = useMemo(() => {
    return screeningRecords.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = rec.returnId.toLowerCase().includes(q) || rec.orderId.toLowerCase().includes(q);
        const matchesProd = rec.productName.toLowerCase().includes(q) || rec.sku.toLowerCase().includes(q);
        const matchesCust = rec.customerName.toLowerCase().includes(q);
        const matchesComment = rec.customerComment.toLowerCase().includes(q);
        if (!matchesId && !matchesProd && !matchesCust && !matchesComment) return false;
      }

      if (statusFilter !== 'all' && rec.status !== statusFilter) {
        return false;
      }

      if (severityFilter !== 'all') {
        const hasMatchingSeverity = rec.triggeredRules.some((rule) => rule.severity === severityFilter);
        if (!hasMatchingSeverity) return false;
      }

      return true;
    });
  }, [screeningRecords, searchQuery, statusFilter, severityFilter]);

  // Filtered Records for Rejected Tab
  const filteredRejectedRecords = useMemo(() => {
    return rejectedRecords.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = rec.returnId.toLowerCase().includes(q) || rec.orderId.toLowerCase().includes(q);
        const matchesProd = rec.productName.toLowerCase().includes(q) || rec.sku.toLowerCase().includes(q);
        const matchesCust = rec.customerName.toLowerCase().includes(q);
        const matchesComment = rec.customerComment.toLowerCase().includes(q);
        const matchesReason = (rec.review?.reason || '').toLowerCase().includes(q);
        const matchesReviewer = (rec.review?.reviewerName || '').toLowerCase().includes(q);
        if (!matchesId && !matchesProd && !matchesCust && !matchesComment && !matchesReason && !matchesReviewer) return false;
      }
      return true;
    });
  }, [rejectedRecords, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header Panel */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-400 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Complaint Screening Center
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600 mr-2 animate-pulse" />
                Company Rules Engine
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 font-semibold">
              Automated policy compliance screening, duplicate detection, and Gemini-assisted complaint verification
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-y-2">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="btn-secondary"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Rules Config ({activeRules.filter((r) => r.enabled).length}/{activeRules.length})</span>
            </button>

            <button
              onClick={() => handleRunScreening(true)}
              disabled={isScreeningRunning || returns.length === 0}
              className="btn-primary"
            >
              {isScreeningRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  <span>Screening Active Claims...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Screen All Complaints</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar during screening */}
        {isScreeningRunning && screeningProgress && (
          <div className="glass-panel p-4 rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-2">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                Screening complaint {screeningProgress.current} of {screeningProgress.total} ({screeningProgress.returnId})...
              </span>
              <span className="text-indigo-600 font-mono font-black">
                {Math.round((screeningProgress.current / screeningProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${(screeningProgress.current / screeningProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Top Navigation Tabs: Active Screening vs Rejected Archive */}
        <div className="flex items-center space-x-2.5 border-b border-slate-300 pb-3.5 overflow-x-auto text-sm">
          <button
            onClick={() => {
              setActiveTab('active');
              setSearchQuery('');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold shrink-0 transition-all cursor-pointer text-sm flex items-center space-x-2 ${
              activeTab === 'active'
                ? 'bg-indigo-600 text-white shadow-[0_2px_10px_0_rgba(99,102,241,0.4)]'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 bg-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Active Complaint Screening</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {screeningRecords.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rejected');
              setSearchQuery('');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold shrink-0 transition-all cursor-pointer text-sm flex items-center space-x-2 ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-[0_2px_10px_0_rgba(225,29,72,0.4)]'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 bg-white'
            }`}
          >
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Rejected Claims Tab</span>
            <span
              className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'rejected'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-700 border border-rose-300'
              }`}
            >
              {rejectedRecords.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ACTIVE SCREENING VIEW */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {/* 4 Core KPI Metric Cards for Active Claims */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Total Screened (Active Only) */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Active Screened Claims</span>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 group-hover:scale-110 transition-transform">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {metrics.totalScreened}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    Active claims under review
                  </p>
                </div>
              </div>

              {/* Metric 2: Requires Review */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Requires Human Review</span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-amber-600 tracking-tight">
                    {metrics.needsReview}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    Flagged by active company rules
                  </p>
                </div>
              </div>

              {/* Metric 3: Active Rule Violations */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Rule Violations</span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
                    {metrics.ruleViolationsDetected}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    Conditions met on active claims
                  </p>
                </div>
              </div>

              {/* Metric 4: Approved Claims */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white group">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Approved Claims</span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
                    {metrics.approvedCount}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    Verified and cleared for return
                  </p>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-400 flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Return ID, Product, Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/90 border border-slate-400 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-indigo-600 font-medium transition"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 whitespace-nowrap">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-white text-slate-900 font-bold border border-slate-400 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-600 cursor-pointer shadow-sm"
                  >
                    <option value="all">All Active Statuses ({screeningRecords.length})</option>
                    <option value="needs-review">Needs Review ({metrics.needsReview})</option>
                    <option value="approved">Approved ({metrics.approvedCount})</option>
                    <option value="no-rule-triggered">Passed All Rules ({metrics.noRuleCount})</option>
                  </select>
                </div>

                {/* Severity Filter */}
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 whitespace-nowrap">
                  <span>Severity:</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as any)}
                    className="bg-white text-slate-900 font-bold border border-slate-400 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-600 cursor-pointer shadow-sm"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Privacy Mask Toggle */}
                <button
                  onClick={() => setMaskCustomerData(!maskCustomerData)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                    maskCustomerData
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Masks customer identifying names to preserve customer privacy"
                >
                  {maskCustomerData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{maskCustomerData ? 'Names Masked' : 'Names Revealed'}</span>
                </button>
              </div>
            </div>

            {/* Active Complaints Table */}
            <div className="glass-panel rounded-2xl border border-slate-400 overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-4 font-mono">Return ID & Product</th>
                      <th className="py-4 px-4">Customer</th>
                      <th className="py-4 px-4">Rating</th>
                      <th className="py-4 px-4 min-w-[220px]">Customer Comment</th>
                      <th className="py-4 px-4">Triggered Rules</th>
                      <th className="py-4 px-4">AI Interpretation</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredActiveRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <FileCheck2 className="w-10 h-10 text-slate-400 mb-2" />
                            <p className="font-bold text-slate-700">No active complaints match the active filters.</p>
                            <p className="text-xs text-slate-500 mt-1">Try clearing search filters or click "Screen All Complaints".</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredActiveRecords.map((rec) => {
                        const isNeedsReview = rec.status === 'needs-review';
                        const isApproved = rec.status === 'approved';

                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-50 transition-colors group cursor-pointer"
                            onClick={() => setSelectedRecord(rec)}
                          >
                            {/* Return ID & Product */}
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-black text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {rec.returnId}
                              </div>
                              <div className="text-xs text-slate-700 font-semibold truncate max-w-[190px] mt-0.5">
                                {rec.productName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                SKU: {rec.sku} • {rec.category}
                              </div>
                            </td>

                            {/* Customer */}
                            <td className="py-3.5 px-4">
                              <div className="text-xs font-bold text-slate-900">
                                {maskCustomerData ? rec.maskedCustomerName : rec.customerName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {rec.orderId}
                              </div>
                            </td>

                            {/* Rating */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="font-black text-amber-600">{rec.rating ?? '-'}</span>
                                <span className="text-amber-500">★</span>
                              </div>
                              <div className="text-[11px] text-slate-500 capitalize">
                                {rec.severity}
                              </div>
                            </td>

                            {/* Complaint Text */}
                            <td className="py-3.5 px-4">
                              <p className="text-xs text-slate-700 line-clamp-2 italic" title={rec.customerComment}>
                                "{rec.customerComment || '(Blank comment)'}"
                              </p>
                              <div className="text-[11px] text-slate-500 mt-1">
                                Reason: <span className="text-slate-700 font-semibold">{rec.reasonCategory}</span>
                              </div>
                            </td>

                            {/* Triggered Rules */}
                            <td className="py-3.5 px-4">
                              {rec.triggeredRules.length === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Passed all checks
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1 max-w-[200px]">
                                  {rec.triggeredRules.map((rule, idx) => (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        rule.severity === 'critical'
                                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                                          : rule.severity === 'high'
                                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                                          : rule.severity === 'medium'
                                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                                          : 'bg-slate-100 border-slate-300 text-slate-700'
                                      }`}
                                      title={rule.explanation}
                                    >
                                      <AlertCircle className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{rule.ruleName}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* AI Interpretation */}
                            <td className="py-3.5 px-4">
                              {rec.aiInterpretation ? (
                                <div className="max-w-[210px]">
                                  {rec.aiInterpretation.possiblePolicyConcern ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                                      <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span className="truncate">{rec.aiInterpretation.possiblePolicyConcern}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-semibold">
                                      <Sparkles className="w-3 h-3 text-slate-500 shrink-0" />
                                      Standard return
                                    </span>
                                  )}
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {rec.aiInterpretation.summary}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">Pending AI</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Approved
                                </span>
                              ) : isNeedsReview ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Needs Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                  No Rule Triggered
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(rec);
                                  }}
                                  className="btn-secondary !py-1.5 !px-3 !text-xs cursor-pointer"
                                >
                                  <span>Review</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(rec);
                                    handleOpenRejectModal();
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-300 transition cursor-pointer"
                                  title="Reject and permanently delete this return from Total Returns and Firebase"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">Reject & Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REJECTED CLAIMS ARCHIVE VIEW (Separate tab requested by user) */}
        {activeTab === 'rejected' && (
          <div className="space-y-6">
            {/* 3 Summary KPI Cards for Rejected Claims */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-rose-300 space-y-3 shadow-sm bg-rose-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-rose-800 uppercase tracking-widest">Total Claims Rejected</span>
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-300">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-rose-700 tracking-tight">
                    {rejectedMetrics.totalRejected}
                  </div>
                  <p className="text-xs sm:text-sm text-rose-800 font-semibold mt-1">
                    Deleted from active screening count
                  </p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm bg-white">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Claim Value Saved</span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(rejectedMetrics.totalValueSaved)}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    Total refund amount prevented
                  </p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-400 space-y-3 shadow-sm bg-white">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Policy Violations Confirmed</span>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-300">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {rejectedMetrics.withViolations}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                    Rejections backed by deterministic rules
                  </p>
                </div>
              </div>
            </div>

            {/* Search Toolbar for Rejected Claims */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-400 flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rejected by ID, product, reason, reviewer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/90 border border-slate-400 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-indigo-600 font-medium transition"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMaskCustomerData(!maskCustomerData)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    maskCustomerData
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {maskCustomerData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{maskCustomerData ? 'Names Masked' : 'Names Revealed'}</span>
                </button>
              </div>
            </div>

            {/* Rejected Claims Table */}
            <div className="glass-panel rounded-2xl border border-slate-400 overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-rose-50 text-rose-950 font-black border-b border-rose-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-4 font-mono">Return ID & Order</th>
                      <th className="py-4 px-4">Product Details</th>
                      <th className="py-4 px-4">Customer</th>
                      <th className="py-4 px-4">Value Saved</th>
                      <th className="py-4 px-4 min-w-[220px]">Documented Rejection Reason</th>
                      <th className="py-4 px-4">Reviewer Details</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRejectedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <XCircle className="w-10 h-10 text-rose-300 mb-2" />
                            <p className="font-bold text-slate-700">No rejected claims recorded in this archive.</p>
                            <p className="text-xs text-slate-500 mt-1">
                              When you review and reject a claim in Active Screening, it will appear here.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRejectedRecords.map((rec) => (
                        <tr
                          key={rec.id}
                          className="hover:bg-rose-50/30 transition-colors group cursor-pointer"
                          onClick={() => setSelectedRecord(rec)}
                        >
                          {/* Return ID & Order */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-black text-xs text-rose-800">
                              {rec.returnId}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Order: {rec.orderId}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {rec.returnDate}
                            </div>
                          </td>

                          {/* Product Details */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs text-slate-900 font-bold truncate max-w-[180px]">
                              {rec.productName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              SKU: {rec.sku} • {rec.category}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-bold text-slate-800">
                              {maskCustomerData ? rec.maskedCustomerName : rec.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {rec.customerEmail || 'No email on file'}
                            </div>
                          </td>

                          {/* Value Saved */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-black text-emerald-700">
                              {formatCurrency(rec.refundAmount || rec.price)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Unit price: {formatCurrency(rec.price)}
                            </div>
                          </td>

                          {/* Rejection Reason (Prominently styled) */}
                          <td className="py-3.5 px-4">
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                              <span className="font-extrabold text-rose-950 block mb-0.5">Mandatory Justification:</span>
                              "{rec.review?.reason || 'No specific reason recorded'}"
                            </div>
                          </td>

                          {/* Reviewer & Timestamp */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-bold text-slate-900">
                              {rec.review?.reviewerName || 'Store Reviewer'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {rec.review?.reviewerEmail}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {rec.review?.reviewedAt ? new Date(rec.review.reviewedAt).toLocaleDateString() : '-'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreToActive(rec);
                                }}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer"
                                title="Move back to active screening"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePermanentlyDeleteRejected(rec);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
                                title="Permanently delete from archive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Review Modal (White UI styling) */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-300 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      Review Complaint: <span className="font-mono text-indigo-600">{selectedRecord.returnId}</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      Product: {selectedRecord.productName} • Customer: {maskCustomerData ? selectedRecord.maskedCustomerName : selectedRecord.customerName}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-700">
                {/* Current Status Banner */}
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50 border-slate-300">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-extrabold tracking-wider">Screening Status</span>
                    <div className="text-base font-black text-slate-900 capitalize mt-0.5">
                      {selectedRecord.status.replace(/-/g, ' ')}
                    </div>
                  </div>
                  {selectedRecord.review && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-semibold">Reviewed by:</span>
                      <div className="text-xs font-mono text-indigo-700 font-bold">
                        {selectedRecord.review.reviewerName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {selectedRecord.review.reviewedAt ? new Date(selectedRecord.review.reviewedAt).toLocaleString() : '-'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Complaint Details Card */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Verified Return Data & Customer Feedback
                  </h3>
                  <div className="p-4 rounded-2xl bg-white border border-slate-300 space-y-3 shadow-2xs">
                    <div>
                      <span className="text-xs text-slate-500 font-bold">Customer Comment:</span>
                      <p className="text-sm text-slate-900 font-medium italic mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        "{selectedRecord.customerComment || '(No comment entered)'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-200">
                      <div>
                        <span className="text-slate-500 font-bold">Order ID:</span>
                        <div className="font-mono text-slate-900 font-black">{selectedRecord.orderId}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Return Date:</span>
                        <div className="text-slate-800 font-medium">{selectedRecord.returnDate}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Unit Price:</span>
                        <div className="text-slate-900 font-black">{formatCurrency(selectedRecord.price)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Refund Claim:</span>
                        <div className="text-slate-900 font-black">{formatCurrency(selectedRecord.refundAmount || selectedRecord.price)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Triggered Company Rules */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Deterministic Company Rule Violations ({selectedRecord.triggeredRules.length})
                  </h3>

                  {selectedRecord.triggeredRules.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Zero rule violations detected. Complaint satisfies all configured company policies.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedRecord.triggeredRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-900 flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                rule.severity === 'critical' ? 'bg-rose-500' : rule.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'
                              }`} />
                              {rule.ruleName}
                            </span>
                            <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                              rule.severity === 'critical'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : rule.severity === 'high'
                                ? 'bg-orange-50 text-orange-700 border-orange-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}>
                              {rule.severity} severity
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{rule.explanation}</p>
                          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-mono">
                            <strong className="text-slate-800">Evidence: </strong>
                            {rule.supportingEvidence}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gemini AI Complaint Interpretation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Gemini-Assisted Complaint Interpretation
                    </h3>
                    <span className="text-[11px] text-slate-500 font-bold">Advisory Suggestions Only</span>
                  </div>

                  {selectedRecord.aiInterpretation ? (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-600 font-bold">Summary: </span>
                        <span className="text-slate-900 font-medium">{selectedRecord.aiInterpretation.summary}</span>
                      </div>

                      {selectedRecord.aiInterpretation.possiblePolicyConcern && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                          <span className="font-extrabold text-amber-950">Potential Policy Concern: </span>
                          {selectedRecord.aiInterpretation.possiblePolicyConcern}
                        </div>
                      )}

                      <div>
                        <span className="text-slate-600 font-bold">AI Reasoning: </span>
                        <span className="text-slate-800">{selectedRecord.aiInterpretation.explanation}</span>
                      </div>

                      {selectedRecord.aiInterpretation.supportingEvidence && (
                        <div className="text-slate-700 bg-white p-2.5 rounded-xl border border-indigo-100 font-mono text-[11px]">
                          <span className="text-indigo-600 font-bold">Supporting Text: </span>
                          "{selectedRecord.aiInterpretation.supportingEvidence}"
                        </div>
                      )}

                      {selectedRecord.aiInterpretation.missingInformation && (
                        <div className="text-orange-900 text-[11px] bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                          <span className="font-bold text-orange-950">Missing Information: </span>
                          {selectedRecord.aiInterpretation.missingInformation}
                        </div>
                      )}

                      <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Confidence: <strong className="text-slate-800 uppercase">{selectedRecord.aiInterpretation.confidence}</strong></span>
                        <span>{selectedRecord.aiInterpretation.disclaimer}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      No AI interpretation recorded for this complaint. Click "Screen All Complaints" to evaluate with Gemini.
                    </div>
                  )}
                </div>

                {/* Audit Review History */}
                {selectedRecord.history && selectedRecord.history.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-500" />
                      Audit Trail & Decision History
                    </h3>
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                      {selectedRecord.history.map((h, i) => (
                        <div key={i} className="flex items-start justify-between py-1.5 border-b border-slate-200 last:border-0">
                          <div>
                            <span className="font-bold text-slate-900 capitalize">{h.action}: </span>
                            <span className="text-slate-700">{h.details}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 text-right whitespace-nowrap ml-4">
                            <div className="font-semibold text-slate-700">{h.actor}</div>
                            <div>{h.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* If already rejected, show rejection summary prominently */}
                {selectedRecord.status === 'rejected' && selectedRecord.review && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-1.5">
                    <span className="text-xs font-black uppercase text-rose-800 tracking-wider">Documented Rejection Reason:</span>
                    <p className="text-sm font-semibold text-rose-950 italic">
                      "{selectedRecord.review.reason}"
                    </p>
                  </div>
                )}

                {/* Reviewer Note Input (only when active/reviewing) */}
                {selectedRecord.status !== 'rejected' && (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Reviewer Notes / Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter any guidance, supplier follow-up notes, or customer instructions..."
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="btn-secondary !text-xs !py-2"
                >
                  Close
                </button>

                <div className="flex items-center gap-3">
                  {selectedRecord.status === 'rejected' ? (
                    <button
                      onClick={() => handleRestoreToActive(selectedRecord)}
                      className="btn-primary !text-xs !py-2"
                    >
                      <Undo2 className="w-4 h-4 mr-1" />
                      <span>Restore to Active Screening</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSetPending(selectedRecord)}
                        className="btn-secondary !text-xs !py-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        Leave Pending
                      </button>

                      <button
                        onClick={handleOpenRejectModal}
                        className="btn-danger !text-xs !py-2"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        <span>Reject & Delete Return</span>
                      </button>

                      <button
                        onClick={() => handleApprove(selectedRecord)}
                        className="btn-success !text-xs !py-2"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        <span>Approve Claim</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Confirmation Dialog (White theme, strictly enforces mandatory rejection reason) */}
        {isRejectConfirmOpen && selectedRecord && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-rose-300 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 rounded-2xl bg-rose-100 border border-rose-300">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Reject & Delete Return Permanently</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Saves an audit copy in Rejected tab, then permanently deletes from Total Returns and Cloud Firestore.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs text-slate-700 space-y-1">
                <div>
                  You are rejecting claim <strong className="text-slate-900 font-mono">{selectedRecord.returnId}</strong> for{' '}
                  <strong className="text-slate-900">{selectedRecord.productName}</strong>.
                </div>
                <div className="text-[11px] text-rose-700 font-semibold">
                  • Audit copy preserved permanently in Rejected Claims tab with full evidence.<br />
                  • Deleted from Total Returns count across the entire app.<br />
                  • Deleted permanently from Cloud Firestore (will not refresh back to all).
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <span>Mandatory Rejection Reason:</span>
                  <span className="text-slate-500 font-normal">(Required, min 5 chars)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="State the objective policy violation or evidence (e.g. 'Duplicate claim confirmed with Return ID RET-9001', 'Damaged category claimed without defect proof')..."
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError(null);
                  }}
                  className="w-full p-3 bg-white border border-slate-400 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 font-medium"
                />
                {rejectionError && (
                  <p className="text-xs text-rose-600 font-bold">{rejectionError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setIsRejectConfirmOpen(false)}
                  className="btn-secondary !text-xs !py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="btn-danger !text-xs !py-2"
                >
                  Reject, Delete from Total Returns & Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Company Rules Configuration Modal (White theme) */}
        {isRulesModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Company Screening Rules</h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      Configure deterministic policy checks evaluated against imported return records
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsRulesModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 max-h-[65vh] overflow-y-auto">
                {activeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      rule.enabled
                        ? 'bg-white border-slate-400 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{rule.name}</span>
                          <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                            rule.severity === 'critical'
                              ? 'bg-rose-50 border-rose-300 text-rose-700'
                              : rule.severity === 'high'
                              ? 'bg-orange-50 border-orange-300 text-orange-700'
                              : rule.severity === 'medium'
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}>
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{rule.description}</p>
                        <div className="text-[11px] font-mono text-slate-500">
                          ID: {rule.id} • Category: {rule.category}
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                          rule.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                        title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            rule.enabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-bold">
                <span>Rules are applied dynamically to active complaint audits.</span>
                <button
                  onClick={() => setIsRulesModalOpen(false)}
                  className="btn-primary !text-xs !py-2"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
