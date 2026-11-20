import { spawn } from 'node:child_process';
import { loadConfig } from '../config.js';
import { exigerBaseDemo, urlBaseDemo } from '../demo/base.js';
import { chargerEnv } from '../env.js';

chargerEnv();

const urlDemo = urlBaseDemo(loadConfig().databaseUrl);
try {
  exigerBaseDemo(urlDemo);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// Lance seulement l'API (`npm run dev` du paquet), DATABASE_URL pointé sur la base de démonstration ; le web est lancé par `npm run dev:demo` (racine).
const enfant = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: urlDemo },
});
enfant.on('exit', (code) => process.exit(code ?? 0));
