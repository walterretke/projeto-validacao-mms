import express, {Response, Router} from 'express'

import {PricingService} from '../pricing/pricing-service'
import {asyncRoute} from './error-handling'
import {parseAge, parseCost, parseDate, parsePassType} from './request-parsing'

// Contrato antigo de /prices, mantido para os clientes que já usam.
// Por dentro, usa a mesma implementação da /v2 (último passo do Strangler Fig).
export function createLegacyRoutes(service: PricingService): Router {
    const router = express.Router()

    router.get('/prices', asyncRoute(async (req, res) => {
        markAsDeprecated(res)
        const passType = parsePassType(req.query.type)
        const age = parseAge(req.query.age)
        const date = parseDate(req.query.date)

        const cost = await service.quote({passType, age}, date)

        res.json({cost})
    }))

    router.put('/prices', asyncRoute(async (req, res) => {
        markAsDeprecated(res)
        const passType = parsePassType(req.query.type)
        const cost = parseCost(req.query.cost)

        await service.saveBasePrice(passType, cost)

        res.end()
    }))

    return router
}

function markAsDeprecated(res: Response): void {
    res.set('Deprecation', 'true')
    res.set('Link', '</v2/prices>; rel="successor-version"')
}
