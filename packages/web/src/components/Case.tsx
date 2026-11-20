import { useId, type InputHTMLAttributes } from 'react';

/** Case à cocher avec libellé associé. */
export function Case({
  label,
  className = '',
  ...rest
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input id={id} type="checkbox" className="size-4 accent-accent" {...rest} />
      <label htmlFor={id} className="text-gray-800">
        {label}
      </label>
    </div>
  );
}
