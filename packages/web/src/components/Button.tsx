import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primaire' | 'secondaire' | 'danger' | 'discrete';

const VARIANTES: Record<Variante, string> = {
  primaire: 'bg-accent text-white hover:bg-accent-hover border-transparent',
  secondaire: 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300',
  discrete: 'bg-transparent text-gray-700 hover:bg-gray-100 border-transparent',
  danger: 'bg-danger text-white hover:bg-danger/90 border-transparent',
};

export function Button({
  variante = 'primaire',
  enCours = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; enCours?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || enCours}
      className={`inline-flex h-8 items-center justify-center gap-2 rounded-ui border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
      {...rest}
    >
      {enCours && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
