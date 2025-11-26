module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: null,
    sourceType: "module",
    ecmaVersion: "latest"
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  env: {
    es6: true,
    node: true
  },
  ignorePatterns: ["dist", "node_modules"]
};
