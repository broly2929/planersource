// Journal des suites complètes (D-193 (4)) : docs/journal-suites.jsonl, suivi par git, ajout seulement.
// Une ligne JSON par évènement : `debut` avant le lancement, `fin` après. Le compte des suites d'un lot
// est le nombre de lignes `debut` : une suite interrompue compte.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

export class SuiteRefusee extends Error {
  constructor(message) {
    super(message);
    this.name = 'SuiteRefusee';
  }
}

function lignes(chemin) {
  if (!existsSync(chemin)) return [];
  return readFileSync(chemin, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '');
}

/** Nom de lot normalisé (D-194 (5)) : minuscules, espaces retirés. */
export function normaliserLot(lot) {
  return String(lot).toLowerCase().replace(/\s+/g, '');
}

export function lireJournal(chemin) {
  return lignes(chemin).map((l) => JSON.parse(l));
}

/** Lignes brutes du journal pour ce lot, dans l'ordre. */
export function lignesDuLot(chemin, lot) {
  const cible = normaliserLot(lot);
  return lignes(chemin).filter((l) => normaliserLot(JSON.parse(l).lot ?? '') === cible);
}

/** Lève SuiteRefusee si le lot a déjà une suite au journal et que la justification est vide. */
export function verifierLot(chemin, lot, justification) {
  const cible = normaliserLot(lot);
  const debuts = lireJournal(chemin).filter(
    (e) => e.evenement === 'debut' && normaliserLot(e.lot ?? '') === cible,
  );
  if (debuts.length === 0) return;
  if (typeof justification === 'string' && justification.trim() !== '') return;
  const deja = debuts.map((d) => `${d.date} ${d.commit}`).join(' ; ');
  throw new SuiteRefusee(
    `Le lot « ${cible} » a déjà ${debuts.length} suite(s) complète(s) au journal (${deja}). ` +
      'Une suite de plus exige --justification "<texte>" (D-193 (4)).',
  );
}

/** Ajoute une ligne JSON terminée par un saut de ligne, sans toucher aux octets existants. */
export function ajouterEvenement(chemin, evenement) {
  const brut = existsSync(chemin) ? readFileSync(chemin, 'utf8') : '';
  const prefixe = brut !== '' && !brut.endsWith('\n') ? '\n' : '';
  appendFileSync(chemin, `${prefixe}${JSON.stringify(evenement)}\n`);
}

const arrondi = (ms) => Math.round(ms / 100) / 10;

export async function executerSuite({
  chemin,
  lot,
  justification,
  commit,
  arbrePropre,
  runner,
  horloge = () => performance.now(),
  date = () => new Date().toISOString(),
}) {
  lot = normaliserLot(lot);
  verifierLot(chemin, lot, justification);
  if (runner.preControle) {
    // D-198 (1) : avant la ligne `debut` ; un échec ne consomme pas la suite.
    const rp = await runner.preControle();
    if (rp.code !== 0) {
      return {
        code: 1,
        resultat: 'pré-contrôle en échec',
        message:
          'Pré-contrôle en échec : un test structurel rapide est rouge (D-198 (1)). ' +
          'Aucune suite lancée, journal inchangé ; corriger puis relancer.' +
          (rp.sortie ? `\n${rp.sortie}` : ''),
      };
    }
  }
  const texte = typeof justification === 'string' ? justification.trim() : '';
  ajouterEvenement(chemin, {
    evenement: 'debut',
    date: date(),
    commit,
    arbre_propre: arbrePropre,
    lot,
    ...(texte === '' ? {} : { justification: texte }),
  });

  const vitest = { statut: 'non lancé', duree_s: 0 };
  const e2e = { statut: 'non lancé', duree_s: 0 };
  let courant = vitest;
  let resultat = 'vert';
  try {
    const t0 = horloge();
    const rv = await runner.vitest();
    vitest.duree_s = arrondi(horloge() - t0);
    vitest.statut = rv.code === 0 ? 'vert' : 'rouge';
    if (rv.code !== 0) {
      resultat = 'échec vitest';
    } else {
      courant = e2e;
      const t1 = horloge();
      const re = await runner.e2e();
      e2e.duree_s = arrondi(horloge() - t1);
      e2e.statut = re.code === 0 ? 'vert' : 'rouge';
      if (re.code !== 0) resultat = 'échec e2e';
    }
  } catch {
    courant.statut = 'interrompu';
    resultat = 'interrompu';
  }
  ajouterEvenement(chemin, { evenement: 'fin', date: date(), commit, lot, vitest, e2e, resultat });
  return { code: resultat === 'vert' ? 0 : 1, resultat };
}
