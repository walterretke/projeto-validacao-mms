# Guia da entrega

Este arquivo mostra onde está cada item combinado para a validação da disciplina de Manutenção e Melhoria de Software.

**Vídeo de apresentação (não listado):** https://www.youtube.com/watch?v=dwABIRErNiM

## 1. O que foi combinado e onde está

| Item combinado | Onde ver |
|---|---|
| **Relatório de análise estática** (SonarQube e ESLint) | [01-diagnostico.md, seção 3](01-diagnostico.md#3-métricas): métricas por função e do projeto, com os prints do SonarQube |
| **Complexidade** | [01-diagnostico.md, seção 3.1](01-diagnostico.md#31-por-função-eslint): complexidade ciclomática, cognitiva e aninhamento de cada função |
| **Code smells** | [01-diagnostico.md, seção 4](01-diagnostico.md#4-code-smells-encontrados): 13 smells, com linha e impacto |
| **Dívida técnica** | [01-diagnostico.md, seção 6](01-diagnostico.md#6-débito-técnico-priorizado): débito priorizado. Valor no SonarQube: 1h03 antes, 0 depois ([04-automacao.md, seção 4](04-automacao.md#4-sonarqube-e-sonarcloud)) |
| **Cobertura** | Antes: 0% ([01-diagnostico.md, seção 3.2](01-diagnostico.md#32-projeto-sonarqube)). Depois: 98,2% no SonarQube e 100% das linhas de `src` ([04-automacao.md, seção 4](04-automacao.md#4-sonarqube-e-sonarcloud)) |
| **Testes de caracterização** | [02-blindagem.md](02-blindagem.md) e o código em [`test/caracterizacao/prices.spec.ts`](../test/caracterizacao/prices.spec.ts) |
| **Refatoração protegida pelos testes** | [03-refatoracao.md](03-refatoracao.md), em especial a [seção 4](03-refatoracao.md#4-bugs-corrigidos): ao trocar a implementação, os 20 testes de comportamento normal continuaram passando e falharam só os 9 que congelavam bugs |
| **Strangler Fig** | [03-refatoracao.md, seção 1](03-refatoracao.md#1-estratégia-strangler-fig): os 4 passos, cada um num commit |
| **Pipeline com Quality Gate** | [04-automacao.md](04-automacao.md), a definição em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) e as execuções na aba [Actions](https://github.com/walterretke/projeto-validacao-mms/actions) |
| **Quality Gate barrando código ruim** | [Pull request de demonstração](https://github.com/walterretke/projeto-validacao-mms/pulls?q=is%3Apr+head%3Ademo%2Fquality-gate-reprovado) da branch `demo/quality-gate-reprovado`: a pipeline falha e o merge fica bloqueado. Ele não deve ser aceito |
| **Histórico do antes e depois** | Seção 2 deste guia |
| **Demonstração prática** | Vídeo acima e a seção 3 deste guia, para rodar na máquina |

## 2. O antes e o depois no Git

Cada etapa terminou com uma tag:

| Tag | Estado do código |
|---|---|
| `legado-original` | Código original do kata, sem nenhuma alteração |
| `etapa-1-diagnostico` | Diagnóstico concluído, código ainda intacto |
| `etapa-2-blindagem` | 29 testes de caracterização, código legado ainda intacto |
| `etapa-3-strangler-v2` | Passo intermediário do Strangler Fig: implementação nova em `/v2` ao lado do legado |
| `etapa-3-refatoracao` | Legado removido, bugs corrigidos |
| `etapa-4-automacao` | Pipeline de CI com Quality Gate |

Links diretos:

- [Lista de commits](https://github.com/walterretke/projeto-validacao-mms/commits/main), com um commit por passo
- [Código original](https://github.com/walterretke/projeto-validacao-mms/blob/legado-original/src/prices.ts): a função única de 64 linhas
- [Regra de preço depois da refatoração](../src/pricing/pricing-logic.ts)
- [Comparação completa entre o legado e a versão final](https://github.com/walterretke/projeto-validacao-mms/compare/legado-original...main)

## 3. Como ver funcionando

Pré-requisitos: Node.js 22 ou mais novo e Docker.

```bash
npm install
npm run db:up          # sobe o MariaDB
npm run quality        # o mesmo Quality Gate da pipeline: lint, tipos e 89 testes com cobertura mínima
npm run lint:legado    # as mesmas regras aplicadas ao código original: 27 erros
npm start              # sobe a API em http://localhost:5010
npm run demo           # em outro terminal: chama a API e mostra as respostas
```

## 4. Observações

- A pipeline é de **integração contínua** (CI): verifica e barra cada mudança. Não há etapa de publicação (CD), porque o projeto não tem um ambiente para receber a API.
- O SonarQube foi usado localmente, pelo Docker Compose. A pipeline já tem o passo para o SonarCloud, que fica ativo quando o token for configurado ([04-automacao.md, seção 4](04-automacao.md#4-sonarqube-e-sonarcloud)).
- Uma regra foi mantida de propósito: a criança não recebe o desconto de segunda-feira. Pode ser regra comercial, então ficou documentada como decisão do cliente ([03-refatoracao.md, seção 5](03-refatoracao.md#5-decisão-o-que-não-foi-corrigido)).
