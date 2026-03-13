/**
 * ESLint configuration
 *
 * Uses @react-spa-scaffold/eslint-config with local overrides.
 */

import config from '@react-spa-scaffold/eslint-config';

export default [
  // Main app uses React config
  ...config,

  // Disable lingui rules (i18n feature not selected)
  {
    rules: {
      'lingui/no-unlocalized-strings': 'off',
      'lingui/t-call-in-function': 'off',
      'lingui/no-single-variables-to-translate': 'off',
      'lingui/no-expression-in-message': 'off',
      'lingui/no-single-tag-to-translate': 'off',
      'lingui/no-trans-inside-trans': 'off',
    },
  },

  // UI components from shadcn and context/provider files - don't modify
  {
    files: ['**/components/ui/**/*.{ts,tsx}', '**/contexts/**/*.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
