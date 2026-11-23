// O código legado tem casos em que o handler lança um erro dentro de uma função async.
// O Express 4 não captura isso, a requisição fica sem resposta e o Node encerra o processo.
// Para conseguir testar esse comportamento sem derrubar o Mocha, o teste registra um
// listener de 'unhandledRejection' enquanto a requisição roda e devolve o erro capturado.
export async function capturarErroNaoTratado(requisicao: () => Promise<unknown>): Promise<{ erro: unknown, respondeu: boolean }> {
    let erro: unknown
    const listener = (motivo: unknown) => { erro = motivo }
    process.on('unhandledRejection', listener)
    try {
        let respondeu = true
        try {
            await requisicao()
        } catch {
            respondeu = false
        }
        return {erro, respondeu}
    } finally {
        process.removeListener('unhandledRejection', listener)
    }
}
