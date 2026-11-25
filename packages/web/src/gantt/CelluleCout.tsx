import { formatMontant } from '../couts';

/** Marque « incomplet » d'un coût dont un taux manque (D-229, SPEC §12.4 point 1). */
export function MarqueIncomplet() {
  return (
    <span
      title="Taux manquant"
      className="ml-1 text-petit font-semibold whitespace-nowrap text-flag"
    >
      incomplet
    </span>
  );
}

/** Montant « 1 234,50 € », suivi de la marque « incomplet » si un taux manque ; vide si le coût est absent. */
export function CelluleCout({
  montant,
  manquant,
}: {
  montant: number | undefined;
  manquant: boolean | undefined;
}) {
  if (montant === undefined) return null;
  return (
    <>
      {formatMontant(montant)}
      {manquant && <MarqueIncomplet />}
    </>
  );
}
