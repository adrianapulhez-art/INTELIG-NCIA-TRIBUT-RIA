import React, { useMemo } from 'react'
import { Boxes } from 'lucide-react'

import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * CARD 3 DO DESENHO DA CEO (29/09) — NOVA COMPOSIÇÃO DO CUSTO DO ESTOQUE,
 * reajustada na perspectiva IBS/CBS. Mora DENTRO da Sessão SN, alimentado pelos
 * resultados que a sessão já calcula (SN puro: motor próprio com crédito do art. 23;
 * híbrido: motor Art. 12 chancelado). MÁXIMA DA CASA: por item, NUNCA média —
 * estoque do item = custo unitário × quantidade comprada DELE.
 */

export interface LinhaEstoqueSN {
  id: string
  nome: string
  qtd: number
  custoHoje: number
  custoNovo: number
  deltaPct: number
}

export function CardEstoqueReajustado({
  linhas,
  exercicio,
  fornecedorTxt,
}: {
  linhas: LinhaEstoqueSN[]
  exercicio: number
  fornecedorTxt: string
}) {
  const calculado = useMemo(
    () =>
      linhas.map((l) => ({
        ...l,
        estoqueHoje: l.custoHoje * l.qtd,
        estoqueNovo: l.custoNovo * l.qtd,
        impacto: (l.custoNovo - l.custoHoje) * l.qtd,
      })),
    [linhas],
  )

  const totalHoje = calculado.reduce((s, l) => s + l.estoqueHoje, 0)
  const totalNovo = calculado.reduce((s, l) => s + l.estoqueNovo, 0)
  const totalImpacto = totalNovo - totalHoje

  if (calculado.length === 0) return null

  return (
    <div className="rounded-xl border border-sky-500/45 bg-sky-500/[0.05] p-3 space-y-2">
      <span className="text-[11px] font-mono font-black uppercase text-sky-300 block">
        4 · Nova composição do custo do estoque — perspectiva IBS/CBS · Exercício {exercicio}
      </span>
      <p className="text-[9px] font-mono text-slate-500">
        Estoque reajustado com {fornecedorTxt} — custo por item (nunca média), crédito do adquirente
        já embutido no custo líquido.
      </p>
      {/* Cards compactos lado a lado — um por item (preferência da CEO) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {calculado.map((l) => (
          <div
            key={l.id}
            className="rounded-lg border border-slate-800/60 bg-slate-950/50 px-2 py-1.5 space-y-0.5"
          >
            <span className="text-[9px] font-mono font-bold uppercase text-sky-300 truncate block max-w-full">
              {l.nome}
            </span>
            <div className="text-[9px] font-mono text-slate-400">
              {formatNumberBR(l.qtd, 0)} un · HOJE {formatBRL(l.custoHoje)}/un
            </div>
            <div className="text-[11px] font-black font-mono text-white leading-tight">
              {formatBRL(l.custoNovo)}/un
              <span
                className={`ml-1 text-[9px] font-bold ${
                  l.deltaPct > 0
                    ? 'text-rose-300'
                    : l.deltaPct < 0
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                }`}
              >
                {l.deltaPct > 0 ? '+' : ''}
                {formatNumberBR(l.deltaPct)}%
              </span>
            </div>
            <div className="text-[9px] font-mono text-slate-400">
              Estoque: {formatBRL(l.estoqueHoje)} → {formatBRL(l.estoqueNovo)}
            </div>
            <div
              className={`text-[9px] font-mono font-bold ${
                l.impacto > 0.005
                  ? 'text-rose-300'
                  : l.impacto < -0.005
                    ? 'text-emerald-300'
                    : 'text-slate-400'
              }`}
            >
              Impacto: {l.impacto > 0 ? '+' : ''}
              {formatBRL(l.impacto)}
            </div>
          </div>
        ))}
      </div>
      {/* Totais da carteira */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 px-2 py-1.5">
          <span className="text-[8px] font-mono text-slate-500 uppercase block">
            Estoque total HOJE
          </span>
          <span className="text-[11px] font-black font-mono text-slate-100">
            {formatBRL(totalHoje)}
          </span>
        </div>
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/[0.06] px-2 py-1.5">
          <span className="text-[8px] font-mono text-slate-500 uppercase block">
            Estoque reajustado ({exercicio})
          </span>
          <span className="text-[11px] font-black font-mono text-sky-300">
            {formatBRL(totalNovo)}
          </span>
        </div>
        <div
          className={`rounded-lg border px-2 py-1.5 ${
            totalImpacto > 0.005
              ? 'border-rose-500/40 bg-rose-500/[0.06]'
              : totalImpacto < -0.005
                ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                : 'border-slate-800/60 bg-slate-950/50'
          }`}
        >
          <span className="text-[8px] font-mono text-slate-500 uppercase block">Impacto total</span>
          <span
            className={`text-[11px] font-black font-mono ${
              totalImpacto > 0.005
                ? 'text-rose-300'
                : totalImpacto < -0.005
                  ? 'text-emerald-300'
                  : 'text-slate-300'
            }`}
          >
            {totalImpacto > 0 ? '+' : ''}
            {formatBRL(totalImpacto)}
          </span>
        </div>
      </div>
      <p className="text-[9px] font-mono text-slate-500 flex items-start gap-1.5">
        <Boxes className="w-3 h-3 shrink-0 mt-0.5 text-slate-600" />
        <span>
          Base do estoque = quantidade COMPRADA de cada item (Calculadora de Compras). O crédito
          proporcional do art. 23 nas notas de fornecedor SN puro já está dentro do custo líquido —
          sem ele, o estoque seria maior.
        </span>
      </p>
    </div>
  )
}
