import { cn } from '../../utils/helpers';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-600',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm border border-slate-200',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-600',
    gradient: 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm border border-transparent',
    outline: 'bg-transparent hover:bg-blue-50 text-blue-600 border border-blue-300',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1.5 gap-1.5',
    sm: 'text-sm px-3 py-1.5 gap-2',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4 flex-shrink-0" />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 flex-shrink-0" />
      )}
    </button>
  );
}
