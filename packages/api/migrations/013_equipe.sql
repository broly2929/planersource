-- Équipes (lot 6a, D-147 (2)) : regroupement facultatif d'utilisateurs pour l'affichage et les filtres.
-- Jamais affectée ni assignée, non historisée. Nom de 1 à 100 caractères après retrait des espaces de bord,
-- unique sans tenir compte de la casse. La clé étrangère interdit de supprimer une équipe portée.
CREATE TABLE equipe (
  id serial PRIMARY KEY,
  nom text NOT NULL CONSTRAINT equipe_nom_longueur CHECK (char_length(btrim(nom)) BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX equipe_nom_unique ON equipe (lower(nom));

ALTER TABLE utilisateur
  ADD COLUMN equipe_id integer CONSTRAINT utilisateur_equipe_id_fkey REFERENCES equipe (id) ON DELETE RESTRICT;
