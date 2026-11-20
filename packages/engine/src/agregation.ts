export interface Dates {
  debut: number;
  fin: number;
}

export interface Charges {
  charge: number;
  reel: number;
  reste: number;
}

/** Plus petit début et plus grande fin ; null sans date. */
export function agregerDates(ds: readonly Dates[]): Dates | null {
  if (ds.length === 0) return null;
  return { debut: Math.min(...ds.map((d) => d.debut)), fin: Math.max(...ds.map((d) => d.fin)) };
}

export function sommerCharges(cs: readonly Charges[]): Charges {
  return {
    charge: cs.reduce((s, c) => s + c.charge, 0),
    reel: cs.reduce((s, c) => s + c.reel, 0),
    reste: cs.reduce((s, c) => s + c.reste, 0),
  };
}

/** Avancement en centièmes de % : 10000 × réel ÷ (réel + reste), demi supérieur ; null si le total est nul. */
export function avancement(reel: number, reste: number): number | null {
  const total = reel + reste;
  if (total === 0) return null;
  return Math.floor((20000 * reel + total) / (2 * total));
}
