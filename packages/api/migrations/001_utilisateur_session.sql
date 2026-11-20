CREATE TABLE utilisateur (
  id serial PRIMARY KEY,
  nom text NOT NULL,
  email text NOT NULL UNIQUE,
  mot_de_passe_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('administrateur', 'chef_de_projet', 'ressource')),
  est_ressource boolean NOT NULL DEFAULT false,
  capacite numeric(5, 2) NOT NULL DEFAULT 1,
  actif boolean NOT NULL DEFAULT true
);

CREATE TABLE session (
  id serial PRIMARY KEY,
  utilisateur_id integer NOT NULL REFERENCES utilisateur (id) ON DELETE CASCADE,
  jeton_hash text NOT NULL UNIQUE,
  cree_le timestamptz NOT NULL DEFAULT now()
);
