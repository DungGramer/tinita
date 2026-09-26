import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    // `storybook-static/**`: output của `storybook build`. eslint lint nó thì bundle
    // minify sinh ra hàng loạt warning `no-unused-expressions` và `pnpm lint` exit 1.
    // Đo được 2026-09-26: lint xanh trước khi build storybook, đỏ ngay sau. Mìn thật,
    // không phải giả thuyết.
    // `coverage/**`, `.next/**`, `.turbo/**`: cùng loại - artifact, không phải source.
    ignores: [
      "dist/**",
      "storybook-static/**",
      "coverage/**",
      ".next/**",
      ".turbo/**",
    ],
  },
];

export default config;
