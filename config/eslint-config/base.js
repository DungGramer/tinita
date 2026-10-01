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
    // `export default` is banned in package source. Measured: with `bundle: true` +
    // `outExtension`, `require('tinita-dom/x')` on a default-only module returns
    // `{ default: fn }` rather than the function - the same interop shape that bug B1
    // already had to fix once. The whole published API is named exports; mixing in
    // default also makes `attw` report the wrong CJS/ESM shape.
    //
    // `.d.ts` is exempt: `css-modules.d.ts` declares the default export CSS Modules
    // actually have, and that is not ours to change.
    files: ["**/src/**/*.ts", "**/src/**/*.tsx"],
    ignores: ["**/*.d.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Use a named export. See docs/code-standards.md, Quy Tac Dat Ten.",
        },
      ],
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
