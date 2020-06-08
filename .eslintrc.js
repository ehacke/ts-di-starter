module.exports = {
  extends: ['plugin:@typescript-eslint/recommended', '@ehacke/eslint-config', 'plugin:import/typescript'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.json'],
      },
      typescript: {},
    },
  },
};
