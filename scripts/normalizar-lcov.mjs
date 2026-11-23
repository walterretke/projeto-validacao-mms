// No Windows o c8 grava os caminhos do coverage/lcov.info com barra invertida (src\config.ts).
// O sonar-scanner roda em Linux (container) e não encontra esses arquivos, e a cobertura
// aparece zerada no SonarQube. Este script troca as barras antes da análise.
import {existsSync, readFileSync, writeFileSync} from "node:fs";

const arquivo = "coverage/lcov.info";

if (!existsSync(arquivo)) {
    console.error(`${arquivo} não existe. Rode "npm run test:coverage" antes da análise.`);
    process.exit(1);
}

const conteudo = readFileSync(arquivo, "utf8");
writeFileSync(arquivo, conteudo.replace(/^SF:(.*)$/gm, (_linha, caminho) => `SF:${caminho.replaceAll("\\", "/")}`));
