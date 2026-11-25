-- Lot couts, tranche 1 (D-225, SPEC §12.1, §12.2).
-- Taux journalier par période d'une ressource : début obligatoire, fin facultative (ouverte),
-- montant en euros > 0 à deux décimales. Le non-chevauchement est contrôlé par l'API, dans la
-- transaction et sous verrou de la ligne utilisateur (aucune extension PostgreSQL).
CREATE TABLE taux_journalier (
  id serial PRIMARY KEY,
  utilisateur_id integer NOT NULL REFERENCES utilisateur (id) ON DELETE RESTRICT,
  debut date NOT NULL,
  fin date,
  montant numeric(8, 2) NOT NULL CONSTRAINT taux_montant_positif CHECK (montant > 0),
  CONSTRAINT taux_fin_apres_debut CHECK (fin IS NULL OR fin >= debut)
);

CREATE INDEX taux_journalier_utilisateur ON taux_journalier (utilisateur_id, debut);

-- Historique : nouvelle entité `taux`, sans projet (comme un calendrier).
ALTER TABLE historique DROP CONSTRAINT historique_entite_check;
ALTER TABLE historique ADD CONSTRAINT historique_entite_check CHECK (
  entite IN ('projet', 'affectation', 'activite', 'jalon', 'dependance', 'assignation', 'calendrier', 'taux')
);

-- OTP propre (facultatif) d'un projet et d'une activité ; la valeur héritée est calculée à la lecture.
ALTER TABLE projet
  ADD COLUMN otp text CONSTRAINT projet_otp_longueur CHECK (char_length(otp) BETWEEN 1 AND 50);
ALTER TABLE activite
  ADD COLUMN otp text CONSTRAINT activite_otp_longueur CHECK (char_length(otp) BETWEEN 1 AND 50);
