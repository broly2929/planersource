-- Dépendances : deux éléments du même projet (clés étrangères composites), sans doublon, sans
-- cycle, jamais entre un élément et son ancêtre ou son descendant.
CREATE TABLE dependance (
  id serial PRIMARY KEY,
  projet_id integer NOT NULL,
  predecesseur_id integer NOT NULL,
  successeur_id integer NOT NULL,
  type text NOT NULL DEFAULT 'FD' CHECK (type IN ('FD', 'DD', 'FF')),
  delai integer NOT NULL DEFAULT 0,
  CONSTRAINT dependance_distincts CHECK (predecesseur_id <> successeur_id),
  CONSTRAINT dependance_unique UNIQUE (predecesseur_id, successeur_id),
  CONSTRAINT dependance_predecesseur_fk FOREIGN KEY (predecesseur_id, projet_id)
    REFERENCES element (id, projet_id) ON DELETE CASCADE,
  CONSTRAINT dependance_successeur_fk FOREIGN KEY (successeur_id, projet_id)
    REFERENCES element (id, projet_id) ON DELETE CASCADE
);

CREATE INDEX dependance_successeur ON dependance (successeur_id);
CREATE INDEX dependance_projet ON dependance (projet_id);

CREATE FUNCTION dependance_controles() RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('planning_graphe'));
  IF EXISTS (
    WITH RECURSIVE suite (id) AS (
      SELECT NEW.successeur_id
      UNION
      SELECT d.successeur_id FROM dependance d JOIN suite s ON d.predecesseur_id = s.id
    )
    SELECT 1 FROM suite WHERE id = NEW.predecesseur_id
  ) THEN
    RAISE EXCEPTION 'cycle de dépendances'
      USING ERRCODE = '23514', CONSTRAINT = 'dependance_sans_cycle';
  END IF;
  IF EXISTS (
    WITH RECURSIVE a (id) AS (
      SELECT parent_id FROM element WHERE id = NEW.successeur_id AND parent_id IS NOT NULL
      UNION
      SELECT e.parent_id FROM element e JOIN a ON e.id = a.id WHERE e.parent_id IS NOT NULL
    ),
    b (id) AS (
      SELECT parent_id FROM element WHERE id = NEW.predecesseur_id AND parent_id IS NOT NULL
      UNION
      SELECT e.parent_id FROM element e JOIN b ON e.id = b.id WHERE e.parent_id IS NOT NULL
    )
    SELECT 1 FROM a WHERE id = NEW.predecesseur_id
    UNION ALL
    SELECT 1 FROM b WHERE id = NEW.successeur_id
  ) THEN
    RAISE EXCEPTION 'dépendance entre un élément et son ancêtre'
      USING ERRCODE = '23514', CONSTRAINT = 'dependance_hierarchie';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dependance_controles BEFORE INSERT ON dependance
  FOR EACH ROW EXECUTE FUNCTION dependance_controles();

-- Un déplacement ne crée pas de dépendance entre un élément et son ancêtre.
CREATE FUNCTION element_deplacement_sans_dependance() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NULL OR NEW.parent_id IS NOT DISTINCT FROM OLD.parent_id THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    WITH RECURSIVE anc (id) AS (
      SELECT NEW.parent_id
      UNION
      SELECT e.parent_id FROM element e JOIN anc ON e.id = anc.id WHERE e.parent_id IS NOT NULL
    ),
    sous (id) AS (
      SELECT NEW.id
      UNION
      SELECT e.id FROM element e JOIN sous ON e.parent_id = sous.id
    )
    SELECT 1 FROM dependance d
     WHERE (d.predecesseur_id IN (SELECT id FROM anc) AND d.successeur_id IN (SELECT id FROM sous))
        OR (d.successeur_id IN (SELECT id FROM anc) AND d.predecesseur_id IN (SELECT id FROM sous))
  ) THEN
    RAISE EXCEPTION 'le déplacement créerait une dépendance avec un ancêtre'
      USING ERRCODE = '23514', CONSTRAINT = 'dependance_hierarchie';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER element_deplacement_sans_dependance BEFORE UPDATE OF parent_id ON element
  FOR EACH ROW EXECUTE FUNCTION element_deplacement_sans_dependance();

-- Assignations : activité (feuille) du projet, ressource affectée à ce projet. La clé étrangère
-- vers l'affectation est NO ACTION : supprimer l'affectation d'une ressource assignée est refusé,
-- mais la suppression d'un projet (qui supprime aussi ses assignations) reste possible.
CREATE TABLE assignation (
  id serial PRIMARY KEY,
  activite_id integer NOT NULL,
  projet_id integer NOT NULL,
  ressource_id integer NOT NULL,
  taux numeric(5, 2) NOT NULL DEFAULT 100 CHECK (taux > 0 AND taux <= 100),
  charge_assignee numeric(8, 2) NOT NULL CHECK (charge_assignee >= 0),
  charge_reelle numeric(8, 2) NOT NULL DEFAULT 0 CHECK (charge_reelle >= 0),
  reste_a_faire numeric(8, 2) NOT NULL CHECK (reste_a_faire >= 0),
  CONSTRAINT assignation_unique UNIQUE (activite_id, ressource_id),
  CONSTRAINT assignation_activite_fk FOREIGN KEY (activite_id) REFERENCES activite (id) ON DELETE CASCADE,
  CONSTRAINT assignation_element_fk FOREIGN KEY (activite_id, projet_id)
    REFERENCES element (id, projet_id) ON DELETE CASCADE,
  CONSTRAINT assignation_affectation_fk FOREIGN KEY (projet_id, ressource_id)
    REFERENCES affectation_projet (projet_id, ressource_id)
);

CREATE INDEX assignation_projet ON assignation (projet_id);
CREATE INDEX assignation_ressource ON assignation (ressource_id);

-- Une activité parente ne porte pas d'assignation (le verrou de ligne est le même que celui de
-- element_controles : les deux opérations concurrentes sont sérialisées).
CREATE FUNCTION assignation_controles() RETURNS trigger AS $$
BEGIN
  PERFORM 1 FROM activite WHERE id = NEW.activite_id FOR NO KEY UPDATE;
  IF EXISTS (SELECT 1 FROM element WHERE parent_id = NEW.activite_id) THEN
    RAISE EXCEPTION 'une activité parente ne porte pas d''assignation'
      USING ERRCODE = '23514', CONSTRAINT = 'assignation_activite_feuille';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignation_controles BEFORE INSERT ON assignation
  FOR EACH ROW EXECUTE FUNCTION assignation_controles();
