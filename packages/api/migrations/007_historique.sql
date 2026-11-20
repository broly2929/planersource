-- Historique (D-023, D-034) : une ligne par champ modifié ; création et suppression avec l'objet
-- complet. Sans clé étrangère vers les entités : les entrées survivent aux suppressions. Écrit par
-- l'API, dans la transaction de l'écriture historisée.
CREATE TABLE historique (
  id bigserial PRIMARY KEY,
  quand timestamptz NOT NULL DEFAULT clock_timestamp(),
  utilisateur_id integer NOT NULL REFERENCES utilisateur (id),
  entite text NOT NULL CHECK (
    entite IN ('projet', 'affectation', 'activite', 'jalon', 'dependance', 'assignation', 'calendrier')
  ),
  entite_id integer NOT NULL,
  -- projet concerné ; nul pour les calendriers
  projet_id integer,
  operation text NOT NULL CHECK (operation IN ('creation', 'modification', 'suppression')),
  champ text,
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb,
  CONSTRAINT historique_champ_coherent CHECK ((operation = 'modification') = (champ IS NOT NULL))
);

CREATE INDEX historique_projet ON historique (projet_id, quand DESC, id DESC);
CREATE INDEX historique_entite ON historique (entite, quand DESC, id DESC);
