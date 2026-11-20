// Lot 5b, limiteur de tentatives de connexion (D-140 (3)) : LIM-1 à LIM-7.
// Module pur `auth/limiteur.ts`, horloge injectée. Import dynamique : le module n'existe pas
// encore en phase rouge (le typecheck ne doit pas échouer sur un import absent).
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

interface Verdict {
  bloque: boolean;
  retryAfter: number;
}
interface Limiteur {
  verifier(ip: string, identifiant: string): Verdict;
  echec(ip: string, identifiant: string): void;
  succes(ip: string, identifiant: string): void;
  taille(): number;
}
type Creer = (maintenant: () => number) => Limiteur;

const CHEMIN = fileURLToPath(new URL('../src/auth/limiteur.ts', import.meta.url));
const QUINZE_MIN = 15 * 60 * 1000;
const IP = '10.0.0.1';

describe('Limiteur de tentatives de connexion (D-140 (3))', () => {
  let t = 0;
  let creer: Creer;
  let lim: Limiteur;

  beforeEach(async () => {
    t = 1_000_000;
    const module = (await import(/* @vite-ignore */ CHEMIN)) as { creerLimiteur: Creer };
    creer = module.creerLimiteur;
    lim = creer(() => t);
  });

  const echecs = (n: number, ip = IP, id = 'a') => {
    for (let i = 0; i < n; i += 1) lim.echec(ip, id);
  };

  it('LIM-1 : 5 échecs → bloqué avec délai restant (arrondi au-dessus) ; 4 échecs → libre', () => {
    echecs(4);
    expect(lim.verifier(IP, 'a').bloque).toBe(false);
    echecs(1);
    t += 100;
    expect(lim.verifier(IP, 'a')).toEqual({ bloque: true, retryAfter: 900 });
    t += 59_900;
    expect(lim.verifier(IP, 'a')).toEqual({ bloque: true, retryAfter: 840 });
  });

  it('LIM-2 : débloqué 15 min après le 1er échec ; nouvelle fenêtre au échec suivant', () => {
    echecs(5);
    t += QUINZE_MIN - 1;
    expect(lim.verifier(IP, 'a').bloque).toBe(true);
    t += 1;
    expect(lim.verifier(IP, 'a').bloque).toBe(false);
    echecs(4);
    expect(lim.verifier(IP, 'a').bloque).toBe(false);
    echecs(1);
    expect(lim.verifier(IP, 'a').bloque).toBe(true);
  });

  it('LIM-3 : un succès remet à zéro la clé (ip, identifiant), pas le compteur de l’IP', () => {
    echecs(4);
    lim.succes(IP, 'a');
    echecs(4);
    expect(lim.verifier(IP, 'a').bloque).toBe(false);

    const autre = creer(() => t);
    for (let i = 0; i < 3; i += 1) autre.echec(IP, 'a');
    autre.succes(IP, 'a');
    for (let i = 0; i < 47; i += 1) autre.echec(IP, `id-${i}`);
    expect(autre.verifier(IP, 'neuf').bloque).toBe(true);
  });

  it('LIM-4 : un autre identifiant ou une autre IP n’est pas bloqué', () => {
    echecs(5);
    expect(lim.verifier(IP, 'a').bloque).toBe(true);
    expect(lim.verifier(IP, 'b').bloque).toBe(false);
    expect(lim.verifier('10.0.0.2', 'a').bloque).toBe(false);
  });

  it('LIM-5 : 50 échecs d’identifiants distincts → IP bloquée ; 49 → libre', () => {
    for (let i = 0; i < 49; i += 1) lim.echec(IP, `id-${i}`);
    expect(lim.verifier(IP, 'neuf').bloque).toBe(false);
    lim.echec(IP, 'id-49');
    const v = lim.verifier(IP, 'neuf');
    expect(v.bloque).toBe(true);
    expect(v.retryAfter).toBeGreaterThan(0);
    expect(lim.verifier('10.0.0.2', 'neuf').bloque).toBe(false);
  });

  it('LIM-6 : une tentative bloquée ne prolonge pas la fenêtre', () => {
    echecs(5);
    t += 10 * 60 * 1000;
    expect(lim.verifier(IP, 'a').bloque).toBe(true);
    lim.echec(IP, 'a');
    expect(lim.verifier(IP, 'a').bloque).toBe(true);
    t += 5 * 60 * 1000;
    expect(lim.verifier(IP, 'a').bloque).toBe(false);
  });

  it('LIM-7 : les entrées expirées sont purgées', () => {
    lim.echec(IP, 'a');
    lim.echec(IP, 'b');
    lim.echec(IP, 'c');
    expect(lim.taille()).toBe(4);
    t += QUINZE_MIN;
    lim.verifier(IP, 'z');
    expect(lim.taille()).toBe(0);
  });
});
