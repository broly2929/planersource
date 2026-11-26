-- Lot taux, tranche 1 (D-258, SPEC §12.6).
-- Taux journalier par période d'une équipe : début obligatoire, fin facultative (ouverte), montant en euros
-- > 0 à deux décimales. Le non-chevauchement est contrôlé par l'API, dans la transaction et sous verrou de
-- la ligne equipe (aucune extension PostgreSQL).
CREATE TABLE taux_equipe (
  id serial PRIMARY KEY,
  equipe_id integer NOT NULL REFERENCES equipe (id) ON DELETE RESTRICT,
  debut date NOT NULL,
  fin date,
  montant numeric(8, 2) NOT NULL CONSTRAINT taux_equipe_montant_positif CHECK (montant > 0),
  CONSTRAINT taux_equipe_fin_apres_debut CHECK (fin IS NULL OR fin >= debut)
);

CREATE INDEX taux_equipe_equipe ON taux_equipe (equipe_id, debut);

-- Historique : nouvelle entité `taux_equipe`, sans projet.
ALTER TABLE historique DROP CONSTRAINT historique_entite_check;
ALTER TABLE historique ADD CONSTRAINT historique_entite_check CHECK (
  entite IN ('projet', 'affectation', 'activite', 'jalon', 'dependance', 'assignation', 'calendrier', 'taux', 'taux_equipe')
);
