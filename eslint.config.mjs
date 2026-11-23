// Regras de qualidade que fazem parte do Quality Gate (npm run lint e pipeline de CI).
// Os limites foram escolhidos a partir do diagnóstico da Etapa 1: o handler legado tinha
// complexidade 15 e 5 níveis de aninhamento, e não passaria por estas regras.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["node_modules/", "dist/", "coverage/", "docs/"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        rules: {
            "complexity": ["error", 8],
            "max-depth": ["error", 2],
            "max-params": ["error", 4],
            "max-statements": ["error", 15],
            "max-lines-per-function": ["error", {max: 40, skipBlankLines: true, skipComments: true}],
            "no-magic-numbers": "off",
            "prefer-const": "error",
            "eqeqeq": "error",
            "no-else-return": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": ["error", {argsIgnorePattern: "^_"}],
        },
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {globals: {console: "readonly", process: "readonly"}},
    },
    {
        // Testes podem ter funções maiores (tabelas de casos) e usam asserções do Chai
        // como expect(x).to.be.undefined. O resto das regras vale.
        files: ["test/**/*.ts"],
        rules: {
            "max-lines-per-function": "off",
            "max-statements": "off",
            "@typescript-eslint/no-unused-expressions": "off",
        },
    },
);
