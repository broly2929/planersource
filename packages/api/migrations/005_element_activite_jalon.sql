-- Éléments du WBS (D-022) : table commune `element` (parent + rang), extensions `activite` et `jalon`
-- qui partagent l'identifiant. Seule une activité peut être parent ; parent et enfant sont dans le
-- même projet : une seule clé étrangère composite, dont la colonne `parent_type` est GÉNÉRÉE
-- (D-024 : colonne générée dans une clé étrangère).
CREATE TABLE element (
  id serial PRIMARY KEY,
  projet_id integer NOT NULL REFERENCES projet (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('activite', 'jalon')),
  parent_id integer,
  parent_type text GENERATED ALWAYS AS (CASE WHEN parent_id IS NOT NULL THEN 'activite' END) STORED,
  rang integer NOT NULL CHECK (rang >= 1),
  nom text NOT NULL CHECK (btrim(nom) <> ''),
  UNIQUE (id, projet_id),
  UNIQUE (id, type),
  UNIQUE (id, projet_id, type),
  CONSTRAINT element_parent_distinct CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT element_parent_fk FOREIGN KEY (parent_id, projet_id, parent_type)
    REFERENCES element (id, projet_id, type),
  -- un seul rang par fraterie (activités et jalons confondus) ; différé pour décaler les frères
  CONSTRAINT element_rang_unique UNIQUE NULLS NOT DISTINCT (projet_id, parent_id, rang)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX element_parent ON element (parent_id);
CREATE INDEX element_projet ON element (projet_id);

CREATE TABLE activite (
  id integer PRIMARY KEY,
  type text NOT NULL DEFAULT 'activite' CHECK (type = 'activite'),
  mode text NOT NULL DEFAULT 'ASAP' CHECK (mode IN ('ASAP', 'START', 'STARR', 'ALAP', 'FDUR', 'DDUR', 'REGUL', 'MAN')),
  priorite integer NOT NULL DEFAULT 500 CHECK (priorite BETWEEN 0 AND 1000),
  debut_valide date,
  fin_valide date,
  duree_validee integer CHECK (duree_validee >= 1),
  -- colonnes du moteur : vides au lot 1
  debut_planifie date,
  fin_planifiee date,
  drapeaux text[] NOT NULL DEFAULT '{}',
  close boolean NOT NULL DEFAULT false,
  CONSTRAINT activite_element_fk FOREIGN KEY (id, type) REFERENCES element (id, type) ON DELETE CASCADE,
  CONSTRAINT activite_dates_coherentes CHECK (
    fin_valide IS NULL OR debut_valide IS NULL OR fin_valide >= debut_valide
  ),
  CONSTRAINT activite_debut_requis CHECK (
    mode NOT IN ('START', 'STARR', 'REGUL') OR debut_valide IS NOT NULL
  ),
  CONSTRAINT activite_fin_requise CHECK (mode <> 'REGUL' OR fin_valide IS NOT NULL),
  CONSTRAINT activite_duree_requise CHECK (mode NOT IN ('FDUR', 'DDUR') OR duree_validee IS NOT NULL)
);

CREATE TABLE jalon (
  id integer PRIMARY KEY,
  type text NOT NULL DEFAULT 'flottant' CHECK (type IN ('flottant', 'fixe')),
  date_validee date,
  date_planifiee date,
  type_element text NOT NULL DEFAULT 'jalon' CHECK (type_element = 'jalon'),
  CONSTRAINT jalon_element_fk FOREIGN KEY (id, type_element) REFERENCES element (id, type) ON DELETE CASCADE,
  CONSTRAINT jalon_fixe_date CHECK (type = 'flottant' OR date_validee IS NOT NULL)
);

-- Arborescence sans cycle, parent sans assignation. Le verrou consultatif sérialise les
-- déplacements (et, en 006, les créations de dépendances) ; le verrou de ligne sur l'activité parent
-- sérialise « ajouter un enfant » et « assigner l'activité ».
CREATE FUNCTION element_controles() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('planning_graphe'));
  IF EXISTS (
    WITH RECURSIVE ancetres (id) AS (
      SELECT NEW.parent_id
      UNION
      SELECT e.parent_id FROM element e JOIN ancetres a ON e.id = a.id WHERE e.parent_id IS NOT NULL
    )
    SELECT 1 FROM ancetres WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'cycle dans l''arborescence des éléments'
      USING ERRCODE = '23514', CONSTRAINT = 'element_sans_cycle';
  END IF;
  PERFORM 1 FROM activite WHERE id = NEW.parent_id FOR NO KEY UPDATE;
  IF EXISTS (
    SELECT 1 FROM assignation WHERE activite_id = NEW.parent_id
  ) THEN
    RAISE EXCEPTION 'une activité assignée ne peut pas avoir d''enfant'
      USING ERRCODE = '23514', CONSTRAINT = 'element_parent_sans_assignation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER element_controles BEFORE INSERT OR UPDATE OF parent_id ON element
  FOR EACH ROW EXECUTE FUNCTION element_controles();
