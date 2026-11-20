import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { api, ApiError } from '../api';
import { useAnnuaire } from '../annuaire';
import { Button } from '../components/Button';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Link, navigate, useSearch } from '../router';
import { useListe } from './projet/commun';
import { caseSuivante, toucheGrille, type CaseGrille } from './planning-manuel-clavier';
import { caseDesactivee } from './planning-manuel-jours';

interface Projet {
  id: number;
  peut_ecrire: boolean;
}
interface LignePlanning {
  id: number;
  parent_id: number | null;
}
interface ActiviteApi {
  id: number;
  nom: string;
  mode: string;
  close: boolean;
}
interface AssignationApi {
  id: number;
  activite_id: number;
  ressource_id: number;
}
interface Saisie {
  assignation_id: number;
  jour: string;
  demi_journee: 'matin' | 'apres_midi';
}

const MOIS_VALIDE = /^(20\d{2})-(0[1-9]|1[0-2])$/;
const INITIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DEMIS = [
  { cle: 'matin', libelle: 'matin' },
  { cle: 'apres_midi', libelle: 'après-midi' },
] as const;

/** Bornes du mois des saisies (D-060 2). */
const MOIS_MIN = '2000-01';
const MOIS_MAX = '2099-12';

const deuxChiffres = (n: number) => String(n).padStart(2, '0');

/** Mois courant du navigateur, au format AAAA-MM. */
function moisCourant(): string {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${deuxChiffres(maintenant.getMonth() + 1)}`;
}

function decalerMois(mois: string, delta: number): string {
  const [a, m] = mois.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}`;
}

const nomMois = (mois: string) =>
  new Date(`${mois}-01T00:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' });

/** Jours du mois : numéro, initiale, week-end ou non, date ISO. */
function joursDuMois(mois: string) {
  const [a, m] = mois.split('-').map(Number) as [number, number];
  const nombre = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: nombre }, (_, i) => {
    const numero = i + 1;
    const semaine = new Date(Date.UTC(a, m - 1, numero)).getUTCDay();
    return {
      numero,
      initiale: INITIALES[semaine]!,
      weekend: semaine === 0 || semaine === 6,
      iso: `${mois}-${deuxChiffres(numero)}`,
    };
  });
}

const cle = (assignation: number, jour: string, demi: string) => `${assignation}|${jour}|${demi}`;

const formaterJours = (demis: number) => String(demis / 2).replace('.', ',');

function messageEchec(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Vous n’avez pas le droit de modifier ces saisies.';
    if (err.status === 422 && err.code === 'jour_non_ouvre') {
      return 'Ce jour n’est pas ouvré pour la ressource.';
    }
    if (err.status === 422) return 'Ces saisies enfreignent une règle du planning.';
  }
  return 'Enregistrement impossible pour le moment. Réessayez.';
}

function Grille({
  activite,
  assignations,
  mois,
  lectureSeule,
  projetId,
}: {
  activite: ActiviteApi;
  assignations: AssignationApi[];
  mois: string;
  lectureSeule: boolean;
  projetId: string;
}) {
  const annuaire = useAnnuaire();
  const [etat, recharger] = useListe<{ saisies: Saisie[] }>(
    `/api/activites/${activite.id}/saisies?mois=${mois}`,
  );
  // Jours non ouvrés de chaque ressource (D-123 (8)) ; un échec est traité comme celui des saisies (D-127 (1)).
  const [jours, rechargerJours] = useListe<{
    jours_non_ouvres: { assignation_id: number; jours: string[] }[];
  }>(`/api/activites/${activite.id}/jours-non-ouvres?mois=${mois}`);
  if (etat.statut === 'chargement' || jours.statut === 'chargement') {
    return <Chargement libelle="Chargement des saisies…" />;
  }
  if (etat.statut === 'erreur' || jours.statut === 'erreur') {
    return (
      <div className="flex flex-col gap-4">
        <Notification type="erreur">Impossible de charger les saisies.</Notification>
        <div>
          <Button
            variante="secondaire"
            onClick={() => {
              if (etat.statut === 'erreur') recharger();
              if (jours.statut === 'erreur') rechargerJours();
            }}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }
  return (
    <GrilleChargee
      activite={activite}
      assignations={assignations}
      mois={mois}
      lectureSeule={lectureSeule}
      projetId={projetId}
      charge={etat.donnees.saisies}
      nonOuvres={
        new Map(jours.donnees.jours_non_ouvres.map((e) => [e.assignation_id, new Set(e.jours)]))
      }
      annuaire={annuaire}
    />
  );
}

function GrilleChargee({
  activite,
  assignations,
  mois,
  lectureSeule,
  projetId,
  charge,
  nonOuvres,
  annuaire,
}: {
  activite: ActiviteApi;
  assignations: AssignationApi[];
  mois: string;
  lectureSeule: boolean;
  projetId: string;
  charge: Saisie[];
  nonOuvres: Map<number, Set<string>>;
  annuaire: ReturnType<typeof useAnnuaire>;
}) {
  const initial = new Set(charge.map((s) => cle(s.assignation_id, s.jour, s.demi_journee)));
  const [reference, setReference] = useState(initial);
  const [courant, setCourant] = useState(initial);
  const [enCours, setEnCours] = useState(false);
  const [retour, setRetour] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);
  // Un seul arrêt de tabulation (D-114 (6)) : la case courante, remise à la première au changement de mois.
  const [courante, setCourante] = useState<CaseGrille>({ ligne: 0, jour: 1, demi: 'matin' });
  const casesRef = useRef(new Map<string, HTMLInputElement>());

  const modifie = courant.size !== reference.size || [...courant].some((c) => !reference.has(c));
  const jours = joursDuMois(mois);
  const nom = (ressourceId: number) => annuaire?.find((u) => u.id === ressourceId)?.nom ?? '…';
  const [annee] = mois.split('-');
  const libelleMois = nomMois(mois);

  const basculer = (k: string, coche: boolean) => {
    setRetour(null);
    setCourant((precedent) => {
      const suivant = new Set(precedent);
      if (coche) suivant.add(k);
      else suivant.delete(k);
      return suivant;
    });
  };

  const surTouche = (e: KeyboardEvent<HTMLInputElement>, depart: CaseGrille) => {
    const touche = toucheGrille(e.key);
    if (touche === null || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    const suivante = caseSuivante(depart, touche, assignations.length, jours.length);
    setCourante(suivante);
    casesRef.current.get(`${suivante.ligne}|${suivante.jour}|${suivante.demi}`)?.focus();
  };

  const enregistrer = async () => {
    setRetour(null);
    setEnCours(true);
    const saisies: Saisie[] = [...courant].map((k) => {
      const [a, jour, demi] = k.split('|') as [string, string, Saisie['demi_journee']];
      return { assignation_id: Number(a), jour, demi_journee: demi };
    });
    try {
      await api(`/api/activites/${activite.id}/saisies?mois=${mois}`, {
        method: 'PUT',
        body: { saisies },
      });
      setReference(courant);
      setRetour({ type: 'succes', texte: 'Saisies enregistrées.' });
    } catch (err) {
      setRetour({ type: 'erreur', texte: messageEchec(err) });
    } finally {
      setEnCours(false);
    }
  };

  const allerAuMois = (delta: number) =>
    navigate(
      `/projets/${projetId}/planning-manuel/${activite.id}?mois=${decalerMois(mois, delta)}`,
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variante="secondaire"
            disabled={modifie || mois <= MOIS_MIN}
            onClick={() => allerAuMois(-1)}
          >
            <ChevronLeft aria-hidden className="size-4" />
            Mois précédent
          </Button>
          <h2 className="min-w-40 text-center text-titre font-semibold first-letter:uppercase">
            {libelleMois} {annee}
          </h2>
          <Button
            variante="secondaire"
            disabled={modifie || mois >= MOIS_MAX}
            onClick={() => allerAuMois(1)}
          >
            Mois suivant
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
        {!lectureSeule && (
          <div className="flex items-center gap-2">
            <Button
              variante="secondaire"
              disabled={!modifie || enCours}
              onClick={() => {
                setCourant(reference);
                setRetour(null);
              }}
            >
              Annuler
            </Button>
            <Button disabled={!modifie} enCours={enCours} onClick={() => void enregistrer()}>
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      {retour && <Notification type={retour.type}>{retour.texte}</Notification>}

      <div className="overflow-x-auto rounded-ui border border-gray-200 bg-white shadow-ui">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            {`Saisies de ${activite.nom}, ${libelleMois} ${annee}`}
          </caption>
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-40 border-r border-b border-gray-200 bg-gray-100 px-3 py-2 font-semibold whitespace-nowrap"
              >
                Ressource
              </th>
              {jours.map((j) => (
                <th
                  key={j.iso}
                  scope="col"
                  className={`w-6 min-w-6 border-b border-gray-200 px-1 py-2 text-center font-semibold ${
                    j.weekend ? 'bg-gray-200' : ''
                  }`}
                >
                  <span className="block">{j.numero}</span>
                  <span className="block text-petit font-normal text-gray-600">{j.initiale}</span>
                </th>
              ))}
              <th
                scope="col"
                className="sticky right-0 z-10 border-b border-l border-gray-200 bg-gray-100 px-3 py-2 text-right font-semibold whitespace-nowrap"
              >
                Total du mois (jours)
              </th>
            </tr>
          </thead>
          <tbody>
            {assignations.map((a, ligne) => {
              const ressource = nom(a.ressource_id);
              const demis = [...courant].filter((k) => k.startsWith(`${a.id}|`)).length;
              return (
                <tr key={a.id} className="border-b border-gray-200 last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-40 border-r border-gray-200 bg-white px-3 py-2 font-semibold whitespace-nowrap"
                  >
                    {ressource}
                  </th>
                  {jours.map((j) => (
                    <td
                      key={j.iso}
                      className={`px-1 py-1 text-center ${j.weekend ? 'bg-gray-100' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {DEMIS.map((d) => {
                          const k = cle(a.id, j.iso, d.cle);
                          const ici: CaseGrille = { ligne, jour: j.numero, demi: d.cle };
                          const inactive = caseDesactivee({
                            lectureSeule,
                            nonOuvre: nonOuvres.get(a.id)?.has(j.iso) ?? false,
                            cochee: courant.has(k),
                          });
                          const estCourante =
                            courante.ligne === ligne &&
                            courante.jour === j.numero &&
                            courante.demi === d.cle;
                          return (
                            <input
                              key={d.cle}
                              ref={(el) => {
                                const clef = `${ligne}|${j.numero}|${d.cle}`;
                                if (el) casesRef.current.set(clef, el);
                                else casesRef.current.delete(clef);
                              }}
                              {...(lectureSeule ? {} : { tabIndex: estCourante ? 0 : -1 })}
                              onFocus={() => setCourante(ici)}
                              onKeyDown={(e) => surTouche(e, ici)}
                              type="checkbox"
                              className={`size-4 accent-accent ${inactive && !lectureSeule ? 'cursor-not-allowed opacity-50' : ''}`}
                              {...(inactive && !lectureSeule ? { 'aria-disabled': true } : {})}
                              aria-label={`${ressource}, ${j.numero} ${libelleMois}, ${d.libelle}`}
                              checked={courant.has(k)}
                              disabled={lectureSeule}
                              onClick={(e) => {
                                setCourante(ici);
                                if (inactive) e.preventDefault();
                              }}
                              onChange={(e) => {
                                if (!inactive) basculer(k, e.target.checked);
                              }}
                            />
                          );
                        })}
                      </div>
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 border-l border-gray-200 bg-white px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {formaterJours(demis)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-petit text-gray-600">
        Première case de chaque jour : matin, seconde : après-midi. Chaque case compte 0,5 jour.
      </p>
    </div>
  );
}

/** Écran « Planning manuel » (D-060) : saisie des demi-journées d'une activité MAN, par mois. */
export function PlanningManuel({ projetId, activiteId }: { projetId: string; activiteId: string }) {
  const recherche = useSearch().get('mois') ?? '';
  const mois = MOIS_VALIDE.test(recherche) ? recherche : moisCourant();
  const base = `/api/projets/${projetId}`;
  const [projet] = useListe<Projet>(base);
  const [planning] = useListe<LignePlanning[]>(`${base}/planning`);
  const [activites] = useListe<ActiviteApi[]>(`${base}/activites`);
  const [assignations] = useListe<AssignationApi[]>(`${base}/assignations`);

  const etats = [projet, planning, activites, assignations];
  const activite =
    activites.statut === 'ok'
      ? activites.donnees.find((a) => String(a.id) === activiteId)
      : undefined;
  const titre = activite ? `Planning manuel : ${activite.nom}` : 'Planning manuel';

  let contenu;
  if (etats.some((e) => e.statut === 'erreur')) {
    contenu = (
      <Notification type="erreur">
        {projet.statut === 'erreur'
          ? 'Projet introuvable ou inaccessible.'
          : 'Impossible de charger les données de l’activité.'}
      </Notification>
    );
  } else if (etats.some((e) => e.statut === 'chargement')) {
    contenu = <Chargement libelle="Chargement du planning manuel…" />;
  } else if (
    projet.statut !== 'ok' ||
    planning.statut !== 'ok' ||
    assignations.statut !== 'ok' ||
    !activite
  ) {
    contenu = <Notification type="erreur">Activité introuvable.</Notification>;
  } else {
    const parente = planning.donnees.some((l) => l.parent_id === activite.id);
    const propres = assignations.donnees.filter((a) => a.activite_id === activite.id);
    const lectureSeule = !projet.donnees.peut_ecrire || activite.close;
    if (activite.mode !== 'MAN' || parente) {
      contenu = <Vide>{"Cette activité n'est pas en planning manuel."}</Vide>;
    } else if (propres.length === 0) {
      contenu = <Vide>Cette activité n’a aucune assignation : rien à saisir.</Vide>;
    } else {
      contenu = (
        <div className="flex flex-col gap-4">
          {activite.close && <p className="font-semibold text-gray-800">Activité close</p>}
          <Grille
            key={mois}
            activite={activite}
            assignations={propres}
            mois={mois}
            lectureSeule={lectureSeule}
            projetId={projetId}
          />
          <p className="text-gray-600">Les saisies sont prises en compte au prochain calcul.</p>
        </div>
      );
    }
  }

  return (
    <Layout titre={titre}>
      <div className="flex flex-col gap-4">
        <div>
          <Link
            to={`/projets/${projetId}`}
            className="text-accent underline hover:text-accent-hover"
          >
            Retour au projet
          </Link>
        </div>
        {contenu}
      </div>
    </Layout>
  );
}
