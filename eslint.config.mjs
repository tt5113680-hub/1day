import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'evidence/COMMERCIAL_UI_FULL_CHAIN_AUDIT/**',
      'evidence/PRODUCT_UI_GAP_AUDIT/**',
      'evidence/**/playwright-output/**',
    ],
  },
  { languageOptions: { globals: { process: 'readonly' } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
