export const NIGHT_PASS = 'night'

export const FREE_UNDER_AGE = 6
export const CHILD_UNDER_AGE = 15
export const SENIOR_OVER_AGE = 64

export const CHILD_DAY_DISCOUNT_PERCENT = 30
export const SENIOR_DAY_DISCOUNT_PERCENT = 25
export const SENIOR_NIGHT_DISCOUNT_PERCENT = 60
export const MONDAY_DISCOUNT_PERCENT = 35

export interface PassDay {
    isMonday: boolean
    isHoliday: boolean
}

export interface PriceInput {
    passType: string
    basePrice: number
    age?: number
    day?: PassDay
}

// Regra de preço do passe, sem HTTP e sem banco de dados.
// Idade não informada é tratada como adulto. Dia não informado não tem desconto de segunda.
export function calculateCost(input: PriceInput): number {
    if (isFree(input.age)) {
        return 0
    }
    if (input.passType === NIGHT_PASS) {
        return nightCost(input)
    }
    return dayCost(input)
}

function nightCost({basePrice, age}: PriceInput): number {
    if (isSenior(age)) {
        return applyDiscounts(basePrice, [SENIOR_NIGHT_DISCOUNT_PERCENT])
    }
    return basePrice
}

function dayCost({basePrice, age, day}: PriceInput): number {
    // Criança não recebe o desconto de segunda. É a regra que existe hoje
    // e ainda depende de confirmação do cliente (ver docs/03-refatoracao.md).
    if (isChild(age)) {
        return applyDiscounts(basePrice, [CHILD_DAY_DISCOUNT_PERCENT])
    }

    const discounts: number[] = []
    if (isSenior(age)) {
        discounts.push(SENIOR_DAY_DISCOUNT_PERCENT)
    }
    if (hasMondayDiscount(day)) {
        discounts.push(MONDAY_DISCOUNT_PERCENT)
    }
    return applyDiscounts(basePrice, discounts)
}

function isFree(age?: number): boolean {
    return age !== undefined && age < FREE_UNDER_AGE
}

function isChild(age?: number): boolean {
    return age !== undefined && age < CHILD_UNDER_AGE
}

function isSenior(age?: number): boolean {
    return age !== undefined && age > SENIOR_OVER_AGE
}

function hasMondayDiscount(day?: PassDay): boolean {
    return day !== undefined && day.isMonday && !day.isHoliday
}

// Os descontos são aplicados um sobre o outro e o valor final é arredondado para cima.
// A conta é feita com inteiros e uma única divisão para não acumular erro de ponto flutuante.
function applyDiscounts(basePrice: number, discountPercents: number[]): number {
    const numerator = discountPercents.reduce((total, percent) => total * (100 - percent), basePrice)
    const denominator = 100 ** discountPercents.length
    return Math.ceil(numerator / denominator)
}

export function groupDiscount(passes: any[], date: any) {
    let total = 0
    for (let pass of passes) {
        if (pass.age >= 6) {
            if (passes.length > 3) {
                if (passes.length > 10) {
                    if (new Date(date).getDay() == 6) {
                        total = total + pass.cost * .8
                    } else {
                        total = total + pass.cost * .85
                    }
                } else {
                    total = total + pass.cost * .9
                }
            } else {
                total = total + pass.cost
            }
        }
    }
    return Math.ceil(total)
}
