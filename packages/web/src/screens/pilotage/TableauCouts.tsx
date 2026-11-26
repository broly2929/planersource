import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api';
import { Chargement, Vide } from '../../components/Etat';
import { Notification } from '../../components/Notification';
import { formatMontant } from '../../couts';
import { MarqueIncomplet } from '../../gantt/CelluleCout';
import { enteteMois, libelleRessource, type FiltreEquipe } from '../../plan-de-charge/logique';

/** Réponse de GET /api/couts (SPEC §12.5 point 3). */
interface Montant {
  reel: number;
  planifie: number;
  cout: number;
  taux_manquant: boolean;
}
interface MontantMois extends Montant {
  mois: string;
}
interface LigneCouts {
  mois: MontantMois[];
  total: Montant;
}
interface ProjetCouts extends LigneCouts {
  projet_id: number;
  code: string;
  nom: string;
  otp_effectif: string | null;
  ressources: (LigneCouts & { ressource_id: number; nom: string; actif: boolean })[];
}
interface Couts {
  mois: string[];
  projets: ProjetCouts[];
  total: LigneCouts;
}

type Etat = { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; couts: Couts };

function Cellule({ m, gras }: { m: Montant; gras?: boolean | undefined }) {
  return (
    <td
      title={`Réel ${formatMontant(m.reel)}, planifié ${formatMontant(m.planifie)}`}
      className={`px-2 py-1 text-right whitespace-nowrap tabular-nums ${gras ? 'font-semibold' : ''}`}
    >
      {formatMontant(m.cout)}
      {m.taux_manquant && <MarqueIncomplet />}
    </td>
  );
}

function Cellules({ ligne, gras }: { ligne: LigneCouts; gras?: boolean | undefined }) {
  return (
    <>
      {ligne.mois.map((m) => (
        <Cellule key={m.mois} m={m} gras={gras} />
      ))}
      <Cellule m={ligne.total} gras />
    </>
  );
}

/** Onglet « Coûts » de l'écran Pilotage (D-245, SPEC §12.5 point 8) : lecture seule. */
export function TableauCouts({ debut, equipe }: { debut: string; equipe: FiltreEquipe }) {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [depliees, setDepliees] = useState<Set<number>>(new Set());

  useEffect(() => {
    let courant = true;
    setEtat({ statut: 'chargement' });
    const filtre = equipe === 'toutes' ? '' : `&equipe=${equipe}`;
    api<Couts>(`/api/couts?debut=${debut}${filtre}`)
      .then((couts) => courant && setEtat({ statut: 'ok', couts }))
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

  if (etat.statut === 'chargement') return <Chargement />;
  if (etat.statut === 'erreur') {
    return <Notification type="erreur">Impossible de charger les coûts.</Notification>;
  }
  const { couts } = etat;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="region"
        aria-label="Coûts"
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-ui border border-gray-200 bg-white shadow-ui focus-visible:outline-offset-[-2px]"
      >
        {couts.projets.length === 0 ? (
          <Vide>Aucun coût sur la période.</Vide>
        ) : (
          <table className="w-full border-separate border-spacing-0 text-left">
            <caption className="sr-only">Coûts</caption>
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-48 border-r border-b border-gray-200 bg-gray-100 px-3 py-2 font-semibold whitespace-nowrap"
                >
                  Projet
                </th>
                {couts.mois.map((m) => (
                  <th
                    key={m}
                    scope="col"
                    className="border-b border-gray-200 px-2 py-2 text-right font-semibold whitespace-nowrap"
                  >
                    {enteteMois(m)}
                  </th>
                ))}
                <th
                  scope="col"
                  className="border-b border-gray-200 px-2 py-2 text-right font-semibold whitespace-nowrap"
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {couts.projets.map((p) => {
                const ouvert = depliees.has(p.projet_id);
                return (
                  <Fragment key={p.projet_id}>
                    <tr className="group hover:bg-gray-50 [&>*]:border-b [&>*]:border-gray-200">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-1 font-semibold whitespace-nowrap group-hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-expanded={ouvert}
                            onClick={() => basculer(p.projet_id)}
                            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-ui text-gray-700 hover:bg-gray-200"
                          >
                            {ouvert ? (
                              <ChevronDown aria-hidden className="size-4" />
                            ) : (
                              <ChevronRight aria-hidden className="size-4" />
                            )}
                            <span className="sr-only">
                              {ouvert ? 'Replier' : 'Déplier'} {p.code}
                            </span>
                          </button>
                          <span className="flex flex-col">
                            <span>
                              {p.code} · {p.nom}
                            </span>
                            {p.otp_effectif !== null && (
                              <span className="text-petit font-normal text-gray-600">
                                {p.otp_effectif}
                              </span>
                            )}
                          </span>
                        </span>
                      </th>
                      <Cellules ligne={p} />
                    </tr>
                    {ouvert &&
                      p.ressources.map((r) => (
                        <tr
                          key={r.ressource_id}
                          className="bg-gray-50 text-gray-700 [&>*]:border-b [&>*]:border-gray-200"
                        >
                          <th
                            scope="row"
                            className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 py-1 pr-3 pl-11 font-normal whitespace-nowrap"
                          >
                            {libelleRessource(r.nom, r.actif)}
                          </th>
                          <Cellules ligne={r} />
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
              <tr className="bg-gray-100 font-semibold">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-gray-200 bg-gray-100 px-3 py-1 whitespace-nowrap"
                >
                  Total
                </th>
                <Cellules ligne={couts.total} gras />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
