/** Un seul geste à la fois sur la page : barres, connecteurs et lignes du tableau (D-108 (5)). */
let prise = false;

export const verrou = {
  libre: () => !prise,
  /** Prend le verrou ; false s'il est déjà pris. */
  prendre: () => {
    if (prise) return false;
    prise = true;
    return true;
  },
  rendre: () => {
    prise = false;
  },
};
