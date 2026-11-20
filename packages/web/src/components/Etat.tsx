import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

/** États non nominaux d'un écran : chargement et vide (l'erreur utilise Notification). */
export function Chargement({ libelle = 'Chargement…' }: { libelle?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-gray-600">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {libelle}
    </p>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-ui border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600">
      {children}
    </p>
  );
}
