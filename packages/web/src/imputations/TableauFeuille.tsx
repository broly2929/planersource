// Tableau des imputations d'une semaine (lot 4b, D-120 ; réutilisé en lecture seule par l'écran Validation, D-135 (4)).
import { TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import {
  analyserCharge,
  analyserReste,
  formaterJours,
  libelleJour,
  totauxJours,
  type JourFeuille,
  type LigneFeuille,
  type Saisie,
} from './logique';

export const nomLigne = (l: LigneFeuille) => `${l.wbs} ${l.activite_nom}`;

export interface ErreurSaisie {
  cle: string;
  id: string;
  texte: string;
}

/**
 * `lectureSeule` : toutes les cases désactivées (feuille soumise ou validée, ou consultation par un validateur).
 * `modifier(id, jour | null, texte)` : `jour` null = reste à faire.
 */
export function TableauFeuille({
  lignes,
  jours,
  saisie,
  erreurs,
  lectureSeule,
  aujourdhui,
  modifier,
}: {
  lignes: LigneFeuille[];
  jours: JourFeuille[];
  saisie: Saisie;
  erreurs: ErreurSaisie[];
  lectureSeule: boolean;
  aujourdhui: string;
  modifier: (id: number, jour: string | null, texte: string) => void;
}) {
  const totaux = useMemo(() => totauxJours(saisie, jours), [saisie, jours]);
  const vue = { lignes, jours };
  return (
    <div className="overflow-x-auto rounded-ui border border-gray-200 bg-white shadow-ui">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">Imputations de la semaine</caption>
        <colgroup>
          <col className="w-28" />
          <col />
          <col className="w-16" />
          <col className="w-16" />
          {vue.jours.map((j) => (
            <col key={j.jour} className="w-12" />
          ))}
          <col className="w-[3.75rem]" />
        </colgroup>
        <thead className="bg-gray-100 text-petit text-gray-700">
          <tr>
            {['Projet', 'Activité', 'Assigné', 'Réel cumulé'].map((t, i) => (
              <th
                key={t}
                scope="col"
                className={`border-b border-gray-200 py-2 font-semibold ${i >= 2 ? 'px-1 text-right' : 'px-2'}`}
              >
                {t}
              </th>
            ))}
            {vue.jours.map((j) => (
              <th
                key={j.jour}
                scope="col"
                data-jour={j.jour}
                data-capacite-nulle={j.capacite === 0 ? '' : undefined}
                className={`border-b border-gray-200 px-1 py-2 text-right font-semibold ${j.capacite === 0 ? 'bg-gray-200' : ''}`}
              >
                {libelleJour(j.jour)}
              </th>
            ))}
            <th scope="col" className="border-b border-gray-200 px-1 py-2 text-right font-semibold">
              Reste à faire
            </th>
          </tr>
        </thead>
        <tbody>
          {vue.lignes.map((l) => {
            const s = saisie[l.assignation_id];
            if (!s) return null;
            const lecture = lectureSeule || !l.modifiable;
            return (
              <tr
                key={l.assignation_id}
                data-ligne-assignation={l.assignation_id}
                className="border-b border-gray-200"
              >
                <th
                  scope="row"
                  title={l.projet_code}
                  className="truncate px-2 py-2 align-top leading-8 font-normal"
                >
                  {l.projet_code}
                </th>
                <td title={nomLigne(l)} className="truncate px-2 py-2 align-top leading-8">
                  {nomLigne(l)}
                </td>
                <td className="px-2 py-2 text-right align-top leading-8">
                  {formaterJours(l.assignee)}
                </td>
                <td className="px-2 py-2 text-right align-top leading-8">
                  {formaterJours(l.reel_cumule)}
                </td>
                {vue.jours.map((j) => (
                  <td
                    key={j.jour}
                    className={`px-1 py-2 text-right align-top ${j.capacite === 0 ? 'bg-gray-100' : ''}`}
                  >
                    <CaseSaisie
                      nom={`${nomLigne(l)}, ${libelleJour(j.jour)}`}
                      id={`c-${l.assignation_id}-${j.jour}`}
                      valeur={s.charges[j.jour] ?? ''}
                      erreurId={
                        erreurs.find((e) => e.cle === `c-${l.assignation_id}-${j.jour}`)?.id
                      }
                      desactivee={lecture || j.jour > aujourdhui}
                      onChange={(t) => modifier(l.assignation_id, j.jour, t)}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-right align-top">
                  <CaseSaisie
                    nom={`${nomLigne(l)}, reste à faire`}
                    id={`r-${l.assignation_id}`}
                    valeur={s.reste}
                    erreurId={erreurs.find((e) => e.cle === `r-${l.assignation_id}`)?.id}
                    desactivee={lecture}
                    onChange={(t) => modifier(l.assignation_id, null, t)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <th scope="row" colSpan={4} className="px-2 py-2 text-left align-top font-semibold">
              Total
            </th>
            {totaux.map((t) => (
              <td
                key={t.jour}
                data-total-jour={t.jour}
                className="px-1 py-2 align-top font-semibold"
              >
                <span className="block text-right">{formaterJours(t.total)}</span>
                {t.depassement && (
                  <span
                    data-depassement-jour={t.jour}
                    className="flex items-center justify-end gap-1 text-petit text-flag"
                  >
                    <TriangleAlert aria-hidden className="size-4 shrink-0" />
                    Dépassement
                  </span>
                )}
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CaseSaisie({
  nom,
  id,
  valeur,
  erreurId,
  desactivee,
  onChange,
}: {
  nom: string;
  id: string;
  valeur: string;
  erreurId: string | undefined;
  desactivee: boolean;
  onChange: (texte: string) => void;
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={nom}
      aria-invalid={erreurId ? true : undefined}
      aria-errormessage={erreurId}
      value={valeur}
      disabled={desactivee}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 w-full min-w-0 rounded-ui border px-1 text-right disabled:bg-gray-100 disabled:text-gray-600 ${erreurId ? 'border-flag' : 'border-gray-300'}`}
    />
  );
}

/** Lignes d'erreur de saisie, dans l'ordre de l'écran (D-134 (4)) : une par case invalide. */
export function erreursSaisie(
  lignes: LigneFeuille[],
  saisie: Saisie,
  jours: JourFeuille[],
): ErreurSaisie[] {
  const erreurs: ErreurSaisie[] = [];
  const ajouter = (
    cle: string,
    quoi: string,
    l: LigneFeuille,
    a: { ok: boolean; message?: string },
  ) => {
    if (a.ok) return;
    erreurs.push({
      cle,
      id: `${cle}-msg`,
      texte: `${quoi} · ${nomLigne(l)} : ${a.message ?? ''}`,
    });
  };
  for (const l of lignes) {
    const s = saisie[l.assignation_id];
    if (!s) continue;
    for (const j of jours) {
      ajouter(
        `c-${l.assignation_id}-${j.jour}`,
        libelleJour(j.jour),
        l,
        analyserCharge(s.charges[j.jour] ?? ''),
      );
    }
    ajouter(`r-${l.assignation_id}`, 'Reste à faire', l, analyserReste(s.reste));
  }
  return erreurs;
}
