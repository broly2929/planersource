import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type Type = 'erreur' | 'succes' | 'info' | 'avertissement';

const STYLES: Record<Type, string> = {
  erreur: 'border-danger bg-danger-bg text-danger',
  succes: 'border-success bg-success-bg text-success',
  info: 'border-info bg-info-bg text-info',
  avertissement: 'border-warning bg-warning-bg text-warning',
};
const ICONES = {
  erreur: AlertCircle,
  succes: CheckCircle2,
  info: Info,
  avertissement: TriangleAlert,
};

/** Message de retour : `role="alert"` pour une erreur, `role="status"` sinon. */
export function Notification({ type, children }: { type: Type; children: ReactNode }) {
  const Icone = ICONES[type];
  return (
    <div
      role={type === 'erreur' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-ui border px-3 py-2 ${STYLES[type]}`}
    >
      <span className="flex h-5 items-center">
        <Icone aria-hidden className="size-4 shrink-0" />
      </span>
      <div>{children}</div>
    </div>
  );
}
