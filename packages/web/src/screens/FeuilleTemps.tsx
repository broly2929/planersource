import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { useAnnuaire } from '../annuaire';
import { useAuth } from '../auth';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Chargement, Vide } from '../components/Etat';
import { GardeSortie } from '../components/GardeSortie';
import { Layout } from '../components/Layout';
import { NavigationSemaine } from '../components/NavigationSemaine';
import { Notification } from '../components/Notification';
import { Onglets } from '../components/Onglets';
import { Select } from '../components/Select';
import {
  adresseImputations,
  aujourdhuiLocal,
  joursSemaine,
  libelleStatut,
  lignesModifiees,
  messageRefusFeuille,
  optionsListeRessource,
  ressourceAffichee,
  ressourcesChoisissables,
  saisieInitiale,
  saisieValide,
  VARIANTE_STATUT,
  semaineAffichee,
  titreFeuille,
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

const MESSAGE_CHOIX = 'Choisissez une ressource.';

export function FeuilleTemps() {
  const { etat } = useAuth();
  const user = etat.statut === 'connecte' ? etat.user : null;
  const admin = user?.role === 'administrateur';
  const ressource = !!user?.est_ressource;
  const aujourdhui = aujourdhuiLocal();
  const recherche = useSearch();
  const { semaine, corrigee } = semaineAffichee(recherche.get('semaine'), aujourdhui);
  const paramRessource = recherche.get('ressource');
  // D-247 : l'onglet par défaut « Feuille de temps » n'a pas de paramètre `onglet`.
  const paramOnglet = recherche.get('onglet');

  if (admin && user)
    return (
      <FeuilleAdmin
        user={{ id: Number(user.id), est_ressource: user.est_ressource }}
        semaine={semaine}
        corrigee={corrigee || paramOnglet !== null}
        aujourdhui={aujourdhui}
      />
    );
  return (
    <Layout titre="Feuille de temps">
      <Onglets>
        <Redirect
          to={adresseImputations(semaine, null)}
          when={corrigee || paramRessource !== null || paramOnglet !== null}
        />
        {!ressource ? (
          <Vide>Cette page est réservée aux ressources.</Vide>
        ) : corrigee || paramRessource !== null || paramOnglet !== null ? null : (
          <Feuille semaine={semaine} aujourdhui={aujourdhui} ressourceId={null} />
        )}
      </Onglets>
    </Layout>
  );
}

/** Écran de l'administrateur : liste « Ressource » (D-181 (5)), feuille de la ressource choisie. */
function FeuilleAdmin({
  user,
  semaine,
  corrigee,
  aujourdhui,
}: {
  user: { id: number; est_ressource: boolean };
  semaine: string;
  corrigee: boolean;
  aujourdhui: string;
}) {
  const annuaire = useAnnuaire();
  const param = useSearch().get('ressource');
  const choix = useMemo(() => (annuaire ? ressourcesChoisissables(annuaire) : []), [annuaire]);
  const { ressource, corrigee: ressourceCorrigee } = ressourceAffichee(param, choix, user);
  const prete = annuaire !== null;
  const aCorriger = prete && (corrigee || ressourceCorrigee);
  const nom = choix.find((e) => e.id === ressource)?.nom ?? '';
  const estSoi = ressource === null || ressource === user.id;
  const liste = (
    <Select
      label="Ressource"
      value={ressource === null ? '' : String(ressource)}
      onChange={(e) => {
        const cible = e.target.value === '' ? null : Number(e.target.value);
        navigate(adresseImputations(semaine, cible));
      }}
      options={optionsListeRessource(choix, ressource, prete)}
      disabled={!prete}
    />
  );
  return (
    <Layout titre={titreFeuille(nom, estSoi)} actions={liste}>
      <Onglets>
        <Redirect
          to={adresseImputations(semaine, param !== null && !ressourceCorrigee ? ressource : null)}
          when={aCorriger}
        />
        {!prete || aCorriger ? (
          <Chargement />
        ) : ressource === null ? (
          <Vide>{MESSAGE_CHOIX}</Vide>
        ) : (
          <Feuille
            key={ressource}
            semaine={semaine}
            aujourdhui={aujourdhui}
            ressourceId={estSoi ? null : ressource}
            ressource={ressource}
          />
        )}
      </Onglets>
    </Layout>
  );
}

function Feuille({
  semaine,
  aujourdhui,
  ressourceId,
  ressource,
}: {
  semaine: string;
  aujourdhui: string;
  ressourceId: number | null;
  ressource?: number;
}) {
  const suffixe = ressourceId === null ? '' : `&ressource_id=${ressourceId}`;
  const [vue, setVue] = useState<Vue | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [saisie, setSaisie] = useState<Saisie>({});
  const [retour, setRetour] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

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
    api<Vue>(`/api/feuilles?semaine=${semaine}${suffixe}`)
      .then((v) => !annule && adopter(v))
      .catch(() => !annule && setErreurChargement(true));
    return () => {
      annule = true;
    };
  }, [semaine, suffixe, adopter]);

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
    if (cible !== semaine) navigate(adresseImputations(cible, ressource ?? null));
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
        api<Vue>(`/api/feuilles?semaine=${semaine}${suffixe}`, {
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

      <GardeSortie modifie={modifiee} />
    </div>
  );
}
