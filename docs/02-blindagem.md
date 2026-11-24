# Etapa 2: Blindagem com testes de caracterização

Antes de mexer em qualquer regra, eu precisava de uma rede de proteção. O código legado não tinha nenhum teste (cobertura 0%), então qualquer refatoração seria feita "no escuro".

A técnica usada foi o **teste de caracterização** (Michael Feathers, *Working Effectively with Legacy Code*): em vez de testar como o sistema *deveria* funcionar, o teste registra o que ele *faz hoje*, inclusive os comportamentos errados. Se depois da refatoração algum valor mudar, o teste avisa.

## 1. Uma mudança mínima antes dos testes

Para testar, o código precisa conectar no banco do Docker. O legado tinha a conexão fixa no código (`localhost:3306`, usuário `root`, senha `mysql`), e na minha máquina a porta 3306 já estava ocupada por outro MySQL.

Fiz a menor mudança possível para criar um ponto de configuração (o que o Feathers chama de *seam*, uma "costura"): as opções de conexão passaram a ler variáveis de ambiente, com os valores antigos como padrão. A regra de preço não foi tocada. O banco do Docker Compose passou a usar a porta **3307** por padrão (configurável com `DB_PORT`).

## 2. Como os testes funcionam

- Ficam em [`test/caracterizacao/prices.spec.ts`](../test/caracterizacao/prices.spec.ts).
- Usam **Mocha**, **Chai** e **SuperTest**, que já estavam no `package.json` do kata.
- Chamam a API de verdade, pela camada HTTP, com o **banco real** (MariaDB do Docker Compose). Assim os testes não dependem de como o código está organizado por dentro, e continuam valendo quando a estrutura mudar.
- O fuso horário é fixado em **UTC** ([`test/setup.ts`](../test/setup.ts)), porque o resultado da API depende do fuso do servidor (diagnóstico, item 5.1). Sem isso, o mesmo teste daria resultados diferentes em máquinas diferentes.
- Depois de cada teste o banco volta ao estado inicial ([`test/helpers/banco.ts`](../test/helpers/banco.ts)), porque os testes do `PUT` alteram preços.
- Os casos são escritos como **tabela** (idade x dia da semana), para ficar fácil de conferir cada regra.

## 3. O que está coberto (29 testes)

| Grupo | Casos |
|---|---|
| Passe diurno (`1jour`) | 8 faixas de idade (5, 6, 14, 15, 30, 64, 65, 80) x 3 dias (terça comum, segunda, segunda feriado), sem idade, sem data, os 3 feriados cadastrados |
| Passe noturno (`night`) | 5 faixas de idade x 3 dias |
| `PUT /prices` | altera o preço, cria tipo novo, resposta vazia |
| Comportamentos estranhos (seção 5 do diagnóstico) | fuso horário de São Paulo, noturno sem idade de graça, idade e data inválidas, criança sem desconto de segunda, tipo inexistente derrubando a API, `PUT` com preço negativo e com preço inválido |

Os valores limite foram escolhidos de propósito: 5 e 6 (fronteira do "não paga"), 14 e 15 (fronteira da criança), 64 e 65 (fronteira do idoso).

**Casos que derrubam a API.** Quando o tipo de passe não existe, o handler lança um erro dentro de uma função `async`, a requisição fica sem resposta e o Node encerra o processo. Para testar isso sem derrubar o próprio Mocha, o teste escuta o evento `unhandledRejection` enquanto a requisição roda ([`test/helpers/erro-nao-tratado.ts`](../test/helpers/erro-nao-tratado.ts)) e confere que a requisição ficou sem resposta e que o erro foi o `TypeError` esperado.

## 4. Os testes realmente protegem?

Um teste que nunca falha não protege nada. Para conferir, mudei de propósito o desconto de criança de `.7` para `.8` no código legado e rodei os testes: **3 falharam**, exatamente os casos de criança (idade 6, idade 14 e o caso 5.4, da criança na segunda-feira). Depois desfiz a mudança.

Cobertura do código legado com os testes de caracterização (`npm run test:coverage`):

| Métrica | Antes | Depois |
|---|---|---|
| Testes | 0 | 29 |
| Cobertura de linhas de `src/prices.ts` | 0% | **100%** |
| Cobertura de ramos (`if/else`) | 0% | 83% (os ramos que faltam são só os valores padrão das variáveis de ambiente) |

## 5. Como rodar

```bash
npm install
npm run db:up
npm test
```

Para ver a cobertura:

```bash
npm run test:coverage
```

> Na Etapa 3 os bugs foram corrigidos e os testes do bloco "Comportamentos estranhos congelados" foram atualizados para o comportamento novo (ver [docs/03-refatoracao.md](03-refatoracao.md#4-bugs-corrigidos)). O helper `erro-nao-tratado.ts` foi removido junto, porque a API não deixa mais erro sem tratamento. A versão exata desta etapa está na tag `etapa-2-blindagem`.
