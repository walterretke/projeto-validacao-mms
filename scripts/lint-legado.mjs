// Roda as regras de qualidade atuais (eslint.config.mjs) no código legado original,
// tirado da tag legado-original do Git. Mostra que o código antigo seria barrado
// pelo Quality Gate. Uso: npm run lint:legado
import {execFileSync} from "node:child_process";
import {ESLint} from "eslint";

const codigoLegado = execFileSync("git", ["show", "legado-original:src/prices.ts"], {encoding: "utf8"});

const eslint = new ESLint();
const resultados = await eslint.lintText(codigoLegado, {filePath: "legado-original/src/prices.ts"});
const formatter = await eslint.loadFormatter("stylish");

console.log("Regras de qualidade atuais aplicadas ao código legado (tag legado-original):");
console.log(await formatter.format(resultados));
