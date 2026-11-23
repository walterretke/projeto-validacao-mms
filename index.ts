import {apiPort, databaseConfig} from './src/config'
import {createApp} from './src/prices'

const port = apiPort()

createApp()
    .then(({app}) => {
        app.listen(port, () => {
            console.log(`API de preços no ar em http://localhost:${port}`)
            console.log(`Exemplo: http://localhost:${port}/v2/prices?type=1jour&age=30&date=2019-02-11`)
        })
    })
    .catch((error: Error) => {
        const {host, port: dbPort} = databaseConfig()
        console.error(`Não foi possível conectar no banco em ${host}:${dbPort} (${error.message}).`)
        console.error('Suba o banco com "npm run db:up" e tente de novo.')
        process.exit(1)
    })
