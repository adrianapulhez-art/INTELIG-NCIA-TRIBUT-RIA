import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, ArrowLeft, Percent, Sparkles, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import {
  calcularMarkupPos,
  ALIQUOTAS_PADRAO,
  fatorVendaPos,
  type RegimeVendedor,
  type ModoMarkup,
  type TeseBaseIcms,
  type AliquotasExercicio,
} from '@/lib/markupPosCalculations'
import { montarItensIntegracao } from '@/lib/integracaoComprasArt12'
import {
  computeCellArt12Item,
  CRONOGRAMA_ART12,
  CONFIG_PADRAO_ART12,
  type RegimeId,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { useTaxContext } from '@/contexts/TaxContext'

const REGIME_LABEL: Record<RegimeVendedor, string> = {
  presumido: 'LP',
  real: 'LR',
  simples: 'SN',
  simples_hibrido: 'SN híb',
}
const REGIME_LABEL_FULL: Record<RegimeVendedor, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
  simples_hibrido: 'SN híbrido — regime regular IBS/CBS',
}
const REGIME_COR: Record<RegimeVendedor, string> = {
  presumido: 'border-sky-500/45 bg-sky-500/[0.06]',
  real: 'border-violet-500/45 bg-violet-500/[0.06]',
  simples: 'border-amber-500/45 bg-amber-500/[0.06]',
  simples_hibrido: 'border-emerald-500/45 bg-emerald-500/[0.06]',
}
const REGIME_COR_TITULO: Record<RegimeVendedor, string> = {
  presumido: 'text-sky-300',
  real: 'text-violet-300',
  simples: 'text-amber-300',
  simples_hibrido: 'text-emerald-300',
}

const FORNECEDOR_LABEL: Record<RegimeId, string> = {
  presumido: 'Fornecedor LP',
  real: 'Fornecedor LR',
  simples: 'Fornecedor SN',
  simples_hibrido: 'Fornecedor SN híbrido',
}

const REGIMES: RegimeVendedor[] = ['presumido', 'real', 'simples', 'simples_hibrido']

/** Card de um regime — número primeiro, memória a 1 clique (padrão canônico da CEO). */
function CardRegimePos({
  regime,
  resultado,
  custoOrigem,
  nomeItem,
  modoLabel,
}: {
  regime: RegimeVendedor
  resultado: ReturnType<typeof calcularMarkupPos>
  custoOrigem: number
  nomeItem: string
  modoLabel: string
}) {
  const [memoriaAberta, setMemoriaAberta] = useState(false)
  const indisponivel = resultado.fator === null

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${REGIME_COR[regime]}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-mono font-black uppercase tracking-wider ${REGIME_COR_TITULO[regime]}`}
        >
          {REGIME_LABEL_FULL[regime]}
        </span>
        {indisponivel ? (
          <Badge className="text-[9px] bg-slate-800 text-slate-400 border-slate-700 font-mono">
            N/A neste exercício
          </Badge>
        ) : (
          <Badge className="text-[9px] bg-slate-800 text-slate-300 border-slate-700 font-mono">
            fator {formatNumberBR(resultado.fator!, 4)}
          </Badge>
        )}
      </div>

      {indisponivel ? (
        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
          O SN híbrido nasce com a opção da janela (set/2026) — efeitos a partir de 01/01/2027.
          Selecione 2027 ou 2028 para simular.
        </p>
      ) : (
        <>
          {/* NÚMERO PRIMEIRO */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Preço de venda — nota (RBV)
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatBRL(resultado.preco)}
            </div>
            <div className="text-[10px] font-mono text-emerald-300">
              RL {formatBRL(resultado.rl)} · divisor {formatNumberBR(resultado.divisor, 4)}
            </div>
          </div>

          {/* Decomposição da nota (híbrido) */}
          {regime === 'simples_hibrido' && resultado.decomposicaoNota.cbsDestaque > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] px-2 py-1.5 space-y-0.5">
              <div className="flex justify-between text-[9px] font-mono text-slate-300">
                <span>Valor da operação</span>
                <span>{formatBRL(resultado.decomposicaoNota.valorOperacao)}</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-emerald-300">
                <span>(+) CBS destacada</span>
                <span>{formatBRL(resultado.decomposicaoNota.cbsDestaque)}</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-emerald-300">
                <span>(+) IBS destacado</span>
                <span>{formatBRL(resultado.decomposicaoNota.ibsDestaque)}</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono font-bold text-emerald-200 border-t border-emerald-500/30 pt-0.5">
                <span>(=) NOTA TOTAL</span>
                <span>{formatBRL(resultado.decomposicaoNota.notaTotal)}</span>
              </div>
            </div>
          )}

          {/* Memória a 1 clique */}
          <button
            type="button"
            onClick={() => setMemoriaAberta(true)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-[10px] font-mono font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
          >
            <Calculator className="w-3 h-3" /> Memória + base legal
          </button>

          {memoriaAberta && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setMemoriaAberta(false)}
            >
              <div
                className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-[#0a1018] p-4 space-y-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white font-mono">
                    Memória — {REGIME_LABEL_FULL[regime]} · {resultado.exercicio}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMemoriaAberta(false)}
                    className="text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer"
                  >
                    Fechar ✕
                  </button>
                </div>
                {resultado.memoria.map((l) => (
                  <div
                    key={l.key}
                    className={`rounded-lg px-2.5 py-1.5 ${l.destaque ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-950/50 border border-slate-800/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono font-semibold text-slate-100 block">
                          {l.label}
                        </span>
                        {l.formula && (
                          <span className="text-[9px] font-mono text-slate-500 block break-words">
                            {l.formula}
                          </span>
                        )}
                        {l.fundamento && (
                          <span className="text-[9px] font-mono text-sky-400/80 block mt-0.5">
                            § {l.fundamento}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold shrink-0 ${l.destaque ? 'text-emerald-300' : 'text-slate-100'}`}
                      >
                        {formatNumberBR(l.value, l.value < 1 ? 6 : 2)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="text-[9px] font-mono text-slate-500 pt-1">
                  Base: {modoLabel} {formatBRL(custoOrigem)} · {nomeItem}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function MarkupPosPage() {
  const navigate = useNavigate()
  const { purchasesItems } = useTaxContext()
  const [exercicio, setExercicio] = useState<2026 | 2027 | 2028>(2027)
  const [modo, setModo] = useState<ModoMarkup>('custo_margem')
  const [tese, setTese] = useState<TeseBaseIcms>('fisco')
  const [fornecedor, setFornecedor] = useState<RegimeId>('presumido')
  const [margemPct, setMargemPct] = useState(30)
  const [dvPct, setDvPct] = useState(5)
  const [customPct, setCustomPct] = useState(0)
  const [rlAncora, setRlAncora] = useState(2000)
  // DAS efetivo e fração ICMS do híbrido — EDITÁVEIS (decisão da CEO, 05/10):
  // campo informável como na pré-reforma; vazio = padrão do exercício (4,17% / 1,3 p.p.).
  const [dasInput, setDasInput] = useState('')
  const [fracInput, setFracInput] = useState('')

  const aliquotas: AliquotasExercicio = useMemo(() => {
    const pad = ALIQUOTAS_PADRAO[exercicio]
    const das = dasInput.trim() === '' ? pad.efetivaSN : Number(dasInput)
    const frac = fracInput.trim() === '' ? pad.icmsFracHibrido : Number(fracInput)
    return {
      ...pad,
      efetivaSN: das > 0 ? das : pad.efetivaSN,
      icmsFracHibrido: frac > 0 ? frac : pad.icmsFracHibrido,
    }
  }, [exercicio, dasInput, fracInput])

  // VÍNCULO AUTOMÁTICO — o custo vem do motor Art. 12 por item (item de maior valor
  // da Compras — máxima da casa: nunca média). Zero na origem = zero na página.
  // Cada card usa a CÉLULA da matriz 4×4: fornecedor selecionado × comprador = o regime do card.
  const itensIntegracao = useMemo(
    () => montarItensIntegracao(purchasesItems || []),
    [purchasesItems],
  )
  const itemAtivo = useMemo(() => {
    const comValor = itensIntegracao.filter((i) => i.valorNota > 0)
    if (comValor.length === 0) return null
    return [...comValor].sort((a, b) => b.valorNota - a.valorNota)[0]
  }, [itensIntegracao])

  const row = useMemo(
    () => CRONOGRAMA_ART12.find((r) => r.exercicio === exercicio) ?? CRONOGRAMA_ART12[1],
    [exercicio],
  )

  const custoPorRegime = useMemo(() => {
    const mapa = {} as Record<RegimeVendedor, number>
    for (const regime of REGIMES) {
      if (!itemAtivo) {
        mapa[regime] = 0
        continue
      }
      const config = {
        ...CONFIG_PADRAO_ART12,
        fornecedorRegime: fornecedor,
        compradorRegime: regime,
      }
      const cell = computeCellArt12Item(itemAtivo, config, row)
      mapa[regime] = exercicio === 2026 ? cell.hoje.unitario : cell.exercicio.unitario
    }
    return mapa
  }, [itemAtivo, fornecedor, row, exercicio])

  const base =
    modo === 'custo_margem'
      ? custoPorRegime
      : ({
          presumido: rlAncora,
          real: rlAncora,
          simples: rlAncora,
          simples_hibrido: rlAncora,
        } as Record<RegimeVendedor, number>)

  const resultados = useMemo(
    () =>
      REGIMES.map((regime) => ({
        regime,
        resultado: calcularMarkupPos(
          regime,
          exercicio,
          modo,
          { base: base[regime], margemPct, dvPct, customTaxesPct: customPct },
          aliquotas,
          tese,
        ),
      })),
    [exercicio, modo, tese, base, margemPct, dvPct, customPct, aliquotas],
  )

  const fatorLP = fatorVendaPos('presumido', exercicio, aliquotas, tese)
  const modoLabel = modo === 'custo_margem' ? 'custo do item' : 'RL âncora'

  return (
    <DemoLayout currentTab="markup-pos">
      <div className="space-y-6">
        <PageHero
          title={
            <span>
              MARKUP PÓS-REFORMA — <span className="text-emerald-400">4 REGIMES</span>
            </span>
          }
          subtitle="Precificação do cliente do contador na transição: LP · LR · SN puro · SN híbrido — custo do motor Art. 12, nota e RL por regime, memória com base legal."
          badge="ETAPA 6 · PRECIFICAÇÃO PÓS-REFORMA"
          icon={Calculator}
        />

        {/* Barra de parâmetros — compacta, número primeiro */}
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Exercício:</span>
            {([2026, 2027, 2028] as const).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setExercicio(ex)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  exercicio === ex
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {ex}
              </button>
            ))}
            <span className="w-px h-5 bg-slate-700 mx-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Modo:</span>
            {(
              [
                { v: 'custo_margem', label: 'Custo + Margem' },
                { v: 'liquid', label: 'Preço de venda líquido' },
              ] as const
            ).map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setModo(m.v)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  modo === m.v
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
            <span className="w-px h-5 bg-slate-700 mx-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Tese:</span>
            {(
              [
                { v: 'fisco', label: 'Fisco' },
                { v: 'contribuinte', label: 'Contribuinte (PLP 16/25)' },
              ] as const
            ).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setTese(t.v)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  tese === t.v
                    ? 'bg-violet-500 text-slate-950 border-violet-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Fornecedor (custo Art. 12):
            </span>
            {(['presumido', 'real', 'simples', 'simples_hibrido'] as RegimeId[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFornecedor(f)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  fornecedor === f
                    ? 'bg-teal-500 text-slate-950 border-teal-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {FORNECEDOR_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {modo === 'custo_margem' && (
              <label className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Margem %</span>
                <Input
                  type="number"
                  value={margemPct}
                  onChange={(e) => setMargemPct(Number(e.target.value) || 0)}
                  className="w-20 h-7 text-[11px] font-mono bg-slate-950 border-slate-700 text-slate-100"
                />
              </label>
            )}
            {modo === 'liquid' && (
              <label className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">RL âncora R$</span>
                <Input
                  type="number"
                  value={rlAncora}
                  onChange={(e) => setRlAncora(Number(e.target.value) || 0)}
                  className="w-24 h-7 text-[11px] font-mono bg-slate-950 border-slate-700 text-slate-100"
                />
              </label>
            )}
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">DV %</span>
              <Input
                type="number"
                value={dvPct}
                onChange={(e) => setDvPct(Number(e.target.value) || 0)}
                className="w-20 h-7 text-[11px] font-mono bg-slate-950 border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Tributos custom %
              </span>
              <Input
                type="number"
                value={customPct}
                onChange={(e) => setCustomPct(Number(e.target.value) || 0)}
                className="w-20 h-7 text-[11px] font-mono bg-slate-950 border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                DAS efetivo % (SN)
              </span>
              <Input
                type="number"
                value={dasInput}
                onChange={(e) => setDasInput(e.target.value)}
                placeholder={`${aliquotas.efetivaSN}`}
                className="w-20 h-7 text-[11px] font-mono bg-slate-950 border-slate-700 text-slate-100"
              />
            </label>
            {exercicio >= 2027 && (
              <label className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Fração ICMS no DAS % (híbrido)
                </span>
                <Input
                  type="number"
                  value={fracInput}
                  onChange={(e) => setFracInput(e.target.value)}
                  placeholder={`${aliquotas.icmsFracHibrido}`}
                  className="w-20 h-7 text-[11px] font-mono bg-slate-950 border-slate-700 text-slate-100"
                />
              </label>
            )}
            <span className="text-[10px] font-mono text-slate-400">
              CBS {aliquotas.cbs}% · IBS {aliquotas.ibs}% · ICMS {aliquotas.icms}%
              {exercicio >= 2027 && fatorLP !== null && (
                <span className="text-slate-500"> · fator LP {formatNumberBR(fatorLP, 4)}</span>
              )}
            </span>
          </div>
        </div>

        {/* Origem do custo — vínculo automático */}
        {modo === 'custo_margem' && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-3">
            {itemAtivo ? (
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-sky-300 font-bold">
                  Custo Art. 12 — {itemAtivo.name || 'Item'}: {FORNECEDOR_LABEL[fornecedor]} → LP{' '}
                  {formatBRL(custoPorRegime.presumido)} · LR {formatBRL(custoPorRegime.real)} · SN{' '}
                  {formatBRL(custoPorRegime.simples)} · SNH{' '}
                  {formatBRL(custoPorRegime.simples_hibrido)} /un
                </span>
                <span className="text-slate-400">
                  ({itemAtivo.quantity} un · vínculo automático com a Calculadora de Compras — nunca
                  média; cada card usa a célula fornecedor × adquirente)
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-[10px] font-mono text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Nenhum item com valor na Calculadora de Compras — os cards ficam ZERADOS (regra:
                  zero na origem, zero aqui). Lance itens na Compras ou use o caso exemplo lá.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4 CARDS LADO A LADO — formato canônico */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {resultados.map(({ regime, resultado }) => (
            <CardRegimePos
              key={regime}
              regime={regime}
              resultado={resultado}
              custoOrigem={base[regime]}
              nomeItem={itemAtivo?.name || 'RL âncora'}
              modoLabel={modoLabel}
            />
          ))}
        </div>

        {/* Nota de honestidade */}
        <div className="flex items-start gap-2 text-[9px] font-mono text-slate-500">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Fatores derivados da álgebra chancelada da CEO (F1, 04/10) — prova de continuidade com
            os divisores da pré-reforma ao 6º decimal. CBS 8,8% é ESTIMADA (pendente de fixação pelo
            Senado, art. 349) e editável no motor Art. 12; IBS 0,1% (2027-28) e alíquotas de 2026
            são CRAVADAS EM LEI. DAS efetivo do SN e fração de ICMS do híbrido são INFORMADOS (art.
            23 §2º e art. 41 §3º — campos editáveis acima; vazio = padrão do exercício). O SN
            híbrido cobra CBS/IBS por fora sobre base sem o ICMS do DAS (premissa IT chancelada) — o
            cliente PJ credita o destaque (art. 47).
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/demo/reforma')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Motor Art. 12
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/demo/markup')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5 mr-1" /> Markup pré-reforma
          </Button>
        </div>
      </div>
    </DemoLayout>
  )
}

export default MarkupPosPage
