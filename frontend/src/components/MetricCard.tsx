import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  statusDot?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-brand-600',
  bgColor = 'bg-lavender-iconBg',
  statusDot,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-soft hover:shadow-card transition-all duration-200 flex items-center gap-4">
      {/* Pastel Icon Square matching Reference Image 2 */}
      <div className={`w-12 h-12 rounded-xl ${bgColor} ${iconColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Metric details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 truncate tracking-wide">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {statusDot && (
            <span className={`w-2 h-2 rounded-full ${statusDot} flex-shrink-0`} />
          )}
          <h3 className="text-lg font-extrabold text-slate-900 truncate tracking-tight">{value}</h3>
        </div>
        {subValue && (
          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
};
