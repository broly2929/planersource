import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { NavigationSemaine } from '../components/NavigationSemaine';
import { Notification } from '../components/Notification';
import {
  aujourdhuiLocal,
  joursSemaine,
  libelleStatut,
  lignesModifiees,
  messageRefusFeuille,
  saisieInitiale,
  saisieValide,
  VARIANTE_STATUT,
  semaineAffichee,
  type JourFeuille,
  type LigneFeuille,
  type Saisie,
  type Statut,
} from '../imputations/logique';
import { erreursSaisie, TableauFeuille } from '../imputations/TableauFeuille';
import { navigate, Redirect, useSearch } from '../router';

interface Vue {
  feuille: { id: number | null; statut: Statut; commentaire: string | null };
  lignes: LigneFeuille[];
  jours: JourFeuille[];
}

const adresse = (semaine: string) => `/imputations?semaine=${semaine}`;

export function FeuilleTemps() {
  const { etat } = useAuth();
  const ressource = etat.statut === 'connecte' && etat.user.est_ressource;
  const param = useSearch().get('semaine');
  const aujourdhui = aujourdhuiLocal();
  const { semaine, corrigee } = semaineAffichee(param, aujourdhui);

  return (
    <Layout titre="Feuille de temps">
      <Redirect to={adresse(semaine)} when={corrigee} />
      {!ressource ? (
        <Vide>Cette page est réservée aux ressources.</Vide>
      ) : corrigee ? null : (
        <Feuille semaine={semaine} aujourdhui={aujourdhui} />
      )}
    </Layout>
  );
}

function Feuille({ semaine, aujourdhui }: { semaine: string; aujourdhui: string }) {
  const [vue, setVue] = useState<Vue | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [saisie, setSaisie] = useState<Saisie>({});
  const [retour, setRetour] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [versSemaine, setVersSemaine] = useState<string | null>(null);

  const jours = useMemo(() => joursSemaine(semaine), [semaine]);

  const adopter = useCallback(
    (v: Vue) => {
      setVue(v);
      setSaisie(saisieInitiale(v.lignes, jours));
    },
    [jours],
  );

  useEffect(() => {
    let annule = false;
    setVue(null);
    setErreurChargement(false);
    setRetour(null);
    api<Vue>(`/api/feuilles?semaine=${semaine}`)
      .then((v) => !annule && adopter(v))
      .catch(() => !annule && setErreurChargement(true));
    return () => {
      annule = true;
    };
  }, [semaine, adopter]);

  const modifications = useMemo(
    () => (vue ? lignesModifiees(vue.lignes, saisie) : []),
    [vue, saisie],
  );
  const valide = saisieValide(saisie);
  const modifiee = modifications.length > 0 || !valide;
  const erreurs = useMemo(
    () => (vue ? erreursSaisie(vue.lignes, saisie, vue.jours) : []),
    [vue, saisie],
  );

  const changerSemaine = (cible: string) => {
    if (cible === semaine) return;
    if (modifiee) setVersSemaine(cible);
    else navigate(adresse(cible));
  };

  const executer = async (appel: () => Promise<Vue>, succes?: string) => {
    setRetour(null);
    setEnCours(true);
    try {
      adopter(await appel());
      if (succes) setRetour({ type: 'succes', texte: succes });
    } catch (err) {
      setRetour({
        type: 'erreur',
        texte:
          err instanceof ApiError
            ? messageRefusFeuille(err.status, err.code)
            : messageRefusFeuille(0, undefined),
      });
    } finally {
      setEnCours(false);
    }
  };

  const modifier = (id: number, jour: string | null, texte: string) => {
    setRetour(null);
    setSaisie((s) => {
      const ligne = s[id]!;
      return {
        ...s,
        [id]:
          jour === null
            ? { ...ligne, reste: texte }
            : { ...ligne, charges: { ...ligne.charges, [jour]: texte } },
      };
    });
  };

  const enregistrer = () =>
    executer(
      () =>
        api<Vue>(`/api/feuilles?semaine=${semaine}`, {
          method: 'PUT',
          body: { lignes: modifications },
        }),
      'Feuille enregistrée.',
    );

  const agir = (verbe: 'soumettre' | 'rappeler') => {
    if (vue?.feuille.id == null) {
      setRetour({ type: 'erreur', texte: messageRefusFeuille(422, 'feuille_vide') });
      return;
    }
    return executer(() => api<Vue>(`/api/feuilles/${vue.feuille.id}/${verbe}`, { method: 'POST' }));
  };

  if (erreurChargement) {
    return <Notification type="erreur">Impossible de charger la feuille de temps.</Notification>;
  }
  if (!vue) return <Chargement />;

  const { statut, commentaire } = vue.feuille;
  const editable = statut === 'brouillon' || statut === 'rejetee';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <NavigationSemaine semaine={semaine} aujourdhui={aujourdhui} onChanger={changerSemaine} />
        <div className="ml-auto flex flex-nowrap items-center gap-2">
          <span data-statut-feuille={statut}>
            <Badge statut={VARIANTE_STATUT[statut]}>{libelleStatut(statut)}</Badge>
          </span>
          {editable && (
            <>
              <Button
                variante="secondaire"
                className="px-2!"
                onClick={enregistrer}
                disabled={modifications.length === 0 || !valide}
                enCours={enCours}
              >
                Enregistrer
              </Button>
              <Button
                className="px-2!"
                onClick={() => agir('soumettre')}
                disabled={modifiee}
                enCours={enCours}
              >
                Soumettre
              </Button>
            </>
          )}
          {statut === 'soumise' && (
            <Button variante="secondaire" onClick={() => agir('rappeler')} enCours={enCours}>
              Rappeler
            </Button>
          )}
        </div>
      </div>

      {statut === 'rejetee' && commentaire && (
        <Notification type="erreur">Feuille rejetée : {commentaire}</Notification>
      )}
      {retour && <Notification type={retour.type}>{retour.texte}</Notification>}

      {vue.lignes.length === 0 ? (
        <Vide>Aucune activité à imputer cette semaine.</Vide>
      ) : (
        <TableauFeuille
          lignes={vue.lignes}
          jours={vue.jours}
          saisie={saisie}
          erreurs={erreurs}
          lectureSeule={!editable}
          aujourdhui={aujourdhui}
          modifier={modifier}
        />
      )}

      <ul aria-live="polite" className="flex flex-col gap-1 text-petit text-flag">
        {erreurs.map((e) => (
          <li key={e.id} id={e.id}>
            {e.texte}
          </li>
        ))}
      </ul>

      {versSemaine && (
        <Confirmation
          titre="Abandonner les modifications ?"
          description="Les modifications non enregistrées seront perdues."
          libelleConfirmer="Abandonner"
          action={async () => undefined}
          onSucces={() => {
            const cible = versSemaine;
            setVersSemaine(null);
            navigate(adresse(cible));
          }}
          onAnnuler={() => setVersSemaine(null)}
        />
      )}
    </div>
  );
}
