CREATE TABLE projet (
  id serial PRIMARY KEY,
  code text NOT NULL CHECK (btrim(code) <> ''),
  nom text NOT NULL CHECK (btrim(nom) <> ''),
  parent_id integer,
  est_modele boolean NOT NULL DEFAULT false,
  priorite integer NOT NULL DEFAULT 500 CHECK (priorite BETWEEN 0 AND 1000),
  chef_id integer NOT NULL REFERENCES utilisateur (id),
  date_debut date NOT NULL,
  clos boolean NOT NULL DEFAULT false,
  cree_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, est_modele),
  CONSTRAINT projet_parent_distinct CHECK (parent_id IS DISTINCT FROM id),
  -- un sous-projet suit le statut (modèle ou non) de son parent
  FOREIGN KEY (parent_id, est_modele) REFERENCES projet (id, est_modele)
);

CREATE UNIQUE INDEX projet_code_unique ON projet (upper(code));
CREATE INDEX projet_parent ON projet (parent_id);
CREATE INDEX projet_chef ON projet (chef_id);

-- Arborescence sans cycle. Le verrou consultatif sérialise les modifications concurrentes :
-- deux déplacements simultanés (A sous B, B sous A) ne peuvent pas former de cycle.
CREATE FUNCTION projet_sans_cycle() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('projet_arbre'));
  IF EXISTS (
    WITH RECURSIVE ancetres (id) AS (
      SELECT NEW.parent_id
      UNION
      SELECT p.parent_id FROM projet p JOIN ancetres a ON p.id = a.id WHERE p.parent_id IS NOT NULL
    )
    SELECT 1 FROM ancetres WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'cycle dans l''arborescence des projets'
      USING ERRCODE = '23514', CONSTRAINT = 'projet_sans_cycle';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projet_sans_cycle BEFORE INSERT OR UPDATE OF parent_id ON projet
  FOR EACH ROW EXECUTE FUNCTION projet_sans_cycle();

CREATE TABLE affectation_projet (
  id serial PRIMARY KEY,
  projet_id integer NOT NULL REFERENCES projet (id) ON DELETE CASCADE,
  ressource_id integer NOT NULL REFERENCES utilisateur (id),
  taux numeric(5, 2) NOT NULL DEFAULT 100 CHECK (taux > 0 AND taux <= 100),
  date_debut date,
  date_fin date,
  CONSTRAINT affectation_dates_coherentes CHECK (
    date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut
  ),
  UNIQUE (projet_id, ressource_id)
);

CREATE INDEX affectation_ressource ON affectation_projet (ressource_id);
