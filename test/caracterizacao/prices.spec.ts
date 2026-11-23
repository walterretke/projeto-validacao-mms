import {expect} from 'chai'
import request from 'supertest'
import {Express} from 'express'
import mysql from 'mysql2/promise'

import {createApp} from '../../src/prices'
import {restaurarBanco} from '../helpers/banco'

// Testes de caracterização: registram o que a API respondia na Etapa 2, certo ou errado.
// Serviram de rede de proteção para a refatoração: se algum valor mudasse, o teste avisava.
// Os testes de comportamento normal continuam iguais desde a Etapa 2. Só os do bloco
// "Bugs corrigidos" foram alterados, de propósito, quando os bugs foram corrigidos.

const TERCA = '2019-02-12'
const SEGUNDA = '2019-02-11'
const SEGUNDA_FERIADO = '2019-02-18'

describe('Caracterização da API legada', () => {
    let app: Express
    let connection: mysql.Connection

    before(async () => {
        ({app, connection} = await createApp() as { app: Express, connection: mysql.Connection })
    })

    afterEach(async () => {
        await restaurarBanco(connection)
    })

    after(async () => {
        await connection.end()
    })

    async function consultarPreco(query: Record<string, string>): Promise<number> {
        const response = await request(app).get('/prices').query(query)
        expect(response.status).to.equal(200)
        return response.body.cost
    }

    describe('GET /prices, passe diurno (1jour, preço base 35)', () => {
        const casos = [
            // idade,  terça, segunda, segunda feriado
            {idade: '5', terca: 0, segunda: 0, feriado: 0},
            {idade: '6', terca: 25, segunda: 25, feriado: 25},
            {idade: '14', terca: 25, segunda: 25, feriado: 25},
            {idade: '15', terca: 35, segunda: 23, feriado: 35},
            {idade: '30', terca: 35, segunda: 23, feriado: 35},
            {idade: '64', terca: 35, segunda: 23, feriado: 35},
            {idade: '65', terca: 27, segunda: 18, feriado: 27},
            {idade: '80', terca: 27, segunda: 18, feriado: 27},
        ]

        for (const caso of casos) {
            it(`idade ${caso.idade}: terça ${caso.terca}, segunda ${caso.segunda}, segunda feriado ${caso.feriado}`, async () => {
                expect(await consultarPreco({type: '1jour', age: caso.idade, date: TERCA})).to.equal(caso.terca)
                expect(await consultarPreco({type: '1jour', age: caso.idade, date: SEGUNDA})).to.equal(caso.segunda)
                expect(await consultarPreco({type: '1jour', age: caso.idade, date: SEGUNDA_FERIADO})).to.equal(caso.feriado)
            })
        }

        it('sem idade é tratado como adulto: terça 35, segunda 23', async () => {
            expect(await consultarPreco({type: '1jour', date: TERCA})).to.equal(35)
            expect(await consultarPreco({type: '1jour', date: SEGUNDA})).to.equal(23)
        })

        it('sem data não tem desconto de segunda: 35', async () => {
            expect(await consultarPreco({type: '1jour', age: '30'})).to.equal(35)
        })

        it('todos os feriados cadastrados anulam o desconto de segunda', async () => {
            for (const feriado of ['2019-02-18', '2019-02-25', '2019-03-04']) {
                expect(await consultarPreco({type: '1jour', age: '30', date: feriado})).to.equal(35)
            }
        })
    })

    describe('GET /prices, passe noturno (night, preço base 19)', () => {
        const casos = [
            {idade: '5', preco: 0},
            {idade: '6', preco: 19},
            {idade: '30', preco: 19},
            {idade: '64', preco: 19},
            {idade: '65', preco: 8},
        ]

        for (const caso of casos) {
            it(`idade ${caso.idade}: ${caso.preco}, em qualquer dia`, async () => {
                for (const data of [TERCA, SEGUNDA, SEGUNDA_FERIADO]) {
                    expect(await consultarPreco({type: 'night', age: caso.idade, date: data})).to.equal(caso.preco)
                }
            })
        }
    })

    describe('PUT /prices', () => {
        it('altera o preço base e responde 200 com corpo vazio', async () => {
            const response = await request(app).put('/prices').query({type: '1jour', cost: '50'})

            expect(response.status).to.equal(200)
            expect(response.text).to.equal('')
            expect(await consultarPreco({type: '1jour', age: '30', date: TERCA})).to.equal(50)
        })

        it('cria um tipo de passe novo', async () => {
            await request(app).put('/prices').query({type: 'semana', cost: '100'})

            expect(await consultarPreco({type: 'semana', age: '30', date: TERCA})).to.equal(100)
        })
    })

    it('avisa que o endpoint é antigo e aponta para a /v2', async () => {
        const response = await request(app).get('/prices').query({type: '1jour', age: '30'})

        expect(response.headers['deprecation']).to.equal('true')
        expect(response.headers['link']).to.equal('</v2/prices>; rel="successor-version"')
    })

    // Regra mantida de propósito: é decisão de negócio, não bug técnico (docs/03-refatoracao.md).
    it('5.4 criança não recebe o desconto de segunda e paga mais que o adulto', async () => {
        expect(await consultarPreco({type: '1jour', age: '10', date: SEGUNDA})).to.equal(25)
        expect(await consultarPreco({type: '1jour', age: '30', date: SEGUNDA})).to.equal(23)
    })

    // Comportamentos estranhos do diagnóstico (docs/01-diagnostico.md, seção 5).
    // Na Etapa 2 eles estavam congelados como eram. Na Etapa 3 foram corrigidos,
    // e cada teste abaixo diz o que acontecia antes.
    describe('Bugs corrigidos', () => {
        describe('5.1 o resultado não depende mais do fuso horário do servidor', () => {
            beforeEach(() => { process.env.TZ = 'America/Sao_Paulo' })
            afterEach(() => { process.env.TZ = 'UTC' })

            it('em São Paulo o desconto de segunda cai na segunda (antes caía na terça)', async () => {
                expect(await consultarPreco({type: '1jour', age: '30', date: SEGUNDA})).to.equal(23)
                expect(await consultarPreco({type: '1jour', age: '30', date: TERCA})).to.equal(35)
            })

            it('em São Paulo o feriado é reconhecido no dia certo', async () => {
                expect(await consultarPreco({type: '1jour', age: '30', date: SEGUNDA_FERIADO})).to.equal(35)
                expect(await consultarPreco({type: '1jour', age: '30', date: '2019-02-19'})).to.equal(35)
            })

            it('em São Paulo o idoso paga 18 numa segunda (antes pagava 27)', async () => {
                expect(await consultarPreco({type: '1jour', age: '70', date: SEGUNDA})).to.equal(18)
            })
        })

        it('5.2 passe noturno sem idade cobra preço de adulto (antes saía de graça)', async () => {
            expect(await consultarPreco({type: 'night', date: TERCA})).to.equal(19)
        })

        it('5.3 idade inválida responde 400 (antes saía de graça no noturno)', async () => {
            for (const tipo of ['night', '1jour']) {
                const response = await request(app).get('/prices').query({type: tipo, age: 'abc', date: TERCA})

                expect(response.status).to.equal(400)
                expect(response.body.error).to.contain('Idade inválida')
            }
        })

        it('5.3 data inválida responde 400 (antes era aceita)', async () => {
            const response = await request(app).get('/prices').query({type: '1jour', age: '30', date: 'abc'})

            expect(response.status).to.equal(400)
            expect(response.body.error).to.contain('Data inválida')
        })

        it('5.5 tipo de passe inexistente responde 404 e a API continua no ar (antes derrubava o processo)', async () => {
            for (const idade of ['5', '30']) {
                const response = await request(app).get('/prices').query({type: 'xyz', age: idade, date: TERCA})

                expect(response.status).to.equal(404)
            }
            expect(await consultarPreco({type: 'night', age: '30'})).to.equal(19)
        })

        it('5.6 PUT recusa preço negativo, zero ou que não é número (antes gravava ou derrubava a API)', async () => {
            for (const custo of ['-50', '0', 'abc']) {
                const response = await request(app).put('/prices').query({type: 'teste', cost: custo})

                expect(response.status, `cost=${custo}`).to.equal(400)
            }
            const consulta = await request(app).get('/prices').query({type: 'teste'})
            expect(consulta.status).to.equal(404)
        })
    })
})
