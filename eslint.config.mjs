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
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        Headers: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
