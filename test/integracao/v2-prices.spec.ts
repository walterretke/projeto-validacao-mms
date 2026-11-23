import {expect} from 'chai'
import request from 'supertest'
import {Express} from 'express'
import mysql from 'mysql2/promise'

import {createApp} from '../../src/prices'
import {restaurarBanco} from '../helpers/banco'

describe('API v2 (implementação nova, com banco real)', () => {
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

    describe('GET /v2/prices', () => {
        it('devolve o preço com os dados da consulta', async () => {
            const response = await request(app).get('/v2/prices').query({type: '1jour', age: '30', date: '2019-02-11'})

            expect(response.status).to.equal(200)
            expect(response.body).to.deep.equal({type: '1jour', age: 30, date: '2019-02-11', cost: 23})
        })

        it('reconhece o feriado cadastrado no banco', async () => {
            const response = await request(app).get('/v2/prices').query({type: '1jour', age: '30', date: '2019-02-18'})

            expect(response.body.cost).to.equal(35)
        })

        it('responde 404 para tipo de passe que não existe', async () => {
            const response = await request(app).get('/v2/prices').query({type: 'xyz', age: '30'})

            expect(response.status).to.equal(404)
            expect(response.body.error).to.equal('Tipo de passe não encontrado: xyz')
        })

        const invalidas = [
            {descricao: 'sem tipo', query: {age: '30'}},
            {descricao: 'idade que não é número', query: {type: '1jour', age: 'abc'}},
            {descricao: 'idade negativa', query: {type: '1jour', age: '-1'}},
            {descricao: 'idade com casas decimais', query: {type: '1jour', age: '10.5'}},
            {descricao: 'idade acima de 120', query: {type: '1jour', age: '200'}},
            {descricao: 'data em outro formato', query: {type: '1jour', date: '11/02/2019'}},
            {descricao: 'data que não existe', query: {type: '1jour', date: '2019-02-30'}},
        ]

        for (const caso of invalidas) {
            it(`responde 400 para ${caso.descricao}`, async () => {
                const response = await request(app).get('/v2/prices').query(caso.query)

                expect(response.status).to.equal(400)
                expect(response.body.error).to.be.a('string')
            })
        }
    })

    describe('POST /v2/prices/quote (vários passes de uma vez)', () => {
        it('calcula o preço de uma família numa segunda-feira', async () => {
            const response = await request(app).post('/v2/prices/quote').send({
                date: '2019-02-11',
                passes: [
                    {type: '1jour', age: 40},
                    {type: '1jour', age: 38},
                    {type: '1jour', age: 10},
                    {type: '1jour', age: 4},
                    {type: 'night', age: 70},
                ],
            })

            expect(response.status).to.equal(200)
            expect(response.body).to.deep.equal({
                date: '2019-02-11',
                passes: [
                    {type: '1jour', age: 40, cost: 23},
                    {type: '1jour', age: 38, cost: 23},
                    {type: '1jour', age: 10, cost: 25},
                    {type: '1jour', age: 4, cost: 0},
                    {type: 'night', age: 70, cost: 8},
                ],
                total: 79,
            })
        })

        it('responde 400 sem lista de passes', async () => {
            const response = await request(app).post('/v2/prices/quote').send({date: '2019-02-11'})

            expect(response.status).to.equal(400)
        })

        it('responde 400 quando um dos passes é inválido', async () => {
            const response = await request(app).post('/v2/prices/quote').send({passes: [{type: '1jour', age: 30}, {type: '1jour', age: 'abc'}]})

            expect(response.status).to.equal(400)
            expect(response.body.error).to.contain('Idade inválida')
        })

        it('responde 404 quando um dos passes tem tipo que não existe', async () => {
            const response = await request(app).post('/v2/prices/quote').send({passes: [{type: 'xyz'}]})

            expect(response.status).to.equal(404)
        })

        it('responde 400 para JSON malformado', async () => {
            const response = await request(app).post('/v2/prices/quote').set('Content-Type', 'application/json').send('{"passes": [')

            expect(response.status).to.equal(400)
        })
    })

    describe('PUT /v2/prices/:type', () => {
        it('grava o preço base e devolve o que foi gravado', async () => {
            const response = await request(app).put('/v2/prices/1jour').send({cost: 50})

            expect(response.status).to.equal(200)
            expect(response.body).to.deep.equal({type: '1jour', cost: 50})
            const consulta = await request(app).get('/v2/prices').query({type: '1jour', age: '30'})
            expect(consulta.body.cost).to.equal(50)
        })

        for (const custo of [-50, 0, 'abc', 10.5, undefined]) {
            it(`responde 400 para preço ${String(custo)} e não grava nada`, async () => {
                const response = await request(app).put('/v2/prices/1jour').send({cost: custo})

                expect(response.status).to.equal(400)
                const consulta = await request(app).get('/v2/prices').query({type: '1jour', age: '30'})
                expect(consulta.body.cost).to.equal(35)
            })
        }
    })

    it('a API continua no ar depois de um erro', async () => {
        await request(app).get('/v2/prices').query({type: 'xyz'})

        const response = await request(app).get('/v2/prices').query({type: 'night', age: '30'})
        expect(response.status).to.equal(200)
    })
})
