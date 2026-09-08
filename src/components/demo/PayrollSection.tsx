import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { PayrollCalculationResult } from '@/lib/payrollCalculations'
import { Users, Info, Sparkles, Building2, UserCheck } from 'lucide-react'

interface PayrollSectionProps {
  payrollSalaries: number
  setPayrollSalaries: (val: number) => void
  payrollProLabore: number
  setPayrollProLabore: (val: number) => void
  payrollInssRate: number
  setPayrollInssRate: (val: number) => void
  payrollRatRate: number
  setPayrollRatRate: (val: number) => void
  payrollTerceirosRate: number
  setPayrollTerceirosRate: (val: number) => void
  calculation: PayrollCalculationResult
  regimeLabel: 'Lucro Presumido' | 'Lucro Real'
}

export const PayrollSection: React.FC<PayrollSectionProps> = ({
  payrollSalaries,
  setPayrollSalaries,
  payrollProLabore,
  setPayrollProLabore,
  payrollInssRate,
  setPayrollInssRate,
  payrollRatRate,
  setPayrollRatRate,
  payrollTerceirosRate,
  setPayrollTerceirosRate,
  calculation,
  regimeLabel,
}) => {
  const [salariesInput, setSalariesInput] = useState<string>(
    payrollSalaries > 0 ? formatNumberBR(payrollSalaries) : '',
  )
  const [isSalariesFocused, setIsSalariesFocused] = useState(false)

  const [proLaboreInput, setProLaboreInput] = useState<string>(
    payrollProLabore > 0 ? formatNumberBR(payrollProLabore) : '',
  )
  const [isProLaboreFocused, setIsProLaboreFocused] = useState(false)

  const [inssInput, setInssInput] = useState<string>(
    payrollInssRate > 0 ? formatNumberBR(payrollInssRate) : '20,00',
  )
  const [isInssFocused, setIsInssFocused] = useState(false)

  const [ratInput, setRatInput] = useState<string>(
    payrollRatRate > 0 ? formatNumberBR(payrollRatRate) : '3,00',
  )
  const [isRatFocused, setIsRatFocused] = useState(false)

  const [terceirosInput, setTerceirosInput] = useState<string>(
    payrollTerceirosRate > 0 ? formatNumberBR(payrollTerceirosRate) : '5,80',
  )
  const [isTerceirosFocused, setIsTerceirosFocused] = useState(false)

  useEffect(() => {
    if (!isSalariesFocused) {
      setSalariesInput(payrollSalaries > 0 ? formatNumberBR(payrollSalaries) : '')
    }
  }, [payrollSalaries, isSalariesFocused])

  useEffect(() => {
    if (!isProLaboreFocused) {
      setProLaboreInput(payrollProLabore > 0 ? formatNumberBR(payrollProLabore) : '')
    }
  }, [payrollProLabore, isProLaboreFocused])

  useEffect(() => {
    if (!isInssFocused) {
      setInssInput(payrollInssRate > 0 ? formatNumberBR(payrollInssRate) : '20,00')
    }
  }, [payrollInssRate, isInssFocused])

  useEffect(() => {
    if (!isRatFocused) {
      setRatInput(payrollRatRate > 0 ? formatNumberBR(payrollRatRate) : '3,00')
    }
  }, [payrollRatRate, isRatFocused])

  useEffect(() => {
    if (!isTerceirosFocused) {
      setTerceirosInput(payrollTerceirosRate > 0 ? formatNumberBR(payrollTerceirosRate) : '5,80')
    }
  }, [payrollTerceirosRate, isTerceirosFocused])

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
      {/* Cabeçalho do Bloco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-mono font-bold uppercase text-slate-200 tracking-wide flex items-center gap-2">
              <span>Folha e Pró-labore ({regimeLabel})</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 normal-case font-normal">
                Encargos Patronais Dedutíveis
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              No {regimeLabel}, a contribuição patronal previdenciária (INSS 20%), RAT e terceiros
              incidem sobre a folha e pró-labore via DCTFWeb/GPS e compõem as despesas operacionais
              dedutíveis.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg inline-block">
            Encargos Patronais: <strong>{formatBRL(calculation.patronalChargesTotal)}</strong>
          </span>
        </div>
      </div>

      {/* Grid de Inputs Principais (Iniciados ZERADOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Folha de Salários Mensal */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Folha de salários mensal (R$)
            </label>
            <span className="text-[11px] text-slate-500 font-mono">salários dos empregados</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
              R$
            </span>
            <Input
              type="text"
              placeholder="0,00"
              value={salariesInput}
              onFocus={() => setIsSalariesFocused(true)}
              onChange={(e) => {
                const raw = e.target.value
                setSalariesInput(raw)
                setPayrollSalaries(parseBRNumber(raw))
              }}
              onBlur={(e) => {
                setIsSalariesFocused(false)
                const parsed = parseBRNumber(e.target.value)
                setSalariesInput(parsed > 0 ? formatNumberBR(parsed) : '')
                setPayrollSalaries(parsed)
              }}
              className="pl-9 text-left sm:text-right bg-slate-900/80 border-slate-800 text-slate-100 font-mono text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Base da folha sobre a qual incidem INSS patronal, RAT e terceiros.
          </span>
        </div>

        {/* Pró-labore Mensal dos Sócios */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Pró-labore mensal dos sócios (R$)
            </label>
            <span className="text-[11px] text-slate-500 font-mono">remuneração dos sócios</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
              R$
            </span>
            <Input
              type="text"
              placeholder="0,00"
              value={proLaboreInput}
              onFocus={() => setIsProLaboreFocused(true)}
              onChange={(e) => {
                const raw = e.target.value
                setProLaboreInput(raw)
                setPayrollProLabore(parseBRNumber(raw))
              }}
              onBlur={(e) => {
                setIsProLaboreFocused(false)
                const parsed = parseBRNumber(e.target.value)
                setProLaboreInput(parsed > 0 ? formatNumberBR(parsed) : '')
                setPayrollProLabore(parsed)
              }}
              className="pl-9 text-left sm:text-right bg-slate-900/80 border-slate-800 text-slate-100 font-mono text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Despesa dedutível da PJ. Gera INSS patronal (20%) + RAT + terceiros.
          </span>
        </div>
      </div>

      {/* Grid de Alíquotas Patronais (Borda verde quando automáticas, editáveis) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Alíquotas dos Encargos Patronais (GPS / DCTFWeb)
          </span>
          <span className="text-[11px] text-emerald-400 font-mono">
            · preenchidas automaticamente (editáveis)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* INSS Patronal */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-emerald-300">
                INSS Patronal (%)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Lei 8.212/91</span>
            </div>
            <div className="relative">
              <Input
                type="text"
                value={inssInput}
                onFocus={() => setIsInssFocused(true)}
                onChange={(e) => {
                  const raw = e.target.value
                  setInssInput(raw)
                  setPayrollInssRate(parseBRNumber(raw))
                }}
                onBlur={(e) => {
                  setIsInssFocused(false)
                  const parsed = parseBRNumber(e.target.value)
                  setInssInput(parsed > 0 ? formatNumberBR(parsed) : '0,00')
                  setPayrollInssRate(parsed)
                }}
                className="pr-7 text-right bg-slate-950/80 border-emerald-500/50 text-slate-100 font-mono text-xs focus:border-emerald-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                %
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Valor:</span>
              <strong className="text-slate-200">{formatBRL(calculation.inssPatronalValue)}</strong>
            </div>
          </div>

          {/* RAT */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-emerald-300">Alíquota RAT (%)</label>
              <span className="text-[10px] text-slate-400 font-mono">Risco médio (2)</span>
            </div>
            <div className="relative">
              <Input
                type="text"
                value={ratInput}
                onFocus={() => setIsRatFocused(true)}
                onChange={(e) => {
                  const raw = e.target.value
                  setRatInput(raw)
                  setPayrollRatRate(parseBRNumber(raw))
                }}
                onBlur={(e) => {
                  setIsRatFocused(false)
                  const parsed = parseBRNumber(e.target.value)
                  setRatInput(parsed > 0 ? formatNumberBR(parsed) : '0,00')
                  setPayrollRatRate(parsed)
                }}
                className="pr-7 text-right bg-slate-950/80 border-emerald-500/50 text-slate-100 font-mono text-xs focus:border-emerald-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                %
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Valor:</span>
              <strong className="text-slate-200">{formatBRL(calculation.ratValue)}</strong>
            </div>
          </div>

          {/* Terceiros / Outras Entidades */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-emerald-300">
                Outras entidades / terceiros (%)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Sistema S</span>
            </div>
            <div className="relative">
              <Input
                type="text"
                value={terceirosInput}
                onFocus={() => setIsTerceirosFocused(true)}
                onChange={(e) => {
                  const raw = e.target.value
                  setTerceirosInput(raw)
                  setPayrollTerceirosRate(parseBRNumber(raw))
                }}
                onBlur={(e) => {
                  setIsTerceirosFocused(false)
                  const parsed = parseBRNumber(e.target.value)
                  setTerceirosInput(parsed > 0 ? formatNumberBR(parsed) : '0,00')
                  setPayrollTerceirosRate(parsed)
                }}
                className="pr-7 text-right bg-slate-950/80 border-emerald-500/50 text-slate-100 font-mono text-xs focus:border-emerald-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                %
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Valor:</span>
              <strong className="text-slate-200">{formatBRL(calculation.terceirosValue)}</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Alíquota patronal combinada:{' '}
              <strong className="text-emerald-400">
                {formatNumberBR(calculation.totalPatronalRate)}%
              </strong>{' '}
              sobre a base total de {formatBRL(calculation.totalBase)}
            </span>
          </div>
          <div className="text-slate-300">
            Total de encargos mensais:{' '}
            <strong className="text-emerald-400">
              {formatBRL(calculation.patronalChargesTotal)}
            </strong>
          </div>
        </div>
      </div>

      {/* Bloco Informativo: Retenções da Pessoa Física do Sócio (Não afetam a DRE da PJ) */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Retenções na Fonte do Sócio / Pró-labore (Pessoa Física)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Informativo — não compõe despesa da PJ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">
              INSS retido do sócio (11%, limitado ao teto)
            </span>
            <span className="text-slate-200 font-semibold block mt-0.5">
              {formatBRL(calculation.socioInssRetido)}
            </span>
            <span className="text-[9px] text-slate-500 block">
              Retenção devida pelo sócio na PF
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">
              IRPF retido (tabela progressiva mensal vigente)
            </span>
            <span className="text-slate-200 font-semibold block mt-0.5">
              {formatBRL(calculation.socioIrpfRetido)}
            </span>
            <span className="text-[9px] text-slate-500 block">
              Estimativa simplificada s/ base líquida
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">
              Pró-labore líquido estimado do sócio
            </span>
            <span className="text-emerald-400 font-semibold block mt-0.5">
              {formatBRL(calculation.socioNetProLabore)}
            </span>
            <span className="text-[9px] text-slate-500 block">
              Valor líquido a receber pelo titular
            </span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-[10px] text-slate-400 font-mono pt-1">
          <Info className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
          <span>
            O INSS (11%) e o IRPF retidos do sócio são descontados da remuneração da pessoa física e
            recolhidos como repasse — não constituem despesa adicional da pessoa jurídica na DRE.
          </span>
        </div>
      </div>
    </div>
  )
}
