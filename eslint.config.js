import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import jsdoc from 'eslint-plugin-jsdoc'

export default defineConfig(
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      jsdoc: jsdoc,
    },
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.node,
        ...globals.es2025,
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeCheckedOnly,
  { rules: { 'no-useless-assignment': 'off' } }
)
