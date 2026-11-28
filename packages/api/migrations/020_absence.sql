-- Lot absences, tranche absences-1 (D-276, SPEC §4 « Absences et charge depuis le taux »).
-- Absence d'une ressource : période (fin ≥ début), portion (journée, matin, après-midi ; demi-journée sur un
-- seul jour), motif. Le non-chevauchement est contrôlé par l'API, dans la transaction et sous verrou de la
-- ligne utilisateur (aucune extension PostgreSQL).
CREATE TABLE absence (
  id serial PRIMARY KEY,
  -- ON DELETE CASCADE : aucune route ne supprime un utilisateur ; les remises à zéro des tests le font.
  ressource_id integer NOT NULL REFERENCES utilisateur (id) ON DELETE CASCADE,
  debut date NOT NULL,
  fin date NOT NULL,
  portion text NOT NULL CONSTRAINT absence_portion CHECK (portion IN ('journee', 'matin', 'apres_midi')),
  motif text NOT NULL CONSTRAINT absence_motif CHECK (motif IN ('conge', 'formation', 'autre')),
  CONSTRAINT absence_fin_apres_debut CHECK (fin >= debut),
  CONSTRAINT absence_demi_journee_un_jour CHECK (portion = 'journee' OR fin = debut)
);

CREATE INDEX absence_ressource ON absence (ressource_id, debut);

-- Historique : nouvelle entité `absence`, sans projet.
ALTER TABLE historique DROP CONSTRAINT historique_entite_check;
ALTER TABLE historique ADD CONSTRAINT historique_entite_check CHECK (
  entite IN ('projet', 'affectation', 'activite', 'jalon', 'dependance', 'assignation', 'calendrier', 'taux', 'taux_equipe', 'absence')
);
