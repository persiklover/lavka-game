import js from '@eslint/js';
import globals from 'globals'
import tseslint from 'typescript-eslint';
// import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		rules: prettierConfig.rules,
	},
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			'prettier': prettierPlugin,
			'import': importPlugin,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],

			// Общие настройки
			'no-tabs': 'off',
			camelcase: 'off',
			// indent: ['error', 'tab', { SwitchCase: 1 }],
			// 'max-len': ['error', 120],
			'linebreak-style': ['error', 'unix'],
			quotes: ['error', 'single'],
			semi: ['error', 'always'],
			'no-underscore-dangle': 'off',
			'no-console': 'warn',

			// TS
			'no-shadow': 'off',
			'@typescript-eslint/no-shadow': 'error',
			'@typescript-eslint/no-explicit-any': 'off',

			// Import
			'import/prefer-default-export': 'off',
			'import/no-unresolved': 'off',
			'import/no-extraneous-dependencies': 'off',
			'import/extensions': 'off',
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
					'newlines-between': 'always',
				},
			],

			// Прочее
			'no-restricted-syntax': 'off',

			// Prettier
			'prettier/prettier': 'warn',
		},
	},
)
