import { cn } from '../../utils/helpers';

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton', className)} {...props} />;
}

export function PageLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}

export function StatusIndicator({ status, label, className }) {
  const colors = {
    completed: 'bg-emerald-500',
    processing: 'bg-blue-500 animate-pulse',
    pending: 'bg-amber-400',
    failed: 'bg-red-500',
    active: 'bg-emerald-500',
    discontinued: 'bg-slate-400',
    normal: 'bg-emerald-500',
    warning: 'bg-amber-400',
    high: 'bg-red-500',
  };

  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full', colors[status] || 'bg-slate-400')} />
      {label && <span className="text-xs text-slate-600 capitalize">{label || status}</span>}
    </span>
  );
}

export function LoadingSpinner({ className, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={cn('animate-spin rounded-full border-2 border-slate-200 border-t-blue-600', sizes[size] || sizes.md, className)} />
  );
}

