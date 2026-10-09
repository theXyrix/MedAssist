import { cn } from '../../utils/helpers';

export default function Badge({ children, variant = 'default', size = 'sm', className }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-violet-50 text-violet-700 border-violet-200',
    ai: 'bg-gradient-to-r from-blue-600 to-violet-600 text-white border-transparent',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border',
        variants[variant] || variants.default,
        sizes[size] || sizes.sm,
        className
      )}
    >
      {children}
    </span>
  );
}
