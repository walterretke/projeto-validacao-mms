// Chama a API em funcionamento e mostra os resultados de forma legível.
// Uso: com a API no ar (npm start), rode npm run demo em outro terminal.

const API = process.env.API_URL ?? 'http://localhost:5010'

interface Chamada {
    descricao: string
    metodo?: 'GET' | 'POST'
    caminho: string
    corpo?: unknown
}

const chamadas: Chamada[] = [
    {descricao: 'Adulto, terça-feira comum', caminho: '/v2/prices?type=1jour&age=30&date=2019-02-12'},
    {descricao: 'Adulto, segunda-feira (35% de desconto)', caminho: '/v2/prices?type=1jour&age=30&date=2019-02-11'},
    {descricao: 'Adulto, segunda-feira feriado (sem desconto)', caminho: '/v2/prices?type=1jour&age=30&date=2019-02-18'},
    {descricao: 'Criança de 10 anos', caminho: '/v2/prices?type=1jour&age=10&date=2019-02-12'},
    {descricao: 'Idoso de 70 anos, segunda-feira', caminho: '/v2/prices?type=1jour&age=70&date=2019-02-11'},
    {descricao: 'Passe noturno, idoso', caminho: '/v2/prices?type=night&age=70'},
    {descricao: 'Passe noturno sem idade (era 0 no legado)', caminho: '/v2/prices?type=night'},
    {descricao: 'Endpoint antigo /prices (continua funcionando)', caminho: '/prices?type=1jour&age=30&date=2019-02-11'},
    {descricao: 'Idade inválida (era aceita no legado)', caminho: '/v2/prices?type=night&age=abc'},
    {descricao: 'Tipo inexistente (derrubava a API)', caminho: '/v2/prices?type=xyz&age=30'},
    {
        descricao: 'Família numa segunda-feira (funcionalidade nova)',
        metodo: 'POST',
        caminho: '/v2/prices/quote',
        corpo: {
            date: '2019-02-11',
            passes: [
                {type: '1jour', age: 40},
                {type: '1jour', age: 38},
                {type: '1jour', age: 10},
                {type: '1jour', age: 4},
            ],
        },
    },
]

async function executar(chamada: Chamada): Promise<void> {
    const metodo = chamada.metodo ?? 'GET'
    const resposta = await fetch(API + chamada.caminho, {
        method: metodo,
        headers: {'Content-Type': 'application/json'},
        body: chamada.corpo === undefined ? undefined : JSON.stringify(chamada.corpo),
    })
    const corpo = await resposta.text()

    console.log(`\n> ${chamada.descricao}`)
    console.log(`  ${metodo} ${chamada.caminho}`)
    if (chamada.corpo !== undefined) {
        console.log(`  corpo: ${JSON.stringify(chamada.corpo)}`)
    }
    console.log(`  ${resposta.status} ${corpo}`)
}

async function main(): Promise<void> {
    for (const chamada of chamadas) {
        await executar(chamada)
    }
}

main().catch((erro: Error) => {
    console.error(`Não foi possível chamar a API em ${API} (${erro.message}). Ela está no ar? Rode "npm start" em outro terminal.`)
    process.exit(1)
})
