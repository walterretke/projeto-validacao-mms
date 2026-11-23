import {PassDate} from './pass-date'
import {PricingDao} from './pricing-dao'
import {calculateCost} from './pricing-logic'

export interface PassRequest {
    passType: string
    age?: number
}

export interface PassQuote extends PassRequest {
    cost: number
}

export class UnknownPassTypeError extends Error {
    constructor(readonly passType: string) {
        super(`Tipo de passe não encontrado: ${passType}`)
    }
}

// Junta o banco (preço base e feriados) com a regra de preço pura.
export class PricingService {
    constructor(private readonly dao: PricingDao) {
    }

    async quote(pass: PassRequest, date?: PassDate): Promise<number> {
        const [quote] = await this.quoteMany([pass], date)
        return quote.cost
    }

    // Vários passes para o mesmo dia, por exemplo uma família inteira.
    async quoteMany(passes: PassRequest[], date?: PassDate): Promise<PassQuote[]> {
        const day = date && {isMonday: date.isMonday, isHoliday: await this.dao.isHoliday(date.iso)}

        const quotes: PassQuote[] = []
        for (const pass of passes) {
            const basePrice = await this.findBasePrice(pass.passType)
            quotes.push({...pass, cost: calculateCost({...pass, basePrice, day})})
        }
        return quotes
    }

    async saveBasePrice(passType: string, cost: number): Promise<void> {
        await this.dao.saveBasePrice(passType, cost)
    }

    private async findBasePrice(passType: string): Promise<number> {
        const basePrice = await this.dao.findBasePrice(passType)
        if (basePrice === undefined) {
            throw new UnknownPassTypeError(passType)
        }
        return basePrice
    }
}
