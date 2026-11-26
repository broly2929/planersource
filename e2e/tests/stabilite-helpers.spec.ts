// Aides de synchronisation des e2e sur un état observable (lot robustesse-tests, D-197). STB-1, STB-2.
// Base « administrateur seul » avant et après chaque test.
import { expect, test } from '@playwright/test';
import pg from 'pg';
import { exigerBaseTest } from '../../scripts/lib/garde-base-test.mjs';
import { E2E_ADMIN } from './credentials.js';
import { loginAsAdmin } from './helpers.js';
import { remettreAdminSeul } from './lot3c-helpers.js';
import { H14, remettreAdminSeul4b } from './lot4b-helpers.js';
import { ouvrirEquipes, remettreAdminSeul6a } from './lot6a-helpers.js';
import { confirmation, dialogueNomme, rester } from './garde-dialogue-helpers.js';
import { cliquerDansConfirmation, saisirParGeste } from './stabilite-helpers.js';

test.beforeEach(async ({ page }) => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
  await page.clock.setFixedTime(H14);
  await page.setViewportSize({ width: 1440, height: 800 });
});
test.afterEach(async () => {
  await remettreAdminSeul4b();
  await remettreAdminSeul6a();
});

test('STB-1 : saisirParGeste : le champ est focalisé par un clic réel, puis porte la valeur saisie', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  const nom = dialogue.getByLabel('Nom');
  await saisirParGeste(nom, 'Équipe STB1');
  await expect(nom).toBeFocused();
  await expect(nom).toHaveValue('Équipe STB1');
  // La saisie est un geste réel : Échap ouvre la confirmation, focus sur « Annuler ».
  await page.keyboard.press('Escape');
  await expect(confirmation(page)).toBeVisible();
});

test('STB-2 : cliquerDansConfirmation : attend la confirmation visible et le focus sur « Annuler » avant le clic ; « Abandonner » ferme le dialogue', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await ouvrirEquipes(page);
  await page.getByRole('button', { name: 'Nouvelle équipe' }).click();
  const dialogue = dialogueNomme(page, 'Nouvelle équipe');
  await saisirParGeste(dialogue.getByLabel('Nom'), 'Équipe STB2');
  await page.keyboard.press('Escape');
  await cliquerDansConfirmation(
    confirmation(page),
    confirmation(page).getByRole('button', { name: 'Abandonner', exact: true }),
    rester(page),
  );
  await expect(confirmation(page)).toHaveCount(0);
  await expect(dialogue).toHaveCount(0);
});

// STB-3 (D-262 (7), RCI-3) : sans navigateur, client `pg` direct sur la base du worker. Ordre forcé par
// `pg_locks` : A tient `assignation` (UPDATE), le TRUNCATE de `remettreAdminSeul` attend `assignation`,
// puis A écrit dans `historique` (déjà tenu par le TRUNCATE) : cycle, comme PATCH /api/assignations/:id.
test('STB-3-r1 : remettreAdminSeul : transaction concurrente qui tient assignation puis écrit historique ; remise à zéro réussie, base « administrateur seul »', async () => {
  const url = exigerBaseTest(process.env);
  const un = async (c: pg.Client, sql: string, p: unknown[] = []) =>
    (await c.query<{ id: number }>(sql, p)).rows[0]!.id;
  const prep = new pg.Client({ connectionString: url });
  const a = new pg.Client({ connectionString: url });
  await prep.connect();
  await a.connect();
  let aOuverte = false;
  try {
    const chef = await un(
      prep,
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, est_ressource, capacite, actif)
       VALUES ('Chef STB3', 'chef-stb3@example.test', 'x', 'chef_de_projet', true, 1, true)
       RETURNING id`,
    );
    const projet = await un(
      prep,
      `INSERT INTO projet (code, nom, chef_id, date_debut)
       VALUES ('STB3', 'STB3', $1, '2027-01-04') RETURNING id`,
      [chef],
    );
    const element = await un(
      prep,
      `INSERT INTO element (projet_id, type, rang, nom)
       VALUES ($1, 'activite', 1, 'A') RETURNING id`,
      [projet],
    );
    await prep.query('INSERT INTO activite (id) VALUES ($1)', [element]);
    await prep.query('INSERT INTO affectation_projet (projet_id, ressource_id) VALUES ($1, $2)', [
      projet,
      chef,
    ]);
    const assignation = await un(
      prep,
      `INSERT INTO assignation (activite_id, projet_id, ressource_id, charge_assignee, reste_a_faire)
       VALUES ($1, $2, $3, 1, 1) RETURNING id`,
      [element, projet, chef],
    );
    const pidA = (await a.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;

    // 1. A tient `assignation` par une écriture réelle.
    await a.query('BEGIN');
    aOuverte = true;
    await a.query('UPDATE assignation SET charge_assignee = 2 WHERE id = $1', [assignation]);

    // 2. Remise à zéro lancée, non attendue ; son issue est capturée (aucune erreur non attrapée).
    const remise = remettreAdminSeul().then(
      () => ({ ok: true as const }),
      (e: { code?: string; message?: string }) => ({ ok: false, code: e.code, message: e.message }),
    );

    // 3. Point de synchronisation : la session du helper attend `assignation`, bloquée par A.
    await expect
      .poll(
        async () =>
          (
            await prep.query(
              `SELECT 1 FROM pg_locks
                WHERE relation = 'assignation'::regclass AND mode = 'AccessExclusiveLock'
                  AND NOT granted AND $1 = ANY (pg_blocking_pids(pid))`,
              [pidA],
            )
          ).rowCount,
        { intervals: [10], timeout: 10_000 },
      )
      .toBe(1);

    // 4. A écrit dans `historique`, tenu par le TRUNCATE ; issue capturée, puis COMMIT ou ROLLBACK.
    const issueA = a
      .query(
        `INSERT INTO historique (utilisateur_id, entite, entite_id, projet_id, operation, champ,
                                 ancienne_valeur, nouvelle_valeur)
         VALUES ($1, 'assignation', $2, $3, 'modification', 'charge_assignee', '1', '2')`,
        [chef, assignation, projet],
      )
      .then(
        async () => {
          await a.query('COMMIT');
          aOuverte = false;
          return 'validee';
        },
        async () => {
          await a.query('ROLLBACK');
          aOuverte = false;
          return 'annulee';
        },
      );

    expect(await remise).toEqual({ ok: true });
    expect(['validee', 'annulee']).toContain(await issueA);
    const compte = async (sql: string) => Number((await prep.query<{ n: string }>(sql)).rows[0]!.n);
    expect(await compte('SELECT count(*) AS n FROM projet')).toBe(0);
    expect(await compte('SELECT count(*) AS n FROM historique')).toBe(0);
    const { rows } = await prep.query<{ email: string }>('SELECT email FROM utilisateur');
    expect(rows.map((r) => r.email)).toEqual([E2E_ADMIN.email]);
  } finally {
    if (aOuverte) await a.query('ROLLBACK').catch(() => undefined);
    await a.end();
    await prep.end();
  }
});
