import { aDroitsDeChef } from '../api';
import { useAuth } from '../auth';
import { FournisseurOnglets } from '../components/Onglets';
import { aujourdhuiLocal, semaineAffichee } from '../imputations/logique';
import { navigate, useSearch } from '../router';
import { Absences } from './Absences';
import { FeuilleTemps } from './FeuilleTemps';
import { Validation } from './Validation';

/**
 * Écran Imputations (D-247) : onglets « Feuille de temps » (`est_ressource` ou administrateur), « Validation »
 * (administrateur, chef de projet, leader métier) et « Absences » (`est_ressource`, administrateur, chef de projet,
 * leader métier ; D-276). La liste d'onglets n'existe qu'avec au moins deux onglets ; l'onglet par défaut est la
 * feuille de temps si elle est disponible, sinon la validation. `semaine` est commune.
 */
export function Imputations() {
  const { etat } = useAuth();
  const user = etat.statut === 'connecte' ? etat.user : null;
  const recherche = useSearch();
  const feuille = !!user && (user.est_ressource || user.role === 'administrateur');
  const validation = !!user && (user.role === 'administrateur' || aDroitsDeChef(user.role));
  const absences = !!user && (user.est_ressource || user.role === 'administrateur' || validation);
  const demande = recherche.get('onglet');
  const actif =
    demande === 'absences' && absences
      ? 'absences'
      : validation && (!feuille || demande === 'validation')
        ? 'validation'
        : 'feuille';
  const contenu =
    actif === 'absences' ? (
      <Absences />
    ) : actif === 'validation' ? (
      <Validation />
    ) : (
      <FeuilleTemps />
    );
  const onglets = [
    ...(feuille ? [{ valeur: 'feuille', titre: 'Feuille de temps' }] : []),
    ...(validation ? [{ valeur: 'validation', titre: 'Validation' }] : []),
    ...(absences ? [{ valeur: 'absences', titre: 'Absences' }] : []),
  ];
  if (onglets.length < 2) return contenu;
  const { semaine } = semaineAffichee(recherche.get('semaine'), aujourdhuiLocal());
  return (
    <FournisseurOnglets
      etat={{
        libelle: 'Sections des imputations',
        onglets,
        actif,
        changer: (v) =>
          navigate(
            v === 'validation' || v === 'absences'
              ? `/imputations?onglet=${v}&semaine=${semaine}`
              : `/imputations?semaine=${semaine}`,
          ),
      }}
    >
      {contenu}
    </FournisseurOnglets>
  );
}
