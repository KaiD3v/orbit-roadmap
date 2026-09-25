import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [
      stylistic.configs.customize({ indent: 2, quotes: 'single', semi: false, jsx: true, arrowParens: false, braceStyle: '1tbs' }),
    ],
    rules: {
      // Quebrar texto e {expressões} em linhas separadas gera {' '} e piora a leitura
      '@stylistic/jsx-one-expression-per-line': 'off',
      '@stylistic/max-len': ['warn', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreUrls: true }],
    },
  },
])
