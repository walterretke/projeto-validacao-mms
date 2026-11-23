const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONDAY = 1

export interface PassDate {
    iso: string
    isMonday: boolean
}

// Lê uma data no formato AAAA-MM-DD como dia do calendário, sem hora e sem fuso.
// O código legado usava new Date(texto) com getDay(), e o resultado mudava conforme
// o fuso horário do servidor (docs/01-diagnostico.md, item 5.1).
export function parsePassDate(text: string): PassDate | undefined {
    const match = ISO_DATE.exec(text)
    if (!match) {
        return undefined
    }

    const [year, month, day] = match.slice(1).map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    const isRealDate = date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day
    if (!isRealDate) {
        return undefined
    }

    return {iso: text, isMonday: date.getUTCDay() === MONDAY}
}
