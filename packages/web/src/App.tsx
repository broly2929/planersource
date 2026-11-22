import { AuthProvider, useAuth } from './auth';
import { Chargement, Vide } from './components/Etat';
import { Layout } from './components/Layout';
import { Redirect, usePath } from './router';
import { Accueil } from './screens/Accueil';
import { CalendrierDetail } from './screens/Calendriers';
import { Connexion } from './screens/Connexion';
import { FeuilleTemps } from './screens/FeuilleTemps';
import { Validation } from './screens/Validation';
import { MesTaches } from './screens/MesTaches';
import { Modeles } from './screens/Modeles';
import { PlanDeCharge } from './screens/PlanDeCharge';
import { PlanningManuel } from './screens/PlanningManuel';
import { ProjetDetail, Projets } from './screens/Projets';
import { Utilisateurs } from './screens/Utilisateurs';

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
    (path === '/' || /^\/(projets|modeles|validation|plan-de-charge)(\/|$)/.test(path))
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
  if (path === '/modeles') return <Modeles />;
  if (path === '/plan-de-charge') return <PlanDeCharge />;
  if (path === '/imputations') return <FeuilleTemps />;
  if (path === '/validation') return <Validation />;
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
