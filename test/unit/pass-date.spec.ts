import {expect} from 'chai'

import {parsePassDate} from '../../src/pricing/pass-date'

describe('parsePassDate', () => {
    it('reconhece uma segunda-feira', () => {
        expect(parsePassDate('2019-02-11')).to.deep.equal({iso: '2019-02-11', isMonday: true})
    })

    it('reconhece um dia que não é segunda', () => {
        expect(parsePassDate('2019-02-12')).to.deep.equal({iso: '2019-02-12', isMonday: false})
    })

    it('não depende do fuso horário do servidor', () => {
        const fusoOriginal = process.env.TZ
        try {
            for (const fuso of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo', 'Pacific/Honolulu']) {
                process.env.TZ = fuso
                expect(parsePassDate('2019-02-11')?.isMonday, fuso).to.equal(true)
                expect(parsePassDate('2019-02-12')?.isMonday, fuso).to.equal(false)
            }
        } finally {
            process.env.TZ = fusoOriginal
        }
    })

    for (const invalida of ['abc', '', '2019-2-11', '11/02/2019', '2019-02-30', '2019-13-01', '2019-02-11T10:00']) {
        it(`recusa a data inválida "${invalida}"`, () => {
            expect(parsePassDate(invalida)).to.be.undefined
        })
    }
})
