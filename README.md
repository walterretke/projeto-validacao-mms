# Projeto de Validação - Manutenção e Melhoria de Software

[![CI](https://github.com/walterretke/projeto-validacao-mms/actions/workflows/ci.yml/badge.svg)](https://github.com/walterretke/projeto-validacao-mms/actions/workflows/ci.yml)

**Vídeo de apresentação:** https://www.youtube.com/watch?v=dwABIRErNiM

**Guia da entrega** (onde está cada item combinado): [docs/00-entrega.md](docs/00-entrega.md)

Projeto prático "ponta a ponta" para validar a disciplina de Manutenção e Melhoria de Software (MMS). A ideia é pegar um código legado e aplicar nele os quatro pilares da disciplina: **diagnóstico** (levantar métricas, complexidade e code smells com análise estática), **blindagem** (testes de caracterização que congelam o comportamento atual), **refatoração** (corrigir as fragilidades encontradas, sempre protegido pelos testes) e **automação** (pipeline de CI/CD com Quality Gate). O histórico do Git mostra o antes e o depois do código.

## Sistema escolhido

O código legado é o kata [Lift Pass Pricing](https://github.com/martinsson/Refactoring-Kata-Lift-Pass-Pricing), criado por **Johan Martinsson** para treinar refatoração de código legado. Foi usada a versão em TypeScript.

É uma API HTTP (Express) ligada a um banco MySQL/MariaDB que calcula o preço do passe de esqui de acordo com o tipo do passe, a idade e a data. No código original, a regra de negócio estava toda misturada com o endpoint e com o SQL, numa única função de 64 linhas com 5 níveis de `if` aninhado.

## Etapas

| Etapa | O que foi feito | Relatório | Tag no Git |
|---|---|---|---|
| 1. Diagnóstico | Análise estática com SonarQube e ESLint, métricas, 13 code smells e 6 comportamentos estranhos confirmados | [01-diagnostico.md](docs/01-diagnostico.md) | `etapa-1-diagnostico` |
| 2. Blindagem | 29 testes de caracterização pela API, com banco real, congelando o comportamento (inclusive os bugs) | [02-blindagem.md](docs/02-blindagem.md) | `etapa-2-blindagem` |
| 3. Refatoração | Regra separada em camadas com Strangler Fig, bugs corrigidos e nova funcionalidade (preço de vários passes) | [03-refatoracao.md](docs/03-refatoracao.md) | `etapa-3-refatoracao` |
| 4. Automação | Pipeline no GitHub Actions com Quality Gate (lint, tipos, testes e cobertura mínima) e dependências atualizadas | [04-automacao.md](docs/04-automacao.md) | `etapa-4-automacao` |

A tag `legado-original` é o estado **"antes"**: o código do kata sem nenhuma alteração.

## Antes e depois

| | Antes (legado) | Depois |
|---|---|---|
| Testes automatizados | 0 | 89 |
| Cobertura de testes | 0% | 100% das linhas de `src` |
| Issues no SonarQube | 9 | 0 |
| Complexidade cognitiva da pior função | 46 | abaixo de 15 em todas |
| Aninhamento máximo | 5 níveis | 1 nível |
| Débito técnico (SonarQube) | 1h03 | 0 min |
| Tipo de passe inexistente | derrubava a API | responde 404 |
| Resultado no fuso de São Paulo | desconto de segunda caía na terça | correto em qualquer fuso |
| Preço de vários passes de uma vez | impossível sem duplicar código | `POST /v2/prices/quote` |
| Verificação automática a cada mudança | nenhuma | pipeline com Quality Gate |

## Como rodar

Pré-requisitos: **Node.js 22 ou mais novo** e **Docker** (Docker Desktop no Windows).

```bash
npm install
npm run db:up
npm start
```

A API sobe em http://localhost:5010. O banco do Docker usa a porta **3307** (para não conflitar com um MySQL que já esteja instalado na 3306).

Com a API no ar, em outro terminal, este comando faz várias chamadas e mostra as respostas:

```bash
npm run demo
```

Para derrubar o banco:

```bash
npm run db:down
```

## Endpoints

| Método e caminho | O que faz |
|---|---|
| `GET /v2/prices?type=1jour&age=30&date=2019-02-11` | Preço de um passe. `age` e `date` são opcionais. |
| `POST /v2/prices/quote` | Preço de vários passes no mesmo dia, com total. Corpo: `{"date": "2019-02-11", "passes": [{"type": "1jour", "age": 40}, {"type": "1jour", "age": 10}]}` |
| `PUT /v2/prices/1jour` | Altera o preço base. Corpo: `{"cost": 40}` |
| `GET /prices` e `PUT /prices` | Contrato antigo, mantido para compatibilidade. Responde com o cabeçalho `Deprecation` apontando para a `/v2`. |

Entradas inválidas respondem **400** e tipo de passe inexistente responde **404**, sempre com `{"error": "mensagem"}`.

## Testes e qualidade

```bash
npm test               # os 89 testes (precisa do banco no ar: npm run db:up)
npm run test:unit      # só os testes unitários, sem banco, em milissegundos
npm run test:coverage  # testes com relatório e cobertura mínima
npm run quality        # o Quality Gate completo, igual ao da pipeline
npm run lint:legado    # aplica as regras de qualidade ao código legado original (27 erros)
```

Para a análise no SonarQube local, ver [docs/04-automacao.md](docs/04-automacao.md#4-sonarqube-e-sonarcloud).

## Estrutura

```
.
├── .github/workflows/ci.yml    # pipeline de CI com o Quality Gate
├── database/initDatabase.sql   # criação do banco lift_pass e dados iniciais
├── docs/                       # relatórios das quatro etapas e prints do SonarQube
├── scripts/                    # demo da API, lint do legado e ajuste do relatório de cobertura
├── src/
│   ├── pricing/                # regra de negócio, sem HTTP
│   │   ├── pricing-logic.ts    # regra de preço pura
│   │   ├── pass-date.ts        # leitura da data sem depender do fuso
│   │   ├── pricing-dao.ts      # acesso ao banco
│   │   └── pricing-service.ts  # junta banco e regra; um ou vários passes
│   ├── http/                   # camada web
│   │   ├── v2-routes.ts        # endpoints novos
│   │   ├── legacy-routes.ts    # contrato antigo de /prices
│   │   ├── request-parsing.ts  # validação da entrada
│   │   └── error-handling.ts   # erros viram 400, 404 ou 500
│   ├── config.ts               # banco e porta por variáveis de ambiente
│   └── prices.ts               # monta a aplicação
├── test/
│   ├── caracterizacao/         # testes de caracterização da API (Etapa 2)
│   ├── integracao/             # testes da API v2 com banco real
│   └── unit/                   # testes unitários, sem banco
├── docker-compose.yml          # MariaDB, SonarQube e sonar-scanner
├── eslint.config.mjs           # regras de qualidade do Quality Gate
└── index.ts                    # sobe a API
```

## Configuração

Tudo tem valor padrão que funciona com o Docker Compose. Para outro ambiente, use variáveis de ambiente:

| Variável | Padrão |
|---|---|
| `PORT` | `5010` |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3307` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `mysql` |
| `DB_NAME` | `lift_pass` |

## Créditos

O código legado é do kata [Refactoring-Kata-Lift-Pass-Pricing](https://github.com/martinsson/Refactoring-Kata-Lift-Pass-Pricing), de Johan Martinsson. Este repositório usa esse código apenas como base para o trabalho da disciplina.
