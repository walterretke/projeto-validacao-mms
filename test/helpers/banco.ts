import mysql from 'mysql2/promise'

// Volta as tabelas para o estado do database/initDatabase.sql,
// para um teste que altera preço não interferir no próximo.
export async function restaurarBanco(connection: mysql.Connection): Promise<void> {
    await connection.query("DELETE FROM base_price WHERE type NOT IN ('1jour', 'night')")
    await connection.query("UPDATE base_price SET cost = 35 WHERE type = '1jour'")
    await connection.query("UPDATE base_price SET cost = 19 WHERE type = 'night'")
}
