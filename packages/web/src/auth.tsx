import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, surMotDePasseRequis, type Utilisateur } from './api';

type Etat =
  { statut: 'chargement' } | { statut: 'anonyme' } | { statut: 'connecte'; user: Utilisateur };

interface AuthValue {
  etat: Etat;
  login: (identifiant: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Changement de mot de passe (D-254) ; lève ApiError sur refus. */
  changerMotDePasse: (actuel: string, nouveau: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });

  useEffect(() => {
    let annule = false;
    api<Utilisateur>('/api/auth/me')
      .then((user) => !annule && setEtat({ statut: 'connecte', user }))
      .catch(() => !annule && setEtat({ statut: 'anonyme' }));
    return () => {
      annule = true;
    };
  }, []);

  // D-254 : un 403 « Changement de mot de passe requis » bascule l'état sans rechargement.
  useEffect(
    () =>
      surMotDePasseRequis(() =>
        setEtat((e) =>
          e.statut === 'connecte' && !e.user.doit_changer_mot_de_passe
            ? { statut: 'connecte', user: { ...e.user, doit_changer_mot_de_passe: true } }
            : e,
        ),
      ),
    [],
  );

  const changerMotDePasse = useCallback(async (actuel: string, nouveau: string) => {
    await api<void>('/api/auth/mot-de-passe', { method: 'POST', body: { actuel, nouveau } });
    setEtat((e) =>
      e.statut === 'connecte'
        ? { statut: 'connecte', user: { ...e.user, doit_changer_mot_de_passe: false } }
        : e,
    );
  }, []);

  const login = useCallback(async (identifiant: string, motDePasse: string) => {
    const user = await api<Utilisateur>('/api/auth/login', {
      method: 'POST',
      body: { identifiant, mot_de_passe: motDePasse },
    });
    setEtat({ statut: 'connecte', user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<void>('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
    setEtat({ statut: 'anonyme' });
  }, []);

  const value = useMemo(
    () => ({ etat, login, logout, changerMotDePasse }),
    [etat, login, logout, changerMotDePasse],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}
