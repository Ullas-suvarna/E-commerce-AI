'use client';

import React from 'react';
import { AlertCircle, Inbox, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ElementType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon: Icon = Inbox,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center my-6 border border-slate-300">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
      <p className="text-base text-slate-600 max-w-md mt-1 mb-6 leading-relaxed font-medium">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 my-4">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-base font-bold text-rose-900">{title}</h4>
          <p className="text-sm text-rose-700 mt-0.5 font-medium">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold border border-rose-200 transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3">
      <div className="h-10 skeleton-shimmer rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-14 skeleton-shimmer rounded-xl w-full opacity-70" />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="h-4 skeleton-shimmer rounded-lg w-28" />
        <div className="w-8 h-8 skeleton-shimmer rounded-lg" />
      </div>
      <div className="h-8 skeleton-shimmer rounded-lg w-36" />
      <div className="h-3 skeleton-shimmer rounded-lg w-24" />
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 skeleton-shimmer rounded-xl w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
};
