import express, {Router} from 'express'

import {PricingService} from '../pricing/pricing-service'
import {asyncRoute} from './error-handling'
import {InvalidRequestError, parseAge, parseCost, parseDate, parsePassType} from './request-parsing'

const MAX_PASSES_PER_QUOTE = 50

interface PassBody {
    type?: unknown
    age?: unknown
}

export function createV2Routes(service: PricingService): Router {
    const router = express.Router()

    // Preço de um passe: GET /v2/prices?type=1jour&age=30&date=2019-02-11
    router.get('/prices', asyncRoute(async (req, res) => {
        const passType = parsePassType(req.query.type)
        const age = parseAge(req.query.age)
        const date = parseDate(req.query.date)

        const cost = await service.quote({passType, age}, date)

        res.json({type: passType, age, date: date?.iso, cost})
    }))

    // Preço de vários passes no mesmo dia, por exemplo uma família inteira.
    router.post('/prices/quote', asyncRoute(async (req, res) => {
        const date = parseDate(req.body.date)
        const passes = parsePasses(req.body.passes)

        const quotes = await service.quoteMany(passes, date)

        res.json({
            date: date?.iso,
            passes: quotes.map(quote => ({type: quote.passType, age: quote.age, cost: quote.cost})),
            total: quotes.reduce((total, quote) => total + quote.cost, 0),
        })
    }))

    // Cria ou altera o preço base de um tipo de passe.
    router.put('/prices/:type', asyncRoute(async (req, res) => {
        const passType = parsePassType(req.params.type)
        const cost = parseCost(req.body.cost)

        await service.saveBasePrice(passType, cost)

        res.json({type: passType, cost})
    }))

    return router
}

function parsePasses(value: unknown): { passType: string, age?: number }[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PASSES_PER_QUOTE) {
        throw new InvalidRequestError(`Informe de 1 a ${MAX_PASSES_PER_QUOTE} passes na lista "passes"`)
    }
    return value.map((pass: PassBody) => ({
        passType: parsePassType(pass?.type),
        age: parseAge(pass?.age),
    }))
}
