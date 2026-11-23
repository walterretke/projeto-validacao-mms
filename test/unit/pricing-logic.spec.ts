import {expect} from 'chai'

import {calculateCost, PassDay} from '../../src/pricing/pricing-logic'

// Testes da regra de preço pura: não usam servidor nem banco e rodam em milissegundos.

const DIA_COMUM: PassDay = {isMonday: false, isHoliday: false}
const SEGUNDA: PassDay = {isMonday: true, isHoliday: false}
const SEGUNDA_FERIADO: PassDay = {isMonday: true, isHoliday: true}

describe('PricingLogic', () => {
    describe('passe diurno (preço base 35)', () => {
        const casos = [
            {regra: 'menor de 6 anos não paga', idade: 5, diaComum: 0, segunda: 0, feriado: 0},
            {regra: 'criança de 6 a 14 anos tem 30% de desconto e não tem desconto de segunda', idade: 6, diaComum: 25, segunda: 25, feriado: 25},
            {regra: 'criança no limite de 14 anos', idade: 14, diaComum: 25, segunda: 25, feriado: 25},
            {regra: 'adulto a partir de 15 anos paga o preço cheio', idade: 15, diaComum: 35, segunda: 23, feriado: 35},
            {regra: 'adulto até 64 anos', idade: 64, diaComum: 35, segunda: 23, feriado: 35},
            {regra: 'idoso acima de 64 anos tem 25% de desconto, somado ao de segunda', idade: 65, diaComum: 27, segunda: 18, feriado: 27},
            {regra: 'sem idade é tratado como adulto', idade: undefined, diaComum: 35, segunda: 23, feriado: 35},
        ]

        for (const caso of casos) {
            it(`${caso.regra}: ${caso.diaComum} / ${caso.segunda} na segunda / ${caso.feriado} na segunda feriado`, () => {
                expect(calculateCost({passType: '1jour', basePrice: 35, age: caso.idade, day: DIA_COMUM})).to.equal(caso.diaComum)
                expect(calculateCost({passType: '1jour', basePrice: 35, age: caso.idade, day: SEGUNDA})).to.equal(caso.segunda)
                expect(calculateCost({passType: '1jour', basePrice: 35, age: caso.idade, day: SEGUNDA_FERIADO})).to.equal(caso.feriado)
            })
        }

        it('sem data não tem desconto de segunda', () => {
            expect(calculateCost({passType: '1jour', basePrice: 35, age: 30})).to.equal(35)
        })

        it('vale para qualquer tipo de passe que não seja o noturno', () => {
            expect(calculateCost({passType: 'semana', basePrice: 100, age: 30, day: SEGUNDA})).to.equal(65)
        })
    })

    describe('passe noturno (preço base 19)', () => {
        const casos = [
            {regra: 'menor de 6 anos não paga', idade: 5, preco: 0},
            {regra: 'a partir de 6 anos paga o preço cheio', idade: 6, preco: 19},
            {regra: 'adulto até 64 anos paga o preço cheio', idade: 64, preco: 19},
            {regra: 'idoso acima de 64 anos tem 60% de desconto', idade: 65, preco: 8},
            {regra: 'sem idade é tratado como adulto', idade: undefined, preco: 19},
        ]

        for (const caso of casos) {
            it(`${caso.regra}: ${caso.preco}`, () => {
                expect(calculateCost({passType: 'night', basePrice: 19, age: caso.idade, day: DIA_COMUM})).to.equal(caso.preco)
            })
        }

        it('não tem desconto de segunda', () => {
            expect(calculateCost({passType: 'night', basePrice: 19, age: 30, day: SEGUNDA})).to.equal(19)
        })
    })

    describe('arredondamento', () => {
        it('arredonda o valor final para cima', () => {
            expect(calculateCost({passType: '1jour', basePrice: 35, age: 30, day: SEGUNDA})).to.equal(23) // 22,75
        })

        it('não soma erro de ponto flutuante quando o resultado é exato', () => {
            expect(calculateCost({passType: '1jour', basePrice: 100, age: 10})).to.equal(70)
            expect(calculateCost({passType: '1jour', basePrice: 40, age: 30, day: SEGUNDA})).to.equal(26)
        })
    })
})
