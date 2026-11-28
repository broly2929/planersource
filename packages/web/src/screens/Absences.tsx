import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAnnuaire, type EntreeAnnuaire } from '../annuaire';
import { FormulaireAbsence } from '../absences/FormulaireAbsence';
import {
  dateFr,
  LIBELLE_MOTIF,
  LIBELLE_PORTION,
  ressourceChoisie,
  ressourcesActives,
  trierParNom,
  type Absence,
} from '../absences/logique';
import { useAuth } from '../auth';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Onglets } from '../components/Onglets';
import { Select } from '../components/Select';
import { Table, type Colonne } from '../components/Table';
import { navigate, Redirect, useSearch } from '../router';
import { GrilleAbsences } from './GrilleAbsences';
import { useListe } from './projet/commun';

const MESSAGE_CHOIX = 'Choisissez une ressource.';

interface ProjetListe {
  id: number;
  peut_ecrire: boolean;
}
interface AffectationListe {
  ressource_id: number;
}

type Choix =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'ok'; liste: { id: number; nom: string }[] };

/**
 * Ressources proposées (SPEC §4 absences point 10) : ressource seule : elle-même ; chef de projet : lui-même s'il est
 * ressource plus les ressources affectées à un projet dont `peut_ecrire` est vrai ; administrateur et leader
 * métier : toutes les ressources actives.
 */
function useChoixRessources(
  user: { id: number; nom: string; role: string; est_ressource: boolean } | null,
): Choix {
  const annuaire = useAnnuaire();
  const [affectees, setAffectees] = useState<Set<number> | null>(null);
  const [erreur, setErreur] = useState(false);
  const chef = user?.role === 'chef_de_projet';
  useEffect(() => {
    if (!chef) return;
    let annule = false;
    (async () => {
      const projets = await api<ProjetListe[]>('/api/projets');
      const ids = new Set<number>();
      for (const p of projets.filter((x) => x.peut_ecrire)) {
        const aff = await api<AffectationListe[]>(`/api/projets/${p.id}/affectations`);
        for (const a of aff) ids.add(a.ressource_id);
      }
      if (!annule) setAffectees(ids);
    })().catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
    };
  }, [chef]);

  if (!user) return { statut: 'chargement' };
  if (user.role === 'ressource') return { statut: 'ok', liste: [{ id: user.id, nom: user.nom }] };
  if (erreur) return { statut: 'erreur' };
  if (annuaire === null || (chef && affectees === null)) return { statut: 'chargement' };
  if (!chef) return { statut: 'ok', liste: ressourcesActives(annuaire) };
  const soi: EntreeAnnuaire[] = user.est_ressource ? annuaire.filter((e) => e.id === user.id) : [];
  const portee = annuaire.filter((e) => e.actif && e.est_ressource && affectees!.has(e.id));
  const uniques = new Map([...soi, ...portee].map((e) => [e.id, e]));
  return { statut: 'ok', liste: trierParNom([...uniques.values()]) };
}

/** Absences d'une ressource : `GET /api/absences?ressource_id=` (états chargement, erreur, ok). */
function useListeAbsences(ressource: number | null) {
  const [etat, recharger] = useListe<Absence[]>(`/api/absences?ressource_id=${ressource ?? ''}`);
  return [etat, recharger] as const;
}

/** Onglet « Absences » de l'écran Imputations (D-276). */
function AbsencesRessourceVue() {
  const { etat } = useAuth();
  const user = etat.statut === 'connecte' ? etat.user : null;
  const moi = useMemo(
    () =>
      user
        ? { id: Number(user.id), nom: user.nom, role: user.role, est_ressource: user.est_ressource }
        : null,
    [user],
  );
  const choix = useChoixRessources(moi);
  const recherche = useSearch();
  const param = recherche.get('ressource');
  const semaine = recherche.get('semaine');
  const liste = choix.statut === 'ok' ? choix.liste : [];
  const { ressource, corrigee } = moi
    ? ressourceChoisie(param, liste, moi)
    : { ressource: null, corrigee: false };
  const adresse = (id: number | null) =>
    `/imputations?onglet=absences${semaine === null ? '' : `&semaine=${semaine}`}${id === null ? '' : `&ressource=${id}`}`;
  const aCorriger = choix.statut === 'ok' && corrigee;
  const options = [
    ...(ressource === null ? [{ value: '', label: '— Choisir —', disabled: true }] : []),
    ...liste.map((e) => ({ value: String(e.id), label: e.nom })),
  ];
  const selection = (
    <Select
      label="Ressource"
      value={ressource === null ? '' : String(ressource)}
      disabled={choix.statut !== 'ok'}
      onChange={(e) => navigate(adresse(Number(e.target.value)))}
      options={choix.statut === 'ok' ? options : [{ value: '', label: 'Chargement…' }]}
      className="w-56"
    />
  );

  return (
    <Layout titre="Absences" actions={selection}>
      <Onglets>
        <Redirect to={adresse(param !== null && !corrigee ? ressource : null)} when={aCorriger} />
        {choix.statut === 'chargement' || aCorriger ? (
          <Chargement libelle="Chargement des ressources…" />
        ) : choix.statut === 'erreur' ? (
          <Notification type="erreur">Impossible de charger les ressources.</Notification>
        ) : ressource === null ? (
          <Vide>{MESSAGE_CHOIX}</Vide>
        ) : (
          <AbsencesRessource key={ressource} ressource={ressource} />
        )}
      </Onglets>
    </Layout>
  );
}

function AbsencesRessource({ ressource }: { ressource: number }) {
  const [etat, recharger] = useListeAbsences(ressource);
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<Absence | null>(null);
  const [suppression, setSuppression] = useState<Absence | null>(null);

  const colonnes: Colonne<Absence>[] = [
    { titre: 'Du', cellule: (a) => dateFr(a.debut) },
    { titre: 'Au', cellule: (a) => dateFr(a.fin) },
    { titre: 'Portion', cellule: (a) => LIBELLE_PORTION[a.portion] },
    { titre: 'Motif', cellule: (a) => LIBELLE_MOTIF[a.motif] },
    {
      titre: 'Actions',
      cellule: (a) => (
        <span className="inline-flex gap-1">
          <BoutonIcone
            libelle={`Modifier l'absence du ${dateFr(a.debut)}`}
            icone={Pencil}
            onClick={() => setEdition(a)}
          />
          <BoutonIcone
            libelle={`Supprimer l'absence du ${dateFr(a.debut)}`}
            icone={Trash2}
            onClick={() => setSuppression(a)}
          />
        </span>
      ),
    },
  ];

  const fermerEtRecharger = () => {
    setCreation(false);
    setEdition(null);
    recharger();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setCreation(true)}>
          <Plus aria-hidden className="size-4" />
          Nouvelle absence
        </Button>
      </div>
      {etat.statut === 'chargement' && <Chargement libelle="Chargement des absences…" />}
      {etat.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger les absences.</Notification>
      )}
      {etat.statut === 'ok' && etat.donnees.length === 0 && <Vide>Aucune absence.</Vide>}
      {etat.statut === 'ok' && etat.donnees.length > 0 && (
        <Table legende="Absences" colonnes={colonnes} lignes={etat.donnees} cle={(a) => a.id} />
      )}
      <Dialog
        ouvert={creation}
        onOuvertChange={setCreation}
        titre="Nouvelle absence"
        description="Renseignez la période, la portion et le motif."
      >
        <FormulaireAbsence
          ressource={ressource}
          absence={null}
          onSucces={fermerEtRecharger}
          onAnnuler={() => setCreation(false)}
        />
      </Dialog>
      {edition && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && setEdition(null)}
          titre="Modifier l'absence"
          description="Modifiez la période, la portion ou le motif."
        >
          <FormulaireAbsence
            ressource={ressource}
            absence={edition}
            onSucces={fermerEtRecharger}
            onAnnuler={() => setEdition(null)}
          />
        </Dialog>
      )}
      {suppression && (
        <Confirmation
          alerte
          nom={`l'absence du ${dateFr(suppression.debut)}`}
          action={() => api(`/api/absences/${suppression.id}`, { method: 'DELETE' })}
          onSucces={() => {
            setSuppression(null);
            recharger();
          }}
          onAnnuler={() => setSuppression(null)}
        />
      )}
    </div>
  );
}

/** Onglet « Absences » : grille mensuelle pour les rôles autres que ressource (D-280), vue du point 10 sinon. */
export function Absences() {
  const { etat } = useAuth();
  if (etat.statut === 'connecte' && etat.user.role !== 'ressource') return <GrilleAbsences />;
  return <AbsencesRessourceVue />;
}
