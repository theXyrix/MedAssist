import { cn } from '../../utils/helpers';

export default function Card({ children, className, padding = true, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm',
        padding && 'p-5',
        hover && 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, unit, status, trend, icon: Icon, color = '#3b82f6', className }) {
  const statusColors = {
    normal: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    high: 'text-red-600 bg-red-50',
    critical: 'text-red-600 bg-red-50',
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{value}</span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {status && (
            <span className={cn('inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', statusColors[status] || statusColors.normal)}>
              {status}
            </span>
          )}
        </div>
        {Icon && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Decorative gradient bar at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-40"
        style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
      />
    </Card>
  );
}
