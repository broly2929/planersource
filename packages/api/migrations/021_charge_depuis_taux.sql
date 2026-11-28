-- Lot absences, tranche charge-taux (D-276, SPEC §4 « Absences et charge depuis le taux », points 11 à 16).
-- Assignation : charge calculée depuis le taux à chaque calcul (activité REGUL seulement, contrôlé par l'API).
-- Historisé comme les autres champs de saisie ; les assignations existantes restent à faux.
ALTER TABLE assignation ADD COLUMN charge_depuis_taux boolean NOT NULL DEFAULT false;
