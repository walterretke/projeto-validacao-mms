import {ConnectionOptions} from 'mysql2/promise'

// Os valores padrão batem com o docker-compose.yml, para o projeto rodar sem configuração.
export function databaseConfig(env: NodeJS.ProcessEnv = process.env): ConnectionOptions {
    return {
        host: env.DB_HOST ?? 'localhost',
        port: Number(env.DB_PORT ?? 3307),
        user: env.DB_USER ?? 'root',
        password: env.DB_PASSWORD ?? 'mysql',
        database: env.DB_NAME ?? 'lift_pass',
    }
}

export function apiPort(env: NodeJS.ProcessEnv = process.env): number {
    return Number(env.PORT ?? 5010)
}
