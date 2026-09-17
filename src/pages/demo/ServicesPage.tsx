import React, { useMemo, useState, useEffect } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import {
  calculateServiceUnitCost,
  calculateServiceCsp,
  calculateServiceDerivedPrice,
  calculatePresumidoServices,
  determineSimplesServiceAnexo,
} from '@/lib/servicesCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Percent,
} from 'lucide-react'

interface ServiceNumericInputProps {
  value: number | undefined
  onChange: (val: number) => void
  placeholder?: string
  prefix?: string
  suffix?: string
  className?: string
  allowEmpty?: boolean
  defaultNonZero?: boolean
}

/**
 * Input numérico/monetário com foco protegido e buffer de texto local.
 * Permite digitação livre de números, vírgulas decimais ("1500,50"), pontos ("1500.50"),
 * colagem com "R$" ou números parciais sem resetar a cada tecla digitada.
 * Atualiza o valor numérico pai no onChange em tempo real e re-formata com pontuação pt-BR no onBlur.
 */
function ServiceNumericInput({
  value,
  onChange,
  placeholder = '0,00',
  prefix,
  suffix,
  className = '',
  allowEmpty = true,
}: ServiceNumericInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const numVal = value !== undefined && Number.isFinite(value) ? value : 0
  const [text, setText] = useState<string>(numVal > 0 ? formatNumberBR(numVal) : '')

  useEffect(() => {
    if (!isFocused) {
      const current = value !== undefined && Number.isFinite(value) ? value : 0
      setText(current > 0 ? formatNumberBR(current) : '')
    }
  }, [value, isFocused])

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          const parsed = parseBRNumber(raw)
          onChange(parsed)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          const parsed = parseBRNumber(e.target.value)
          onChange(parsed)
          if (parsed > 0) {
            setText(formatNumberBR(parsed))
          } else {
            setText(allowEmpty ? '' : '0,00')
          }
        }}
        className={className}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

export const ServicesPage: React.FC = () => {
  const {
    serviceItems,
    serviceIssRate,
    setServiceIssRate,
    addServiceItem,
    updateServiceItem,
    removeServiceItem,
    addServiceInputItem,
    updateServiceInputItem,
    removeServiceInputItem,
    totalServicesGrossRevenue,
    totalServicesCsp,
    totalServicesQuantity,
    simplesPayroll12m,
    effectiveSimplesRbt12,
    setSimplesAnexo,
  } = useTaxContext()

  const [activeTab, setActiveTab] = useState<'services' | 'inputs' | 'taxes'>('services')

  // Fator R automático consumindo calculateFatorR
  const fatorRResult = useMemo(() => {
    return determineSimplesServiceAnexo(simplesPayroll12m, effectiveSimplesRbt12)
  }, [simplesPayroll12m, effectiveSimplesRbt12])

  // Apuração do Lucro Presumido para Serviços
  const presumidoResult = useMemo(() => {
    return calculatePresumidoServices(totalServicesGrossRevenue, totalServicesCsp, serviceIssRate)
  }, [totalServicesGrossRevenue, totalServicesCsp, serviceIssRate])

  return (
    <DemoLayout currentTab="servicos">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Top Hero Banner */}
        <PageHero
          title="PRESTADORES DE SERVIÇOS"
          subtitle="Precificação de honorários por Custo + Margem ou Preço Líquido, apropriação de insumos (CSP), cálculo de ISSQN municipal, presunção de 32% no Lucro Presumido e Fator R automático do Simples Nacional."
          badge="LC 116/2003 · LEI 9.249/95 · LC 123/2006"
          icon={Briefcase}
        />

        {/* Resumo de KPIs do Módulo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#091511]/90 border border-emerald-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">
              Receita Bruta Total
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {formatBRL(totalServicesGrossRevenue)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Σ (Honorário × Qtd Mensal)
            </span>
          </div>

          <div className="bg-[#091511]/90 border border-emerald-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">
              Custo dos Serviços (CSP)
            </span>
            <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
              {formatBRL(totalServicesCsp)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Σ (Custo Insumos × Qtd Mensal)
            </span>
          </div>

          <div className="bg-[#091511]/90 border border-emerald-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">
              ISSQN Municipal (LC 116)
            </span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
              {formatNumberBR(serviceIssRate)}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Alíquota municipal (2% a 5%)
            </span>
          </div>

          <div className="bg-[#091511]/90 border border-emerald-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">
              Fator R / Simples Nacional
            </span>
            <span
              className={`text-xl font-bold font-mono mt-1 block ${
                fatorRResult.isElegibleAnexo3 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {fatorRResult.fatorRPercent.toFixed(2)}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              {fatorRResult.isElegibleAnexo3 ? '≥ 28% → Anexo III' : '< 28% → Anexo V'}
            </span>
          </div>
        </div>

        {/* Sub-navegação em 3 Blocos */}
        <div className="p-1.5 rounded-2xl bg-[#091511]/90 border border-emerald-500/25 inline-flex items-center gap-1.5 max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
            }`}
          >
            1. Cadastro de Serviços ({serviceItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inputs')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'inputs'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
            }`}
          >
            2. Insumos por Serviço (CSP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('taxes')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
              activeTab === 'taxes'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
            }`}
          >
            3. Parâmetros Tributários de Serviço
          </button>
        </div>

        {/* BLOCO 1 — CADASTRO DE SERVIÇOS */}
        {activeTab === 'services' && (
          <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/15">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Catálogo de Serviços Prestados
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  >
                    LC 116/2003 · ISSQN
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preço do honorário, modo de formação (Custo + Margem ou Preço Líquido Desejado) e
                  volume mensal estimado.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => addServiceItem(`Serviço ${serviceItems.length + 1}`, 1500, 5)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Serviço
              </Button>
            </div>

            {serviceItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs font-mono space-y-3">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Nenhum serviço cadastrado até o momento.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addServiceItem('Consultoria Tributária Mensal', 2500, 10)}
                  className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-mono cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Criar Primeiro Serviço
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceItems.map((item, idx) => {
                  const unitCost = calculateServiceUnitCost(item.inputs)
                  const csp = calculateServiceCsp(item)
                  const derivedPrice = calculateServiceDerivedPrice(item, serviceIssRate)
                  const lineTotal = Math.round(item.price * item.monthlyQuantity * 100) / 100

                  return (
                    <div
                      key={item.id}
                      className="bg-[#0b1612] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-md space-y-4 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateServiceItem(item.id, 'description', e.target.value)
                            }
                            placeholder="Descrição do serviço..."
                            className="bg-slate-950/80 border-slate-800 text-slate-100 font-semibold text-sm max-w-sm"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-slate-950/60 text-xs font-mono">
                            <button
                              type="button"
                              onClick={() => updateServiceItem(item.id, 'mode', 'cost_margin')}
                              className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
                                item.mode === 'cost_margin'
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Custo + Margem
                            </button>
                            <button
                              type="button"
                              onClick={() => updateServiceItem(item.id, 'mode', 'liquid')}
                              className={`px-2.5 py-1 rounded text-[11px] cursor-pointer ${
                                item.mode === 'liquid'
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Preço Líquido
                            </button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeServiceItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0 cursor-pointer"
                            title="Remover serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
                        {/* Preço Unitário (Honorário) */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 block">
                            Honorário Unitário
                          </label>
                          <ServiceNumericInput
                            value={item.price}
                            onChange={(val) => updateServiceItem(item.id, 'price', val)}
                            placeholder="0,00"
                            prefix="R$"
                            className="pl-8 text-right font-mono bg-slate-950/80 border-slate-800 text-amber-300 font-bold"
                          />
                          {derivedPrice > 0 && Math.abs(derivedPrice - item.price) > 0.05 && (
                            <span className="text-[10px] text-emerald-400 block">
                              Sugerido: {formatBRL(derivedPrice)}
                            </span>
                          )}
                        </div>

                        {/* Quantidade Mensal */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 block">
                            Qtd. Serviços / mês
                          </label>
                          <ServiceNumericInput
                            value={item.monthlyQuantity}
                            onChange={(val) => updateServiceItem(item.id, 'monthlyQuantity', val)}
                            placeholder="0"
                            className="text-right font-mono bg-slate-950/80 border-slate-800 text-slate-200"
                          />
                          <span className="text-[10px] text-slate-500 block">Atendimentos/mês</span>
                        </div>

                        {/* Parâmetro de Margem ou Meta Líquida */}
                        {item.mode === 'cost_margin' ? (
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 block">
                              Margem de Lucro Desejada
                            </label>
                            <ServiceNumericInput
                              value={item.desiredMargin !== undefined ? item.desiredMargin : 20}
                              onChange={(val) => updateServiceItem(item.id, 'desiredMargin', val)}
                              placeholder="0,00"
                              suffix="%"
                              className="pr-6 text-right font-mono bg-slate-950/80 border-slate-800 text-emerald-300"
                            />
                            <span className="text-[10px] text-slate-500 block">
                              Sobre honorário bruto
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 block">
                              Meta Líquida Desejada
                            </label>
                            <ServiceNumericInput
                              value={item.desiredNetRevenue}
                              onChange={(val) =>
                                updateServiceItem(item.id, 'desiredNetRevenue', val)
                              }
                              placeholder="0,00"
                              prefix="R$"
                              className="pl-8 text-right font-mono bg-slate-950/80 border-slate-800 text-emerald-300"
                            />
                            <span className="text-[10px] text-slate-500 block">
                              Livre de tributos
                            </span>
                          </div>
                        )}

                        {/* Custo Unitário (Insumos) */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 block">
                            Custo Unitário (CSP)
                          </label>
                          <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-between text-amber-300 font-bold">
                            <span>{formatBRL(unitCost)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {item.inputs.length} {item.inputs.length === 1 ? 'insumo' : 'insumos'}
                          </span>
                        </div>

                        {/* Receita Bruta da Linha */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-emerald-400 font-semibold block">
                            Receita Bruta Total
                          </label>
                          <div className="h-9 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 font-bold">
                            <span>{formatBRL(lineTotal)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            CSP Total: {formatBRL(csp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* BLOCO 2 — INSUMOS POR SERVIÇO → CUSTO DOS SERVIÇOS PRESTADOS */}
        {activeTab === 'inputs' && (
          <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/15">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Insumos por Serviço (CSP — Custo dos Serviços Prestados)
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-amber-500/40 text-amber-300 bg-amber-500/10"
                  >
                    Análogo ao CMV nas DREs
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Custo Unitário do Serviço = Σ(unitCost × quantity do insumo); CSP Total = Σ(custo
                  unitário × monthlyQuantity).
                </p>
              </div>
            </div>

            {serviceItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs font-mono space-y-3">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <p>
                  Cadastre primeiro um serviço na aba &quot;Cadastro de Serviços&quot; para
                  adicionar insumos.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    addServiceItem('Desenvolvimento de Software', 8000, 2)
                    setActiveTab('services')
                  }}
                  className="text-xs bg-emerald-500 text-slate-950 font-bold font-mono cursor-pointer"
                >
                  Ir para Cadastro
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {serviceItems.map((service) => {
                  const unitCost = calculateServiceUnitCost(service.inputs)
                  const csp = calculateServiceCsp(service)

                  return (
                    <div
                      key={service.id}
                      className="bg-[#0b1612] border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-mono">
                            {service.description}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            · {service.monthlyQuantity} un./mês
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-slate-300">
                            Custo Unit.:{' '}
                            <strong className="text-amber-300">{formatBRL(unitCost)}</strong>
                          </span>
                          <span className="text-slate-300">
                            CSP Total:{' '}
                            <strong className="text-emerald-400">{formatBRL(csp)}</strong>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              addServiceInputItem(service.id, 'Novo Insumo/Licença', 100, 1)
                            }
                            className="h-7 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />+ Insumo
                          </Button>
                        </div>
                      </div>

                      {service.inputs.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs font-mono text-slate-500">
                          Nenhum insumo direto alocado neste serviço. O custo unitário é R$ 0,00.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400">
                                <th className="text-left py-2 px-2 font-semibold">
                                  Descrição do Insumo
                                </th>
                                <th className="text-right py-2 px-2 font-semibold w-32">
                                  Custo Unit. (R$)
                                </th>
                                <th className="text-right py-2 px-2 font-semibold w-24">Qtd.</th>
                                <th className="text-right py-2 px-2 font-semibold w-32">
                                  Subtotal (R$)
                                </th>
                                <th className="w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {service.inputs.map((inp) => {
                                const subtotal = Math.round(inp.unitCost * inp.quantity * 100) / 100
                                return (
                                  <tr key={inp.id} className="hover:bg-slate-900/30">
                                    <td className="py-2 px-2">
                                      <Input
                                        type="text"
                                        value={inp.description}
                                        onChange={(e) =>
                                          updateServiceInputItem(
                                            service.id,
                                            inp.id,
                                            'description',
                                            e.target.value,
                                          )
                                        }
                                        className="h-7 bg-slate-950/70 border-slate-800 text-slate-200 text-xs font-mono"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <ServiceNumericInput
                                        value={inp.unitCost}
                                        onChange={(val) =>
                                          updateServiceInputItem(
                                            service.id,
                                            inp.id,
                                            'unitCost',
                                            val,
                                          )
                                        }
                                        placeholder="0,00"
                                        className="h-7 text-right bg-slate-950/70 border-slate-800 text-amber-300 text-xs font-mono font-bold"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <ServiceNumericInput
                                        value={inp.quantity}
                                        onChange={(val) =>
                                          updateServiceInputItem(
                                            service.id,
                                            inp.id,
                                            'quantity',
                                            val,
                                          )
                                        }
                                        placeholder="1"
                                        className="h-7 text-right bg-slate-950/70 border-slate-800 text-slate-200 text-xs font-mono"
                                      />
                                    </td>
                                    <td className="py-2 px-2 text-right font-bold text-slate-200">
                                      {formatBRL(subtotal)}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => removeServiceInputItem(service.id, inp.id)}
                                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                                        title="Remover insumo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* BLOCO 3 — PARÂMETROS TRIBUTÁRIOS DE SERVIÇO */}
        {activeTab === 'taxes' && (
          <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
            <div className="border-b border-emerald-500/15 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Parâmetros Tributários Específicos para Prestadores de Serviços
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                >
                  LC 116/2003 · LEI 9.249/95 · LEI 123/2006
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Regras de tributação municipal de ISSQN, presunção legal de 32% no Lucro Presumido e
                Fator R do Simples Nacional.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card ISSQN Municipal */}
              <div className="bg-[#0b1612] border border-emerald-500/25 rounded-2xl p-4.5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 uppercase">(a) ISSQN Municipal</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-emerald-500/40 text-emerald-400"
                  >
                    LC 116/2003
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Alíquota municipal entre 2% e 5%. Quando receita é de serviço, ICMS = 0 e ISS
                  debita a receita bruta.
                </p>
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] text-slate-400 block font-semibold">
                    Alíquota de ISS Municipal (2% a 5%):
                  </label>
                  <ServiceNumericInput
                    value={serviceIssRate}
                    onChange={(val) => setServiceIssRate(val)}
                    placeholder="0,00"
                    suffix="%"
                    className="pr-7 text-right font-mono bg-slate-950/80 border-slate-800 text-emerald-400 font-bold"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                  ISS Apurado: <strong>{formatBRL(presumidoResult.issValue)}</strong>
                </div>
              </div>

              {/* Card Lucro Presumido (32%) */}
              <div className="bg-[#0b1612] border border-emerald-500/25 rounded-2xl p-4.5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 uppercase">(b) Lucro Presumido</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-emerald-500/40 text-emerald-400"
                  >
                    Lei 9.249/95
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Presunção legal de 32% para IRPJ e CSLL. PIS 0,65% e COFINS 3,00% cumulativos
                  sobre a receita bruta.
                </p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Base Presumida (32%):</span>
                    <strong className="text-emerald-400">
                      {formatBRL(presumidoResult.irpjBase)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>PIS Cumulativo (0,65%):</span>
                    <strong className="text-slate-200">
                      {formatBRL(presumidoResult.pisValue)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>COFINS Cumulativo (3,00%):</span>
                    <strong className="text-slate-200">
                      {formatBRL(presumidoResult.cofinsValue)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>IRPJ + CSLL Total:</span>
                    <strong className="text-rose-300">
                      {formatBRL(presumidoResult.totalIrpjCsll)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Simples Nacional & Fator R */}
              <div className="bg-[#0b1612] border border-emerald-500/25 rounded-2xl p-4.5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 uppercase">
                    (c) Fator R (Simples)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-emerald-500/40 text-emerald-400"
                  >
                    LC 123/2006
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Consumo estrito de calculateFatorR. Folha 12m ÷ RBT12. Anexo III se ≥ 28%, Anexo V
                  se &lt; 28%.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Fator R Calculado:</span>
                    <strong
                      className={
                        fatorRResult.isElegibleAnexo3
                          ? 'text-emerald-400 font-bold'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {fatorRResult.fatorRPercent.toFixed(2)}%
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Anexo Recomendado:</span>
                    <strong className="text-emerald-300">
                      {fatorRResult.recommendedAnexo === 'anexo_3' ? 'Anexo III' : 'Anexo V'}
                    </strong>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSimplesAnexo(fatorRResult.recommendedAnexo)}
                  className="w-full text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Aplicar {fatorRResult.recommendedAnexo === 'anexo_3' ? 'Anexo III' : 'Anexo V'}
                </Button>
              </div>
            </div>

            {/* DRE Sintética de Serviços no Lucro Presumido */}
            <div className="p-4.5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 uppercase">
                  DRE Sintética de Serviços · Lucro Presumido (32%)
                </span>
                <span className="text-[11px] text-slate-400">
                  {totalServicesGrossRevenue > 0
                    ? `Baseada em ${serviceItems.length} serviços cadastrados`
                    : 'Nenhum serviço faturado'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Receita Bruta</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatBRL(presumidoResult.grossRevenue)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Tributos s/ Faturamento</span>
                  <span className="text-sm font-bold text-rose-300">
                    {formatBRL(presumidoResult.taxesOnRevenue)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">ISS + PIS + COFINS</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Custo dos Serviços (CSP)</span>
                  <span className="text-sm font-bold text-amber-300">
                    {formatBRL(presumidoResult.csp)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Insumos Diretos</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 block font-semibold">
                    Lucro Líquido Final
                  </span>
                  <span className="text-sm font-extrabold text-emerald-300">
                    {formatBRL(presumidoResult.netProfit)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Após IRPJ/CSLL</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DemoLayout>
  )
}
export default ServicesPage
