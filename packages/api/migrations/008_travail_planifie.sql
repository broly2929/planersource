-- La suppression d'un projet supprime ses affectations et ses assignations dans la même instruction :
-- la clé étrangère NO ACTION refusait cette suppression dès qu'une assignation existait (D-045).
-- Différée, elle n'est contrôlée qu'en fin de transaction : supprimer l'affectation d'une ressource
-- encore assignée, ou assigner une ressource non affectée, reste refusé (23503 au COMMIT).
ALTER TABLE assignation ALTER CONSTRAINT assignation_affectation_fk DEFERRABLE INITIALLY DEFERRED;

-- Résultats du moteur (D-044) : travail planifié par assignation et par jour, drapeaux des jalons,
-- dates planifiées des projets. Purgé et réécrit à chaque calcul ; jamais historisé.
CREATE TABLE travail_planifie (
  assignation_id integer NOT NULL REFERENCES assignation (id) ON DELETE CASCADE,
  jour date NOT NULL,
  charge numeric(8, 2) NOT NULL CHECK (charge > 0),
  surcharge boolean NOT NULL DEFAULT false,
  PRIMARY KEY (assignation_id, jour)
);

CREATE INDEX travail_planifie_jour ON travail_planifie (jour);

ALTER TABLE jalon ADD COLUMN drapeaux text[] NOT NULL DEFAULT '{}';
ALTER TABLE projet ADD COLUMN debut_planifie date, ADD COLUMN fin_planifiee date;
