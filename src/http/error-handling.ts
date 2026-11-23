import {NextFunction, Request, RequestHandler, Response} from 'express'

import {UnknownPassTypeError} from '../pricing/pricing-service'
import {InvalidRequestError} from './request-parsing'

type AsyncHandler = (req: Request, res: Response) => Promise<void>

// O Express 4 não captura erro lançado dentro de função async: a requisição ficava
// sem resposta e o processo caía (docs/01-diagnostico.md, item 5.5). Este wrapper
// encaminha o erro para o tratador abaixo.
export function asyncRoute(handler: AsyncHandler): RequestHandler {
    return (req, res, next) => {
        handler(req, res).catch(next)
    }
}

export function handleErrors(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (error instanceof InvalidRequestError) {
        res.status(400).json({error: error.message})
    } else if (isMalformedJson(error)) {
        res.status(400).json({error: 'O corpo da requisição não é um JSON válido'})
    } else if (error instanceof UnknownPassTypeError) {
        res.status(404).json({error: error.message})
    } else {
        console.error(error)
        res.status(500).json({error: 'Erro interno'})
    }
}

function isMalformedJson(error: unknown): boolean {
    return error instanceof SyntaxError && (error as { type?: string }).type === 'entity.parse.failed'
}
