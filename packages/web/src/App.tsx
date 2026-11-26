import { AuthProvider, useAuth } from './auth';
import { Chargement, Vide } from './components/Etat';
import { Layout } from './components/Layout';
import { Redirect, usePath, useSearch } from './router';
import { Accueil } from './screens/Accueil';
import { CalendrierDetail } from './screens/Calendriers';
import { Connexion } from './screens/Connexion';
import { Imputations } from './screens/Imputations';
import { MesTaches } from './screens/MesTaches';
import { Pilotage, RedirectionPlanDeCharge } from './screens/Pilotage';
import { PlanningManuel } from './screens/PlanningManuel';
import { Projets } from './screens/EcranProjets';
import { ProjetDetail } from './screens/Projets';
import { Utilisateurs } from './screens/Utilisateurs';

/** Ancienne adresse /validation[?semaine=…] (D-247) : onglet Validation de l'écran Imputations. */
function AncienneValidation() {
  const semaine = useSearch().get('semaine');
  return (
    <Redirect
      to={`/imputations?onglet=validation${semaine === null ? '' : `&semaine=${semaine}`}`}
    />
  );
}

function Routes() {
  const path = usePath();
  const { etat } = useAuth();

  if (etat.statut === 'chargement') {
    return (
      <div className="p-6">
        <Chargement />
      </div>
    );
  }
  if (path === '/connexion') {
    return (
      <>
        <Redirect to="/" when={etat.statut === 'connecte'} />
        {etat.statut === 'anonyme' && <Connexion />}
      </>
    );
  }
  if (etat.statut === 'anonyme') return <Redirect to="/connexion" />;
  // Rôle ressource (D-148 (5)) : aucun accès aux projets, redirection vers « Mes tâches ».
  const restreint = etat.user.role === 'ressource';
  if (path === '/mes-taches') return <MesTaches />;
  if (
    restreint &&
    (path === '/' || /^\/(projets|modeles|validation|plan-de-charge|pilotage)(\/|$)/.test(path))
  ) {
    return <Redirect to="/mes-taches" />;
  }
  if (path === '/') return <Accueil />;
  if (path === '/utilisateurs') return <Utilisateurs />;
  // REX-5 (D-165 (3), (3 bis)) : anciens écrans Équipes et Calendriers, remplacés par des onglets.
  const admin = etat.user.role === 'administrateur';
  const ancien = /^\/(equipes|calendriers)$/.exec(path);
  if (ancien) {
    return <Redirect to={admin ? `/utilisateurs?onglet=${ancien[1]}` : '/'} />;
  }
  if (/^\/calendriers\/\d+$/.test(path) && !admin) return <Redirect to="/" />;
  const detail = /^\/calendriers\/(\d+)$/.exec(path);
  if (detail) return <CalendrierDetail id={detail[1]!} />;
  if (path === '/projets') return <Projets />;
  // D-247 : anciens écrans Modèles et Validation, devenus des onglets (redirections sans entrée d'historique).
  if (path === '/modeles') return <Redirect to="/projets?onglet=modeles" />;
  if (path === '/plan-de-charge') return <RedirectionPlanDeCharge />;
  if (path === '/pilotage') return <Pilotage />;
  if (path === '/imputations') return <Imputations />;
  if (path === '/validation') return <AncienneValidation />;
  const projet = /^\/projets\/(\d+)$/.exec(path);
  if (projet) return <ProjetDetail id={projet[1]!} />;
  const manuel = /^\/projets\/(\d+)\/planning-manuel\/(\d+)$/.exec(path);
  if (manuel) return <PlanningManuel projetId={manuel[1]!} activiteId={manuel[2]!} />;
  return (
    <Layout titre="Page introuvable">
      <Vide>Cette page n’existe pas.</Vide>
    </Layout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
