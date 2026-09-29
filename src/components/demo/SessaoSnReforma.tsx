import React, { useMemo, useState } from 'react'
import { Percent, Calculator, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  calcularSessaoSN,
  PERFIL_SN_NOTA_PADRAO,
  type ModoPreenchimentoSN,
  type PerfilSN,
} from '@/lib/art12SnCalculations'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * SESSÃO "SN NA REFORMA — TRATAMENTO DIFERENCIADO" (desenho da CEO, 28/09).
 * Mora dentro da página Reforma, ABAIXO da célula Fornecedor × Comprador × Repasse.
 * Alimenta-se dos itens da Calculadora de Compras (vínculo automático) e calcula
 * o CRÉDITO PROPORCIONAL do adquirente — LC 123/2006, art. 23, §§1º–2º
 * (redação LC 214/2025). Motor próprio (art12SnCalculations) — o Art. 12
 * consolidado NÃO é tocado; ouros chancelados intactos.
 */

function LinhaSN({
  line,
}: {
  line: {
    label: string
    formula: string
    value: number
    destaque?: boolean
    fundamento?: string
  }
}) {
  const isPct = line.label.startsWith('(i)') && line.value < 100 && line.label.includes('efetiva')
  return (
    <div
      className={`flex items-start justify-between gap-2 px-2 py-1 rounded-lg border ${
        line.destaque
          ? 'bg-emerald-500/10 border-emerald-500/40'
          : 'bg-slate-950/50 border-slate-800/60'
      }`}
    >
      <div className="min-w-0">
        <span
          className={`text-[10px] font-mono font-semibold block leading-tight ${line.destaque ? 'text-emerald-300' : 'text-slate-200'}`}
        >
          {line.label}
        </span>
        {line.formula && (
          <span className="text-[9px] font-mono text-slate-500 leading-tight block break-words">
            {line.formula}
          </span>
        )}
        {line.fundamento && (
          <span className="text-[8px] font-mono text-sky-400/80 block mt-0.5">
            {line.fundamento}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-mono font-bold shrink-0 ${
          line.value < 0
            ? 'text-emerald-300'
            : line.destaque
              ? 'text-emerald-300'
              : line.value > 0
                ? 'text-slate-100'
                : 'text-slate-500'
        }`}
      >
        {isPct ? `${formatNumberBR(line.value)}%` : formatBRL(line.value)}
      </span>
    </div>
  )
}

export function SessaoSnReforma({
  itensOrigem,
  custoPlenoUnitario,
}: {
  /** Itens da Calculadora de Compras (vínculo automático — mesma fonte do Art. 12). */
  itensOrigem: ItemIntegracaoArt12[]
  /** Custo unitário da célula plena de referência (LP×LP chancelada) — régua da negociação. */
  custoPlenoUnitario: number
}) {
  const comValor = useMemo(() => itensOrigem.filter((i) => i.valorNota > 0), [itensOrigem])
  const [idxItem, setIdxItem] = useState(0)
  const [modo, setModo] = useState<ModoPreenchimentoSN>('nota')
  const [icmsNotaPct, setIcmsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.icmsNotaPct)
  const [cbsNotaPct, setCbsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.cbsNotaPct)
  const [ibsNotaPct, setIbsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.ibsNotaPct)
  const [anexo, setAnexo] = useState(PERFIL_SN_NOTA_PADRAO.anexo)
  const [faixa, setFaixa] = useState(PERFIL_SN_NOTA_PADRAO.faixa)
  const [rbt12, setRbt12] = useState(PERFIL_SN_NOTA_PADRAO.rbt12)
  const [efetivaPct, setEfetivaPct] = useState(PERFIL_SN_NOTA_PADRAO.efetivaPct)
  const [icmsFracPct, setIcmsFracPct] = useState(PERFIL_SN_NOTA_PADRAO.icmsFracPct)

  const item = comValor[Math.min(idxItem, Math.max(0, comValor.length - 1))]

  const perfil: PerfilSN = useMemo(
    () => ({
      modo,
      icmsNotaPct,
      cbsNotaPct,
      ibsNotaPct,
      anexo,
      faixa,
      rbt12,
      efetivaPct,
      icmsFracPct,
    }),
    [modo, icmsNotaPct, cbsNotaPct, ibsNotaPct, anexo, faixa, rbt12, efetivaPct, icmsFracPct],
  )

  const resultado = useMemo(() => (item ? calcularSessaoSN(item, perfil) : null), [item, perfil])

  if (!item || !resultado) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-violet-400" />
          <span className="text-xs font-mono font-black uppercase tracking-wider text-violet-300">
            SN na Reforma — tratamento diferenciado para optantes
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-2">
          Nenhum item com valor na Calculadora de Compras — lance os itens para calcular o crédito
          proporcional do adquirente (art. 23 da LC 123/2006).
        </p>
      </div>
    )
  }

  const gap = resultado.custoUnitarioLiquido - custoPlenoUnitario

  return (
    <div className="rounded-xl border border-violet-500/40 bg-violet-500/[0.04] p-4 space-y-3">
      {/* Cabeçalho da sessão */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-violet-400" />
          <span className="text-xs font-mono font-black uppercase tracking-wider text-violet-300">
            SN na Reforma — tratamento diferenciado para optantes
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-400">
          Crédito proporcional do adquirente — LC 123/2006, art. 23, §§1º–2º (redação LC 214/2025) ·
          por item da Calculadora de Compras · motor próprio (o Art. 12 consolidado não é alterado)
        </p>
      </div>

      {/* Item em análise */}
      {comValor.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {comValor.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setIdxItem(i)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                i === idxItem
                  ? 'bg-violet-500 text-slate-950 border-violet-400'
                  : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {it.name || `Item ${i + 1}`} · {formatNumberBR(it.quantity, 0)} un.
            </button>
          ))}
        </div>
      )}

      {/* 1 — Contexto: alíquota efetiva (botões de preenchimento — decisão da CEO) */}
      <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-3 space-y-2">
        <span className="text-[11px] font-mono font-black uppercase text-sky-300 block">
          1 · Contexto da operação — alíquota efetiva do fornecedor
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setModo('nota')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
              modo === 'nota'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Preencher pelo percentual da NOTA
          </button>
          <button
            type="button"
            onClick={() => setModo('anexo')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
              modo === 'anexo'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Preencher por Anexo + Faixa + RBT12
          </button>
        </div>
        {modo === 'nota' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">
                % ICMS da nota
              </label>
              <Input
                type="number"
                step="0.01"
                value={icmsNotaPct}
                onChange={(e) => setIcmsNotaPct(Number(e.target.value) || 0)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">
                % CBS da nota
              </label>
              <Input
                type="number"
                step="0.01"
                value={cbsNotaPct}
                onChange={(e) => setCbsNotaPct(Number(e.target.value) || 0)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">
                % IBS da nota
              </label>
              <Input
                type="number"
                step="0.01"
                value={ibsNotaPct}
                onChange={(e) => setIbsNotaPct(Number(e.target.value) || 0)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-2 py-1.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase block">Origem</span>
              <span className="text-[10px] font-mono font-bold text-emerald-300">
                DOCUMENTO FISCAL
              </span>
              <span className="text-[8px] font-mono text-emerald-400/80 block">
                padrão ouro — art. 23, §2º
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">Anexo</label>
              <Input
                value={anexo}
                onChange={(e) => setAnexo(e.target.value)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">Faixa</label>
              <Input
                value={faixa}
                onChange={(e) => setFaixa(e.target.value)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">
                RBT12 (R$)
              </label>
              <Input
                type="number"
                value={rbt12}
                onChange={(e) => setRbt12(Number(e.target.value) || 0)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">
                Alíquota efetiva (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={efetivaPct}
                onChange={(e) => setEfetivaPct(Number(e.target.value) || 0)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase block">
                Fração ICMS no anexo (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={icmsFracPct}
                onChange={(e) => setIcmsFracPct(Number(e.target.value) || 0)}
                className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
              />
            </div>
            <div className="col-span-2 sm:col-span-5 rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-2 py-1">
              <span className="text-[9px] font-mono font-bold text-amber-300 uppercase">
                ESTIMADO pela faixa — premissa declarada (não é dado do documento fiscal)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2 — Cálculo guiado (memória detalhada) */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-1">
        <span className="text-[11px] font-mono font-black uppercase text-emerald-300 block">
          2 · Cálculo guiado — memória detalhada ({item.name || 'item'})
        </span>
        {resultado.memoria
          .filter((l) =>
            [
              'mercadorias',
              'frete',
              'receitabruta',
              'efetiva',
              'das',
              'icmsnota',
              'cbsdas',
              'ibsdas',
              'preconota',
            ].includes(l.key),
          )
          .map((l) => (
            <LinhaSN key={l.key} line={l} />
          ))}
      </div>

      {/* 3 — Crédito proporcional do adquirente (o coração da sessão) */}
      <div className="rounded-xl border border-amber-500/45 bg-amber-500/[0.06] p-3 space-y-1">
        <span className="text-[11px] font-mono font-black uppercase text-amber-300 block">
          3 · Crédito proporcional do ADQUIRENTE (art. 23) — o coração da sessão
        </span>
        {resultado.memoria
          .filter((l) =>
            [
              'credito_base',
              'credito_icms',
              'credito_cbs',
              'credito_ibs',
              'credito_total',
              'credito_unidade',
            ].includes(l.key),
          )
          .map((l) => (
            <LinhaSN key={l.key} line={l} />
          ))}
      </div>

      {/* 4 — Leitura de negociação */}
      <div className="rounded-xl border border-orange-500/45 bg-orange-500/[0.06] p-3 space-y-1">
        <span className="text-[11px] font-mono font-black uppercase text-orange-300 block">
          4 · Leitura de negociação — custo líquido do adquirente
        </span>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            Preço da nota do fornecedor SN (sem crédito — mundo antigo)
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-100">
            {formatBRL(resultado.receitaBruta)}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            (−) Crédito proporcional do art. 23
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-300">
            -{formatBRL(resultado.creditoTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/40">
          <span className="text-[10px] font-mono font-bold text-emerald-300">
            (=) CUSTO LÍQUIDO COM O ART. 23
          </span>
          <span className="text-[11px] font-black font-mono text-emerald-300">
            {formatBRL(resultado.custoUnitarioLiquido)}/un
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            Comparativo: comprar de fornecedor LP (célula LP×LP chancelada)
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-100">
            {formatBRL(custoPlenoUnitario)}/un
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/40">
          <span className="text-[10px] font-mono font-bold text-orange-300">
            Gap de negociação — o que o fornecedor SN precisa compensar em preço
          </span>
          <span className="text-[11px] font-black font-mono text-orange-300">
            {formatBRL(gap)}/un
          </span>
        </div>
        <p className="text-[9px] font-mono text-slate-500">
          Sem o art. 23 (motor Art. 12 atual): 1.413,33/un · com o art. 23:{' '}
          {formatBRL(resultado.custoUnitarioLiquido)}/un — o crédito devolve{' '}
          {formatNumberBR(resultado.efetivaPct)}% da nota ao adquirente em regime regular.
        </p>
      </div>

      {/* Nota de honestidade */}
      <div className="flex items-start gap-2 text-[9px] font-mono text-slate-500">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <span>
          Percentuais de partilha e crédito dependem da faixa do fornecedor no mês da operação e da
          regulamentação em curso (art. 23, §2º: alíquota informada no documento fiscal). A sessão
          calcula com o dado que o contador informa — estimativas ficam marcadas como estimadas.
        </span>
      </div>

      {/* Botão de memória completa */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const linhas = resultado.memoria
            .map(
              (l) =>
                `${l.label} | ${l.formula} | ${l.value}${l.fundamento ? ` | ${l.fundamento}` : ''}`,
            )
            .join('\n')
          void navigator.clipboard
            ?.writeText(`SESSÃO SN NA REFORMA — ${item.name}\n${linhas}`)
            .catch(() => undefined)
        }}
        className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 cursor-pointer h-7 text-[10px]"
      >
        <Calculator className="w-3 h-3 mr-1" /> Copiar memória de cálculo completa
      </Button>
    </div>
  )
}
