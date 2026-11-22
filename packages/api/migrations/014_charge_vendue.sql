-- Charge vendue et date client (lot 6c, D-149 (2)) : `activite.charge_vendue` (jours, 2 décimales, jamais
-- négative, vide = non renseignée) et `jalon.date_client`. Historisées comme les autres champs de saisie ;
-- les valeurs calculées (marge, écart) ne sont jamais stockées.
ALTER TABLE activite
  ADD COLUMN charge_vendue numeric(10, 2)
    CONSTRAINT activite_charge_vendue_positive CHECK (charge_vendue >= 0);
ALTER TABLE jalon ADD COLUMN date_client date;

-- Charge vendue sur les feuilles seulement (D-149 (3)) : une activité parente n'en porte pas
-- (code 'activite_parente'), une activité vendue ne reçoit pas d'enfant (code 'parent_vendu').
CREATE FUNCTION activite_controle_vendue() RETURNS trigger AS $$
BEGIN
  IF NEW.charge_vendue IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    PERFORM 1 FROM activite WHERE id = NEW.id FOR NO KEY UPDATE;
  END IF;
  IF EXISTS (SELECT 1 FROM element WHERE parent_id = NEW.id) THEN
    RAISE EXCEPTION 'une activité parente ne porte pas de charge vendue'
      USING ERRCODE = '23514', CONSTRAINT = 'activite_parente_sans_vendu';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activite_controle_vendue BEFORE INSERT OR UPDATE OF charge_vendue ON activite
  FOR EACH ROW EXECUTE FUNCTION activite_controle_vendue();

CREATE OR REPLACE FUNCTION element_controles() RETURNS trigger AS $$
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
  IF EXISTS (
    SELECT 1 FROM activite WHERE id = NEW.parent_id AND charge_vendue IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'une activité vendue ne peut pas avoir d''enfant'
      USING ERRCODE = '23514', CONSTRAINT = 'element_parent_sans_vendu';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
