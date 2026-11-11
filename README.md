# Projeto de Validação - Manutenção e Melhoria de Software

Projeto prático "ponta a ponta" para validar a disciplina de Manutenção e Melhoria de Software (MMS). A ideia é pegar um código legado e aplicar nele os quatro pilares da disciplina: **diagnóstico** (levantar métricas, complexidade e code smells com análise estática), **blindagem** (testes de caracterização que congelam o comportamento atual), **refatoração** (corrigir as fragilidades encontradas, sempre protegido pelos testes) e **automação** (pipeline de CI/CD com Quality Gate). O histórico do Git mostra o antes e o depois do código.

## Sistema escolhido

O código legado é o kata [Lift Pass Pricing](https://github.com/martinsson/Refactoring-Kata-Lift-Pass-Pricing), criado por **Johan Martinsson** para treinar refatoração de código legado. Foi usada a versão em TypeScript.

É uma API HTTP (Express) ligada a um banco MySQL/MariaDB que calcula o preço do passe de esqui de acordo com o tipo do passe, a idade e a data. A regra de negócio está toda misturada com o endpoint e com o SQL, o que dá material para as quatro etapas.

## Etapas

| Etapa | Descrição | Status |
|---|---|---|
| 1. Diagnóstico | Análise estática (SonarQube e ESLint), métricas, code smells e débito técnico | Concluída ([relatório](docs/01-diagnostico.md)) |
| 2. Blindagem | Testes de caracterização para congelar o comportamento atual | Pendente |
| 3. Refatoração | Separação da regra de negócio e migração com Strangler Fig | Pendente |
| 4. Automação | Pipeline de CI/CD com Quality Gate | Pendente |

> O commit `Importa código legado do Lift Pass Pricing (versão TypeScript)` (tag `legado-original`) é o estado **"antes"**: o código original do kata, sem nenhuma alteração.

## Como rodar

Pré-requisitos: **Node.js 18+** e **Docker**.

```bash
npm install
npm run db:up
npm start
```

A API fica em http://localhost:5010. Exemplo de chamada:

```
GET http://localhost:5010/prices?type=1jour&age=30&date=2019-02-11
```

Para derrubar o banco:

```bash
npm run db:down
```

## Análise estática local

Para subir o SonarQube em http://localhost:9000:

```bash
npm run sonar:up
```

O passo a passo completo (criar o projeto, gerar o token e rodar o scan) está na seção [Como reproduzir a análise](docs/01-diagnostico.md#8-como-reproduzir-a-análise) do relatório.

## Estrutura

```
.
├── database/
│   └── initDatabase.sql          # criação do banco lift_pass e dados iniciais
├── docs/
│   ├── 01-diagnostico.md         # relatório da Etapa 1
│   ├── eslint-metricas.config.mjs  # configuração do ESLint usada para as métricas
│   └── img/                      # prints do SonarQube
├── src/
│   └── prices.ts                 # código legado: API e regra de preço
├── docker-compose.yml            # MariaDB, SonarQube e sonar-scanner
├── index.ts                      # sobe a API na porta 5010
├── package.json
├── sonar-project.properties      # configuração da análise do SonarQube
└── tsconfig.json
```

## Créditos

O código legado é do kata [Refactoring-Kata-Lift-Pass-Pricing](https://github.com/martinsson/Refactoring-Kata-Lift-Pass-Pricing), de Johan Martinsson. Este repositório usa esse código apenas como base para o trabalho da disciplina.
