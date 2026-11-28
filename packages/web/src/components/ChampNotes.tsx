import { useId } from 'react';

/** Longueur maximale d'une note d'activité, en points de code (SPEC §3, D-270). */
export const NOTES_MAX = 500;

/** Tronque à `NOTES_MAX` points de code. */
export function tronquerNotes(texte: string): string {
  const points = [...texte];
  return points.length > NOTES_MAX ? points.slice(0, NOTES_MAX).join('') : texte;
}

/** Valeur envoyée : texte vide = null. */
export const notesEnvoyees = (texte: string): string | null => (texte === '' ? null : texte);

export function ChampNotes({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold text-gray-800">
        Notes
      </label>
      <textarea
        id={id}
        rows={3}
        value={valeur}
        onChange={(e) => onChange(tronquerNotes(e.target.value))}
        className="rounded-ui border border-gray-400 bg-white px-2 py-1 text-gray-900"
      />
      <p className="text-right text-petit text-gray-600">
        {[...valeur].length} / {NOTES_MAX}
      </p>
    </div>
  );
}
