import React, { useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import { Calculator, Plus, Trash2, CheckCircle2, ArrowRight, Package } from 'lucide-react'
import { formatBRL, formatFactorBR, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function MarkupPage() {
  const navigate = useNavigate()
  const {
    regime,
    setRegime,
    markupMode,
    setMarkupMode,
    icmsRateMarkup,
    setIcmsRateMarkup,
    customTaxesMarkup,
    addCustomTaxMarkup,
    removeCustomTaxMarkup,
    markupProducts,
    addMarkupProduct,
    updateMarkupProduct,
    removeMarkupProduct,
    simulatedSalePrice,
    simulatedTaxFactorTotal,
    simulatedCompleteFactor,
    isMarkupSimulated,
    simulateMarkup,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    totalConsolidatedCost,
  } = useTaxContext()

  // Sincronização do ICMS
  const [icmsInput, setIcmsInput] = useState<string>(
    icmsRateMarkup > 0 ? formatNumberBR(icmsRateMarkup) : '',
  )

  // Estado para novo tributo customizado
  const [showAddCustomTax, setShowAddCustomTax] = useState(false)
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxRate, setNewTaxRate] = useState('')

  // Sincronizar ICMS
  const handleIcmsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setIcmsInput(val)
    setIcmsRateMarkup(parseBRNumber(val))
  }

  const handleAddCustomTax = () => {
    if (newTaxName.trim() && newTaxRate) {
      addCustomTaxMarkup(newTaxName.trim().toUpperCase(), parseBRNumber(newTaxRate))
      setNewTaxName('')
      setNewTaxRate('')
      setShowAddCustomTax(false)
    }
  }

  // Alíquotas e fatores de PIS/COFINS conforme regime
  // No Simples Nacional, PIS/COFINS não incidem em guias separadas (são unificados no DAS)
  const isSimples = regime === 'simples'
  const pisRate = isSimples ? 0 : regime === 'presumido' ? 0.65 : 1.65
  const cofinsRate = isSimples ? 0 : regime === 'presumido' ? 3.0 : 7.6
  const icmsFactor = 1 - (icmsRateMarkup || 0) / 100
  const pisFactor = isSimples ? 1 : 1 - pisRate / 100
  const cofinsFactor = isSimples ? 1 : 1 - cofinsRate / 100

  // Fator tributário base
  let baseTaxFactor = icmsFactor * pisFactor * cofinsFactor
  for (const tax of customTaxesMarkup) {
    baseTaxFactor *= 1 - (tax.rate || 0) / 100
  }

  // Aplica modo padrão para novos produtos ou quando o usuário clica nos botões do topo
  const handleSelectDefaultMode = (mode: 'liquid' | 'cost_margin') => {
    setMarkupMode(mode)
    // Se houver apenas 1 produto e estiver zerado, também atualiza seu modo para facilitar a experiência
    if (
      markupProducts.length === 1 &&
      markupProducts[0].desiredNetRevenue === 0 &&
      markupProducts[0].cost === 0
    ) {
      updateMarkupProduct(markupProducts[0].id, 'mode', mode)
    }
  }

  return (
    <DemoLayout currentTab="markup">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Card Principal */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          {/* Header com Ícone de Calculadora */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Calculadora de MARKUP Multi-Produtos
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    {markupProducts.length} {markupProducts.length === 1 ? 'produto' : 'produtos'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Cadastre produtos e serviços, defina a receita líquida ou custo + margem por item
                  e obtenha os preços fracionados com consolidação automática para as DREs.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => addMarkupProduct('', markupMode)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar produto
            </Button>
          </div>

          {/* Modo padrão de partida para a calculadora */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Modo de cálculo predominante (ou personalize por produto abaixo):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectDefaultMode('liquid')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  markupMode === 'liquid'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    A partir da receita líquida
                  </span>
                  {markupMode === 'liquid' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Partir do valor líquido desejado e aplicar os fatores fracionados.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDefaultMode('cost_margin')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  markupMode === 'cost_margin'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    A partir do custo + margem
                  </span>
                  {markupMode === 'cost_margin' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Partir do custo base e embutir a margem de lucro e tributos.
                </p>
              </button>
            </div>
          </div>

          {/* ÁREA DE LISTA / TABELA DE PRODUTOS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Produtos / Serviços Cadastrados
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Preencha os valores; clique em <strong>Simular</strong> ao final
              </span>
            </div>

            <div className="space-y-3">
              {markupProducts.map((prod, index) => {
                const isProdLiquid = prod.mode === 'liquid'
                return (
                  <div
                    key={prod.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 transition-colors hover:border-slate-700/80"
                  >
                    {/* Linha superior: Nome do produto, seletor de modo e lixeira */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-mono text-slate-500 font-bold shrink-0">
                          #{index + 1}
                        </span>
                        <Input
                          type="text"
                          value={prod.name}
                          onChange={(e) => updateMarkupProduct(prod.id, 'name', e.target.value)}
                          placeholder="Nome ou descrição do produto/serviço (ex.: Produto A)"
                          className="bg-slate-900 border-slate-800 text-slate-100 font-semibold text-xs h-8 flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Seletor do modo específico para este produto */}
                        <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => updateMarkupProduct(prod.id, 'mode', 'liquid')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isProdLiquid
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Receita Líquida
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMarkupProduct(prod.id, 'mode', 'cost_margin')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              !isProdLiquid
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Custo + Margem
                          </button>
                        </div>

                        {/* Botão de Remover (lixeira) */}
                        <button
                          type="button"
                          onClick={() => removeMarkupProduct(prod.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10 cursor-pointer"
                          title="Remover produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Linha de Campos: Base de cálculo, Margem (se aplicável), Quantidade e Preço Resultante */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                      {/* Campo 1: Valor Base (Receita Líquida ou Custo) */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-semibold">
                          {isProdLiquid ? 'Receita líquida desejada' : 'Custo base'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                            R$
                          </span>
                          <Input
                            type="text"
                            placeholder="0,00"
                            defaultValue={
                              isProdLiquid
                                ? prod.desiredNetRevenue > 0
                                  ? formatNumberBR(prod.desiredNetRevenue)
                                  : ''
                                : prod.cost > 0
                                  ? formatNumberBR(prod.cost)
                                  : ''
                            }
                            key={`${prod.id}-${prod.mode}-${isProdLiquid ? prod.desiredNetRevenue : prod.cost}`}
                            onBlur={(e) => {
                              const val = parseBRNumber(e.target.value)
                              if (isProdLiquid) {
                                updateMarkupProduct(prod.id, 'desiredNetRevenue', val)
                              } else {
                                updateMarkupProduct(prod.id, 'cost', val)
                              }
                            }}
                            className="pl-8 text-right bg-slate-900 border-slate-800 text-slate-100 text-xs h-8"
                          />
                        </div>
                      </div>

                      {/* Campo 2: Margem de Lucro (%) */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-semibold">
                          {isProdLiquid ? 'Margem adicional (%)' : 'Margem de lucro (%)'}
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="0,00"
                            defaultValue={prod.margin > 0 ? formatNumberBR(prod.margin) : ''}
                            key={`${prod.id}-margin-${prod.margin}`}
                            onBlur={(e) => {
                              updateMarkupProduct(prod.id, 'margin', parseBRNumber(e.target.value))
                            }}
                            className="pr-6 text-right bg-slate-900 border-slate-800 text-slate-100 text-xs h-8"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Campo 3: Quantidade Vendida */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-semibold">
                          Quantidade vendida
                        </label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          defaultValue={prod.quantity > 0 ? String(prod.quantity) : ''}
                          key={`${prod.id}-qty-${prod.quantity}`}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10)
                            updateMarkupProduct(
                              prod.id,
                              'quantity',
                              isNaN(val) || val < 0 ? 0 : val,
                            )
                          }}
                          className="text-right bg-slate-900 border-slate-800 text-slate-100 text-xs h-8"
                        />
                      </div>

                      {/* Campo 4: Preço Resultante e Total (atualizado após Simular) */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-emerald-400 font-semibold">
                          Preço de venda simulado
                        </label>
                        <div className="h-8 px-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-400">
                          <span className="text-[10px] text-emerald-400/70 font-mono">Un.:</span>
                          <span>{isMarkupSimulated ? formatBRL(prod.salePrice) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-resultado do produto quando simulado */}
                    {isMarkupSimulated && prod.quantity > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px] font-mono text-slate-400">
                        <span>
                          Subtotal do produto ({prod.quantity} un. × {formatBRL(prod.salePrice)}):
                        </span>
                        <span className="font-bold text-emerald-300">
                          {formatBRL(prod.totalRevenue)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Botão para adicionar mais produtos */}
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addMarkupProduct('', markupMode)}
                className="h-8 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar outro produto
              </Button>
            </div>
          </div>

          {/* Seção % Tributos */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                % Tributos
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCustomTax(!showAddCustomTax)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar tributo
              </Button>
            </div>

            {/* Modal/Form inline para tributo adicional */}
            {showAddCustomTax && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-200">Novo tributo adicional</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="Nome (ex.: ISS, IPI)"
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                  <Input
                    type="text"
                    placeholder="Alíquota %"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCustomTax(false)}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomTax}
                    className="text-xs h-7 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}

            {/* ICMS Primeiro: Alíquota livre */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-emerald-400 uppercase">ICMS</span>
                <span className="text-xs text-slate-400">
                  (alíquota estadual sobre receita bruta)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-28">
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={icmsInput}
                    onChange={handleIcmsChange}
                    className="pr-7 text-right bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    %
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 min-w-[110px] text-right">
                  Fator: <span className="text-slate-200">{formatFactorBR(icmsFactor)}</span>
                </div>
              </div>
            </div>

            {/* PIS e COFINS: SOMENTE Seleção de Regime */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Regime tributário da empresa (alíquotas automáticas)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRegime('presumido')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regime === 'presumido'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase">Lucro Presumido</span>
                    {regime === 'presumido' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    PIS 0,65% · COFINS 3,00% (cumulativo)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRegime('real')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regime === 'real'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase">Lucro Real</span>
                    {regime === 'real' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    PIS 1,65% · COFINS 7,60% (não cumulativo)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRegime('simples')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regime === 'simples'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase">Simples Nacional</span>
                    {regime === 'simples' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Guia única DAS (PIS/COFINS sem destaque avulso)
                  </p>
                </button>
              </div>
            </div>

            {/* Linhas por tributo detalhadas */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl divide-y divide-slate-800/80 text-xs font-mono">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-300 font-bold">PIS</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">{formatNumberBR(pisRate)}%</span>
                  <span className="text-slate-300">
                    Fator: <strong className="text-emerald-400">{formatFactorBR(pisFactor)}</strong>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-300 font-bold">COFINS</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">{formatNumberBR(cofinsRate)}%</span>
                  <span className="text-slate-300">
                    Fator:{' '}
                    <strong className="text-emerald-400">{formatFactorBR(cofinsFactor)}</strong>
                  </span>
                </div>
              </div>

              {/* Tributos adicionais se houver */}
              {customTaxesMarkup.map((ct) => (
                <div key={ct.id} className="px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-bold">{ct.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomTaxMarkup(ct.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{formatNumberBR(ct.rate)}%</span>
                    <span className="text-slate-300">
                      Fator:{' '}
                      <strong className="text-emerald-400">
                        {formatFactorBR(1 - ct.rate / 100)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão Simular à Direita na Base */}
          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={simulateMarkup}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Calculator className="w-4 h-4" />
              Simular
            </Button>
          </div>
        </div>

        {/* Quadro de Resultados (atualiza SOMENTE ao simular) */}
        {isMarkupSimulated && (
          <div className="bg-[#0b101b]/90 border border-emerald-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Resultado Consolidado do Markup
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] font-mono">
                  {markupProducts.length} {markupProducts.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Regime aplicado: <strong className="text-emerald-400 uppercase">{regime}</strong>
              </span>
            </div>

            {/* Totais Consolidados */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Fator tributário base</span>
                <span className="text-lg font-bold text-slate-200">
                  {formatFactorBR(simulatedTaxFactorTotal, 5)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">ICMS + PIS/COFINS</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Quantidade total de itens
                </span>
                <span className="text-lg font-bold text-slate-200">
                  {totalConsolidatedQuantity} un.
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Soma de todos os produtos
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Preço unitário médio</span>
                <span className="text-lg font-bold text-slate-200">
                  {totalConsolidatedQuantity > 0
                    ? formatBRL(totalConsolidatedRevenue / totalConsolidatedQuantity)
                    : formatBRL(simulatedSalePrice)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Receita ÷ Quantidade</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 block mb-1 font-semibold">
                  Receita bruta consolidada
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {formatBRL(totalConsolidatedRevenue)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Alimenta as DREs</span>
              </div>
            </div>

            {/* Tabela de Produtos Simulados */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-right">
                    <th className="py-2 text-left font-semibold text-slate-300">Produto</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Modo</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Fator Comp.</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Preço Venda</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Qtd.</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {markupProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-left font-medium text-slate-200">{p.name}</td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {p.mode === 'liquid' ? 'Líquida' : 'Custo+Margem'}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {formatFactorBR(p.completeFactor, 4)}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-400">
                        {formatBRL(p.salePrice)}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-200">{p.quantity} un.</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-100">
                        {formatBRL(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950/60 font-bold border-t border-slate-700">
                    <td colSpan={4} className="py-2.5 text-left text-slate-300 uppercase">
                      Total Consolidado
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200">
                      {totalConsolidatedQuantity} un.
                    </td>
                    <td className="py-2.5 px-2 text-right text-emerald-400">
                      {formatBRL(totalConsolidatedRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              💡 A receita consolidada ({formatBRL(totalConsolidatedRevenue)}) alimenta
              automaticamente as páginas de <strong>DRE Simples Nacional</strong>,{' '}
              <strong>Lucro Presumido</strong>, <strong>Lucro Real</strong> e{' '}
              <strong>Comparação de Regimes</strong>.
            </p>
          </div>
        )}

        {/* Rodapé da Calculadora Markup: Botão para próxima página (Calculadora de Compras) */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            onClick={() => navigate('/demo/compras')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Ir para a calculadora de compras</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DemoLayout>
  )
}
