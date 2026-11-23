import {expect} from 'chai'
import request from 'supertest'
import {Express} from 'express'
import mysql from 'mysql2/promise'

import {createApp} from '../../src/prices'

// Teste de paridade do Strangler Fig: para toda entrada válida, a implementação nova
// (/v2/prices) precisa devolver exatamente o mesmo preço que o código legado (/prices).
// Só assim é seguro apontar o endpoint antigo para a implementação nova.
//
// Diferença intencional, fora desta comparação: passe noturno sem idade.
// O legado cobra 0 (bug 5.2 do diagnóstico) e a versão nova cobra preço de adulto.

const TIPOS = ['1jour', 'night']
const IDADES = [undefined, '0', '5', '6', '14', '15', '30', '64', '65', '80']
const DATAS = [undefined, '2019-02-11', '2019-02-12', '2019-02-17', '2019-02-18', '2019-02-25', '2019-03-04', '2019-03-11']

describe('Paridade entre o legado e a implementação nova', () => {
    let app: Express
    let connection: mysql.Connection

    before(async () => {
        ({app, connection} = await createApp() as { app: Express, connection: mysql.Connection })
    })

    after(async () => {
        await connection.end()
    })

    for (const tipo of TIPOS) {
        for (const idade of IDADES) {
            if (tipo === 'night' && idade === undefined) {
                continue
            }
            it(`type=${tipo} age=${idade ?? '(sem)'}: mesmo preço nas ${DATAS.length} datas`, async () => {
                for (const data of DATAS) {
                    const query = {type: tipo, age: idade, date: data}
                    const legado = await request(app).get('/prices').query(query)
                    const novo = await request(app).get('/v2/prices').query(query)

                    expect(novo.body.cost, `date=${data}`).to.equal(legado.body.cost)
                }
            })
        }
    }
})
