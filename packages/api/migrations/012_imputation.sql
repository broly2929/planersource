-- Imputations, feuilles de temps et validations (lot 4a, D-118 (2)). Jamais historisées, sauf le reste
-- à faire de l'assignation. La clé étrangère RESTRICT interdit de supprimer une assignation imputée.
CREATE TABLE imputation (
  id serial PRIMARY KEY,
  assignation_id integer NOT NULL REFERENCES assignation (id) ON DELETE RESTRICT,
  jour date NOT NULL,
  charge numeric(8, 2) NOT NULL CHECK (charge > 0 AND charge <= 10),
  CONSTRAINT imputation_unique UNIQUE (assignation_id, jour)
);

CREATE TABLE feuille_temps (
  id serial PRIMARY KEY,
  ressource_id integer NOT NULL REFERENCES utilisateur (id),
  lundi date NOT NULL CHECK (EXTRACT(ISODOW FROM lundi) = 1),
  statut text NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'soumise', 'validee', 'rejetee')),
  commentaire text,
  CONSTRAINT feuille_temps_unique UNIQUE (ressource_id, lundi)
);

CREATE TABLE validation_feuille (
  feuille_id integer NOT NULL REFERENCES feuille_temps (id) ON DELETE CASCADE,
  projet_id integer NOT NULL REFERENCES projet (id),
  validateur_id integer NOT NULL REFERENCES utilisateur (id),
  date date NOT NULL,
  PRIMARY KEY (feuille_id, projet_id)
);
