import React from 'react'
import { Scale, CheckCircle2 } from 'lucide-react'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { TrilhaChancelaBadge } from './TrilhaChancelaBadge'
import type { ResultadoSessaoSN } from '@/lib/art12SnCalculations'

interface PainelTesesSnProps {
  resultado: ResultadoSessaoSN
  baseAtual: 'bruta' | 'liquida'
  onAlternarBase: (novaBase: 'bruta' | 'liquida') => void
  hojeFormatado?: string
}

/**
 * PAINEL DE TESES EM ABERTO — Res. CGSN 190/2026 (determinação da CEO, Fase 2).
 * Exibe honestamente e lado a lado as teses tributárias com o rótulo:
 * "CRITÉRIO IT v2 (chancela CEO + data de hoje)".
 */
export function PainelTesesSn({
  resultado,
  baseAtual,
  onAlternarBase,
  hojeFormatado = new Date().toLocaleDateString('pt-BR'),
}: PainelTesesSnProps) {
  const { comparativoBases, receitaBruta, icmsNota6, parcelaCreditavelPct } = resultado
  const { bruta, liquida } = comparativoBases

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4 space-y-3.5 shadow-2xs">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
        <div className="space-y-0.5 border-l-4 border-amber-500 pl-2.5">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-950">
              Pendências de Regulamentação — Res. CGSN 190/2026
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-600 leading-tight">
            Teses tributárias abertas para a apropriação de créditos de optantes do Simples Nacional
            na Reforma Tributária (LC 123/2006 arts. 23 e 25 × LC 214/2025).
          </p>
        </div>
        <TrilhaChancelaBadge label={`CRITÉRIO IT v2 (chancela CEO · ${hojeFormatado})`} compact />
      </div>

      {/* Grid com as duas teses em confronto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tese A: Base Bruta */}
        <div
          className={`rounded-xl border-2 p-3.5 space-y-2 transition-all cursor-pointer shadow-2xs ${
            baseAtual === 'bruta'
              ? 'bg-emerald-50 border-emerald-600'
              : 'bg-white border-slate-300 hover:border-slate-400'
          }`}
          onClick={() => onAlternarBase('bruta')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-900">
              Tese A · Base do DAS Bruta [Padrão]
            </span>
            {baseAtual === 'bruta' && (
              <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Em uso
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-600 leading-tight">
            Incidência da alíquota efetiva sobre a receita bruta total da nota (LC 123/2006, art.
            3º, §12º), sem abatimento do ICMS destacado.
          </p>
          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-600">Base do DAS:</span>
              <span className="text-slate-900 font-bold">{formatBRL(bruta.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">DAS Devido (4,00%):</span>
              <span className="text-slate-900 font-bold">{formatBRL(bruta.das)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800 font-bold">Crédito LP 2027 (1,98%):</span>
              <span className="text-emerald-700 font-bold">{formatBRL(bruta.creditoTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-900 font-bold">Custo Unitário Líquido:</span>
              <span className="text-slate-900 font-black">{formatBRL(bruta.custoUnitario)}/un</span>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            Fundamento: LC 123/2006, art. 3º, §12º + art. 23, §1º.
          </div>
        </div>

        {/* Tese B: Base Líquida */}
        <div
          className={`rounded-xl border-2 p-3.5 space-y-2 transition-all cursor-pointer shadow-2xs ${
            baseAtual === 'liquida'
              ? 'bg-emerald-50 border-emerald-600'
              : 'bg-white border-slate-300 hover:border-slate-400'
          }`}
          onClick={() => onAlternarBase('liquida')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-900">
              Tese B · Base Líquida da Fração ICMS
            </span>
            {baseAtual === 'liquida' && (
              <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Em uso
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-600 leading-tight">
            Dedução do ICMS cobrado do adquirente (art. 25, §1º, II da LC 123) com base na fração do
            anexo informada no documento fiscal ({formatNumberBR(resultado.icmsPct, 2)}%).
          </p>
          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-600">Dedução ICMS nota:</span>
              <span className="text-rose-700 font-bold">-{formatBRL(liquida.deducaoIcms)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Base Líquida apurada:</span>
              <span className="text-slate-900 font-bold">{formatBRL(liquida.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">DAS Devido (4,00%):</span>
              <span className="text-slate-900 font-bold">{formatBRL(liquida.das)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800 font-bold">Crédito LP 2027 (1,98%):</span>
              <span className="text-emerald-700 font-bold">{formatBRL(liquida.creditoTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-900 font-bold">Custo Unitário Líquido:</span>
              <span className="text-slate-900 font-black">
                {formatBRL(liquida.custoUnitario)}/un
              </span>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            Fundamento: LC 123/2006, art. 25, §1º, II + Res. CGSN 190/2026.
          </div>
        </div>
      </div>

      {/* Nota de honestidade da IT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-amber-300 text-[10px] font-mono text-slate-700 shadow-2xs">
        <div>
          <span className="text-slate-900 font-bold">
            Decomposição do "montante equivalente" (art. 23):
          </span>{' '}
          A IT adota transparentemente a Tese A (R$ {formatBRL(bruta.creditoTotal)} de crédito) como
          padrão, permitindo alternância imediata para a Tese B (R${' '}
          {formatBRL(liquida.creditoTotal)}).
        </div>
        <span className="text-slate-600 shrink-0 font-bold">
          Δ no crédito: {formatBRL(Math.abs(bruta.creditoTotal - liquida.creditoTotal))}
        </span>
      </div>
    </div>
  )
}
