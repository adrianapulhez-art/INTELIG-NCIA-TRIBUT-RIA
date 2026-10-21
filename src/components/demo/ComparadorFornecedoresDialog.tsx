import React, { useMemo } from 'react'
import { ArrowLeftRight, AlertTriangle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { compararFornecedoresSN, type ComparacaoFornecedores } from '@/lib/comparadorFornecedoresSN'
import { type CellConfigArt, type RegimeId, type ScheduleRowArt } from '@/lib/art12Calculations'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { type PerfilSN } from '@/lib/art12SnCalculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * COMPARADOR DE FORNECEDORES SN — prévia aprovada pela CEO (30/09).
 * Os dois caminhos do Simples Nacional lado a lado: mesmo adquirente, mesmo item,
 * mesma Calculadora de Compras. Nenhum número novo — os dois lados saem dos motores
 * já chancelados. Veredito em 3 quadros: unidade × estoque × risco/contrapartida.
 */

function LinhaComp({
  label,
  value,
  destaque = false,
  cor = 'neutro',
}: {
  label: string
  value: string
  destaque?: boolean
  cor?: 'neutro' | 'verde' | 'laranja'
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
        destaque ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50/70 border-slate-200'
      }`}
    >
      <span
        className={`text-[11px] font-mono ${destaque ? 'font-bold text-slate-900' : 'text-slate-700'}`}
      >
        {label}
      </span>
      <span
        className={`text-[11px] font-mono font-bold shrink-0 ${
          cor === 'verde'
            ? 'text-emerald-700'
            : destaque
              ? 'text-emerald-900 font-black'
              : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function ColunaFornecedor({
  lado,
  titulo,
  badge,
  regra,
  estoqueBase,
  corBadge,
}: {
  lado: ComparacaoFornecedores['puro']
  titulo: string
  badge: string
  regra: string
  estoqueBase: number
  corBadge: 'violeta' | 'esmeralda'
}) {
  const badgeCls =
    corBadge === 'violeta'
      ? 'text-slate-800 border-slate-300 bg-slate-100'
      : 'text-emerald-800 border-emerald-300 bg-emerald-100'
  return (
    <div
      className={`flex-1 min-w-[280px] rounded-2xl border p-4 space-y-2 ${
        corBadge === 'violeta'
          ? 'border-slate-200 bg-white shadow-2xs'
          : 'border-emerald-300 bg-emerald-50/40 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
        <span
          className={`text-xs font-mono font-bold uppercase leading-tight ${
            corBadge === 'violeta' ? 'text-slate-900' : 'text-emerald-950'
          }`}
        >
          {titulo}
        </span>
        <span
          className={`text-[9px] font-mono font-bold rounded px-2 py-0.5 border shrink-0 ${badgeCls}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-[10px] font-mono text-slate-600 leading-relaxed">{regra}</p>
      <div className="space-y-1">
        <LinhaComp label="Preço da nota do fornecedor" value={formatBRL(lado.precoNota)} />
        <LinhaComp
          label={`(−) ${lado.creditoLabel}`}
          value={`-${formatBRL(lado.credito)}`}
          cor="verde"
        />
        <LinhaComp
          label="Custo líquido unitário"
          value={`${formatBRL(lado.unitario)}/un · ${lado.deltaPct > 0 ? '+' : ''}${formatNumberBR(lado.deltaPct)}% vs HOJE`}
          destaque
        />
        <LinhaComp
          label={`Estoque reajustado (base ${formatBRL(estoqueBase)})`}
          value={formatBRL(lado.estoque)}
        />
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
        <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">
          Gap de negociação vs célula plena
        </span>
        <span className="text-xs font-bold font-mono text-slate-900">
          {lado.gap > 0 ? '+' : ''}
          {formatBRL(lado.gap)}/un
        </span>
      </div>
    </div>
  )
}

export function ComparadorFornecedoresDialog({
  open,
  onOpenChange,
  itens,
  perfil,
  adquirente,
  cfgBase,
  row,
  exercicio,
  custoPlenoUnitario,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itens: ItemIntegracaoArt12[]
  perfil: PerfilSN
  adquirente: RegimeId
  cfgBase: CellConfigArt
  row: ScheduleRowArt
  exercicio: number
  custoPlenoUnitario: number
}) {
  const comparacoes = useMemo(
    () =>
      open && itens.length > 0
        ? itens.map((item) =>
            compararFornecedoresSN(item, perfil, adquirente, cfgBase, row, custoPlenoUnitario),
          )
        : [],
    [open, itens, perfil, adquirente, cfgBase, row, custoPlenoUnitario],
  )

  // Item de maior valor comanda a leitura por unidade (máxima da casa — nunca média)
  const comando = comparacoes[0]
  const diffTotalEstoque = comparacoes.reduce((s, c) => s + c.diffEstoque, 0)
  const estoqueBase = comparacoes.reduce((s, c) => s + c.puro.estoque, 0)
  const puroVence = comando ? comando.diffUnitario < 0 : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-6 shadow-xl">
        <DialogHeader>
          <div className="border-l-4 border-amber-500 pl-2.5 mb-1">
            <DialogTitle className="text-base font-bold font-mono text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#b87c14]" />{' '}
              <span>
                Comparação de fornecedores SN —{' '}
                {adquirente === 'presumido'
                  ? 'Lucro Presumido'
                  : adquirente === 'real'
                    ? 'Lucro Real'
                    : adquirente === 'simples'
                      ? 'Simples Nacional'
                      : 'SN híbrido'}{' '}
                · Exercício {exercicio}
              </span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Os dois caminhos do Simples Nacional lado a lado — mesmo adquirente, mesmo item, mesma
            Calculadora de Compras. Nenhum número novo: os dois lados saem dos motores já
            chancelados.
          </DialogDescription>
        </DialogHeader>

        {comparacoes.length === 0 ? (
          <p className="text-xs font-mono text-slate-500">
            Nenhum item com valor na Calculadora de Compras.
          </p>
        ) : (
          <div className="space-y-4">
            {/* As duas colunas */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch">
              <ColunaFornecedor
                lado={comando.puro}
                titulo="SN puro (DAS por dentro)"
                badge="art. 23 — crédito proporcional"
                corBadge="violeta"
                regra="Nota congelada, sem destaque · crédito = montante equivalente ao cobrado no regime único (percentuais informados na nota — art. 23, §2º)"
                estoqueBase={estoqueBase}
              />
              <ColunaFornecedor
                lado={comando.hibrido}
                titulo="SN híbrido (regime regular IBS/CBS)"
                badge="art. 47 — crédito integral"
                corBadge="esmeralda"
                regra="Optante pelo regime regular de IBS/CBS (art. 41) · destaque na nota, base limpa sem ICMS (premissa IT) · CBS/IBS por fora · repasse conforme a régua"
                estoqueBase={estoqueBase}
              />
            </div>

            {/* VEREDITO — 3 quadros */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-900 block">
                ⇄ Leitura da comparação — quem custa menos para o adquirente
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Por unidade ({comando.item.name || 'item'})
                  </span>
                  <span
                    className={`text-sm font-black font-mono block mt-1 ${puroVence ? 'text-[#b87c14]' : 'text-rose-700'}`}
                  >
                    {puroVence ? 'SN puro ' : 'SN híbrido '}
                    {formatBRL(Math.abs(comando.diffUnitario))}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-1 leading-tight">
                    {puroVence
                      ? 'o crédito proporcional do art. 23 supera o congelamento da nota'
                      : 'o crédito integral do regime regular supera o crédito proporcional'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Impacto no estoque (carteira)
                  </span>
                  <span
                    className={`text-sm font-black font-mono block mt-1 ${diffTotalEstoque < 0 ? 'text-[#b87c14]' : 'text-rose-700'}`}
                  >
                    {diffTotalEstoque < 0 ? 'SN puro −' : 'SN puro +'}
                    {formatBRL(Math.abs(diffTotalEstoque))}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-1 leading-tight">
                    {formatBRL(comando.puro.estoque)} (puro) × {formatBRL(comando.hibrido.estoque)}{' '}
                    (híbrido) — mesma compra
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Risco / contrapartida
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 block mt-1">
                    Híbrido = cadeia neutra
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-1 leading-tight">
                    custo estável 2027–2032 · puro depende da faixa do fornecedor no mês
                  </span>
                </div>
              </div>
            </div>

            {/* Nota de honestidade — semântica real de pendência de tese / art. 23 */}
            <div className="flex items-start gap-2.5 text-xs font-mono text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span className="leading-relaxed">
                Percentuais do crédito dependem da faixa do fornecedor no mês da operação (art. 23,
                §2º — alíquota informada no documento fiscal). Comparação calculada com o mesmo item
                e o mesmo exercício — mudou a seleção, muda a comparação. Itens adicionais da
                Calculadora de Compras entram no impacto do estoque, cada um com a própria célula
                (nunca média).
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
