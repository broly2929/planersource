// Garde-fou de base de test (D-193 (1), (2)). Module unique : tout point d'entrée qui touche une base
// de test passe par lui. Il agit sur la seule chaîne de l'URL, avant toute connexion.
export const SUFFIXE_BASE_TEST = '_test';

export class GardeBaseTestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GardeBaseTestError';
  }
}

const REGLE = `le nom de la base doit finir par ${SUFFIXE_BASE_TEST}, précédé d'un préfixe (D-193 (1))`;

function refus(nomVariable, detail) {
  return new GardeBaseTestError(`Garde-fou base de test : ${nomVariable} ${detail} ; ${REGLE}.`);
}

/** Renvoie `valeur` inchangée si elle désigne une base de test ; sinon lève GardeBaseTestError. */
export function verifierBaseTest(valeur, nomVariable = 'TEST_DATABASE_URL') {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw refus(nomVariable, 'est absente ou vide');
  }
  let nom;
  try {
    nom = decodeURIComponent(new URL(valeur).pathname.slice(1));
  } catch {
    throw refus(nomVariable, "n'est pas une URL de connexion lisible");
  }
  if (!nom.endsWith(SUFFIXE_BASE_TEST) || nom.length === SUFFIXE_BASE_TEST.length) {
    throw refus(nomVariable, `désigne la base « ${nom} »`);
  }
  return valeur;
}

/** Lit la variable `nomVariable` de `env` (jamais de repli sur une autre) et la vérifie. */
export function exigerBaseTest(env = process.env, nomVariable = 'TEST_DATABASE_URL') {
  return verifierBaseTest(env[nomVariable], nomVariable);
}
