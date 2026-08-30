'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ReturnRecord, ProductSummary, ReturnPattern, ToastMessage, ReturnFilterState } from '@/lib/types';
import { INITIAL_RETURNS, INITIAL_PRODUCTS, INITIAL_PATTERNS } from '@/lib/mockData';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeToUserReturns,
  addFirestoreReturn,
  updateFirestoreReturn,
  deleteFirestoreReturn,
  batchImportFirestoreReturns,
  seedInitialUserDataIfEmpty,
} from '@/lib/firestoreService';

export interface SummaryMetrics {
  totalReturns: number;
  analyzedReturns: number;
  pendingReturns: number;
  highSeverityReturns: number;
  numberOfProblematicProducts: number;
  totalRefunded: number;
  topProblematicProducts: {
    sku: string;
    name: string;
    category: string;
    returnCount: number;
    topReason: string;
    topReasonCount: number;
    riskStatus: 'Critical Issue' | 'High Risk' | 'Moderate Risk' | 'Normal';
  }[];
  topReturnReasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  aiInsightsCount: number;
  recentReturns: ReturnRecord[];
  analyzedPercentage: number;
}

export type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'name-asc';

interface DataContextType {
  returns: ReturnRecord[];
  products: ProductSummary[];
  patterns: ReturnPattern[];
  filterState: ReturnFilterState;
  sortOption: SortOption;
  toasts: ToastMessage[];
  isLoading: boolean;
  error: string | null;
  currency: string;
  currencySymbol: string;
  currencyRate: number;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount?: number) => string;
  setFilterState: React.Dispatch<React.SetStateAction<ReturnFilterState>>;
  setSortOption: (sort: SortOption) => void;
  addReturnRecord: (record: Omit<ReturnRecord, 'id'>) => Promise<void>;
  updateReturnRecord: (id: string, updatedData: Partial<ReturnRecord>) => Promise<void>;
  importCsvRecords: (newRecords: (Omit<ReturnRecord, 'id'> & { id?: string })[]) => Promise<number>;
  syncAllReturnsToFirestore: () => Promise<number>;
  getReturnById: (id: string) => ReturnRecord | undefined;
  deleteReturnRecord: (id: string) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  removeToast: (id: string) => void;
  filteredReturns: ReturnRecord[];
  summaryMetrics: SummaryMetrics;
  resetToSampleData: () => Promise<void>;
  clearAllReturns: () => void;
}

const getUserStorageKey = (uid?: string) => (uid ? `ai_return_iq_returns_${uid}` : 'ai_return_iq_returns_demo');
const getUserClearedKey = (uid?: string) => (uid ? `ai_return_iq_cleared_${uid}` : 'ai_return_iq_cleared_demo');
const getUserCurrencyKey = (uid?: string) => (uid ? `ai_return_iq_currency_${uid}` : 'ai_return_iq_currency_demo');

export const CURRENCY_MAP: Record<string, { symbol: string; rate: number }> = {
  'USD ($)': { symbol: '$', rate: 1.0 },
  'EUR (€)': { symbol: '€', rate: 0.92 },
  'GBP (£)': { symbol: '£', rate: 0.79 },
  'CAD ($)': { symbol: 'CAD $', rate: 1.36 },
  'INR (₹)': { symbol: '₹', rate: 83.5 },
  'AUD ($)': { symbol: 'AUD $', rate: 1.52 },
  'JPY (¥)': { symbol: '¥', rate: 155.0 },
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [currency, setCurrencyState] = useState<string>('USD ($)');

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getUserCurrencyKey(user?.uid), newCurrency);
      } catch (e) {}
    }
  };

  const currencyInfo = CURRENCY_MAP[currency] || CURRENCY_MAP['USD ($)'];
  const currencySymbol = currencyInfo.symbol;
  const currencyRate = currencyInfo.rate;

  const formatCurrency = (amount: number = 0): string => {
    const converted = amount * currencyRate;
    if (currencySymbol === '¥') {
      return `${currencySymbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${currencySymbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>(INITIAL_PRODUCTS);
  const [patterns, setPatterns] = useState<ReturnPattern[]>(INITIAL_PATTERNS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  const [filterState, setFilterState] = useState<ReturnFilterState>({
    searchQuery: '',
    status: 'all',
    severity: 'all',
    category: 'all',
    dateRange: 'all',
  });

  // Save returns dataset permanently to localStorage for the active user ONLY
  const saveToStorage = (dataset: ReturnRecord[], targetUid?: string) => {
    if (typeof window !== 'undefined') {
      try {
        const uid = targetUid || user?.uid;
        const storageKey = getUserStorageKey(uid);
        const clearedKey = getUserClearedKey(uid);
        if (dataset.length > 0) {
          localStorage.removeItem(clearedKey);
        }
        localStorage.setItem(storageKey, JSON.stringify(dataset));
      } catch (e) {}
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Switch workspace & sync real-time Cloud Firestore returns for authenticated user session
  useEffect(() => {
    const uid = user?.uid;
    const storageKey = getUserStorageKey(uid);
    const clearedKey = getUserClearedKey(uid);

    if (typeof window !== 'undefined') {
      try {
        const isCleared = localStorage.getItem(clearedKey);
        if (isCleared === 'true') {
          setReturns([]);
        } else {
          const saved = localStorage.getItem(storageKey);
          if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setReturns(parsed);
            }
          } else {
            // New user session: start with baseline sample data for this user
            setReturns(INITIAL_RETURNS);
            localStorage.setItem(storageKey, JSON.stringify(INITIAL_RETURNS));
          }
        }

        const savedCurrency = localStorage.getItem(getUserCurrencyKey(uid));
        if (savedCurrency && CURRENCY_MAP[savedCurrency]) {
          setCurrencyState(savedCurrency);
        } else {
          setCurrencyState('USD ($)');
        }
      } catch (e) {}
    }

    if (!user || user.uid === 'demo-user-spark') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    seedInitialUserDataIfEmpty(user.uid)
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });

    const unsubscribe = subscribeToUserReturns(
      user.uid,
      (firestoreReturns) => {
        const currentCleared = typeof window !== 'undefined' ? localStorage.getItem(getUserClearedKey(user.uid)) : null;
        if (currentCleared === 'true') {
          setIsLoading(false);
          return;
        }

        if (firestoreReturns.length > 0) {
          setReturns(firestoreReturns);
          saveToStorage(firestoreReturns, user.uid);
        }
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addReturnRecord = async (record: Omit<ReturnRecord, 'id'>) => {
    const newId = `RET-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: ReturnRecord = { ...record, id: newId };

    setReturns((prev) => {
      const updated = [newRecord, ...prev];
      saveToStorage(updated);
      return updated;
    });

    try {
      await addFirestoreReturn(user?.uid || 'demo-user-spark', record);
      showToast('success', 'Return Saved to Firestore', `Return record saved to Cloud Firestore (${newId}).`);
    } catch (err: any) {
      showToast('success', 'Return Saved Workspace', `Return ${newId} saved to workspace.`);
    }
  };

  const updateReturnRecord = async (id: string, updatedData: Partial<ReturnRecord>) => {
    setReturns((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updatedData } : r));
      saveToStorage(updated);
      return updated;
    });

    try {
      await updateFirestoreReturn(user?.uid || 'demo-user-spark', id, updatedData);
      showToast('success', 'Record Updated', `Return ${id} updated in Cloud Firestore.`);
    } catch (err: any) {
      showToast('success', 'Record Updated', `Return ${id} updated successfully.`);
    }
  };

  const importCsvRecords = async (newRecords: (Omit<ReturnRecord, 'id'> & { id?: string })[]) => {
    const preparedRecords: ReturnRecord[] = newRecords.map((r, idx) => ({
      ...r,
      id: r.id || `RET-${Math.floor(2000 + Math.random() * 8000 + idx)}`,
    }));

    let updatedDataset: ReturnRecord[] = [];
    setReturns((prev) => {
      const existingIds = new Set(prev.map((r) => r.id.toLowerCase()));
      const uniqueNew = preparedRecords.filter((r) => !existingIds.has(r.id.toLowerCase()));
      updatedDataset = [...uniqueNew, ...prev];
      saveToStorage(updatedDataset);
      return updatedDataset;
    });

    try {
      const count = await batchImportFirestoreReturns(user?.uid || 'demo-user-spark', preparedRecords);
      showToast('success', 'CSV Sync Complete', `Saved ${count} records to Cloud Firestore.`);
    } catch (err: any) {
      showToast('success', 'CSV Sync Complete', `Saved ${preparedRecords.length} records to workspace.`);
    }

    return preparedRecords.length;
  };

  const syncAllReturnsToFirestore = async (): Promise<number> => {
    setIsLoading(true);
    try {
      const activeUid = user?.uid || 'demo-user-spark';
      const count = await batchImportFirestoreReturns(activeUid, returns);
      showToast('success', 'Cloud Firestore Synced', `Stored all ${count} return records into Cloud Firestore!`);
      setIsLoading(false);
      return count;
    } catch (err: any) {
      showToast('error', 'Firestore Sync Alert', err.message || 'Ensure Firestore Rules are published in Firebase Console.');
      setIsLoading(false);
      return 0;
    }
  };

  const getReturnById = (id: string) => {
    return returns.find((r) => r.id === id);
  };

  const deleteReturnRecord = async (id: string) => {
    setReturns((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveToStorage(updated);
      return updated;
    });

    try {
      await deleteFirestoreReturn(user?.uid || 'demo-user-spark', id);
      showToast('info', 'Record Removed', `Removed return record ${id} from database.`);
    } catch (err: any) {
      showToast('info', 'Record Removed', `Return record ${id} deleted.`);
    }
  };

  const resetToSampleData = async () => {
    const uid = user?.uid;
    const storageKey = getUserStorageKey(uid);
    const clearedKey = getUserClearedKey(uid);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(clearedKey);
        localStorage.setItem(storageKey, JSON.stringify(INITIAL_RETURNS));
      } catch (e) {}
    }
    setReturns(INITIAL_RETURNS);
    if (user && user.uid !== 'demo-user-spark') {
      try {
        await batchImportFirestoreReturns(user.uid, INITIAL_RETURNS);
      } catch (e) {}
    }
    showToast('success', 'Data Reset', 'Restored sample return records for your account.');
  };

  const clearAllReturns = () => {
    const uid = user?.uid;
    const storageKey = getUserStorageKey(uid);
    const clearedKey = getUserClearedKey(uid);
    setReturns([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(clearedKey, 'true');
        localStorage.removeItem(storageKey);
      } catch (e) {}
    }
    showToast('info', 'Dataset Cleared', 'All return records have been permanently cleared from workspace.');
  };

  // Enhanced Filtering & Sorting
  const filteredReturns = useMemo(() => {
    let result = returns.filter((r) => {
      if (filterState.searchQuery) {
        const query = filterState.searchQuery.toLowerCase();
        const matchSku = r.sku.toLowerCase().includes(query);
        const matchName = r.productName.toLowerCase().includes(query);
        const matchCustomer = r.customerName?.toLowerCase().includes(query) || false;
        const matchId = r.id.toLowerCase().includes(query) || r.orderId.toLowerCase().includes(query);
        const matchReason = r.reasonCategory.toLowerCase().includes(query);
        const matchComment = r.customerComment.toLowerCase().includes(query);
        if (!matchSku && !matchName && !matchCustomer && !matchId && !matchReason && !matchComment) return false;
      }

      if (filterState.status === 'Pending') {
        if (r.status !== 'Unanalyzed' && r.status !== 'Processing') return false;
      } else if (filterState.status === 'Analyzed') {
        if (r.status !== 'Analyzed') return false;
      } else if (filterState.status === 'High severity') {
        if (r.severity !== 'High' && r.severity !== 'Critical') return false;
      } else if (filterState.status === 'Medium severity') {
        if (r.severity !== 'Medium') return false;
      } else if (filterState.status === 'Low severity') {
        if (r.severity !== 'Low') return false;
      }

      if (filterState.severity !== 'all' && r.severity !== filterState.severity) {
        return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      if (sortOption === 'date-desc') {
        return new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime();
      } else if (sortOption === 'date-asc') {
        return new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime();
      } else if (sortOption === 'price-desc') {
        return (b.refundAmount || b.price || 0) - (a.refundAmount || a.price || 0);
      } else if (sortOption === 'price-asc') {
        return (a.refundAmount || a.price || 0) - (b.refundAmount || b.price || 0);
      } else if (sortOption === 'name-asc') {
        return a.productName.localeCompare(b.productName);
      }
      return 0;
    });
  }, [returns, filterState, sortOption]);

  // Compute summary metrics
  const summaryMetrics: SummaryMetrics = useMemo(() => {
    const totalReturns = returns.length;
    const analyzedReturns = returns.filter((r) => r.status === 'Analyzed').length;
    const pendingReturns = totalReturns - analyzedReturns;
    const highSeverityReturns = returns.filter((r) => r.severity === 'High' || r.severity === 'Critical').length;
    const totalRefunded = returns.reduce((sum, r) => sum + (r.refundAmount || r.price || 0), 0);
    const analyzedPercentage = totalReturns > 0 ? Math.round((analyzedReturns / totalReturns) * 100) : 0;

    const prodMap: Record<
      string,
      {
        sku: string;
        name: string;
        category: string;
        returnCount: number;
        reasons: Record<string, number>;
      }
    > = {};

    returns.forEach((r) => {
      const key = r.sku || r.productName;
      if (!prodMap[key]) {
        prodMap[key] = {
          sku: r.sku,
          name: r.productName,
          category: r.category,
          returnCount: 0,
          reasons: {},
        };
      }
      prodMap[key].returnCount += 1;
      const cat = r.reasonCategory || 'Other';
      prodMap[key].reasons[cat] = (prodMap[key].reasons[cat] || 0) + 1;
    });

    const topProblematicProducts = Object.values(prodMap)
      .map((p) => {
        let topReason = 'Other';
        let topReasonCount = 0;
        Object.entries(p.reasons).forEach(([rsn, cnt]) => {
          if (cnt > topReasonCount) {
            topReasonCount = cnt;
            topReason = rsn;
          }
        });

        let riskStatus: 'Critical Issue' | 'High Risk' | 'Moderate Risk' | 'Normal' = 'Normal';
        if (p.returnCount >= 4) riskStatus = 'Critical Issue';
        else if (p.returnCount === 3) riskStatus = 'High Risk';
        else if (p.returnCount === 2) riskStatus = 'Moderate Risk';

        return {
          sku: p.sku,
          name: p.name,
          category: p.category,
          returnCount: p.returnCount,
          topReason,
          topReasonCount,
          riskStatus,
        };
      })
      .sort((a, b) => b.returnCount - a.returnCount);

    const numberOfProblematicProducts = topProblematicProducts.filter((p) => p.returnCount >= 2).length;

    const reasonCountsMap: Record<string, number> = {};
    returns.forEach((r) => {
      const cat = r.reasonCategory || 'Other';
      reasonCountsMap[cat] = (reasonCountsMap[cat] || 0) + 1;
    });

    const topReturnReasons = Object.entries(reasonCountsMap)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalReturns > 0 ? Math.round((count / totalReturns) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const aiInsightsCount = returns.filter((r) => r.aiAnalysis?.recommendedAction).length;
    const recentReturns = [...returns].sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime()).slice(0, 5);

    return {
      totalReturns,
      analyzedReturns,
      pendingReturns,
      highSeverityReturns,
      numberOfProblematicProducts,
      totalRefunded,
      topProblematicProducts,
      topReturnReasons,
      aiInsightsCount,
      recentReturns,
      analyzedPercentage,
    };
  }, [returns]);

  return (
    <DataContext.Provider
      value={{
        returns,
        products,
        patterns,
        filterState,
        sortOption,
        toasts,
        isLoading,
        error,
        currency,
        currencySymbol,
        currencyRate,
        setCurrency,
        formatCurrency,
        setFilterState,
        setSortOption,
        addReturnRecord,
        updateReturnRecord,
        importCsvRecords,
        syncAllReturnsToFirestore,
        getReturnById,
        deleteReturnRecord,
        showToast,
        removeToast,
        filteredReturns,
        summaryMetrics,
        resetToSampleData,
        clearAllReturns,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
