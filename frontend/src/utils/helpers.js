import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '—';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getStatusColor(status) {
  switch (status) {
    case 'normal': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'high':
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'failed': return 'text-red-600 bg-red-50 border-red-200';
    case 'active': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'discontinued': return 'text-slate-500 bg-slate-50 border-slate-200';
    case 'on_hold': return 'text-amber-600 bg-amber-50 border-amber-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getStatusDotColor(status) {
  switch (status) {
    case 'normal':
    case 'completed':
    case 'active': return 'bg-emerald-500';
    case 'warning': return 'bg-amber-500';
    case 'high':
    case 'critical':
    case 'failed': return 'bg-red-500';
    case 'processing': return 'bg-blue-500';
    case 'pending': return 'bg-amber-400';
    case 'discontinued': return 'bg-slate-400';
    default: return 'bg-slate-400';
  }
}

export function getTrendIcon(trend) {
  switch (trend) {
    case 'improving': return '↓';
    case 'worsening': return '↑';
    case 'stable': return '→';
    default: return '→';
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
