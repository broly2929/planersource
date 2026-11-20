-- Saisies manuelles du mode MAN (D-058, D-059) : une ligne = une demi-journée (0,5 j), pas de colonne
-- charge. Supprimées avec l'assignation. Jamais historisées.
CREATE TABLE saisie_manuelle (
  id serial PRIMARY KEY,
  assignation_id integer NOT NULL REFERENCES assignation (id) ON DELETE CASCADE,
  jour date NOT NULL,
  demi_journee text NOT NULL CHECK (demi_journee IN ('matin', 'apres_midi')),
  UNIQUE (assignation_id, jour, demi_journee)
);

-- Garde-fou de mode (D-059 8) : le mode d'une activité ne change pas tant qu'une de ses assignations
-- porte des saisies, close ou non. Un PATCH vers la même valeur ne déclenche rien.
CREATE FUNCTION activite_mode_sans_saisie() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM saisie_manuelle s JOIN assignation a ON a.id = s.assignation_id
     WHERE a.activite_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'le mode d''une activité qui porte des saisies ne change pas'
      USING ERRCODE = '23514', CONSTRAINT = 'activite_mode_sans_saisie';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activite_mode_sans_saisie BEFORE UPDATE OF mode ON activite
  FOR EACH ROW WHEN (OLD.mode IS DISTINCT FROM NEW.mode)
  EXECUTE FUNCTION activite_mode_sans_saisie();
