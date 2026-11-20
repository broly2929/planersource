import { useId, type InputHTMLAttributes } from 'react';

export function Field({
  label,
  erreur,
  className = '',
  ...rest
}: { label: string; erreur?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="font-semibold text-gray-800">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
        className="h-8 rounded-ui border border-gray-400 bg-white px-2 text-gray-900 aria-invalid:border-danger"
        {...rest}
      />
      {erreur && (
        <p id={`${id}-erreur`} className="text-petit text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
