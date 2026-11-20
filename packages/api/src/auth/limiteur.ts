// Limiteur des tentatives de connexion (D-140 (3)) : module pur, sans dépendance, horloge injectée.
// Fenêtre fixe de 15 min ouverte au premier échec ; 5 échecs par (IP, identifiant), 50 par IP.

const FENETRE_MS = 15 * 60 * 1000;
const MAX_PAR_CLE = 5;
const MAX_PAR_IP = 50;

export interface Verdict {
  bloque: boolean;
  /** Secondes restantes avant la fin de la fenêtre, arrondi au-dessus (0 si libre). */
  retryAfter: number;
}

export interface Limiteur {
  /** Verdict pour une tentative ; ne crée aucune entrée. */
  verifier(ip: string, identifiant: string): Verdict;
  /** Compte un échec (sans effet sur une entrée déjà au maximum : la fenêtre n'est pas prolongée). */
  echec(ip: string, identifiant: string): void;
  /** Remet à zéro la clé (IP, identifiant) seulement. */
  succes(ip: string, identifiant: string): void;
  /** Nombre d'entrées conservées (clés et IP). */
  taille(): number;
}

interface Entree {
  debut: number;
  echecs: number;
}

export function creerLimiteur(maintenant: () => number): Limiteur {
  const parCle = new Map<string, Entree>();
  const parIp = new Map<string, Entree>();
  const cle = (ip: string, identifiant: string) => `${ip}\u0000${identifiant}`;

  const purger = (table: Map<string, Entree>, t: number) => {
    for (const [k, e] of table) if (t - e.debut >= FENETRE_MS) table.delete(k);
  };
  const purgerTout = (t: number) => {
    purger(parCle, t);
    purger(parIp, t);
  };
  const restant = (e: Entree | undefined, max: number, t: number): number =>
    e && e.echecs >= max ? Math.ceil((e.debut + FENETRE_MS - t) / 1000) : 0;
  const compter = (table: Map<string, Entree>, k: string, max: number, t: number) => {
    const e = table.get(k);
    if (!e) table.set(k, { debut: t, echecs: 1 });
    else if (e.echecs < max) e.echecs += 1;
  };

  return {
    verifier(ip, identifiant) {
      const t = maintenant();
      purgerTout(t);
      const retryAfter = Math.max(
        restant(parCle.get(cle(ip, identifiant)), MAX_PAR_CLE, t),
        restant(parIp.get(ip), MAX_PAR_IP, t),
      );
      return { bloque: retryAfter > 0, retryAfter };
    },
    echec(ip, identifiant) {
      const t = maintenant();
      purgerTout(t);
      compter(parCle, cle(ip, identifiant), MAX_PAR_CLE, t);
      compter(parIp, ip, MAX_PAR_IP, t);
    },
    succes(ip, identifiant) {
      parCle.delete(cle(ip, identifiant));
    },
    taille() {
      return parCle.size + parIp.size;
    },
  };
}
