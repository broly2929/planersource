import { useId } from 'react';
import { Select } from './components/Select';

/** Table unique des libellés et aides des types de dépendance (D-218 (2), SPEC §6 « Retouches REX-6 »). */
export const TYPES_DEPENDANCE: readonly { code: string; libelle: string; aide: string }[] = [
  {
    code: 'FD',
    libelle: 'Fin → début (FD)',
    aide: 'Le successeur commence après la fin du prédécesseur.',
  },
  {
    code: 'DD',
    libelle: 'Début → début (DD)',
    aide: 'Le successeur commence après le début du prédécesseur.',
  },
  {
    code: 'FF',
    libelle: 'Fin → fin (FF)',
    aide: 'Le successeur finit après la fin du prédécesseur.',
  },
];

/** Libellé d'un type ; le code lui-même pour un code inconnu. */
export const libelleType = (code: string): string =>
  TYPES_DEPENDANCE.find((t) => t.code === code)?.libelle ?? code;

/** Liste « Type » et son aide selon le type choisi (`aria-describedby`). */
export function SelectTypeDependance({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (code: string) => void;
}) {
  const idAide = useId();
  return (
    <div className="flex flex-col gap-1">
      <Select
        label="Type"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={idAide}
        options={TYPES_DEPENDANCE.map((t) => ({ value: t.code, label: t.libelle }))}
      />
      <p id={idAide} className="text-petit text-gray-600">
        {TYPES_DEPENDANCE.find((t) => t.code === valeur)?.aide ?? ''}
      </p>
    </div>
  );
}
