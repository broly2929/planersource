import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Dialog({
  ouvert,
  onOuvertChange,
  titre,
  description,
  children,
  large = false,
}: {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  titre: string;
  description: string;
  children: ReactNode;
  /** Dialogue large (tableau de la feuille de temps, D-135 (4)). */
  large?: boolean;
}) {
  return (
    <RadixDialog.Root open={ouvert} onOpenChange={onOuvertChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-gray-900/40" />
        <RadixDialog.Content
          className={`fixed top-1/2 left-1/2 max-h-screen w-11/12 ${large ? 'max-w-5xl' : 'max-w-md'} overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-ui border border-gray-200 bg-white p-6 shadow-ui`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="text-titre font-semibold">{titre}</RadixDialog.Title>
              <RadixDialog.Description className="text-gray-600">
                {description}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close
              aria-label="Fermer"
              className="rounded-ui p-1 text-gray-600 hover:bg-gray-100"
            >
              <X aria-hidden className="size-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
