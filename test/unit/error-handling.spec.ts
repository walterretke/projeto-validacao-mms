import {expect} from 'chai'
import {NextFunction, Request, Response} from 'express'

import {handleErrors} from '../../src/http/error-handling'
import {InvalidRequestError} from '../../src/http/request-parsing'
import {UnknownPassTypeError} from '../../src/pricing/pricing-service'

function respostaFalsa() {
    const resposta = {status: 0, body: undefined as unknown}
    const res = {
        status(codigo: number) {
            resposta.status = codigo
            return this
        },
        json(corpo: unknown) {
            resposta.body = corpo
            return this
        },
    }
    return {res: res as unknown as Response, resposta}
}

function tratar(erro: unknown) {
    const {res, resposta} = respostaFalsa()
    handleErrors(erro, {} as Request, res, (() => undefined) as NextFunction)
    return resposta
}

describe('Tratamento de erros da API', () => {
    it('entrada inválida vira 400 com a mensagem', () => {
        expect(tratar(new InvalidRequestError('Idade inválida'))).to.deep.equal({status: 400, body: {error: 'Idade inválida'}})
    })

    it('tipo de passe inexistente vira 404', () => {
        expect(tratar(new UnknownPassTypeError('xyz')).status).to.equal(404)
    })

    it('erro inesperado vira 500 sem expor detalhes internos', () => {
        const consoleError = console.error
        console.error = () => undefined
        try {
            expect(tratar(new Error('senha do banco errada'))).to.deep.equal({status: 500, body: {error: 'Erro interno'}})
        } finally {
            console.error = consoleError
        }
    })
})
