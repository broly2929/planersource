UPDATE utilisateur SET email = lower(email) WHERE email <> lower(email);

ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_email_minuscules CHECK (email = lower(email));
