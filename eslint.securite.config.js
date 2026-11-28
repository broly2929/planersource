// Lint de sécurité, séparé du lint ordinaire (D-272 (4)) : `npm run lint:securite`.
// Ses constats nourrissent l'audit (docs/securite.md) ; il ne rend pas `npm run lint` rouge.
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'e2e/playwright-report/**',
      'e2e/test-results/**',
      'e2e/.piles/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  security.configs.recommended,
);
