import {expect} from 'chai'

import {apiPort, databaseConfig} from '../../src/config'

describe('Configuração', () => {
    it('sem variáveis de ambiente usa o banco do docker-compose.yml e a porta 5010', () => {
        expect(databaseConfig({})).to.deep.equal({host: 'localhost', port: 3307, user: 'root', password: 'mysql', database: 'lift_pass'})
        expect(apiPort({})).to.equal(5010)
    })

    it('lê o banco e a porta das variáveis de ambiente', () => {
        const env = {DB_HOST: 'banco', DB_PORT: '3306', DB_USER: 'app', DB_PASSWORD: 'segredo', DB_NAME: 'precos', PORT: '8080'}

        expect(databaseConfig(env)).to.deep.equal({host: 'banco', port: 3306, user: 'app', password: 'segredo', database: 'precos'})
        expect(apiPort(env)).to.equal(8080)
    })
})
