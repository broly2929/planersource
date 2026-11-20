import { useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notification } from '../components/Notification';
import { navigate } from '../router';

export function Connexion() {
  const { login } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await login(identifiant, motDePasse);
      navigate('/', { replace: true });
    } catch (err) {
      setErreur(
        err instanceof ApiError && err.status === 401
          ? 'Identifiant ou mot de passe incorrect.'
          : err instanceof ApiError && err.status === 429
            ? 'Trop de tentatives de connexion. Réessayez dans quelques minutes.'
            : 'Connexion impossible pour le moment. Réessayez.',
      );
      setEnCours(false);
    }
  };

  return (
    <main className="flex h-full items-center justify-center p-4">
      <form
        onSubmit={soumettre}
        className="flex w-full max-w-sm flex-col gap-4 rounded-ui border border-gray-200 bg-white p-6 shadow-ui"
      >
        <h1 className="text-titre font-semibold">Connexion</h1>
        {erreur && <Notification type="erreur">{erreur}</Notification>}
        <Field
          label="Identifiant"
          autoComplete="username"
          required
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
        />
        <Field
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
        <Button type="submit" enCours={enCours}>
          Se connecter
        </Button>
      </form>
    </main>
  );
}
