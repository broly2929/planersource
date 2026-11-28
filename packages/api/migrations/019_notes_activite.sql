-- Lot notes (D-270, SPEC §3 « Notes d'activité ») : `activite.notes`, texte libre facultatif de 500
-- caractères au plus (la normalisation, espaces de bord retirés et vide = null, est faite par l'API).
-- Historisé comme les autres champs de saisie. Aucune donnée modifiée.
ALTER TABLE activite
  ADD COLUMN notes text
    CONSTRAINT activite_notes_longueur CHECK (char_length(notes) <= 500);
