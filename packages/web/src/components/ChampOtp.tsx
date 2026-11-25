import { useId } from 'react';
import { Field } from './Field';

/** Champ « OTP » (D-225, SPEC §12.2 point 7) : 50 caractères au plus ; aide de la valeur héritée, s'il y en a une. */
export function ChampOtp({
  valeur,
  onChange,
  aide,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  aide: string | null;
}) {
  const idAide = useId();
  return (
    <div className="flex flex-col gap-1">
      <Field
        label="OTP"
        maxLength={50}
        autoComplete="off"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        {...(aide ? { 'aria-describedby': idAide } : {})}
      />
      {aide && (
        <p id={idAide} className="text-petit text-gray-600">
          {aide}
        </p>
      )}
    </div>
  );
}
