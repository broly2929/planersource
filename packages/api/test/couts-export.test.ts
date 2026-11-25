// Lot couts, tranche 2 (D-229) : export des coûts. CEX-1 à CEX-4.
// Valeurs attendues recopiées de SPEC §12.4 (exemple d'export du projet de COUT-6) et §7 (format commun).
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import { creerMondeCouts, JOUR } from './couts-helpers.js';

const BOM = '﻿';
const EXEMPLE =
  BOM +
  [
    'WBS;Activité;OTP;Charge assignée;Charge réelle;Reste;Coût planifié;Coût imputé;Coût réel;Taux manquant',
    '1;P;OTP-A;7;0;7;3000;0;3000;oui',
    '1.1;F1;OTP-A;5;0;5;3000;0;3000;non',
    '1.2;F2;OTP-A;2;0;2;0;0;0;oui',
    'Total;;;7;0;7;3000;0;3000;oui',
  ]
    .map((l) => `${l}\r\n`)
    .join('');

describe('Lot couts-2 : export des coûts (SPEC §12.4)', () => {
  const ctx = useTestApp(() => JOUR);

  it("CEX-1 : l'administrateur reçoit l'exemple de §12.4, mot pour mot", async () => {
    const m = await creerMondeCouts(ctx);
    const res = await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/couts/export`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.body).toBe(EXEMPLE);
  });

  it('CEX-2 : en-têtes : text/csv UTF-8, fichier couts-<code>-AAAA-MM-JJ.csv en pièce jointe', async () => {
    const m = await creerMondeCouts(ctx);
    const res = await appel(ctx, m.chef).get(`/api/projets/${m.projet.id}/couts/export`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="couts-PCOUT-2027-01-15.csv"',
    );
  });

  it("CEX-3 : l'export ne modifie rien et ne contient aucune charge vendue", async () => {
    const m = await creerMondeCouts(ctx);
    await ctx.pool.query('UPDATE activite SET charge_vendue = 987.65 WHERE id = $1', [m.f1.id]);
    const avant = await ctx.pool.query('SELECT count(*)::int AS n FROM historique');
    const res = await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/couts/export`);
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('987');
    const apres = await ctx.pool.query('SELECT count(*)::int AS n FROM historique');
    expect(apres.rows).toEqual(avant.rows);
  });

  it('CEX-4 : activité sans OTP effectif : cellule OTP vide', async () => {
    const m = await creerMondeCouts(ctx);
    await ctx.pool.query('UPDATE projet SET otp = NULL WHERE id = $1', [m.projet.id]);
    const res = await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/couts/export`);
    expect(res.statusCode).toBe(200);
    expect(res.body.split('\r\n')[1]).toBe('1;P;;7;0;7;3000;0;3000;oui');
  });
});
