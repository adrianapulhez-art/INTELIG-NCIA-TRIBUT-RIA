import React, { useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import { Calculator, Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react'
import { formatBRL, formatFactorBR, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function MarkupPage() {
  const navigate = useNavigate()
  const {
    regime,
    setRegime,
    markupMode,
    setMarkupMode,
    desiredNetRevenue,
    setDesiredNetRevenue,
    additionalMargin,
    setAdditionalMargin,
    icmsRateMarkup,
    setIcmsRateMarkup,
    customTaxesMarkup,
    addCustomTaxMarkup,
    removeCustomTaxMarkup,
    simulatedSalePrice,
    simulatedTaxFactorTotal,
    simulatedCompleteFactor,
    isMarkupSimulated,
    simulateMarkup,
  } = useTaxContext()

  // Estado local para input de texto formatado
  const [netRevenueInput, setNetRevenueInput] = useState<string>(
    desiredNetRevenue > 0 ? formatNumberBR(desiredNetRevenue) : '',
  )
  const [icmsInput, setIcmsInput] = useState<string>(
    icmsRateMarkup > 0 ? formatNumberBR(icmsRateMarkup) : '',
  )
  const [marginInput, setMarginInput] = useState<string>(
    additionalMargin > 0 ? formatNumberBR(additionalMargin) : '',
  )
  const [showMarginInput, setShowMarginInput] = useState<boolean>(additionalMargin > 0)

  // Estado para novo tributo customizado
  const [showAddCustomTax, setShowAddCustomTax] = useState(false)
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxRate, setNewTaxRate] = useState('')

  // Sincronizar input de receita líquida
  const handleNetRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNetRevenueInput(val)
    setDesiredNetRevenue(parseBRNumber(val))
  }

  // Sincronizar ICMS
  const handleIcmsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setIcmsInput(val)
    setIcmsRateMarkup(parseBRNumber(val))
  }

  // Sincronizar margem
  const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMarginInput(val)
    setAdditionalMargin(parseBRNumber(val))
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

  return (
    <DemoLayout currentTab="markup">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Card Principal */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          {/* Header com Ícone de Calculadora */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Calculadora de MARKUP
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Informe as alíquotas e o valor-base para obter o preço de venda com fator
                fracionado.
              </p>
            </div>
          </div>

          {/* Botões de Modo no Topo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMarkupMode('liquid')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
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
                Eu sei quanto quero auferir de receita líquida.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMarkupMode('cost_margin')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                markupMode === 'cost_margin'
                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">A partir do custo + margem</span>
                {markupMode === 'cost_margin' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Eu parto do custo e defino a margem de lucro.
              </p>
            </button>
          </div>

          {/* Campos: Receita Líquida Desejada e Margem de Lucro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {markupMode === 'liquid' ? 'Receita líquida desejada' : 'Custo base desejado'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={netRevenueInput}
                  onChange={handleNetRevenueChange}
                  className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Margem de lucro adicional
                </label>
                {!showMarginInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMarginInput(true)}
                    className="h-6 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 cursor-pointer"
                  >
                    + Adicionar margem
                  </Button>
                )}
              </div>

              {showMarginInput ? (
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={marginInput}
                    onChange={handleMarginChange}
                    className="pr-8 bg-slate-950/60 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    %
                  </span>
                </div>
              ) : (
                <div className="h-9 rounded-md border border-dashed border-slate-800 bg-slate-950/30 flex items-center px-3 text-xs text-slate-500 font-mono">
                  Nenhuma margem aplicada
                </div>
              )}
            </div>
          </div>

          {/* Seção % Tributos */}
          <div className="space-y-4 pt-2">
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
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Resultado do Markup
              </span>
              <span className="text-xs font-mono text-slate-400">
                Regime: <strong className="text-emerald-400 uppercase">{regime}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Fator tributário total
                </span>
                <span className="text-lg font-bold text-slate-200">
                  {formatFactorBR(simulatedTaxFactorTotal, 5)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Fator completo</span>
                <span className="text-lg font-bold text-slate-200">
                  {formatFactorBR(simulatedCompleteFactor, 5)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 block mb-1 font-semibold">
                  Preço de venda resultante
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {formatBRL(simulatedSalePrice)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              💡 Este preço de venda ({formatBRL(simulatedSalePrice)}) foi conectado automaticamente
              como <strong>Receita bruta unitária</strong> nas páginas de DRE Simples Nacional,
              Lucro Presumido e Lucro Real.
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
