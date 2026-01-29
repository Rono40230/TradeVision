import globals from "globals";
import pluginVue from "eslint-plugin-vue";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,vue}"]},
  {languageOptions: { globals: globals.browser }},
  ...pluginVue.configs["flat/essential"],
  {
    rules: {
      "no-console": "warn",
      "vue/max-len": ["warn", { 
        "code": 150,
        "template": 150,
        "ignoreStrings": true,
        "ignoreUrls": true
      }]
    }
  }
];