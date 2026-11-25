import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Version du package.json racine (seule source) et commit court de COMMIT (D-231, SPEC §13).
const racine = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
) as { version: string };

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(racine.version),
    __COMMIT__: JSON.stringify(process.env.COMMIT || 'inconnu'),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': process.env.VITE_API_URL ?? 'http://localhost:3000' },
  },
});
