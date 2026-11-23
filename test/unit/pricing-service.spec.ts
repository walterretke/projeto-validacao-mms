import {expect} from 'chai'

import {parsePassDate, PassDate} from '../../src/pricing/pass-date'
import {PricingDao} from '../../src/pricing/pricing-dao'
import {PricingService, UnknownPassTypeError} from '../../src/pricing/pricing-service'

// Dublê do banco em memória: o serviço é testado sem MySQL.
class PricingDaoEmMemoria implements PricingDao {
    readonly precos = new Map([['1jour', 35], ['night', 19]])
    readonly feriados = new Set(['2019-02-18'])
    consultasDeFeriado = 0

    async findBasePrice(passType: string): Promise<number | undefined> {
        return this.precos.get(passType)
    }

    async isHoliday(isoDate: string): Promise<boolean> {
        this.consultasDeFeriado++
        return this.feriados.has(isoDate)
    }

    async saveBasePrice(passType: string, cost: number): Promise<void> {
        this.precos.set(passType, cost)
    }
}

function data(texto: string): PassDate {
    return parsePassDate(texto) as PassDate
}

describe('PricingService', () => {
    let dao: PricingDaoEmMemoria
    let service: PricingService

    beforeEach(() => {
        dao = new PricingDaoEmMemoria()
        service = new PricingService(dao)
    })

    it('calcula o preço usando o preço base do banco', async () => {
        expect(await service.quote({passType: '1jour', age: 30}, data('2019-02-12'))).to.equal(35)
    })

    it('aplica o desconto de segunda quando não é feriado', async () => {
        expect(await service.quote({passType: '1jour', age: 30}, data('2019-02-11'))).to.equal(23)
    })

    it('não aplica o desconto de segunda num feriado', async () => {
        expect(await service.quote({passType: '1jour', age: 30}, data('2019-02-18'))).to.equal(35)
    })

    it('sem data não consulta feriado', async () => {
        expect(await service.quote({passType: '1jour', age: 30})).to.equal(35)
        expect(dao.consultasDeFeriado).to.equal(0)
    })

    it('recusa tipo de passe que não existe', async () => {
        let erro: unknown
        try {
            await service.quote({passType: 'xyz', age: 30})
        } catch (e) {
            erro = e
        }
        expect(erro).to.be.instanceOf(UnknownPassTypeError)
    })

    it('calcula o preço de vários passes no mesmo dia consultando o feriado uma vez só', async () => {
        const passes = [
            {passType: '1jour', age: 40},
            {passType: '1jour', age: 38},
            {passType: '1jour', age: 10},
            {passType: '1jour', age: 4},
        ]

        const cotacoes = await service.quoteMany(passes, data('2019-02-11'))

        expect(cotacoes.map(c => c.cost)).to.deep.equal([23, 23, 25, 0])
        expect(dao.consultasDeFeriado).to.equal(1)
    })

    it('grava o preço base', async () => {
        await service.saveBasePrice('1jour', 50)

        expect(await service.quote({passType: '1jour', age: 30})).to.equal(50)
    })
})
