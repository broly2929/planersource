import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';

/** Liste déroulante native (accessible au clavier et aux lecteurs d'écran). */
export function Select({
  label,
  options,
  className = '',
  ...rest
}: {
  label: string;
  options: { value: string; label: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="font-semibold text-gray-800">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className="h-8 w-full appearance-none rounded-ui border border-gray-400 bg-white pr-8 pl-2 text-gray-900"
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-2 right-2 size-4 text-gray-600"
        />
      </div>
    </div>
  );
}
