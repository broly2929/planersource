import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, type Utilisateur } from './api';

type Etat =
  { statut: 'chargement' } | { statut: 'anonyme' } | { statut: 'connecte'; user: Utilisateur };

interface AuthValue {
  etat: Etat;
  login: (identifiant: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const value = useMemo(() => ({ etat, login, logout }), [etat, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}
