import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import {
  casesInitiales,
  libelleProjet,
  messageRefus,
  projetsListes,
  type ProjetCalcul,
} from './logique';
import { Button } from '../components/Button';
import { Case } from '../components/Case';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Field } from '../components/Field';
import { Notification } from '../components/Notification';
import { dateLocale } from '../gantt/echelle';

export interface AvertissementCalcul {
  code: string;
  assignation_id: number;
  reste: number;
}

export interface ReponseCalcul {
  d0: string;
  horizon: string;
  projets: number[];
  ignores: unknown[];
  lignes: number;
  avertissements: AvertissementCalcul[];
}

type Liste =
  { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; projets: ProjetCalcul[] };

/** Noms des éléments du projet affiché, pour nommer les éléments d'un refus. */
export async function nomsElements(projetId: number): Promise<Map<number, string>> {
  try {
    const gantt = await api<{ elements: { id: number; nom: string }[] }>(
      `/api/projets/${projetId}/gantt`,
    );
    return new Map(gantt.elements.map((e) => [e.id, e.nom]));
  } catch {
    return new Map();
  }
}

/** Texte d'un refus de POST /api/calcul (3c points 8 et 10), partagé avec le recalcul automatique. */
export function texteRefusCalcul(err: unknown, noms: Map<number, string>): string {
  const refus =
    err instanceof ApiError
      ? {
          status: err.status,
          ...(err.code === undefined ? {} : { code: err.code }),
          ...(err.ids === undefined ? {} : { ids: err.ids }),
        }
      : { status: 0 };
  return messageRefus(refus, noms);
}

/** Dialogue « Calculer le planning » (SPEC §6, D-074). */
export function DialogueCalcul({
  precoches,
  projetId,
  noms,
  onSucces,
  onFermer,
}: {
  precoches: number[] | 'tous';
  projetId?: number;
  noms?: Map<number, string>;
  onSucces: (reponse: ReponseCalcul) => void;
  onFermer: () => void;
}) {
  const [liste, setListe] = useState<Liste>({ statut: 'chargement' });
  const [coches, setCoches] = useState<Set<number>>(new Set());
  const [d0, setD0] = useState(() => dateLocale(new Date()));
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    api<ProjetCalcul[]>('/api/projets')
      .then((projets) => {
        if (annule) return;
        setCoches(casesInitiales(projets, precoches));
        setListe({ statut: 'ok', projets: projetsListes(projets) });
      })
      .catch(() => !annule && setListe({ statut: 'erreur' }));
    return () => {
      annule = true;
    };
    // précochage calculé une seule fois à l'ouverture
  }, []);

  const projets = liste.statut === 'ok' ? liste.projets : [];
  const basculer = (id: number, coche: boolean) =>
    setCoches((avant) => {
      const apres = new Set(avant);
      if (coche) apres.add(id);
      else apres.delete(id);
      return apres;
    });

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await api<ReponseCalcul>('/api/calcul', {
        method: 'POST',
        body: { projets: projets.filter((p) => coches.has(p.id)).map((p) => p.id), d0 },
      });
      onSucces(reponse);
    } catch (err) {
      setErreur(
        texteRefusCalcul(
          err,
          noms ??
            (projetId === undefined ? new Map<number, string>() : await nomsElements(projetId)),
        ),
      );
      setEnCours(false);
    }
  };

  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre="Calculer le planning"
      description="Choisissez les projets à calculer et la date de début du calcul."
    >
      {liste.statut === 'chargement' && <Chargement libelle="Chargement des projets…" />}
      {liste.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger les projets.</Notification>
      )}
      {liste.statut === 'ok' && projets.length === 0 && <Vide>Aucun projet à calculer.</Vide>}
      {liste.statut === 'ok' && projets.length > 0 && (
        <form onSubmit={soumettre} className="flex flex-col gap-4">
          {erreur && <Notification type="erreur">{erreur}</Notification>}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold text-gray-800">Projets à calculer</legend>
            <div className="flex gap-2">
              <Button
                variante="secondaire"
                onClick={() => setCoches(new Set(projets.map((p) => p.id)))}
              >
                Tout cocher
              </Button>
              <Button variante="secondaire" onClick={() => setCoches(new Set())}>
                Tout décocher
              </Button>
            </div>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {projets.map((p) => (
                <Case
                  key={p.id}
                  label={libelleProjet(p)}
                  checked={coches.has(p.id)}
                  onChange={(e) => basculer(p.id, e.target.checked)}
                />
              ))}
            </div>
          </fieldset>
          <Field
            label="Date de début du calcul"
            type="date"
            required
            value={d0}
            onChange={(e) => setD0(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variante="secondaire" onClick={onFermer}>
              Annuler
            </Button>
            <Button type="submit" enCours={enCours} disabled={coches.size === 0 || d0 === ''}>
              Calculer
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
