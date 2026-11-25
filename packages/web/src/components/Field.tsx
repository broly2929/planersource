import { useId, type InputHTMLAttributes } from 'react';

export function Field({
  label,
  erreur,
  aide,
  className = '',
  id: idImpose,
  ...rest
}: { label: string; erreur?: string; aide?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const idAuto = useId();
  // `id` imposé : champ qui disparaît et revient (champs selon le mode, D-220) garde la même clé de garde (D-188).
  const id = idImpose ?? idAuto;
  const decrit = [aide ? `${id}-aide` : null, erreur ? `${id}-erreur` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="font-semibold text-gray-800">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit || undefined}
        className="h-8 rounded-ui border border-gray-400 bg-white px-2 text-gray-900 aria-invalid:border-danger"
        {...rest}
      />
      {aide && (
        <p id={`${id}-aide`} className="text-petit text-gray-600">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={`${id}-erreur`} className="text-petit text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
