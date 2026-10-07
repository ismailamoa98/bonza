// eslint.config.js — Phase 23. Flat config for a mixed repo: CommonJS Node backend + ESM/JSX React
// frontend + Vitest/Playwright tests. Kept pragmatic — real-bug rules as errors (no-undef via correct
// globals, rules-of-hooks), stylistic/unused as warnings — so `npm run lint` is a meaningful gate, not noise.
const js = require("@eslint/js");
const globals = require("globals");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  { ignores: ["node_modules/**", "coverage/**", "infra/**", "dist/**", "src/frontend/dist/**", "**/*.min.js", "**/.vite/**"] },
  js.configs.recommended,

  // Backend — CommonJS, Node globals.
  {
    files: ["src/backend/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node } },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // Frontend — ESM + JSX, browser globals.
  {
    files: ["src/frontend/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-uses-vars": "error", // JSX-only imports count as used
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off", // Vite's JSX runtime — no React import needed
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // Tests, mocks, setup — Vitest globals + both environments.
  {
    files: ["test/**/*.js", "src/**/*.test.{js,jsx}", "e2e/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.node,
        ...globals.browser,
        vi: "readonly", vitest: "readonly",
        describe: "readonly", it: "readonly", test: "readonly", expect: "readonly",
        beforeEach: "readonly", afterEach: "readonly", beforeAll: "readonly", afterAll: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // Root config/build files — Node, may be ESM or CJS.
  {
    files: ["*.config.js", "*.config.mjs", "*.config.cjs", "playwright.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
    rules: { "no-unused-vars": "warn" },
  },
];
