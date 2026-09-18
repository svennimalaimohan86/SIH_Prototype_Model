import React from 'react';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  score?: number;
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, showScore = false }) => {
  const normalizedLevel = level.toUpperCase();

  let styles = {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };

  if (normalizedLevel === 'CRITICAL') {
    styles = {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      dot: 'bg-rose-500 animate-pulse',
    };
  } else if (normalizedLevel === 'HIGH') {
    styles = {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
    };
  } else if (normalizedLevel === 'MEDIUM') {
    styles = {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    };
  } else if (normalizedLevel === 'LOW') {
    styles = {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    };
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${styles.bg} ${styles.border} ${styles.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      <span>{normalizedLevel}</span>
      {showScore && score !== undefined && (
        <span className="font-extrabold ml-0.5 opacity-90">({score})</span>
      )}
    </span>
  );
};
