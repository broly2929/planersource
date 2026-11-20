CREATE TABLE calendrier (
  id serial PRIMARY KEY,
  nom text NOT NULL CHECK (btrim(nom) <> ''),
  -- jours ISO : 1 = lundi … 7 = dimanche
  jours_travailles smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  est_defaut boolean NOT NULL DEFAULT false,
  CONSTRAINT calendrier_jours_valides CHECK (
    cardinality(jours_travailles) BETWEEN 1 AND 7
    AND jours_travailles <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
);

CREATE UNIQUE INDEX calendrier_un_seul_defaut ON calendrier (est_defaut) WHERE est_defaut;

CREATE TABLE calendrier_ferie (
  calendrier_id integer NOT NULL REFERENCES calendrier (id) ON DELETE CASCADE,
  jour date NOT NULL,
  libelle text NOT NULL DEFAULT '',
  PRIMARY KEY (calendrier_id, jour)
);

INSERT INTO calendrier (nom, est_defaut) VALUES ('Calendrier par défaut', true);

CREATE FUNCTION calendrier_defaut_protege() RETURNS trigger AS $$
BEGIN
  IF OLD.est_defaut THEN
    RAISE EXCEPTION 'le calendrier par défaut ne peut pas être supprimé'
      USING ERRCODE = '23503', CONSTRAINT = 'calendrier_defaut_protege';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendrier_defaut_protege BEFORE DELETE ON calendrier
  FOR EACH ROW EXECUTE FUNCTION calendrier_defaut_protege();

ALTER TABLE utilisateur ADD COLUMN calendrier_id integer REFERENCES calendrier (id) ON DELETE RESTRICT;
UPDATE utilisateur SET calendrier_id = (SELECT id FROM calendrier WHERE est_defaut);
ALTER TABLE utilisateur ALTER COLUMN calendrier_id SET NOT NULL;

-- Un utilisateur inséré sans calendrier reçoit le calendrier par défaut.
CREATE FUNCTION utilisateur_calendrier_defaut() RETURNS trigger AS $$
BEGIN
  NEW.calendrier_id := (SELECT id FROM calendrier WHERE est_defaut);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER utilisateur_calendrier_defaut BEFORE INSERT ON utilisateur
  FOR EACH ROW WHEN (NEW.calendrier_id IS NULL)
  EXECUTE FUNCTION utilisateur_calendrier_defaut();
