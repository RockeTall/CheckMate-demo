import React from 'react';
import { cn } from '../../utils';

interface StatusChipProps {
  status: 'draft' | 'published' | 'grading' | 'completed' | 'submitted' | 'graded' | 'returned' | 'pending';
  label?: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, className }) => {
  const styles = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    published: 'bg-blue-950/50 text-blue-300 border-blue-900',
    grading: 'bg-amber-950/50 text-amber-300 border-amber-900', // Bordo/Orange ish
    completed: 'bg-emerald-950/50 text-emerald-300 border-emerald-900',
    submitted: 'bg-indigo-950/50 text-indigo-300 border-indigo-900',
    graded: 'bg-purple-950/50 text-purple-300 border-purple-900',
    returned: 'bg-green-950/50 text-green-300 border-green-900',
    pending: 'bg-rose-950/50 text-rose-300 border-rose-900', // Warning/Attention
  };

  const defaultLabels = {
    draft: 'טיוטה',
    published: 'פורסם',
    grading: 'בבדיקה',
    completed: 'הושלם',
    submitted: 'הוגש',
    graded: 'נבדק',
    returned: 'ציון נשלח',
    pending: 'ממתין',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        styles[status] || styles.draft,
        className
      )}
    >
      {label || defaultLabels[status]}
    </span>
  );
};
