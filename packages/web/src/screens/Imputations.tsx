import { useAuth } from '../auth';
import { FournisseurOnglets } from '../components/Onglets';
import { aujourdhuiLocal, semaineAffichee } from '../imputations/logique';
import { navigate, useSearch } from '../router';
import { FeuilleTemps } from './FeuilleTemps';
import { Validation } from './Validation';

/**
 * Écran Imputations (D-247) : onglets « Feuille de temps » (`est_ressource` ou administrateur) et
 * « Validation » (administrateur, chef de projet). La liste d'onglets n'existe qu'avec au moins deux
 * onglets ; l'onglet par défaut est la feuille de temps si elle est disponible. `semaine` est commune.
 */
export function Imputations() {
  const { etat } = useAuth();
  const user = etat.statut === 'connecte' ? etat.user : null;
  const recherche = useSearch();
  const feuille = !!user && (user.est_ressource || user.role === 'administrateur');
  const validation = !!user && (user.role === 'administrateur' || user.role === 'chef_de_projet');
  const actif =
    validation && (!feuille || recherche.get('onglet') === 'validation') ? 'validation' : 'feuille';
  const contenu = actif === 'validation' ? <Validation /> : <FeuilleTemps />;
  if (!(feuille && validation)) return contenu;
  const { semaine } = semaineAffichee(recherche.get('semaine'), aujourdhuiLocal());
  return (
    <FournisseurOnglets
      etat={{
        libelle: 'Sections des imputations',
        onglets: [
          { valeur: 'feuille', titre: 'Feuille de temps' },
          { valeur: 'validation', titre: 'Validation' },
        ],
        actif,
        changer: (v) =>
          navigate(
            v === 'validation'
              ? `/imputations?onglet=validation&semaine=${semaine}`
              : `/imputations?semaine=${semaine}`,
          ),
      }}
    >
      {contenu}
    </FournisseurOnglets>
  );
}
