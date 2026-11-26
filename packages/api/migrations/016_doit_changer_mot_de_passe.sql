-- Lot mot-de-passe (D-254, SPEC §8) : l'administrateur peut exiger un changement de mot de passe.
ALTER TABLE utilisateur ADD COLUMN doit_changer_mot_de_passe boolean NOT NULL DEFAULT false;
