import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import importPlugin from 'eslint-plugin-import'
import jsdoc from 'eslint-plugin-jsdoc'

export default defineConfig(
  {
    ignores: ['dist/**'],
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
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
  { rules: { 'no-unused-vars': 'off' } }
)
