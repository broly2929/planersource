import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  LayoutTemplate,
  LogOut,
  Users,
  UsersRound,
  Home,
  ListTodo,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth';
import { Link, usePath } from '../router';
import { Button } from './Button';
import { Notification } from './Notification';

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
  const actif = to === '/' ? chemin === '/' : chemin === to || chemin.startsWith(`${to}/`);
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
  actions,
  children,
}: {
  titre: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { etat, logout } = useAuth();
  const [erreur, setErreur] = useState(false);
  const user = etat.statut === 'connecte' ? etat.user : null;

  const deconnecter = () => {
    setErreur(false);
    logout().catch(() => setErreur(true));
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="px-4 py-3 text-titre font-semibold text-accent">PlanerSource</div>
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
          <NavLink to="/calendriers" icone={CalendarDays}>
            Calendriers
          </NavLink>
          {user?.role === 'administrateur' && (
            <NavLink to="/equipes" icone={UsersRound}>
              Équipes
            </NavLink>
          )}
          {user?.role !== 'ressource' && (
            <NavLink to="/projets" icone={FolderKanban}>
              Projets
            </NavLink>
          )}
          {user?.est_ressource && (
            <NavLink to="/imputations" icone={ClipboardList}>
              Imputations
            </NavLink>
          )}
          {(user?.role === 'administrateur' || user?.role === 'chef_de_projet') && (
            <NavLink to="/validation" icone={ClipboardCheck}>
              Validation
            </NavLink>
          )}
          {(user?.role === 'administrateur' || user?.role === 'chef_de_projet') && (
            <NavLink to="/modeles" icone={LayoutTemplate}>
              Modèles
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
          <Button variante="secondaire" onClick={deconnecter}>
            <LogOut aria-hidden className="size-4" />
            Se déconnecter
          </Button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <h1 className="text-titre font-semibold">{titre}</h1>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        {user?.role === 'administrateur' && user.mot_de_passe_origine && (
          <div className="px-6 pt-4">
            <Notification type="avertissement">
              Le mot de passe de l’administrateur est celui d’origine : changez-le.
            </Notification>
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
