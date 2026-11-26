import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api';
import { Chargement, Vide } from '../../components/Etat';
import { Notification } from '../../components/Notification';
import { formaterNombre } from '../../gantt/libelles';
import {
  cellulePlan,
  enteteMois,
  libelleProjet,
  libelleRessource,
  type FiltreEquipe,
} from '../../plan-de-charge/logique';

/** Réponse de GET /api/plan-de-charge (D-154 (3)). */
interface MoisRessource {
  mois: string;
  disponible: number;
  reel: number;
  planifie: number;
  charge: number;
  ecart: number;
}
interface LigneProjet {
  projet_id: number | null;
  code: string | null;
  nom: string | null;
  mois: { mois: string; charge: number }[];
}
interface LigneRessource {
  ressource_id: number;
  nom: string;
  actif: boolean;
  mois: MoisRessource[];
  projets: LigneProjet[];
}
interface Plan {
  mois: string[];
  ressources: LigneRessource[];
}

type Etat = { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; plan: Plan };

/** Onglet « Plan de charge » (lot 6d, D-154 (9)) : tableau en lecture seule, filtres fournis par l'écran Pilotage. */
export function TableauPlan({ debut, equipe }: { debut: string; equipe: FiltreEquipe }) {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [depliees, setDepliees] = useState<Set<number>>(new Set());

  useEffect(() => {
    let courant = true;
    setEtat({ statut: 'chargement' });
    const filtre = equipe === 'toutes' ? '' : `&equipe=${equipe}`;
    api<Plan>(`/api/plan-de-charge?debut=${debut}${filtre}`)
      .then((plan) => courant && setEtat({ statut: 'ok', plan }))
      .catch(() => courant && setEtat({ statut: 'erreur' }));
    return () => {
      courant = false;
    };
  }, [debut, equipe]);

  const basculer = (id: number) =>
    setDepliees((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(id)) apres.add(id);
      return apres;
    });

  return (
    <>
      {etat.statut === 'chargement' && <Chargement />}
      {etat.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger le plan de charge.</Notification>
      )}
      {etat.statut === 'ok' &&
        (etat.plan.ressources.length === 0 ? (
          <Vide>Aucune ressource.</Vide>
        ) : (
          <div
            role="region"
            aria-label="Plan de charge"
            tabIndex={0}
            className="max-w-full overflow-x-auto rounded-ui border border-gray-200 bg-white shadow-ui focus-visible:outline-offset-[-2px]"
          >
            <table className="w-full border-separate border-spacing-0 text-left">
              <caption className="sr-only">Plan de charge</caption>
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 min-w-48 border-r border-b border-gray-200 bg-gray-100 px-3 py-2 font-semibold whitespace-nowrap"
                  >
                    Ressource
                  </th>
                  {etat.plan.mois.map((m) => (
                    <th
                      key={m}
                      scope="col"
                      className="min-w-16 border-b border-gray-200 px-2 py-2 text-right font-semibold whitespace-nowrap"
                    >
                      {enteteMois(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>*]:border-b-0">
                {etat.plan.ressources.map((r) => {
                  const ouverte = depliees.has(r.ressource_id);
                  return (
                    <Fragment key={r.ressource_id}>
                      <tr className="group hover:bg-gray-50 [&>*]:border-b [&>*]:border-gray-200">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-1 font-semibold whitespace-nowrap group-hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-expanded={ouverte}
                              onClick={() => basculer(r.ressource_id)}
                              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-ui text-gray-700 hover:bg-gray-200"
                            >
                              {ouverte ? (
                                <ChevronDown aria-hidden className="size-4" />
                              ) : (
                                <ChevronRight aria-hidden className="size-4" />
                              )}
                              <span className="sr-only">
                                {ouverte ? 'Replier' : 'Déplier'} {r.nom}
                              </span>
                            </button>
                            <span>{libelleRessource(r.nom, r.actif)}</span>
                          </span>
                        </th>
                        {r.mois.map((m) => {
                          const c = cellulePlan(m);
                          return (
                            <td
                              key={m.mois}
                              title={c.titre}
                              className={`px-2 py-1 text-right tabular-nums ${c.surcharge ? 'font-semibold text-flag' : ''}`}
                            >
                              {c.texte}
                              {c.surcharge && <span className="sr-only">, surcharge</span>}
                            </td>
                          );
                        })}
                      </tr>
                      {ouverte &&
                        r.projets.map((p) => (
                          <tr
                            key={p.projet_id ?? 'autres'}
                            className="bg-gray-50 text-gray-700 [&>*]:border-b [&>*]:border-gray-200"
                          >
                            <th
                              scope="row"
                              className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 py-1 pr-3 pl-11 font-normal whitespace-nowrap"
                            >
                              {libelleProjet(p)}
                            </th>
                            {p.mois.map((m) => (
                              <td key={m.mois} className="px-2 py-1 text-right tabular-nums">
                                {formaterNombre(m.charge)}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </>
  );
}
