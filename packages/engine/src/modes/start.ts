import { joursDepuis } from '../dates.js';
import type { Activite } from '../types.js';

/** START : le début au plus tôt ne précède pas le début validé (SPEC 5.6). */
export function plancherStart(plancher: number, act: Activite): number {
  return act.debutValide === undefined
    ? plancher
    : Math.max(plancher, joursDepuis(act.debutValide));
}
