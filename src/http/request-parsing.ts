import {parsePassDate, PassDate} from '../pricing/pass-date'

const MAX_AGE = 120
const INTEGER = /^\d+$/

export class InvalidRequestError extends Error {
}

export function parsePassType(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new InvalidRequestError('Informe o tipo do passe (type)')
    }
    return value
}

// Idade é opcional: sem idade, o preço é o de adulto.
export function parseAge(value: unknown): number | undefined {
    if (value === undefined) {
        return undefined
    }
    const age = parseInteger(value)
    if (age === undefined || age > MAX_AGE) {
        throw new InvalidRequestError(`Idade inválida: ${String(value)}. Use um número inteiro de 0 a ${MAX_AGE}`)
    }
    return age
}

// Data é opcional: sem data, não há desconto de segunda-feira.
export function parseDate(value: unknown): PassDate | undefined {
    if (value === undefined) {
        return undefined
    }
    const date = typeof value === 'string' ? parsePassDate(value) : undefined
    if (date === undefined) {
        throw new InvalidRequestError(`Data inválida: ${String(value)}. Use o formato AAAA-MM-DD`)
    }
    return date
}

export function parseCost(value: unknown): number {
    const cost = parseInteger(value)
    if (cost === undefined || cost <= 0) {
        throw new InvalidRequestError(`Preço inválido: ${String(value)}. Use um número inteiro maior que zero`)
    }
    return cost
}

function parseInteger(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
        return value
    }
    if (typeof value === 'string' && INTEGER.test(value)) {
        return Number(value)
    }
    return undefined
}
