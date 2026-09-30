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
      className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg border ${
        destaque
          ? cor === 'laranja'
            ? 'bg-orange-500/[0.08] border-orange-500/40'
            : 'bg-slate-950/60 border-slate-700/60'
          : 'bg-slate-950/50 border-slate-800/60'
      }`}
    >
      <span
        className={`text-[10px] font-mono ${destaque ? 'font-bold text-slate-100' : 'text-slate-300'}`}
      >
        {label}
      </span>
      <span
        className={`text-[11px] font-mono font-bold shrink-0 ${
          cor === 'verde'
            ? 'text-emerald-300'
            : cor === 'laranja'
              ? 'text-orange-200'
              : 'text-slate-100'
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
      ? 'text-violet-300 border-violet-500/50 bg-violet-500/10'
      : 'text-emerald-300 border-emerald-500/50 bg-emerald-500/10'
  return (
    <div
      className={`flex-1 min-w-[280px] rounded-xl border p-3 space-y-1.5 ${
        corBadge === 'violeta'
          ? 'border-violet-500/45 bg-violet-500/[0.05]'
          : 'border-emerald-500/45 bg-emerald-500/[0.05]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-mono font-black uppercase leading-tight ${
            corBadge === 'violeta' ? 'text-violet-300' : 'text-emerald-300'
          }`}
        >
          {titulo}
        </span>
        <span
          className={`text-[8px] font-mono font-bold rounded px-1.5 py-0.5 border shrink-0 ${badgeCls}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-[9px] font-mono text-slate-400 leading-relaxed">{regra}</p>
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
        cor="laranja"
      />
      <LinhaComp
        label={`Estoque reajustado (base ${formatBRL(estoqueBase)})`}
        value={formatBRL(lado.estoque)}
      />
      <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/40">
        <span className="text-[9px] font-mono font-bold text-violet-300 uppercase">
          Gap de negociação vs célula plena
        </span>
        <span className="text-[11px] font-black font-mono text-violet-300">
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
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
          <DialogDescription className="text-xs text-slate-400">
            Os dois caminhos do Simples Nacional lado a lado — mesmo adquirente, mesmo item, mesma
            Calculadora de Compras. Nenhum número novo: os dois lados saem dos motores já
            chancelados.
          </DialogDescription>
        </DialogHeader>

        {comparacoes.length === 0 ? (
          <p className="text-[10px] font-mono text-slate-400">
            Nenhum item com valor na Calculadora de Compras.
          </p>
        ) : (
          <>
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
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3 space-y-2">
              <span className="text-[11px] font-mono font-black uppercase text-amber-300 block">
                ⇄ Leitura da comparação — quem custa menos para o adquirente
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 p-2.5">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">
                    Por unidade ({comando.item.name || 'item'})
                  </span>
                  <span
                    className={`text-[13px] font-black font-mono ${puroVence ? 'text-emerald-300' : 'text-rose-300'}`}
                  >
                    {puroVence ? 'SN puro ' : 'SN híbrido '}
                    {formatBRL(Math.abs(comando.diffUnitario))}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 block mt-0.5">
                    {puroVence
                      ? 'o crédito proporcional do art. 23 supera o congelamento da nota'
                      : 'o crédito integral do regime regular supera o crédito proporcional'}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 p-2.5">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">
                    Impacto no estoque (carteira)
                  </span>
                  <span
                    className={`text-[13px] font-black font-mono ${diffTotalEstoque < 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                  >
                    {diffTotalEstoque < 0 ? 'SN puro −' : 'SN puro +'}
                    {formatBRL(Math.abs(diffTotalEstoque))}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 block mt-0.5">
                    {formatBRL(comando.puro.estoque)} (puro) × {formatBRL(comando.hibrido.estoque)}{' '}
                    (híbrido) — mesma compra
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 p-2.5">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">
                    Risco / contrapartida
                  </span>
                  <span className="text-[13px] font-black font-mono text-slate-200">
                    Híbrido = cadeia neutra
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 block mt-0.5">
                    custo estável 2027–2032 · puro depende da faixa do fornecedor no mês
                  </span>
                </div>
              </div>
            </div>

            {/* Nota de honestidade */}
            <div className="flex items-start gap-2 text-[9px] font-mono text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Percentuais do crédito dependem da faixa do fornecedor no mês da operação (art. 23,
                §2º — alíquota informada no documento fiscal). Comparação calculada com o mesmo item
                e o mesmo exercício — mudou a seleção, muda a comparação. Itens adicionais da
                Calculadora de Compras entram no impacto do estoque, cada um com a própria célula
                (nunca média).
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
