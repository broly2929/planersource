import { useId } from 'react';
import { Field } from './Field';

/** Champ « Taux (%) » avec son aide, reliée par `aria-describedby` (D-220, SPEC §6 « Charge lisible » 3). */
export function ChampTaux({
  valeur,
  onChange,
  aide,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  aide: string;
}) {
  const idAide = useId();
  return (
    <div className="flex flex-col gap-1">
      <Field
        label="Taux (%)"
        type="number"
        required
        min="1"
        max="100"
        step="any"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={idAide}
      />
      <p id={idAide} className="text-petit text-gray-600">
        {aide}
      </p>
    </div>
  );
}
