/**
 * Utilitários de cálculo para Folha de Salários, Pró-labore e Encargos Previdenciários / Fiscais
 * Conforme legislação brasileira vigente:
 * - INSS Patronal: 20,00% (Lei 8.212/91 art. 22, I)
 * - RAT / SAT: 3,00% (grau de risco médio 2, padrão editável)
 * - Outras Entidades / Terceiros: 5,80% (Sistema S - Sesi/Senai/Sesc/Senac/Sebrae/Incra/Salário-Educação)
 * - Total Encargos Patronais = 28,80%
 *
 * Para o Sócio (Retenção informativa na pessoa física, não despesa da PJ):
 * - INSS retido sócio: 11% sobre o pró-labore, limitado ao teto do RGPS (2025: R$ 8.157,41, teto máx R$ 897,32 ou teto de 11% até R$ 908,86)
 * - IRPF retido sócio: Tabela progressiva mensal simplificada
 *   Até R$ 2.259,20: Isento
 *   De 2.259,21 até 2.826,65: 7,5% (dedução 169,44)
 *   De 2.826,66 até 3.751,05: 15,0% (dedução 381,44)
 *   De 3.751,06 até 4.664,68: 22,5% (dedução 662,77)
 *   Acima de 4.664,68: 27,5% (dedução 896,00)
 */

export interface PayrollCalculationInput {
  payrollSalaries: number // Folha de salários mensal (R$)
  proLabore: number // Pró-labore mensal dos sócios (R$)
  inssPatronalRate: number // % padrão 20.00
  ratRate: number // % padrão 3.00
  terceirosRate: number // % padrão 5.80
}

export interface PayrollCalculationResult {
  totalBase: number // folha + pró-labore
  totalPatronalRate: number // inssPatronalRate + ratRate + terceirosRate
  patronalChargesTotal: number // encargos patronais totais (R$)
  inssPatronalValue: number // parcela INSS 20%
  ratValue: number // parcela RAT
  terceirosValue: number // parcela Terceiros
  totalLaborExpense: number // salários + pró-labore + encargos patronais (despesa total da PJ)
  // Informativos do sócio (PF - não é despesa da PJ)
  socioInssRetido: number
  socioIrpfBase: number
  socioIrpfRetido: number
  socioNetProLabore: number
}

// Teto RGPS 2024/2025: R$ 8.157,41 (11% máximo = R$ 897,32)
export const TETO_INSS_RGPS = 8157.41
export const ALIQUOTA_INSS_SOCIO = 11.0

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const salaries = Math.max(0, input.payrollSalaries || 0)
  const proLabore = Math.max(0, input.proLabore || 0)
  const inssRate = Math.max(0, input.inssPatronalRate ?? 20.0)
  const ratRate = Math.max(0, input.ratRate ?? 3.0)
  const terceirosRate = Math.max(0, input.terceirosRate ?? 5.8)

  const totalBase = salaries + proLabore
  const totalPatronalRate = inssRate + ratRate + terceirosRate

  const inssPatronalValue = (totalBase * inssRate) / 100
  const ratValue = (totalBase * ratRate) / 100
  const terceirosValue = (totalBase * terceirosRate) / 100
  const patronalChargesTotal = inssPatronalValue + ratValue + terceirosValue

  const totalLaborExpense = salaries + proLabore + patronalChargesTotal

  // Retenções informativas do Sócio (PF)
  const socioBaseInss = Math.min(proLabore, TETO_INSS_RGPS)
  const socioInssRetido = (socioBaseInss * ALIQUOTA_INSS_SOCIO) / 100

  // Base do IRPF sobre pró-labore: pró-labore bruto - INSS retido
  const socioIrpfBase = Math.max(0, proLabore - socioInssRetido)
  const socioIrpfRetido = calculateProgressiveIrpf(socioIrpfBase)
  const socioNetProLabore = Math.max(0, proLabore - socioInssRetido - socioIrpfRetido)

  return {
    totalBase,
    totalPatronalRate,
    patronalChargesTotal,
    inssPatronalValue,
    ratValue,
    terceirosValue,
    totalLaborExpense,
    socioInssRetido,
    socioIrpfBase,
    socioIrpfRetido,
    socioNetProLabore,
  }
}

/**
 * Tabela progressiva mensal vigente do IRPF (estimativa simplificada)
 */
export function calculateProgressiveIrpf(baseCalculo: number): number {
  if (baseCalculo <= 2259.2) {
    return 0
  }
  if (baseCalculo <= 2826.65) {
    const ir = (baseCalculo * 7.5) / 100 - 169.44
    return Math.max(0, ir)
  }
  if (baseCalculo <= 3751.05) {
    const ir = (baseCalculo * 15.0) / 100 - 381.44
    return Math.max(0, ir)
  }
  if (baseCalculo <= 4664.68) {
    const ir = (baseCalculo * 22.5) / 100 - 662.77
    return Math.max(0, ir)
  }
  const ir = (baseCalculo * 27.5) / 100 - 896.0
  return Math.max(0, ir)
}
