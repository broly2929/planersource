import type { ReactNode } from 'react';

type Statut = 'success' | 'warning' | 'danger' | 'info' | 'neutre' | 'flag';

const STYLES: Record<Statut, string> = {
  success: 'bg-success-bg text-success border-success',
  warning: 'bg-warning-bg text-warning border-warning',
  danger: 'bg-danger-bg text-danger border-danger',
  info: 'bg-info-bg text-info border-info',
  flag: 'bg-flag-bg text-flag border-flag',
  neutre: 'bg-gray-100 text-gray-700 border-gray-400',
};

export function Badge({ statut, children }: { statut: Statut; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-ui border px-2 text-petit font-semibold ${STYLES[statut]}`}
    >
      {children}
    </span>
  );
}
