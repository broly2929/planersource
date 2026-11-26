import * as Tabs from '@radix-ui/react-tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Layout } from '../components/Layout';
import { LienTelechargement } from '../components/LienTelechargement';
import { Select } from '../components/Select';
import { adresseExportCouts, adresseExportPlan } from '../export/logique';
import { aujourdhuiLocal } from '../imputations/logique';
import {
  adressePlan,
  boutonsMois,
  decalerMois,
  moisDe,
  parametresPlan,
  type FiltreEquipe,
  type OngletPilotage,
} from '../plan-de-charge/logique';
import { navigate, Redirect, useSearch } from '../router';
import type { Equipe } from './Equipes';
import { ONGLET } from './projet/commun';
import { TableauCouts } from './pilotage/TableauCouts';
import { TableauPlan } from './pilotage/TableauPlan';

const valeurEquipe = (e: FiltreEquipe): string => (e === 'toutes' ? '' : String(e));

/** Ancienne adresse /plan-de-charge (D-245) : redirige vers l'onglet « Plan de charge » en gardant les filtres. */
export function RedirectionPlanDeCharge() {
  const { debut, equipe } = parametresPlan(useSearch(), moisDe(aujourdhuiLocal()));
  return <Redirect to={adressePlan(debut, equipe)} />;
}

/** Écran « Pilotage » (D-245, SPEC §12.5) : onglets « Plan de charge » et « Coûts », filtres communs dans l'adresse. */
export function Pilotage() {
  const { etat } = useAuth();
  const role = etat.statut === 'connecte' ? etat.user.role : null;
  const recherche = useSearch();
  const { debut, equipe, corrige } = parametresPlan(recherche, moisDe(aujourdhuiLocal()));
  const brut = recherche.get('onglet');
  const onglet: OngletPilotage = brut === 'couts' ? 'couts' : 'charge';
  const canonique = corrige || (brut !== 'charge' && brut !== 'couts');
  return (
    <Layout titre="Pilotage">
      <Redirect to={adressePlan(debut, equipe, onglet)} when={canonique} />
      {role === 'ressource' || canonique ? null : (
        <Contenu onglet={onglet} debut={debut} equipe={equipe} />
      )}
    </Layout>
  );
}

function Contenu({
  onglet,
  debut,
  equipe,
}: {
  onglet: OngletPilotage;
  debut: string;
  equipe: FiltreEquipe;
}) {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  useEffect(() => {
    api<Equipe[]>('/api/equipes')
      .then(setEquipes)
      .catch(() => setEquipes([]));
  }, []);

  const permis = boutonsMois(debut);
  const aller = (d: string, e: FiltreEquipe) => navigate(adressePlan(d, e, onglet));

  return (
    <Tabs.Root
      value={onglet}
      onValueChange={(v) =>
        navigate(adressePlan(debut, equipe, v === 'couts' ? 'couts' : 'charge'))
      }
      className="flex min-w-0 flex-col gap-4"
    >
      <Tabs.List aria-label="Sections du pilotage" className="flex gap-2 border-b border-gray-200">
        <Tabs.Trigger value="charge" className={ONGLET}>
          Plan de charge
        </Tabs.Trigger>
        <Tabs.Trigger value="couts" className={ONGLET}>
          Coûts
        </Tabs.Trigger>
      </Tabs.List>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <Select
          label="Équipe"
          value={valeurEquipe(equipe)}
          onChange={(e) => {
            const v = e.target.value;
            aller(debut, v === '' ? 'toutes' : v === 'aucune' ? 'aucune' : Number(v));
          }}
          options={[
            { value: '', label: 'Toutes' },
            { value: 'aucune', label: 'Sans équipe' },
            ...equipes.map((e) => ({ value: String(e.id), label: e.nom })),
          ]}
        />
        <Field
          label="Mois de départ"
          type="month"
          min="2000-01"
          max="2099-12"
          value={debut}
          onChange={(e) => {
            const v = e.target.value;
            if (parametresPlan(new URLSearchParams({ debut: v }), '').corrige) return;
            aller(v, equipe);
          }}
        />
        <Button
          variante="secondaire"
          className="px-2!"
          disabled={!permis.precedent}
          onClick={() => aller(decalerMois(debut, -1), equipe)}
        >
          <ChevronLeft aria-hidden className="size-4" />
          Mois précédent
        </Button>
        <Button
          variante="secondaire"
          className="px-2!"
          disabled={!permis.suivant}
          onClick={() => aller(decalerMois(debut, 1), equipe)}
        >
          Mois suivant
          <ChevronRight aria-hidden className="size-4" />
        </Button>
        <LienTelechargement
          href={
            onglet === 'couts'
              ? adresseExportCouts(debut, equipe)
              : adresseExportPlan(debut, equipe)
          }
        >
          Exporter CSV
        </LienTelechargement>
      </div>
      <Tabs.Content value="charge">
        <TableauPlan debut={debut} equipe={equipe} />
      </Tabs.Content>
      <Tabs.Content value="couts">
        <TableauCouts debut={debut} equipe={equipe} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
