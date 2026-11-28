-- Lot droits, tranche 1 (D-265, SPEC §2) : rôle `leader_metier`. Aucune donnée modifiée.
ALTER TABLE utilisateur DROP CONSTRAINT utilisateur_role_check;
ALTER TABLE utilisateur ADD CONSTRAINT utilisateur_role_check CHECK (
  role IN ('administrateur', 'chef_de_projet', 'leader_metier', 'ressource')
);
