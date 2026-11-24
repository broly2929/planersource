import { useEffect, useState } from 'react';
import { api } from '../api';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Field } from '../components/Field';
import { Select } from '../components/Select';
import type { Equipe } from '../screens/Equipes';
import { adresseExportImputations, periodeExportValide, type EquipeExport } from './logique';

/** Dialogue « Exporter les imputations » (lot 6f, D-160 (6)) : le téléchargement ferme le dialogue. */
export function DialogueExport({
  du: duInitial,
  au: auInitial,
  onFermer,
}: {
  du: string;
  au: string;
  /** Fermeture (le parent rend le focus au bouton d'ouverture). */
  onFermer: () => void;
}) {
  const [du, setDu] = useState(duInitial);
  const [au, setAu] = useState(auInitial);
  const [equipe, setEquipe] = useState<EquipeExport>('toutes');
  const [equipes, setEquipes] = useState<Equipe[]>([]);

  useEffect(() => {
    api<Equipe[]>('/api/equipes')
      .then(setEquipes)
      .catch(() => setEquipes([]));
  }, []);

  const valide = periodeExportValide(du, au);

  const exporter = () => {
    const lien = document.createElement('a');
    lien.href = adresseExportImputations(du, au, equipe);
    lien.download = '';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    onFermer();
  };

  return (
    <Dialog
      sansGarde
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre="Exporter les imputations"
      description="Fichier CSV des imputations de la période."
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <Field
            label="Du"
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={du}
            aria-invalid={valide ? undefined : true}
            onChange={(e) => setDu(e.target.value)}
          />
          <Field
            label="Au"
            type="date"
            min="2000-01-01"
            max="2099-12-31"
            value={au}
            {...(valide ? {} : { erreur: 'Période invalide.' })}
            onChange={(e) => setAu(e.target.value)}
          />
        </div>
        <Select
          label="Équipe"
          value={equipe === 'toutes' ? '' : String(equipe)}
          onChange={(e) => {
            const v = e.target.value;
            setEquipe(v === '' ? 'toutes' : v === 'aucune' ? 'aucune' : Number(v));
          }}
          options={[
            { value: '', label: 'Toutes' },
            { value: 'aucune', label: 'Sans équipe' },
            ...equipes.map((e) => ({ value: String(e.id), label: e.nom })),
          ]}
        />
        <div className="flex justify-end gap-2">
          <Button variante="secondaire" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={exporter} disabled={!valide}>
            Exporter
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
