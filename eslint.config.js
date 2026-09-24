import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
export default [
 {ignores:['node_modules/**','dist/**','tmp/**']},
 js.configs.recommended,
 {files:['**/*.js','**/*.jsx'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.node,...globals.browser},parserOptions:{ecmaFeatures:{jsx:true}}},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}},
 {files:['**/*.jsx'],plugins:{react},rules:{'react/jsx-uses-react':'error','react/jsx-uses-vars':'error'}},
];

