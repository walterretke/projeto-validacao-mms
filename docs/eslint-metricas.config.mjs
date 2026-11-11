// Configuração usada só para levantar métricas na Etapa 1.
// Os limites estão em 0 de propósito: assim o ESLint mostra o valor
// de cada função, e não apenas as que passam do limite.
//
// Uso:
//   npm install --no-save eslint@10 @typescript-eslint/parser@8
//   npx eslint -c docs/eslint-metricas.config.mjs src/prices.ts index.ts
import tsParser from "@typescript-eslint/parser";

export default [
    {
        files: ["**/*.ts"],
        languageOptions: {parser: tsParser},
        rules: {
            "complexity": ["warn", 0],
            "max-depth": ["warn", 0],
            "max-statements": ["warn", 0],
            "max-lines-per-function": ["warn", {max: 0}],
            "prefer-const": "warn",
            "no-unused-vars": "warn",
        },
    },
];
