import type { ButtonHTMLAttributes, ComponentType } from 'react';

/** Bouton de ligne : icône seule, `aria-label` et `title` identiques (le libellé). */
export function BoutonIcone({
  libelle,
  icone: Icone,
  className = '',
  type = 'button',
  ...rest
}: {
  libelle: string;
  icone: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title' | 'children'>) {
  return (
    <button
      type={type}
      aria-label={libelle}
      title={libelle}
      className={`inline-flex size-8 items-center justify-center rounded-ui border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      <Icone aria-hidden className="size-4" />
    </button>
  );
}
