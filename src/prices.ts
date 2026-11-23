import express, {Express} from 'express'
import mysql from 'mysql2/promise'

import {databaseConfig} from './config'
import {handleErrors} from './http/error-handling'
import {createLegacyRoutes} from './http/legacy-routes'
import {createV2Routes} from './http/v2-routes'
import {MysqlPricingDao} from './pricing/pricing-dao'
import {PricingService} from './pricing/pricing-service'

// Monta a API: conecta no banco, cria o serviço e registra as rotas.
export async function createApp(): Promise<{ app: Express, connection: mysql.Connection }> {
    const connection = await mysql.createConnection(databaseConfig())
    const service = new PricingService(new MysqlPricingDao(connection))

    const app = express()
    app.disable('x-powered-by')
    app.use(createLegacyRoutes(service))
    app.use('/v2', express.json(), createV2Routes(service))
    app.use(handleErrors)

    return {app, connection}
}
