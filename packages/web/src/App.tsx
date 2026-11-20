import { AuthProvider, useAuth } from './auth';
import { Chargement, Vide } from './components/Etat';
import { Layout } from './components/Layout';
import { Redirect, usePath } from './router';
import { Accueil } from './screens/Accueil';
import { CalendrierDetail, Calendriers } from './screens/Calendriers';
import { Connexion } from './screens/Connexion';
import { FeuilleTemps } from './screens/FeuilleTemps';
import { Validation } from './screens/Validation';
import { Modeles } from './screens/Modeles';
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
  if (path === '/') return <Accueil />;
  if (path === '/utilisateurs') return <Utilisateurs />;
  if (path === '/calendriers') return <Calendriers />;
  const detail = /^\/calendriers\/(\d+)$/.exec(path);
  if (detail) return <CalendrierDetail id={detail[1]!} />;
  if (path === '/projets') return <Projets />;
  if (path === '/modeles') return <Modeles />;
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
