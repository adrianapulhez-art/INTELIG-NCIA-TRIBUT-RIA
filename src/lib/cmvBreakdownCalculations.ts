import { formatBRL, formatNumberBR } from './taxCalculations'
import type { PurchaseItem, AdditionalCostItem, DeductionCostItem } from '../contexts/TaxContext'

export interface ProductCmvBreakdownItem {
  id: string
  name: string
  quantity: number
  unitGross: number
  totalGross: number
  unitFreight: number
  totalFreight: number
  unitIcmsMerch: number
  totalIcmsMerch: number
  unitIcmsFreight: number
  totalIcmsFreight: number
  unitPisMerch?: number
  totalPisMerch?: number
  unitCofinsMerch?: number
  totalCofinsMerch?: number
  unitNetPurchases: number
  totalNetPurchases: number
}

export interface CmvBreakdownLine {
  id: string
  label: string
  type: 'addition' | 'deduction' | 'subtotal' | 'total' | 'info'
  unitValue: number | null
  totalValue: number
  description?: string
}

export interface RegimeCmvBreakdown {
  regime: 'presumido' | 'real' | 'simples'
  regimeLabel: string
  unitCmv: number | null
  totalCmv: number
  isMultiProduct: boolean
  productBreakdowns?: ProductCmvBreakdownItem[]
  // Componentes totais de compras / aquisição
  merchandiseTotal: number
  freightTotal: number
  otherCostsTotal: number
  ipiTotal: number
  stTotal: number
  grossTotal: number
  deductionsBaseTotal: number
  // Tributos discriminados (em R$)
  icmsMerchandise: number
  icmsFreight: number
  totalIcms: number
  pisMerchandise: number
  pisFreight: number
  totalPis: number
  cofinsMerchandise: number
  cofinsFreight: number
  totalCofins: number
  // Net purchases
  netPurchases: number
  // Estoque
  initialInventory: number
  finalInventory: number
  // Flags
  isAutoInventory: boolean
  soldUnits: number
  purchasedUnits: number
  availableUnits: number
  isQuantityCapped: boolean
  // Linhas discriminadas prontas para renderização
  lines: CmvBreakdownLine[]
}

export interface CmvBreakdownInput {
  regime: 'presumido' | 'real' | 'simples'
  purchasesItems: PurchaseItem[]
  additionalCosts: AdditionalCostItem[]
  deductionCosts: DeductionCostItem[]
  initialInventory: number
  finalInventory: number
  autoInventoryDeduction: boolean
  initialInventoryUnits?: number
  // Tributos globais (quando não vêm de purchasesItems)
  nonRecoverableTaxBase: number
  nonRecoverableTaxRate: number
  icmsPurchasesBase: number
  icmsPurchasesRate: number
  icmsFreightPurchasesBase: number
  icmsFreightPurchasesRate: number
  pisPurchasesBase: number
  pisRatePurchases: number
  cofinsPurchasesBase: number
  cofinsRatePurchases: number
  pisFreightPurchasesBase: number
  cofinsFreightPurchasesBase: number
  pisExcludedIcmsManual: number | null
  cofinsExcludedIcmsManual: number | null
  // Subsistema ST
  stSubsystemEnabled: boolean
  stSubsystemPurchasesPaid: number
  // Quantidade vendida e totais consolidados
  quantitySold: number // unidades vendidas da tela atual (DRE ou Compras)
  // Totais apurados pelo TaxContext (para bater com fidelidade absoluta de centavos)
  cmvPresumidoNetPurchasesContext?: number
  cmvPresumidoContext?: number
  cmvRealNetPurchasesContext?: number
  cmvRealContext?: number
  cmvSimplesNetPurchasesContext?: number
  cmvSimplesContext?: number
  unitCostPresumidoContext?: number
  unitCostRealContext?: number
  unitCostSimplesContext?: number
  autoFinalInventoryPresumidoContext?: number
  autoFinalInventoryRealContext?: number
  autoFinalInventorySimplesContext?: number
}

/**
 * Calcula a memória discriminada item a item da composição do CMV por regime.
 * Garante que:
 * 1. Cada tributo/dedução seja exibido com seu valor em R$ individualmente.
 * 2. A soma das parcelas bate 100% centavo por centavo com o CMV oficial do TaxContext.
 * 3. Preserva o princípio contábil:
 *    - Lucro Presumido: Mercadorias + Frete + outros − Deduções − ICMS mercadoria − ICMS frete (+ ST se houver)
 *    - Lucro Real: Mercadorias + Frete + outros − Deduções − ICMS mercadoria − ICMS frete − PIS − COFINS (+ ST se houver)
 *    - Simples Nacional: Mercadorias + Frete + outros (+ IPI/ST integrados) − Deduções base (tributos integram o custo)
 */
export function calculateCmvDetailedBreakdown(input: CmvBreakdownInput): RegimeCmvBreakdown {
  const {
    regime,
    purchasesItems,
    additionalCosts,
    deductionCosts,
    initialInventory,
    finalInventory,
    autoInventoryDeduction,
    initialInventoryUnits = 0,
    nonRecoverableTaxBase,
    nonRecoverableTaxRate,
    icmsPurchasesBase,
    icmsPurchasesRate,
    icmsFreightPurchasesBase,
    icmsFreightPurchasesRate,
    pisPurchasesBase,
    pisRatePurchases,
    cofinsPurchasesBase,
    cofinsRatePurchases,
    pisFreightPurchasesBase,
    cofinsFreightPurchasesBase,
    pisExcludedIcmsManual,
    cofinsExcludedIcmsManual,
    stSubsystemEnabled,
    stSubsystemPurchasesPaid,
    quantitySold,
  } = input

  const hasPurchasesItemsData = purchasesItems.some(
    (item) =>
      (item.merchandiseValue || 0) > 0 ||
      (item.quantity || 0) > 0 ||
      (item.freightValue || 0) > 0 ||
      (item.stValue || 0) > 0,
  )

  // Somatórios dos itens
  const purchasedUnits = purchasesItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
  const merchandiseTotal = purchasesItems.reduce((acc, it) => acc + (it.merchandiseValue || 0), 0)
  const freightTotal = purchasesItems.reduce((acc, it) => acc + (it.freightValue || 0), 0)
  const itemsIpi = purchasesItems.reduce((acc, it) => acc + (it.calculatedIpi || 0), 0)
  const itemsIcms = purchasesItems.reduce((acc, it) => acc + (it.calculatedIcms || 0), 0)
  const itemsFreightIcms = purchasesItems.reduce((acc, it) => acc + (it.icmsFreightValue || 0), 0)
  const itemsPis = purchasesItems.reduce((acc, it) => acc + (it.calculatedPis || 0), 0)
  const itemsCofins = purchasesItems.reduce((acc, it) => acc + (it.calculatedCofins || 0), 0)
  const itemsSt = purchasesItems.reduce((acc, it) => acc + (it.stValue || 0), 0)

  // Custos adicionais e deduções base
  const otherCostsTotal = additionalCosts.reduce((acc, c) => acc + (c.value || 0), 0)
  const deductionsBaseTotal = deductionCosts.reduce((acc, d) => acc + (d.value || 0), 0)

  // IPI / Tributos não recuperáveis
  const globalIpi = (nonRecoverableTaxBase * nonRecoverableTaxRate) / 100
  const ipiTotal = hasPurchasesItemsData ? itemsIpi : globalIpi

  // ST global ou dos itens
  const stTotal = stSubsystemEnabled ? Math.max(0, stSubsystemPurchasesPaid || 0) : itemsSt

  // ICMS sobre mercadorias
  const globalIcms = (icmsPurchasesBase * icmsPurchasesRate) / 100
  const icmsMerchandise = hasPurchasesItemsData ? itemsIcms : globalIcms

  // ICMS sobre frete
  const globalIcmsFreight = (icmsFreightPurchasesBase * icmsFreightPurchasesRate) / 100
  const icmsFreight = hasPurchasesItemsData ? itemsFreightIcms : globalIcmsFreight
  const totalIcms = icmsMerchandise + icmsFreight

  // PIS / COFINS
  const globalPisFreight = (pisFreightPurchasesBase * pisRatePurchases) / 100
  const globalCofinsFreight = (cofinsFreightPurchasesBase * cofinsRatePurchases) / 100

  const effectiveIcmsToExclude =
    pisExcludedIcmsManual !== null ? pisExcludedIcmsManual : icmsMerchandise

  const pisAdjustedBase = Math.max(0, pisPurchasesBase - effectiveIcmsToExclude)
  const globalPisPurchases = (pisAdjustedBase * pisRatePurchases) / 100

  const cofinsAdjustedBase = Math.max(
    0,
    cofinsPurchasesBase -
      (cofinsExcludedIcmsManual !== null ? cofinsExcludedIcmsManual : icmsMerchandise),
  )
  const globalCofinsPurchases = (cofinsAdjustedBase * cofinsRatePurchases) / 100

  const pisMerchandise = hasPurchasesItemsData ? itemsPis : globalPisPurchases
  const cofinsMerchandise = hasPurchasesItemsData ? itemsCofins : globalCofinsPurchases
  const pisFreight = globalPisFreight
  const cofinsFreight = globalCofinsFreight
  const totalPis = pisMerchandise + pisFreight
  const totalCofins = cofinsMerchandise + cofinsFreight

  // Base bruta
  const baseGrossPurchases = hasPurchasesItemsData
    ? merchandiseTotal + freightTotal + otherCostsTotal
    : otherCostsTotal
  const grossTotal = baseGrossPurchases + ipiTotal

  // Compras líquidas por regime
  const cmvPresumidoNetPurchases =
    input.cmvPresumidoNetPurchasesContext !== undefined
      ? input.cmvPresumidoNetPurchasesContext
      : grossTotal + stTotal - deductionsBaseTotal - icmsMerchandise - icmsFreight

  const cmvRealNetPurchases =
    input.cmvRealNetPurchasesContext !== undefined
      ? input.cmvRealNetPurchasesContext
      : grossTotal +
        stTotal -
        deductionsBaseTotal -
        icmsMerchandise -
        icmsFreight -
        totalPis -
        totalCofins

  const cmvSimplesNetPurchases =
    input.cmvSimplesNetPurchasesContext !== undefined
      ? input.cmvSimplesNetPurchasesContext
      : grossTotal + stTotal - deductionsBaseTotal

  // Custos totais apropriados para baixa por quantidade
  const totalItemsCostPresumido = purchasesItems.reduce(
    (acc, it) => acc + (it.costPresumido || 0),
    0,
  )
  const totalItemsCostReal = purchasesItems.reduce((acc, it) => acc + (it.costReal || 0), 0)
  const totalItemsCostSimples = purchasesItems.reduce((acc, it) => acc + (it.costSimples || 0), 0)

  const purchasesCostPresumido = hasPurchasesItemsData
    ? totalItemsCostPresumido
    : cmvPresumidoNetPurchases
  const purchasesCostReal = hasPurchasesItemsData ? totalItemsCostReal : cmvRealNetPurchases
  const purchasesCostSimples = hasPurchasesItemsData
    ? totalItemsCostSimples
    : cmvSimplesNetPurchases

  const unitCostPresumidoAuto =
    input.unitCostPresumidoContext !== undefined
      ? input.unitCostPresumidoContext
      : purchasedUnits > 0
        ? purchasesCostPresumido / purchasedUnits
        : 0

  const unitCostRealAuto =
    input.unitCostRealContext !== undefined
      ? input.unitCostRealContext
      : purchasedUnits > 0
        ? purchasesCostReal / purchasedUnits
        : 0

  const unitCostSimplesAuto =
    input.unitCostSimplesContext !== undefined
      ? input.unitCostSimplesContext
      : purchasedUnits > 0
        ? purchasesCostSimples / purchasedUnits
        : 0

  const availableUnits = (purchasedUnits || 0) + Math.max(0, initialInventoryUnits || 0)
  const generalSoldUnits = quantitySold > 0 ? quantitySold : 0
  const cappedSoldUnits =
    availableUnits > 0 ? Math.min(generalSoldUnits, availableUnits) : generalSoldUnits
  const isQuantityCapped = availableUnits > 0 && generalSoldUnits > availableUnits

  // CMV de cada regime
  const legacyCmvPresumido = Math.max(
    0,
    initialInventory + cmvPresumidoNetPurchases - finalInventory,
  )
  const legacyCmvReal = Math.max(0, initialInventory + cmvRealNetPurchases - finalInventory)
  const legacyCmvSimples = Math.max(0, initialInventory + cmvSimplesNetPurchases - finalInventory)

  const autoCmvPresumido = unitCostPresumidoAuto * cappedSoldUnits
  const autoCmvReal = unitCostRealAuto * cappedSoldUnits
  const autoCmvSimples = unitCostSimplesAuto * cappedSoldUnits

  const autoFinalInventoryPresumido =
    input.autoFinalInventoryPresumidoContext !== undefined
      ? input.autoFinalInventoryPresumidoContext
      : Math.max(0, initialInventory + purchasesCostPresumido - autoCmvPresumido)

  const autoFinalInventoryReal =
    input.autoFinalInventoryRealContext !== undefined
      ? input.autoFinalInventoryRealContext
      : Math.max(0, initialInventory + purchasesCostReal - autoCmvReal)

  const autoFinalInventorySimples =
    input.autoFinalInventorySimplesContext !== undefined
      ? input.autoFinalInventorySimplesContext
      : Math.max(0, initialInventory + purchasesCostSimples - autoCmvSimples)

  let netPurchases = 0
  let totalCmv = 0
  let unitCmv = 0
  let effectiveFinalInventory = finalInventory

  if (regime === 'presumido') {
    netPurchases = cmvPresumidoNetPurchases
    totalCmv = autoInventoryDeduction
      ? input.cmvPresumidoContext !== undefined
        ? input.cmvPresumidoContext
        : autoCmvPresumido
      : input.cmvPresumidoContext !== undefined
        ? input.cmvPresumidoContext
        : legacyCmvPresumido
    unitCmv = autoInventoryDeduction
      ? unitCostPresumidoAuto
      : purchasedUnits > 0
        ? totalCmv / purchasedUnits
        : totalCmv
    effectiveFinalInventory = autoInventoryDeduction ? autoFinalInventoryPresumido : finalInventory
  } else if (regime === 'real') {
    netPurchases = cmvRealNetPurchases
    totalCmv = autoInventoryDeduction
      ? input.cmvRealContext !== undefined
        ? input.cmvRealContext
        : autoCmvReal
      : input.cmvRealContext !== undefined
        ? input.cmvRealContext
        : legacyCmvReal
    unitCmv = autoInventoryDeduction
      ? unitCostRealAuto
      : purchasedUnits > 0
        ? totalCmv / purchasedUnits
        : totalCmv
    effectiveFinalInventory = autoInventoryDeduction ? autoFinalInventoryReal : finalInventory
  } else {
    netPurchases = cmvSimplesNetPurchases
    totalCmv = autoInventoryDeduction
      ? input.cmvSimplesContext !== undefined
        ? input.cmvSimplesContext
        : autoCmvSimples
      : input.cmvSimplesContext !== undefined
        ? input.cmvSimplesContext
        : legacyCmvSimples
    unitCmv = autoInventoryDeduction
      ? unitCostSimplesAuto
      : purchasedUnits > 0
        ? totalCmv / purchasedUnits
        : totalCmv
    effectiveFinalInventory = autoInventoryDeduction ? autoFinalInventorySimples : finalInventory
  }

  // Regra conceitual de tratamento consolidado:
  // "As tratativas consolidadas não podem fazer média, e sim considerar o resultado consolidado
  // de cada item, e aí sim gerar a soma consolidada."
  // Proibido dividir total consolidado pela quantidade total quando há produtos diferentes.
  const isMultiProduct = purchasesItems.length > 1

  // Detalhamento individual por produto (quando houver itens)
  const productBreakdowns: ProductCmvBreakdownItem[] = purchasesItems.map((item, idx) => {
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1
    const gross = item.merchandiseValue || 0
    const freight = item.freightValue || 0
    const icmsM = item.calculatedIcms || 0
    const icmsF = item.icmsFreightValue || 0
    const pisM = item.calculatedPis || 0
    const cofM = item.calculatedCofins || 0

    let net = 0
    if (regime === 'presumido') {
      net =
        item.costPresumido !== undefined && Number.isFinite(item.costPresumido)
          ? item.costPresumido
          : gross + freight + (item.stValue || 0) + (item.calculatedIpi || 0) - icmsM - icmsF
    } else if (regime === 'real') {
      net =
        item.costReal !== undefined && Number.isFinite(item.costReal)
          ? item.costReal
          : gross +
            freight +
            (item.stValue || 0) +
            (item.calculatedIpi || 0) -
            icmsM -
            icmsF -
            pisM -
            cofM
    } else {
      net =
        item.costSimples !== undefined && Number.isFinite(item.costSimples)
          ? item.costSimples
          : gross + freight + (item.stValue || 0) + (item.calculatedIpi || 0)
    }

    return {
      id: item.id || `item-${idx}`,
      name: item.name || `Produto ${idx + 1}`,
      quantity: item.quantity || 0,
      unitGross: qty > 0 ? gross / qty : 0,
      totalGross: gross,
      unitFreight: qty > 0 ? freight / qty : 0,
      totalFreight: freight,
      unitIcmsMerch: qty > 0 ? icmsM / qty : 0,
      totalIcmsMerch: icmsM,
      unitIcmsFreight: qty > 0 ? icmsF / qty : 0,
      totalIcmsFreight: icmsF,
      unitPisMerch: qty > 0 ? pisM / qty : 0,
      totalPisMerch: pisM,
      unitCofinsMerch: qty > 0 ? cofM / qty : 0,
      totalCofinsMerch: cofM,
      unitNetPurchases: qty > 0 ? net / qty : 0,
      totalNetPurchases: net,
    }
  })

  // Divisor para os componentes unitários:
  // Se for produto único (purchasesItems.length <= 1) com quantidade > 0, unitários são legítimos daquele produto.
  // Se for multi-produto, NUNCA dividimos o total agregado pela quantidade acumulada de produtos distintos.
  const divisor = !isMultiProduct && purchasedUnits > 0 ? purchasedUnits : 1

  const regimeLabel =
    regime === 'presumido'
      ? 'Lucro Presumido'
      : regime === 'real'
        ? 'Lucro Real'
        : 'Simples Nacional'

  // Montagem das linhas discriminadas item a item
  const lines: CmvBreakdownLine[] = []

  // 1. Mercadoria
  lines.push({
    id: 'merchandise',
    label: '(+) Mercadorias adquiridas',
    type: 'addition',
    unitValue: isMultiProduct ? null : merchandiseTotal / divisor,
    totalValue: merchandiseTotal,
    description:
      purchasedUnits > 0
        ? isMultiProduct
          ? `${purchasedUnits} un. compradas em multi-itens`
          : `${purchasedUnits} un. compradas`
        : 'Valor base de mercadorias',
  })

  // 2. Frete sobre compras
  if (freightTotal > 0) {
    lines.push({
      id: 'freight',
      label: '(+) Frete sobre compras',
      type: 'addition',
      unitValue: isMultiProduct ? null : freightTotal / divisor,
      totalValue: freightTotal,
      description: 'Integra o custo de aquisição nos 3 regimes (art. 289 RIR/18)',
    })
  }

  // 3. Outros custos adicionais (seguro, embalagem, rateios)
  if (otherCostsTotal > 0) {
    lines.push({
      id: 'other_costs',
      label: '(+) Outros custos adicionais',
      type: 'addition',
      unitValue: isMultiProduct ? null : otherCostsTotal / divisor,
      totalValue: otherCostsTotal,
      description: 'Seguros, armazenagem e encargos rateados',
    })
  }

  // 4. IPI não recuperável
  if (ipiTotal > 0) {
    lines.push({
      id: 'ipi',
      label: '(+) IPI não recuperável',
      type: 'addition',
      unitValue: isMultiProduct ? null : ipiTotal / divisor,
      totalValue: ipiTotal,
      description: 'Integra o custo quando a empresa não for indústria contribuinte',
    })
  }

  // 5. ICMS-ST pago na compra
  if (stTotal > 0) {
    lines.push({
      id: 'st',
      label: '(+) ICMS-ST pago na compra',
      type: 'addition',
      unitValue: isMultiProduct ? null : stTotal / divisor,
      totalValue: stTotal,
      description: 'Integra o custo de aquisição (tributação concentrada na entrada)',
    })
  }

  // 6. Deduções base da compra (devoluções, abatimentos, descontos incondicionais)
  if (deductionsBaseTotal > 0) {
    lines.push({
      id: 'deductions_base',
      label: '(−) Devoluções / Abatimentos / Descontos',
      type: 'deduction',
      unitValue: isMultiProduct ? null : -deductionsBaseTotal / divisor,
      totalValue: -deductionsBaseTotal,
      description: 'Deduções comerciais obtidas na aquisição',
    })
  }

  // 7. Deduções de tributos recuperáveis conforme o regime
  if (regime === 'presumido') {
    // Lucro Presumido: Apenas ICMS mercadoria e ICMS frete deduzem
    if (icmsMerchandise > 0) {
      lines.push({
        id: 'icms_merch',
        label: '(−) ICMS sobre mercadoria recuperável',
        type: 'deduction',
        unitValue: isMultiProduct ? null : -icmsMerchandise / divisor,
        totalValue: -icmsMerchandise,
        description: 'Crédito básico de ICMS destacado na nota de aquisição',
      })
    }
    if (icmsFreight > 0) {
      lines.push({
        id: 'icms_freight',
        label: '(−) ICMS sobre frete recuperável',
        type: 'deduction',
        unitValue: isMultiProduct ? null : -icmsFreight / divisor,
        totalValue: -icmsFreight,
        description: 'Crédito de ICMS relativo ao Conhecimento de Transporte (CT-e)',
      })
    }
  } else if (regime === 'real') {
    // Lucro Real: ICMS, ICMS frete, PIS e COFINS são recuperáveis
    if (icmsMerchandise > 0) {
      lines.push({
        id: 'icms_merch',
        label: '(−) ICMS sobre mercadoria recuperável',
        type: 'deduction',
        unitValue: isMultiProduct ? null : -icmsMerchandise / divisor,
        totalValue: -icmsMerchandise,
        description: 'Crédito de ICMS destacado na nota fiscal de entrada',
      })
    }
    if (icmsFreight > 0) {
      lines.push({
        id: 'icms_freight',
        label: '(−) ICMS sobre frete recuperável',
        type: 'deduction',
        unitValue: isMultiProduct ? null : -icmsFreight / divisor,
        totalValue: -icmsFreight,
        description: 'Crédito de ICMS sobre o serviço de transporte da compra',
      })
    }
    if (pisMerchandise > 0 || pisFreight > 0) {
      lines.push({
        id: 'pis',
        label: `(−) PIS recuperável (${formatNumberBR(pisRatePurchases)}%)`,
        type: 'deduction',
        unitValue: isMultiProduct ? null : -totalPis / divisor,
        totalValue: -totalPis,
        description:
          pisFreight > 0
            ? `Mercadorias: ${formatBRL(pisMerchandise)} + Frete: ${formatBRL(pisFreight)} (não cumulativo)`
            : 'Crédito da não cumulatividade (Lei 10.637/02)',
      })
    }
    if (cofinsMerchandise > 0 || cofinsFreight > 0) {
      lines.push({
        id: 'cofins',
        label: `(−) COFINS recuperável (${formatNumberBR(cofinsRatePurchases)}%)`,
        type: 'deduction',
        unitValue: isMultiProduct ? null : -totalCofins / divisor,
        totalValue: -totalCofins,
        description:
          cofinsFreight > 0
            ? `Mercadorias: ${formatBRL(cofinsMerchandise)} + Frete: ${formatBRL(cofinsFreight)} (não cumulativo)`
            : 'Crédito da não cumulatividade (Lei 10.833/03)',
      })
    }
  } else {
    // Simples Nacional: tributos INTEGRAM o custo (não há dedução)
    lines.push({
      id: 'simples_info',
      label: '(i) Tributos sobre compras (ICMS, PIS, COFINS, ST)',
      type: 'info',
      unitValue: null,
      totalValue: 0,
      description:
        'No Simples Nacional todos os tributos incidentes na compra integram o custo do estoque (art. 23 da LC 123/2006 — sem apropriação de créditos fiscais).',
    })
  }

  // Subtotal de compras líquidas (CL)
  lines.push({
    id: 'net_purchases',
    label: '(=) Compras Líquidas apropriadas (CL)',
    type: 'subtotal',
    unitValue: isMultiProduct ? null : divisor > 0 ? netPurchases / divisor : netPurchases,
    totalValue: netPurchases,
    description: 'Custo efetivo de aquisição das mercadorias no período',
  })

  // Se não estiver em baixa automática, exibe a equação clássica de estoques:
  // CMV = EI + Compras Líquidas − EF
  if (!autoInventoryDeduction) {
    if (initialInventory > 0) {
      lines.push({
        id: 'initial_inventory',
        label: '(+) Estoque inicial (EI)',
        type: 'addition',
        unitValue: isMultiProduct
          ? null
          : divisor > 0
            ? initialInventory / divisor
            : initialInventory,
        totalValue: initialInventory,
        description: 'Saldo contábil em estoque no início do período',
      })
    }
    if (effectiveFinalInventory > 0) {
      lines.push({
        id: 'final_inventory',
        label: '(−) Estoque final (EF manual)',
        type: 'deduction',
        unitValue: isMultiProduct
          ? null
          : divisor > 0
            ? -effectiveFinalInventory / divisor
            : -effectiveFinalInventory,
        totalValue: -effectiveFinalInventory,
        description: 'Inventário apurado no fim do período',
      })
    }
  } else {
    // Baixa automática ativa
    lines.push({
      id: 'auto_units_info',
      label: isMultiProduct
        ? `Baixa por unidades vendidas (${cappedSoldUnits} un. em multi-produtos)`
        : `Baixa por unidades vendidas (${cappedSoldUnits} un. × ${formatBRL(unitCmv)})`,
      type: 'info',
      unitValue: isMultiProduct ? null : unitCmv,
      totalValue: totalCmv,
      description: isQuantityCapped
        ? `Venda total (${generalSoldUnits} un.) limitada ao estoque disponível (${availableUnits} un.)`
        : `Estoque final automático resultante: ${formatBRL(effectiveFinalInventory)}`,
    })
  }

  // Linha final com CMV do regime
  lines.push({
    id: 'cmv_total',
    label: autoInventoryDeduction
      ? '(=) CMV consolidado do período'
      : '(=) CMV consolidado (EI + CL − EF)',
    type: 'total',
    unitValue: isMultiProduct ? null : unitCmv,
    totalValue: totalCmv,
    description: `Custo total apurado para o regime ${regimeLabel}`,
  })

  return {
    regime,
    regimeLabel,
    unitCmv: isMultiProduct ? null : unitCmv,
    totalCmv,
    isMultiProduct,
    productBreakdowns,
    merchandiseTotal,
    freightTotal,
    otherCostsTotal,
    ipiTotal,
    stTotal,
    grossTotal,
    deductionsBaseTotal,
    icmsMerchandise,
    icmsFreight,
    totalIcms,
    pisMerchandise,
    pisFreight,
    totalPis,
    cofinsMerchandise,
    cofinsFreight,
    totalCofins,
    netPurchases,
    initialInventory,
    finalInventory: effectiveFinalInventory,
    isAutoInventory: autoInventoryDeduction,
    soldUnits: cappedSoldUnits,
    purchasedUnits,
    availableUnits,
    isQuantityCapped,
    lines,
  }
}
