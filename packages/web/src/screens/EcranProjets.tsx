import { FournisseurOnglets } from '../components/Onglets';
import { navigate, useSearch } from '../router';
import { Modeles } from './Modeles';
import { ListeProjets } from './Projets';

/** Écran Projets (D-247) : onglets « Projets » (par défaut) et « Modèles », comme l'écran Utilisateurs (D-165). */
export function Projets() {
  const demande = useSearch().get('onglet');
  const actif = demande === 'modeles' ? 'modeles' : 'projets';
  return (
    <FournisseurOnglets
      etat={{
        libelle: 'Sections des projets',
        onglets: [
          { valeur: 'projets', titre: 'Projets' },
          { valeur: 'modeles', titre: 'Modèles' },
        ],
        actif,
        changer: (v) => navigate(v === 'modeles' ? '/projets?onglet=modeles' : '/projets'),
      }}
    >
      {actif === 'modeles' ? <Modeles /> : <ListeProjets />}
    </FournisseurOnglets>
  );
}
