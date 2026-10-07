import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fmtSN, roundHalfUp } from '@/lib/art12SnCalculations'
import { Target, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, ArrowRight } from 'lucide-react'

interface PerspectivaClienteAdquirenteProps {
  receitaBaseSemestre: number
  aliquotaRegularPct: number // ex: 9,28%
  aliquotaDasPct: number // ex: 0,62% (IBS/CBS contido no DAS)
  aliquotaEfetivaDasTotalPct: number // ex: 4,00%
  percentualPj: number // ex: 65%
}

export const PerspectivaClienteAdquirente: React.FC<PerspectivaClienteAdquirenteProps> = ({
  receitaBaseSemestre,
  aliquotaRegularPct,
  aliquotaDasPct,
  aliquotaEfetivaDasTotalPct,
  percentualPj,
}) => {
  // Preço unitário ou valor de referência do produto/serviço para a simulação de repareamento
  const [precoVendaReferencia, setPrecoVendaReferencia] = useState<number>(100.0)
  const [cmvPercentual, setCmvPercentual] = useState<number>(60.0) // 60% CMV
  const [abrirMemoriaObjetivos, setAbrirMemoriaObjetivos] = useState<boolean>(false)

  // Custo da mercadoria vendida de referência
  const cmvBase = roundHalfUp((precoVendaReferencia * cmvPercentual) / 100, 4)

  // Tributos incidentes na saída da empresa:
  // No Simples Nacional puro: tributo contido no preço = aliquotaEfetivaDasTotalPct
  // No Regime Regular: d = aliquotaRegularPct (IBS/CBS por fora destacado)
  const dRegular = aliquotaRegularPct / 100
  const dDas = aliquotaDasPct / 100

  // 1. Margens de Referência Atuais na Opção DAS
  // Preço na nota DAS = P0
  // Tributo no DAS = P0 * (aliquotaEfetivaDasTotalPct / 100)
  // Margem em R$ atual = P0 − TributoDAS − CMV
  const tributoDasReais = roundHalfUp(precoVendaReferencia * (aliquotaEfetivaDasTotalPct / 100), 4)
  const margemAtualReais = roundHalfUp(precoVendaReferencia - tributoDasReais - cmvBase, 4)
  const margemAtualPct =
    precoVendaReferencia > 0 ? roundHalfUp((margemAtualReais / precoVendaReferencia) * 100, 2) : 0

  // Crédito gerado para o cliente adquirente:
  // Se comprar no DAS: crédito restrito = P0 * dDas (~0,62%)
  // Se comprar no Regime Regular: crédito integral = P * dRegular (9,28%)
  const creditoClienteDas = roundHalfUp(precoVendaReferencia * dDas, 4)
  const custoLiquidoClienteDas = roundHalfUp(precoVendaReferencia - creditoClienteDas, 4)

  // ==========================================================================
  // OBJETIVO 1: IGUALAR O PREÇO DE DESEMBOLSO / CUSTO LÍQUIDO DO CLIENTE EM R$
  // O cliente PJ quer ter exatamente o mesmo desembolso líquido:
  // CustoLíquidoCliente = P_reg * (1 − dRegular) = CustoLíquidoClienteDas
  // => P_reg = CustoLíquidoClienteDas ÷ (1 − dRegular)
  // ==========================================================================
  const precoObjetivo1 =
    dRegular < 1 ? roundHalfUp(custoLiquidoClienteDas / (1 - dRegular), 2) : precoVendaReferencia
  const creditoClienteObj1 = roundHalfUp(precoObjetivo1 * dRegular, 2)
  const custoLiqClienteObj1 = roundHalfUp(precoObjetivo1 - creditoClienteObj1, 2)
  const margemReaisObj1 = roundHalfUp(precoObjetivo1 - creditoClienteObj1 - cmvBase, 2)
  const varEtiquetaObj1 =
    precoVendaReferencia > 0
      ? roundHalfUp(((precoObjetivo1 - precoVendaReferencia) / precoVendaReferencia) * 100, 2)
      : 0

  // ==========================================================================
  // OBJETIVO 2: MANTER A MARGEM DA EMPRESA EM REAIS (R$)
  // Fórmula de Repareamento Canônica:
  // P = (Margem-Alvo em R$ + CMV Líquido) ÷ (1 − d)
  // ==========================================================================
  const precoObjetivo2 =
    dRegular < 1
      ? roundHalfUp((margemAtualReais + cmvBase) / (1 - dRegular), 2)
      : precoVendaReferencia
  const creditoClienteObj2 = roundHalfUp(precoObjetivo2 * dRegular, 2)
  const custoLiqClienteObj2 = roundHalfUp(precoObjetivo2 - creditoClienteObj2, 2)
  const margemReaisObj2 = roundHalfUp(precoObjetivo2 - creditoClienteObj2 - cmvBase, 2)
  const varEtiquetaObj2 =
    precoVendaReferencia > 0
      ? roundHalfUp(((precoObjetivo2 - precoVendaReferencia) / precoVendaReferencia) * 100, 2)
      : 0

  // ==========================================================================
  // OBJETIVO 3: MANTER A MARGEM PERCENTUAL DA EMPRESA (%)
  // Margem% = MargemAtual% => Margem-alvo = P * (MargemAtual% / 100)
  // P = CMV Líquido ÷ [1 − d − (Margem% / 100)]
  // ==========================================================================
  const denom3 = 1 - dRegular - margemAtualPct / 100
  const precoObjetivo3 = denom3 > 0 ? roundHalfUp(cmvBase / denom3, 2) : precoVendaReferencia
  const creditoClienteObj3 = roundHalfUp(precoObjetivo3 * dRegular, 2)
  const custoLiqClienteObj3 = roundHalfUp(precoObjetivo3 - creditoClienteObj3, 2)
  const margemReaisObj3 = roundHalfUp(precoObjetivo3 - creditoClienteObj3 - cmvBase, 2)
  const varEtiquetaObj3 =
    precoVendaReferencia > 0
      ? roundHalfUp(((precoObjetivo3 - precoVendaReferencia) / precoVendaReferencia) * 100, 2)
      : 0

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/25 bg-[#06120e] space-y-5">
      {/* Cabeçalho da Perspectiva do Cliente */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              <Target className="h-4 w-4 text-emerald-400" />
            </span>
            <h3 className="text-base font-bold text-white font-mono">
              Perspectiva do Cliente Adquirente & Três Objetivos de Repareamento de Preço
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Microtexto didático: Quando a empresa migra para o Regime Regular ("Por Fora"), o
            cliente PJ adquirente passa a receber créditos plenos de 9,28% em vez da fração restrita
            do Simples Nacional (~0,62%). Avalie como repassar esse ganho mantendo a
            competitividade.
          </p>
        </div>

        {/* Parâmetros de Simulação Rápida */}
        <div className="flex items-center gap-2 bg-[#040a08] p-2 rounded-xl border border-emerald-500/20 shrink-0">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-slate-400 block">Preço de Referência</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-slate-400">R$</span>
              <Input
                type="number"
                step="10"
                min="1"
                value={precoVendaReferencia}
                onChange={(e) => setPrecoVendaReferencia(parseFloat(e.target.value) || 100)}
                className="h-7 w-20 font-mono text-xs bg-[#06100d] border-emerald-500/30 text-emerald-300 font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cartões dos Três Objetivos de Preço LADO A LADO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OBJETIVO 1 */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-[#040c09] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="border-teal-500/40 text-[10px] font-mono text-teal-300"
              >
                Objetivo 1
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">Foco: Competitividade</span>
            </div>
            <h4 className="text-sm font-bold text-white font-mono">
              Igualar Custo do Cliente em R$
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mantém o custo líquido desembolsado pelo comprador corporativo (PJ) exatamente igual
              ao que ele pagava antes.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#06140f] border border-emerald-500/15 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-slate-400">Novo Preço de Nota:</span>
              <span className="text-lg font-mono font-bold text-emerald-300">
                R$ {fmtSN(precoObjetivo1)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Variação na Etiqueta:</span>
              <span className={varEtiquetaObj1 >= 0 ? 'text-rose-300' : 'text-emerald-300'}>
                {varEtiquetaObj1 >= 0
                  ? `+${fmtSN(varEtiquetaObj1)}%`
                  : `${fmtSN(varEtiquetaObj1)}%`}
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Crédito do Cliente (9,28%):</span>
              <span className="text-teal-300">R$ {fmtSN(creditoClienteObj1)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-emerald-500/10">
              <span className="text-slate-300 font-semibold">Custo Líq. Adquirente:</span>
              <span className="text-white font-bold">R$ {fmtSN(custoLiqClienteObj1)}</span>
            </div>
          </div>
        </div>

        {/* OBJETIVO 2 */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-[#040c09] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-[10px] font-mono text-emerald-300"
              >
                Objetivo 2
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">Foco: Margem Bruta R$</span>
            </div>
            <h4 className="text-sm font-bold text-white font-mono">Manter Margem em Reais (R$)</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Repassa o tributo por fora de modo a preservar exatamente o mesmo lucro absoluto em R$
              por unidade vendida.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#06140f] border border-emerald-500/15 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-slate-400">Novo Preço de Nota:</span>
              <span className="text-lg font-mono font-bold text-emerald-300">
                R$ {fmtSN(precoObjetivo2)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Variação na Etiqueta:</span>
              <span className={varEtiquetaObj2 >= 0 ? 'text-rose-300' : 'text-emerald-300'}>
                {varEtiquetaObj2 >= 0
                  ? `+${fmtSN(varEtiquetaObj2)}%`
                  : `${fmtSN(varEtiquetaObj2)}%`}
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Crédito do Cliente (9,28%):</span>
              <span className="text-teal-300">R$ {fmtSN(creditoClienteObj2)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-emerald-500/10">
              <span className="text-slate-300 font-semibold">Custo Líq. Adquirente:</span>
              <span className="text-white font-bold">R$ {fmtSN(custoLiqClienteObj2)}</span>
            </div>
          </div>
        </div>

        {/* OBJETIVO 3 */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-[#040c09] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="border-amber-500/40 text-[10px] font-mono text-amber-300"
              >
                Objetivo 3
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">Foco: Retorno %</span>
            </div>
            <h4 className="text-sm font-bold text-white font-mono">Manter Margem Percentual (%)</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Preserva a taxa de rentabilidade percentual sobre o faturamento, ajustando o markup à
              nova alíquota por fora.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#06140f] border border-emerald-500/15 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-slate-400">Novo Preço de Nota:</span>
              <span className="text-lg font-mono font-bold text-emerald-300">
                R$ {fmtSN(precoObjetivo3)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Variação na Etiqueta:</span>
              <span className={varEtiquetaObj3 >= 0 ? 'text-rose-300' : 'text-emerald-300'}>
                {varEtiquetaObj3 >= 0
                  ? `+${fmtSN(varEtiquetaObj3)}%`
                  : `${fmtSN(varEtiquetaObj3)}%`}
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Crédito do Cliente (9,28%):</span>
              <span className="text-teal-300">R$ {fmtSN(creditoClienteObj3)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-emerald-500/10">
              <span className="text-slate-300 font-semibold">Custo Líq. Adquirente:</span>
              <span className="text-white font-bold">R$ {fmtSN(custoLiqClienteObj3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão de Memória de Cálculo da Fórmula de Repareamento */}
      <div className="pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAbrirMemoriaObjetivos(!abrirMemoriaObjetivos)}
          className="text-xs font-mono text-emerald-300 hover:text-white border border-emerald-500/20 h-8 justify-between w-full"
        >
          <span>Exibir Memória de Cálculo e Fundamento das Fórmulas de Repareamento</span>
          {abrirMemoriaObjetivos ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {abrirMemoriaObjetivos && (
          <div className="mt-2.5 p-4 rounded-xl bg-[#030806] border border-emerald-500/15 space-y-3 text-xs font-mono">
            <div className="space-y-1 border-b border-emerald-500/10 pb-2">
              <span className="text-emerald-400 font-bold">
                1. Fórmula Canônica de Repareamento do Preço:
              </span>
              <p className="text-slate-300">
                <code className="text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded">
                  P = (Margem-Alvo em R$ + CMV Líquido) ÷ (1 − d)
                </code>
              </p>
              <p className="text-slate-400 text-[11px]">
                Onde <code className="text-slate-300">d</code> é a alíquota de IBS/CBS por fora (
                {aliquotaRegularPct}% = {dRegular}), e{' '}
                <code className="text-slate-300">CMV Líquido</code> é o custo de aquisição do
                produto (R$ {fmtSN(cmvBase)}).
              </p>
            </div>

            <div className="space-y-1 border-b border-emerald-500/10 pb-2">
              <span className="text-emerald-400 font-bold">
                2. Vantagem Competitiva no Canal B2B ({percentualPj}% da sua carteira):
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                No Objetivo 1, o preço de etiqueta sobe nominalmente (
                {varEtiquetaObj1 >= 0
                  ? `+${fmtSN(varEtiquetaObj1)}%`
                  : `${fmtSN(varEtiquetaObj1)}%`}
                ), porém o comprador PJ não sente nenhum aumento no bolso porque desconta
                integralmente R$ {fmtSN(creditoClienteObj1)} em sua apuração mensal.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-emerald-400 font-bold">
                3. Alerta para Clientes Consumidores Finais (B2C):
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Para o consumidor pessoa física, qualquer acréscimo de preço na etiqueta representa
                encarecimento direto, pois o consumidor não toma crédito tributário.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
