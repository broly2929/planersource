// Lot couts, tranche 2 (D-229) : visibilité des coûts. CVI-1 à CVI-5.
// Valeurs attendues recopiées de SPEC §12.3 point 7, §12.4 point 3 et de D-229 (2) (e).
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, liste } from './lot1-helpers.js';
import { empreinte } from './lot2a-helpers.js';
import { creerMondeCouts, JOUR } from './couts-helpers.js';

const CLES = ['cout_planifie', 'cout_impute', 'cout_reel', 'taux_manquant'];

describe('Lot couts-2 : visibilité des coûts (SPEC §12.3 point 7)', () => {
  const ctx = useTestApp(() => JOUR);

  it("CVI-1 : le Gantt porte les quatre clés pour l'administrateur et le chef (éléments et totaux), valeurs de COUT-6", async () => {
    const m = await creerMondeCouts(ctx);
    for (const qui of [m.admin, m.chef]) {
      const res = await appel(ctx, qui).get(`/api/projets/${m.projet.id}/gantt`);
      expect(res.statusCode, res.body).toBe(200);
      const g = corps(res) as {
        projet: { totaux: Record<string, unknown> };
        elements: Record<string, unknown>[];
      };
      const par = (id: number) => g.elements.find((e) => e.id === id)!;
      const cout = (e: Record<string, unknown>) => ({
        cout_planifie: e.cout_planifie,
        cout_impute: e.cout_impute,
        cout_reel: e.cout_reel,
        taux_manquant: e.taux_manquant,
      });
      expect(cout(par(m.f1.id))).toEqual({
        cout_planifie: 3000,
        cout_impute: 0,
        cout_reel: 3000,
        taux_manquant: false,
      });
      expect(cout(par(m.f2.id))).toEqual({
        cout_planifie: 0,
        cout_impute: 0,
        cout_reel: 0,
        taux_manquant: true,
      });
      expect(cout(par(m.p.id))).toEqual({
        cout_planifie: 3000,
        cout_impute: 0,
        cout_reel: 3000,
        taux_manquant: true,
      });
      expect(cout(g.projet.totaux)).toEqual({
        cout_planifie: 3000,
        cout_impute: 0,
        cout_reel: 3000,
        taux_manquant: true,
      });
    }
  });

  it('CVI-2 : sans peut_ecrire (chef en lecture seule ; le rôle ressource ne lit pas le projet, D-148), aucune des quatre clés : absentes, pas null', async () => {
    const m = await creerMondeCouts(ctx);
    for (const qui of [m.lecteur]) {
      const res = await appel(ctx, qui).get(`/api/projets/${m.projet.id}/gantt`);
      expect(res.statusCode, res.body).toBe(200);
      const g = corps(res) as {
        projet: Record<string, unknown>;
        elements: Record<string, unknown>[];
      };
      expect(g.projet.peut_ecrire).toBe(false);
      for (const e of g.elements) for (const c of CLES) expect(Object.keys(e)).not.toContain(c);
      for (const c of CLES) expect(JSON.stringify(g)).not.toContain(c);
    }
  });

  it("CVI-3 : l'OTP effectif est renvoyé à tout lecteur de l'élément (lecture seule comprise)", async () => {
    const m = await creerMondeCouts(ctx);
    for (const qui of [m.admin, m.lecteur]) {
      const res = await appel(ctx, qui).get(`/api/projets/${m.projet.id}/gantt`);
      const g = corps(res) as { elements: Record<string, unknown>[] };
      for (const e of g.elements)
        expect(e.otp_effectif, `${qui.email} ${String(e.nom)}`).toBe('OTP-A');
    }
  });

  it('CVI-4-r1 : export refusé : 401 sans session, puis 403 rôle ressource, 403 lecture seule, 403 chef d’un autre projet, 404 projet inconnu ; base inchangée', async () => {
    const m = await creerMondeCouts(ctx);
    const adresse = `/api/projets/${m.projet.id}/couts/export`;
    const avant = await empreinte(ctx);
    expect((await appel(ctx).get(adresse)).statusCode).toBe(401);
    expect((await appel(ctx, m.alice).get(adresse)).statusCode).toBe(403);
    expect((await appel(ctx, m.lecteur).get(adresse)).statusCode).toBe(403);
    // Révision D-265 (4) : projet lisible pour l'autre chef, en lecture seule → 403.
    expect((await appel(ctx, m.autreChef).get(adresse)).statusCode).toBe(403);
    expect((await appel(ctx, m.admin).get('/api/projets/999999/couts/export')).statusCode).toBe(
      404,
    );
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CVI-5 : les listes habituelles (activités) ne portent pas les clés de coût sans peut_ecrire', async () => {
    const m = await creerMondeCouts(ctx);
    const res = await appel(ctx, m.lecteur).get(`/api/projets/${m.projet.id}/activites`);
    expect(res.statusCode).toBe(200);
    for (const a of liste(res)) for (const c of CLES) expect(Object.keys(a)).not.toContain(c);
  });
});
