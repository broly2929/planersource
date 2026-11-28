import {
  ClipboardList,
  FolderKanban,
  KeyRound,
  LogOut,
  Users,
  Home,
  ListTodo,
  ChartNoAxesGantt,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { aDroitsDeChef } from '../api';
import { useAuth } from '../auth';
import { Link, sortir, usePath } from '../router';
import { FormulaireMotDePasse } from '../screens/ChangementMotDePasse';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notification } from './Notification';
import { COMMIT, VERSION, useNouvelleVersion } from '../version';

function NavLink({
  to,
  icone: Icone,
  children,
}: {
  to: string;
  icone: typeof Home;
  children: ReactNode;
}) {
  const chemin = usePath();
  // Le détail d'un calendrier (/calendriers/:id) relève de l'écran Utilisateurs (D-165 (3 bis)).
  const actif =
    to === '/'
      ? chemin === '/'
      : chemin === to ||
        chemin.startsWith(`${to}/`) ||
        (to === '/utilisateurs' && chemin.startsWith('/calendriers/'));
  return (
    <Link
      to={to}
      aria-current={actif ? 'page' : undefined}
      className={`flex h-8 items-center gap-2 rounded-ui px-3 ${
        actif ? 'bg-gray-200 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icone aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

export function Layout({
  titre,
  mention,
  actions,
  children,
}: {
  titre: string;
  /** Mention à côté du titre (ex. « Lecture seule »). */
  mention?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { etat, logout } = useAuth();
  const [erreur, setErreur] = useState(false);
  const [dialogueMdp, setDialogueMdp] = useState(false);
  const [mdpChange, setMdpChange] = useState(false);
  const user = etat.statut === 'connecte' ? etat.user : null;
  const nouvelleVersion = useNouvelleVersion();

  const deconnecter = () => {
    setErreur(false);
    sortir(() => logout().catch(() => setErreur(true)));
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <Link
          to="/"
          className="px-4 py-3 text-titre font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:rounded-ui"
        >
          PlanerSource
        </Link>
        <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-2">
          {(user?.est_ressource || user?.role === 'ressource') && (
            <NavLink to="/mes-taches" icone={ListTodo}>
              Mes tâches
            </NavLink>
          )}
          {user?.role !== 'ressource' && (
            <NavLink to="/" icone={Home}>
              Accueil
            </NavLink>
          )}
          {user?.role !== 'ressource' && (
            <NavLink to="/projets" icone={FolderKanban}>
              Projets
            </NavLink>
          )}
          {(user?.role === 'administrateur' || aDroitsDeChef(user?.role)) && (
            <NavLink to="/pilotage" icone={ChartNoAxesGantt}>
              Pilotage
            </NavLink>
          )}
          {(user?.est_ressource ||
            user?.role === 'administrateur' ||
            aDroitsDeChef(user?.role)) && (
            <NavLink to="/imputations" icone={ClipboardList}>
              Imputations
            </NavLink>
          )}
          {user?.role === 'administrateur' && (
            <NavLink to="/utilisateurs" icone={Users}>
              Utilisateurs
            </NavLink>
          )}
        </nav>
        <div className="flex flex-col gap-2 border-t border-gray-200 p-3">
          {user && (
            <p className="truncate text-petit text-gray-600" title={user.login}>
              {user.nom}
            </p>
          )}
          {erreur && <Notification type="erreur">Déconnexion impossible.</Notification>}
          <Button
            variante="discrete"
            className="justify-start px-2 text-petit font-normal! whitespace-nowrap"
            onClick={() => setDialogueMdp(true)}
          >
            <KeyRound aria-hidden className="size-4 shrink-0" />
            Changer mon mot de passe
          </Button>
          <Button variante="secondaire" onClick={deconnecter}>
            <LogOut aria-hidden className="size-4" />
            Se déconnecter
          </Button>
          <p className="text-petit text-gray-600">{`v${VERSION} · ${COMMIT}`}</p>
        </div>
      </aside>
      <Dialog
        ouvert={dialogueMdp}
        onOuvertChange={setDialogueMdp}
        titre="Changer mon mot de passe"
        description="Saisissez votre mot de passe actuel, puis le nouveau."
      >
        <FormulaireMotDePasse
          onSucces={() => {
            setDialogueMdp(false);
            setMdpChange(true);
          }}
          onAnnuler={() => setDialogueMdp(false)}
        />
      </Dialog>
      <main className="flex min-w-0 flex-1 flex-col">
        {nouvelleVersion && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 border-b border-warning bg-warning-bg px-6 py-2 text-warning"
          >
            <span>Nouvelle version disponible</span>
            <Button variante="secondaire" onClick={() => sortir(() => window.location.reload())}>
              Recharger
            </Button>
          </div>
        )}
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-titre font-semibold">{titre}</h1>
            {mention}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        {user?.role === 'administrateur' && user.mot_de_passe_origine && (
          <div className="px-6 pt-4">
            <Notification type="avertissement">
              Le mot de passe de l’administrateur est celui d’origine : changez-le.
            </Notification>
          </div>
        )}
        {mdpChange && (
          <div className="px-6 pt-4">
            <Notification type="succes">Mot de passe changé.</Notification>
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
