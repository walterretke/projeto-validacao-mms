# Etapa 3: Refatoração com Strangler Fig

Com os testes de caracterização da Etapa 2 protegendo o comportamento, a refatoração podia começar. O objetivo era resolver os problemas do diagnóstico e, principalmente, destravar o pedido do cliente: **consultar o preço de vários passes de uma vez** (uma família inteira, por exemplo).

## 1. Estratégia: Strangler Fig

Em vez de reescrever o `src/prices.ts` de uma vez, usei o padrão **Strangler Fig** (Martin Fowler). O nome vem de uma figueira que cresce em volta de uma árvore até substituí-la. No software, a ideia é a mesma: o código novo cresce **ao lado** do legado, e o tráfego é passado para ele só quando ele já provou que funciona. Em nenhum momento o sistema fica quebrado.

Os passos, cada um num commit separado:

| Passo | Commit | O que muda para quem usa a API |
|---|---|---|
| 1 | Extrai a regra de preço para `PricingLogic`, uma função pura | Nada. Código novo, ainda sem uso. |
| 2 | Cria `PricingDao` e `PricingService` | Nada. |
| 3 | Implementação nova em `/v2`, ao lado do código legado | Ganha `/v2/prices` e a consulta de vários passes. `/prices` continua o legado. |
| 4 | `/prices` passa a usar a implementação nova | `/prices` responde igual para entradas válidas. Os bugs foram corrigidos. O código legado é apagado. |

No passo 3 havia um **teste de paridade** ([`paridade.spec.ts`](https://github.com/walterretke/projeto-validacao-mms/blob/etapa-3-strangler-v2/test/integracao/paridade.spec.ts), na tag `etapa-3-strangler-v2`) que chamava os dois endpoints com 19 combinações de tipo e idade, em 8 datas cada, e exigia **o mesmo preço** nos dois. Foi ele que deu segurança para o passo 4. Depois do passo 4 os dois endpoints usam o mesmo código, então o teste perdeu o sentido e foi removido.

## 2. Nova estrutura

```
src/
├── pricing/                  regra de negócio (não conhece HTTP)
│   ├── pricing-logic.ts      regra de preço pura: sem banco, sem HTTP
│   ├── pass-date.ts          leitura da data como dia do calendário (sem fuso)
│   ├── pricing-dao.ts        acesso ao MySQL (preço base e feriados)
│   └── pricing-service.ts    junta o DAO com a regra; calcula um ou vários passes
├── http/                     camada web (não conhece regra de preço)
│   ├── v2-routes.ts          GET /v2/prices, POST /v2/prices/quote, PUT /v2/prices/:type
│   ├── legacy-routes.ts      GET e PUT /prices, contrato antigo mantido
│   ├── request-parsing.ts    validação da entrada (tipo, idade, data, preço)
│   └── error-handling.ts     erros viram 400, 404 ou 500, sem derrubar a API
├── config.ts                 banco e porta por variáveis de ambiente
└── prices.ts                 monta a aplicação (createApp)
```

A regra de preço ficou assim (trecho de [`pricing-logic.ts`](../src/pricing/pricing-logic.ts)):

```ts
export function calculateCost(input: PriceInput): number {
    if (isFree(input.age)) {
        return 0
    }
    if (input.passType === NIGHT_PASS) {
        return nightCost(input)
    }
    return dayCost(input)
}
```

## 3. O que foi resolvido do diagnóstico

| # | Problema (docs/01-diagnostico.md) | Como ficou |
|---|---|---|
| 1 | God Function: tudo no handler HTTP | Regra em `PricingLogic`, banco em `PricingDao`, HTTP em `src/http` |
| 2 | Arrow Code, 5 níveis de `if` | Funções pequenas com retorno antecipado. Aninhamento máximo: 1 |
| 3 | HTTP, SQL e regra misturados | Camadas separadas. A regra é testada sem banco e sem servidor |
| 4 | Magic numbers | Constantes com nome: `FREE_UNDER_AGE`, `MONDAY_DISCOUNT_PERCENT`... |
| 5 | Conta de desconto duplicada 3 vezes | Uma função só, `applyDiscounts` |
| 6 | Idade e data como string sem validação | `request-parsing.ts` converte e valida, e responde 400 com mensagem clara |
| 7 | Credenciais fixas no código | `config.ts` lê variáveis de ambiente (os padrões batem com o Docker Compose local) |
| 8 | Conexão criada sem ponto de injeção | `PricingService` recebe a interface `PricingDao`; os testes usam um dublê em memória |
| 9 e 10 | Variáveis não usadas, `let` no lugar de `const` | Removidos |
| 11 | Lê todos os feriados a cada pedido | Consulta só a data pedida, e só uma vez por cotação de vários passes |
| 12 | TODO esquecido | Virou decisão documentada (ver seção 5) |
| 13 | Resposta igual ao `SELECT` do banco | Respostas montadas explicitamente |
| - | `X-Powered-By` (issue de segurança do Sonar) | Desligado |

## 4. Bugs corrigidos

Quando o `/prices` passou a usar a implementação nova (passo 4), rodei os 29 testes de caracterização **sem mudar nada neles**:

- os **20 testes de comportamento normal passaram**: preços de todas as idades, dias e tipos continuaram iguais;
- **falharam exatamente os 9 testes** que congelavam os comportamentos estranhos da seção 5 do diagnóstico.

Era o resultado esperado: a refatoração não mudou nada que não devia, e os únicos pontos diferentes eram os bugs. Esses 9 testes foram então atualizados, um a um, para o comportamento correto, e cada um diz no nome o que acontecia antes.

| Bug | Antes | Depois |
|---|---|---|
| 5.1 Fuso horário | Em São Paulo o desconto de segunda caía na terça | Data lida como dia do calendário: mesmo resultado em qualquer fuso |
| 5.2 Noturno sem idade | Saía de graça (0) | Preço de adulto (19), igual ao passe diurno |
| 5.3 Idade ou data inválida | Aceitava e cobrava 0 ou preço cheio | `400` com mensagem: `Idade inválida: abc. Use um número inteiro de 0 a 120` |
| 5.5 Tipo de passe inexistente | A requisição ficava sem resposta e **o processo caía** | `404` com mensagem, e a API continua no ar |
| 5.6 `PUT` sem validação | Gravava preço negativo; com preço inválido derrubava a API | `400` e nada é gravado |

## 5. Decisão: o que **não** foi corrigido

**5.4 Criança não recebe o desconto de segunda.** No código legado havia um `// TODO apply reduction for others`, e o resultado é que numa segunda a criança paga 25 e o adulto paga 23. Isso pode ser um bug ou uma regra comercial (por exemplo, o desconto de segunda ser só para adultos). Como é uma **decisão de negócio** e não um erro técnico, não cabe ao desenvolvedor decidir sozinho. A regra foi mantida como está, ficou explícita num comentário em `dayCost` e num teste com nome claro, e fica pendente de confirmação com o cliente. Se o cliente decidir mudar, é uma linha de código e um teste.

## 6. Nova funcionalidade: vários passes de uma vez

O pedido de evolução do diagnóstico agora existe:

```
POST /v2/prices/quote
Content-Type: application/json

{
  "date": "2019-02-11",
  "passes": [
    {"type": "1jour", "age": 40},
    {"type": "1jour", "age": 38},
    {"type": "1jour", "age": 10},
    {"type": "1jour", "age": 4}
  ]
}
```

Resposta:

```json
{
  "date": "2019-02-11",
  "passes": [
    {"type": "1jour", "age": 40, "cost": 23},
    {"type": "1jour", "age": 38, "cost": 23},
    {"type": "1jour", "age": 10, "cost": 25},
    {"type": "1jour", "age": 4, "cost": 0}
  ],
  "total": 71
}
```

Antes isso exigiria copiar o handler inteiro. Agora o `PricingService.quoteMany` só chama a mesma regra para cada passe, consultando o feriado uma única vez.

## 7. Antes e depois

Medido com a mesma configuração de ESLint da Etapa 1 ([`eslint-metricas.config.mjs`](eslint-metricas.config.mjs)):

| Métrica | Antes (legado) | Depois |
|---|---|---|
| Maior complexidade ciclomática de uma função | 15 (handler do `GET`) | 7 (`databaseConfig`, pelos valores padrão) |
| Maior complexidade na regra de preço | 15 | 4 (`dayCost`) |
| Aninhamento máximo | 5 níveis | 1 nível |
| Maior função (comandos) | 30 | 9 |
| Conversões `as any` | 5 | 0 |
| Avisos de `prefer-const` | 7 | 0 |
| Testes automatizados | 0 | 89 (34 unitários sem banco, que rodam em milissegundos) |
| Cobertura de linhas | 0% | 100% |
| Tipo inexistente derruba a API | Sim | Não |

O código ficou maior em linhas (de 87 para cerca de 440, somando todos os arquivos), o que é esperado: agora tem validação, tratamento de erro, um endpoint novo e cada responsabilidade num arquivo. O que importa é que cada parte ficou pequena, com nome claro e testada.

(O ESLint com a regra `no-unused-vars` padrão ainda mostra 9 avisos, mas são falsos positivos: a regra padrão do ESLint não entende assinaturas de interface do TypeScript. Na Etapa 4 o lint passa a usar o `typescript-eslint`, que entende.)

## 8. Como testar na mão

```bash
npm run db:up
npm start
```

No navegador:

- http://localhost:5010/v2/prices?type=1jour&age=30&date=2019-02-11 (segunda: 23)
- http://localhost:5010/v2/prices?type=1jour&age=30&date=2019-02-18 (segunda feriado: 35)
- http://localhost:5010/v2/prices?type=xyz&age=30 (404, a API continua no ar)
- http://localhost:5010/v2/prices?type=night&age=abc (400)
