import {expect} from 'chai'
import request from 'supertest'
import {Express} from 'express'
import mysql from 'mysql2/promise'

import {createApp} from '../../src/prices'
import {restaurarBanco} from '../helpers/banco'
import {capturarErroNaoTratado} from '../helpers/erro-nao-tratado'

// Testes de caracterização: registram o que a API responde HOJE, certo ou errado.
// Eles não dizem como o sistema deveria funcionar. Servem de rede de proteção para
// a refatoração: se algum valor mudar, o teste avisa.

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

    // Comportamentos estranhos encontrados no diagnóstico (docs/01-diagnostico.md, seção 5).
    // Estão congelados como estão hoje. Corrigir é uma decisão separada da refatoração.
    describe('Comportamentos estranhos congelados', () => {
        describe('5.1 o resultado depende do fuso horário do servidor', () => {
            beforeEach(() => { process.env.TZ = 'America/Sao_Paulo' })
            afterEach(() => { process.env.TZ = 'UTC' })

            it('em São Paulo o desconto de segunda vai para a terça', async () => {
                expect(await consultarPreco({type: '1jour', age: '30', date: SEGUNDA})).to.equal(35)
                expect(await consultarPreco({type: '1jour', age: '30', date: TERCA})).to.equal(23)
            })

            it('em São Paulo o feriado é reconhecido um dia depois', async () => {
                expect(await consultarPreco({type: '1jour', age: '30', date: '2019-02-19'})).to.equal(35)
            })

            it('em São Paulo o idoso paga 27 numa segunda em vez de 18', async () => {
                expect(await consultarPreco({type: '1jour', age: '70', date: SEGUNDA})).to.equal(27)
            })
        })

        it('5.2 passe noturno sem idade sai de graça', async () => {
            expect(await consultarPreco({type: 'night', date: TERCA})).to.equal(0)
        })

        it('5.3 idade inválida: de graça no noturno, preço de adulto no diurno', async () => {
            expect(await consultarPreco({type: 'night', age: 'abc', date: TERCA})).to.equal(0)
            expect(await consultarPreco({type: '1jour', age: 'abc', date: TERCA})).to.equal(35)
            expect(await consultarPreco({type: '1jour', age: 'abc', date: SEGUNDA})).to.equal(23)
        })

        it('5.3 data inválida é aceita e não tem desconto', async () => {
            expect(await consultarPreco({type: '1jour', age: '30', date: 'abc'})).to.equal(35)
        })

        it('5.4 criança não recebe o desconto de segunda e paga mais que o adulto', async () => {
            expect(await consultarPreco({type: '1jour', age: '10', date: SEGUNDA})).to.equal(25)
            expect(await consultarPreco({type: '1jour', age: '30', date: SEGUNDA})).to.equal(23)
        })

        it('5.5 tipo de passe inexistente com criança menor de 6 devolve 0', async () => {
            expect(await consultarPreco({type: 'xyz', age: '5', date: TERCA})).to.equal(0)
        })

        it('5.5 tipo de passe inexistente fica sem resposta e gera erro não tratado', async () => {
            const {erro, respondeu} = await capturarErroNaoTratado(() =>
                request(app).get('/prices').query({type: 'xyz', age: '30', date: TERCA}).timeout(1000))

            expect(respondeu).to.equal(false)
            expect(erro).to.be.instanceOf(TypeError)
            expect((erro as Error).message).to.contain("reading 'cost'")
        })

        it('5.6 PUT aceita preço negativo', async () => {
            await request(app).put('/prices').query({type: 'teste', cost: '-50'})

            expect(await consultarPreco({type: 'teste', age: '30', date: TERCA})).to.equal(-50)
        })

        it('5.6 PUT com preço que não é número fica sem resposta e gera erro não tratado', async () => {
            const {erro, respondeu} = await capturarErroNaoTratado(() =>
                request(app).put('/prices').query({type: 'teste', cost: 'abc'}).timeout(1000))

            expect(respondeu).to.equal(false)
            expect((erro as Error).message).to.contain('Incorrect integer value')
        })
    })
})
