import { Button } from '../components/Button';
import { navigate } from '../router';
import type { Zoom } from './echelle';

const ZOOMS: { valeur: Zoom; libelle: string }[] = [
  { valeur: 'jour', libelle: 'Jour' },
  { valeur: 'semaine', libelle: 'Semaine' },
  { valeur: 'mois', libelle: 'Mois' },
];

export function BoutonsZoom({ zoom, chemin }: { zoom: Zoom; chemin: string }) {
  const changerZoom = (valeur: Zoom) => {
    const parametres = new URLSearchParams(window.location.search);
    parametres.set('zoom', valeur);
    navigate(`${chemin}?${parametres.toString()}`);
  };
  return (
    <div role="group" aria-label="Zoom" className="flex gap-2">
      {ZOOMS.map((z) => (
        <Button
          key={z.valeur}
          variante={zoom === z.valeur ? 'primaire' : 'secondaire'}
          aria-pressed={zoom === z.valeur}
          onClick={() => changerZoom(z.valeur)}
        >
          {z.libelle}
        </Button>
      ))}
    </div>
  );
}
