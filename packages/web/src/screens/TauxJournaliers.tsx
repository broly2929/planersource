import { Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { api, ApiError } from '../api';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Dialog } from '../components/Dialog';
import { Field } from '../components/Field';
import { Notification } from '../components/Notification';
import { analyserMontant, formatMontant, type Taux } from '../couts';
import { formaterDate } from '../gantt/libelles';
import { FormulaireDialogue, useListe } from './projet/commun';

/**
 * Taux journaliers d'une ressource (D-225, SPEC §12.1 point 9) ou d'une équipe (D-260, §12.6 point 12) : section
 * partagée, dans « Modifier <nom> », « Taux de <nom> » ou « Taux de l'équipe <nom> ».
 */

export const CHEVAUCHEMENT = 'Cette période chevauche un autre taux.';
export const FIN_AVANT_DEBUT = 'La date de fin précède la date de début.';
export const AIDE_FORMULAIRE = 'Facultatif. Sert au calcul des coûts.';
const MONTANT_INVALIDE = 'Montant invalide.';

/** Texte d'un refus de l'API sur un taux. */
function texteRefusTaux(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return CHEVAUCHEMENT;
    if (err.status === 422 && err.erreur === 'La date de fin précède la date de début') {
      return FIN_AVANT_DEBUT;
    }
    if (err.status === 400) return 'Données invalides : vérifiez les champs.';
    if (err.status === 404) return 'Ce taux n’existe plus.';
  }
  return 'Opération impossible pour le moment. Réessayez.';
}

/** État partagé par la section (dans le formulaire) et les dialogues (hors du formulaire). */
export function useTauxJournaliers(id: number | string, cible: CibleTaux = 'ressource') {
  const base = cible === 'equipe' ? `/api/equipes/${id}/taux` : `/api/utilisateurs/${id}/taux`;
  const chemin = (t: { id: number }) =>
    cible === 'equipe' ? `/api/taux-equipe/${t.id}` : `/api/taux/${t.id}`;
  const [liste, recharger] = useListe<Taux[]>(base);
  const [edition, setEdition] = useState<Taux | null>(null);
  const [suppression, setSuppression] = useState<Taux | null>(null);
  return { base, chemin, liste, recharger, edition, setEdition, suppression, setSuppression };
}
export type CibleTaux = 'ressource' | 'equipe';
export type TauxCtl = ReturnType<typeof useTauxJournaliers>;

/** Champs Du, Au, Montant ; montant invalide : `aria-invalid` et message. */
function ChampsPeriode({
  debut,
  fin,
  montant,
  setDebut,
  setFin,
  setMontant,
}: {
  debut: string;
  fin: string;
  montant: string;
  setDebut: (v: string) => void;
  setFin: (v: string) => void;
  setMontant: (v: string) => void;
}) {
  const invalide = montant.trim() !== '' && analyserMontant(montant) === null;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Field
        className="w-40"
        label="Du"
        type="date"
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
      />
      <Field
        className="w-40"
        label="Au"
        type="date"
        value={fin}
        onChange={(e) => setFin(e.target.value)}
      />
      <Field
        className="w-36"
        label="Montant (€)"
        inputMode="decimal"
        value={montant}
        onChange={(e) => setMontant(e.target.value)}
        {...(invalide ? { erreur: MONTANT_INVALIDE } : {})}
      />
    </div>
  );
}

const corpsPeriode = (debut: string, fin: string, montant: string) => ({
  debut,
  fin: fin === '' ? null : fin,
  montant: analyserMontant(montant),
});

/** Section « Taux journaliers » : à placer dans le formulaire de l'utilisateur. */
export function SectionTaux({ ctl, aide = AIDE_FORMULAIRE }: { ctl: TauxCtl; aide?: string }) {
  const idTitre = useId();
  const idAide = useId();
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [montant, setMontant] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const pret = debut !== '' && analyserMontant(montant) !== null;
  const taux = ctl.liste.statut === 'ok' ? ctl.liste.donnees : [];

  const ajouter = async () => {
    if (!pret) return;
    setErreur(null);
    setEnCours(true);
    try {
      await api(ctl.base, {
        method: 'POST',
        body: corpsPeriode(debut, fin, montant),
      });
      setDebut('');
      setFin('');
      setMontant('');
      ctl.recharger();
    } catch (err) {
      setErreur(texteRefusTaux(err));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section
      aria-labelledby={idTitre}
      aria-describedby={idAide}
      className="flex flex-col gap-2 border-t border-gray-200 pt-4"
    >
      <h3 id={idTitre} className="font-semibold text-gray-900">
        Taux journaliers
      </h3>
      <p id={idAide} className="text-petit text-gray-600">
        {aide}
      </p>
      {ctl.liste.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger les taux.</Notification>
      )}
      {ctl.liste.statut === 'ok' && taux.length === 0 && (
        <p className="text-petit text-gray-600">Aucun taux.</p>
      )}
      {taux.length > 0 && (
        <table className="w-full text-left">
          <caption className="sr-only">Taux journaliers</caption>
          <thead>
            <tr className="border-b border-gray-200 text-gray-700">
              <th scope="col" className="py-1 pr-2 font-semibold">
                Du
              </th>
              <th scope="col" className="py-1 pr-2 font-semibold">
                Au
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">
                Montant
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {taux.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="py-1 pr-2">{formaterDate(t.debut)}</td>
                <td className="py-1 pr-2">{formaterDate(t.fin)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{formatMontant(t.montant)}</td>
                <td className="py-1">
                  <span className="flex justify-end gap-1">
                    <BoutonIcone
                      libelle={`Modifier le taux du ${formaterDate(t.debut)}`}
                      icone={Pencil}
                      onClick={() => ctl.setEdition(t)}
                    />
                    <BoutonIcone
                      libelle={`Supprimer le taux du ${formaterDate(t.debut)}`}
                      icone={Trash2}
                      onClick={() => ctl.setSuppression(t)}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div
        className="flex flex-col gap-2 rounded-ui border border-gray-200 bg-gray-50 p-3"
        onKeyDown={(e) => {
          // Entrée dans un champ d'ajout : ajoute le taux, n'envoie pas le formulaire de l'utilisateur.
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
            void ajouter();
          }
        }}
      >
        <ChampsPeriode
          debut={debut}
          fin={fin}
          montant={montant}
          setDebut={setDebut}
          setFin={setFin}
          setMontant={setMontant}
        />
        <div>
          <Button
            variante="secondaire"
            onClick={() => void ajouter()}
            enCours={enCours}
            disabled={!pret}
          >
            Ajouter le taux
          </Button>
        </div>
      </div>
      {erreur && <Notification type="erreur">{erreur}</Notification>}
    </section>
  );
}

function FormulaireModifTaux({
  taux,
  chemin,
  onSucces,
  onAnnuler,
}: {
  taux: Taux;
  chemin: string;
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [debut, setDebut] = useState(taux.debut);
  const [fin, setFin] = useState(taux.fin ?? '');
  const [montant, setMontant] = useState(String(taux.montant).replace('.', ','));
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      inactif={debut === '' || analyserMontant(montant) === null}
      envoyer={() => api(chemin, { method: 'PATCH', body: corpsPeriode(debut, fin, montant) })}
      onSucces={onSucces}
      onAnnuler={onAnnuler}
      texteErreur={texteRefusTaux}
    >
      <ChampsPeriode
        debut={debut}
        fin={fin}
        montant={montant}
        setDebut={setDebut}
        setFin={setFin}
        setMontant={setMontant}
      />
    </FormulaireDialogue>
  );
}

/** Dialogues de modification et de confirmation : à placer HORS du formulaire de l'utilisateur. */
export function DialoguesTaux({ ctl }: { ctl: TauxCtl }) {
  return (
    <>
      {ctl.edition && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && ctl.setEdition(null)}
          titre="Modifier le taux"
          description="Modifiez la période et le montant."
        >
          <FormulaireModifTaux
            taux={ctl.edition}
            chemin={ctl.chemin(ctl.edition)}
            onSucces={() => {
              ctl.setEdition(null);
              ctl.recharger();
            }}
            onAnnuler={() => ctl.setEdition(null)}
          />
        </Dialog>
      )}
      {ctl.suppression && (
        <Confirmation
          nom={`le taux du ${formaterDate(ctl.suppression.debut)}`}
          action={() => api(ctl.chemin(ctl.suppression!), { method: 'DELETE' })}
          onSucces={() => {
            ctl.setSuppression(null);
            ctl.recharger();
          }}
          onAnnuler={() => ctl.setSuppression(null)}
        />
      )}
    </>
  );
}

/**
 * Dialogue « Taux de <nom> » / « Taux de l'équipe <nom> » : la section partagée, sans formulaire englobant (les
 * taux s'enregistrent un à un) ; « Fermer » est la croix du dialogue, avec la garde D-188 (saisie d'ajout non envoyée).
 */
export function DialogueTaux({
  titre,
  aide,
  cible,
  id,
  onFermer,
}: {
  titre: string;
  aide: string;
  cible: CibleTaux;
  id: number;
  onFermer: () => void;
}) {
  const ctl = useTauxJournaliers(id, cible);
  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre={titre}
      description="Périodes et montants journaliers, enregistrés un à un."
    >
      <SectionTaux ctl={ctl} aide={aide} />
      <DialoguesTaux ctl={ctl} />
    </Dialog>
  );
}
