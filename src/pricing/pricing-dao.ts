import mysql from 'mysql2/promise'

// Tudo o que a regra de preço precisa do banco de dados.
// A interface permite trocar o MySQL por um dublê em memória nos testes.
export interface PricingDao {
    findBasePrice(passType: string): Promise<number | undefined>
    isHoliday(isoDate: string): Promise<boolean>
    saveBasePrice(passType: string, cost: number): Promise<void>
}

export class MysqlPricingDao implements PricingDao {
    constructor(private readonly connection: mysql.Connection) {
    }

    async findBasePrice(passType: string): Promise<number | undefined> {
        const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
            'SELECT cost FROM `base_price` WHERE `type` = ?',
            [passType])
        return rows.length > 0 ? rows[0].cost : undefined
    }

    async isHoliday(isoDate: string): Promise<boolean> {
        const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
            'SELECT 1 FROM `holidays` WHERE `holiday` = ? LIMIT 1',
            [isoDate])
        return rows.length > 0
    }

    async saveBasePrice(passType: string, cost: number): Promise<void> {
        await this.connection.query(
            'INSERT INTO `base_price` (type, cost) VALUES (?, ?) ON DUPLICATE KEY UPDATE cost = ?',
            [passType, cost, cost])
    }
}
