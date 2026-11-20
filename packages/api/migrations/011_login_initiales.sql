-- D-077 : identifiant de connexion (login), initiales, email facultatif.
ALTER TABLE utilisateur ADD COLUMN login text;
ALTER TABLE utilisateur ADD COLUMN initiales text;

ALTER TABLE utilisateur ALTER COLUMN email DROP NOT NULL;

UPDATE utilisateur SET login = lower(btrim(email));
UPDATE utilisateur SET email = NULL WHERE position('@' in email) = 0;

ALTER TABLE utilisateur ALTER COLUMN login SET NOT NULL;
ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_login_unique UNIQUE (login);
ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_login_forme
  CHECK (login = lower(btrim(login)) AND login <> '');
ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_initiales_longueur
  CHECK (initiales IS NULL OR char_length(initiales) BETWEEN 1 AND 4);

-- Insertion sans login : login = email. Sans login ni email, NOT NULL refuse la ligne.
CREATE FUNCTION utilisateur_login_defaut() RETURNS trigger AS $$
BEGIN
  IF NEW.login IS NULL THEN
    NEW.login := NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER utilisateur_login_defaut BEFORE INSERT ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION utilisateur_login_defaut();
