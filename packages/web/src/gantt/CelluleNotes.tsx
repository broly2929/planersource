import { CLASSE_NOTES_MAX } from './largeurs';

/** Note d'activité sur une ligne, tronquée ; le texte complet est le `title` de la cellule (D-270). */
export function CelluleNotes({ notes }: { notes: string | null | undefined }) {
  if (!notes) return null;
  return <span className={`block ${CLASSE_NOTES_MAX} truncate whitespace-nowrap`}>{notes}</span>;
}
