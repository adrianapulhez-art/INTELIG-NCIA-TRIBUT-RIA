import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBasket,
  BarChart3,
  Layers,
  Link2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePurchaseCollapseState } from '@/hooks/usePurchaseCollapseState'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { formatarMascaraNcm } from '@/services/ncmClassificationService'
import { ItemClassificacaoDrawer } from '@/components/demo/ItemClassificacaoDrawer'
import { useTaxContext } from '@/contexts/TaxContext'

const CLASSE_STYLE: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  B: 'bg-amber-100 text-amber-800 border-amber-300',
  C: 'bg-slate-100 text-slate-700 border-slate-300',
  '—': 'bg-slate-100 text-slate-500 border-slate-200',
}

/**
 * INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — VÍNCULO AUTOMÁTICO (25/09).
 * O módulo CMV Art. 12 lê a Calculadora de Compras DIRETO do TaxContext — a MESMA
 * fonte que o botão "Zerar campos" limpa. Regra da CEO: zero na origem = zero na
 * célula; alimentado na origem = alimentado na célula. Sem importação manual e sem
 * fallback canônico: o caso exemplo entra por botão explícito que ESCREVE na Compras.
 * Markup e Despesas Operacionais seguem como portas de fases futuras (decisão da CEO).
 */
export function PainelIntegracaoOrigem({
  itensOrigem,
  temOrigem,
  onCarregarExemplo,
}: {
  itensOrigem: ItemIntegracaoArt12[]
  temOrigem: boolean
  onCarregarExemplo: () => void
}) {
  const navigate = useNavigate()
  const { updatePurchaseItem } = useTaxContext()
  const itensComValor = itensOrigem.filter((i) => i.valorNota > 0)
  const totalNota = itensComValor.reduce((a, i) => a + i.valorNota, 0)
  const totalQtd = itensComValor.reduce((a, i) => a + (i.quantity || 0), 0)

  // Estado da nota de rodapé colapsável (recolhida por padrão)
  const [notaRodapeAberta, setNotaRodapeAberta] = useState(false)

  // Gerenciamento de abrir/recolher itens copiando o padrão da Calculadora de Compras
  const itemIds = useMemo(() => itensOrigem.map((i) => i.id), [itensOrigem])
  const { isCollapsed, toggleItem, collapseAll, expandAll, allCollapsed, allExpanded } =
    usePurchaseCollapseState('reforma-itens', itemIds)

  const handleAtualizarClassificacao = (
    id: string,
    dados: {
      ncm: string
      ncmPercentualReducao: number
      ncmAnexo?: string
      ncmArtigoOrigem?: string
      ncmDescricaoReducao?: string
      ncmFonte?: string
      ncmOpcaoId?: string
      cClassTribCodigo?: string
    },
  ) => {
    updatePurchaseItem(id, 'ncm', dados.ncm)
    updatePurchaseItem(id, 'ncmPercentualReducao', dados.ncmPercentualReducao)
    updatePurchaseItem(id, 'ncmAnexo', dados.ncmAnexo)
    updatePurchaseItem(id, 'ncmArtigoOrigem', dados.ncmArtigoOrigem)
    updatePurchaseItem(id, 'ncmDescricaoReducao', dados.ncmDescricaoReducao)
    updatePurchaseItem(id, 'ncmFonte', dados.ncmFonte)
    updatePurchaseItem(id, 'ncmOpcaoId', dados.ncmOpcaoId)
    updatePurchaseItem(id, 'cClassTribCodigo', dados.cClassTribCodigo)
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-950">
          Integração de base com sistema pré-reforma
        </span>
        {temOrigem ? (
          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-mono">
            <Link2 className="w-3 h-3 mr-1" /> Vínculo automático ativo — {itensComValor.length}{' '}
            item{itensComValor.length === 1 ? '' : 's'} na célula
          </Badge>
        ) : (
          <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-mono">
            Origem zerada — célula zerada
          </Badge>
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed font-mono">
        A célula fornecedor × comprador × repasse calcula sobre os itens da Calculadora de Compras —
        automaticamente, pela mesma fonte que o botão "Zerar campos" limpa. Zero lá, zero aqui;
        alimentado lá, alimentado aqui. Selecione por relevância — classe A concentra o valor (curva
        ABC).
      </p>

      {/* Portas de origem */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate('/demo/compras')}
          title="Abrir a Calculadora de Compras para lançar os itens"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-600 text-white border border-emerald-600 cursor-pointer hover:bg-emerald-700 shadow-xs transition-colors"
        >
          <ShoppingBasket className="w-3.5 h-3.5" /> Calculadora de Compras
        </button>
        <span
          title="Importação na próxima fase"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          Despesas Operacionais{' '}
          <span className="text-[10px] text-slate-400 font-normal">— próxima fase</span>
        </span>
      </div>

      {/* Visualização dos itens da origem (vínculo automático — sem importação manual) */}
      {itensComValor.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3.5 space-y-2">
          <p className="text-xs font-mono text-amber-900 leading-relaxed">
            Nenhum item com valor na Calculadora de Compras — a célula está ZERADA (regra: zero na
            origem, zero na célula). Lance itens lá, ou carregue o caso exemplo: ele ESCREVE os
            itens na Compras, e os dois lados ficam iguais de verdade.
          </p>
          <Button
            size="sm"
            onClick={onCarregarExemplo}
            className="h-8 text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Carregar caso exemplo (escreve na Compras)
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Controles de Recolher todos / Expandir todos copiando o formato da Calculadora de Compras */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Itens de Compra ({itensOrigem.length})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {itensComValor.length} ativo{itensComValor.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 p-0.5 text-xs">
              <button
                type="button"
                onClick={expandAll}
                disabled={allExpanded}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium font-mono transition-all ${
                  allExpanded
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white cursor-pointer'
                }`}
                title="Expandir todas as linhas de itens"
              >
                <ChevronDown className="w-3 h-3" />
                <span>Expandir todos</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAll}
                disabled={allCollapsed}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium font-mono transition-all ${
                  allCollapsed
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white cursor-pointer'
                }`}
                title="Recolher todas as linhas para formato compacto"
              >
                <ChevronUp className="w-3 h-3" />
                <span>Recolher todos</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto shadow-2xs">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white">
                  <th className="py-2.5 px-3 w-10 text-center rounded-tl-xl font-bold">#</th>
                  <th className="text-left px-3 py-2 font-bold">Item</th>
                  <th className="text-right px-3 py-2 font-bold">Qtd</th>
                  <th className="text-right px-3 py-2 font-bold">Mercadoria</th>
                  <th className="text-right px-3 py-2 font-bold">Frete</th>
                  <th className="text-right px-3 py-2 font-bold">ICMS</th>
                  <th className="text-right px-3 py-2 font-bold">IPI</th>
                  <th className="text-center px-3 py-2 font-bold">ABC</th>
                  <th className="text-center px-3 py-2 font-bold">NCM/SH</th>
                  <th className="text-center px-3 py-2 font-bold">Classificação</th>
                  <th className="text-right px-3 py-2 font-bold">Valor da nota</th>
                  <th className="text-center px-3 py-2 font-bold rounded-tr-xl w-24">Ação</th>
                </tr>
              </thead>
              <tbody>
                {itensOrigem.map((i, idx) => {
                  const collapsed = isCollapsed(i.id)
                  if (collapsed) {
                    return (
                      <tr
                        key={i.id}
                        className={`border-t border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition-colors ${i.valorNota <= 0 ? 'opacity-40' : ''}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <span className="w-5 h-5 rounded bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] border border-slate-700 inline-flex items-center justify-center text-white font-semibold text-[10px] shadow-sm">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2" colSpan={7}>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-slate-900 font-medium max-w-[200px] truncate"
                              title={i.name}
                            >
                              {i.name || `Item ${idx + 1}`}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ({formatNumberBR(i.quantity, 0)} un.)
                            </span>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-bold ${CLASSE_STYLE[i.classe]}`}
                            >
                              ABC {i.classe}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">
                          {i.ncm ? formatarMascaraNcm(i.ncm) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {i.ncmPercentualReducao && i.ncmPercentualReducao > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                              {i.ncmAnexo || 'Redução'} · {i.ncmPercentualReducao}%
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-normal">
                              Alíquota cheia
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900 font-bold">
                          {formatBRL(i.valorNota)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleItem(i.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded cursor-pointer transition-all shadow-sm font-medium"
                            title="Expandir classificação deste item"
                          >
                            <ChevronDown className="w-3 h-3 text-slate-500" />
                            <span>Expandir</span>
                          </button>
                        </td>
                      </tr>
                    )
                  }

                  const temReducao = Boolean(i.ncmPercentualReducao && i.ncmPercentualReducao > 0)

                  return (
                    <React.Fragment key={i.id}>
                      <tr
                        className={`border-t border-slate-200 hover:bg-slate-50 transition-colors ${i.valorNota <= 0 ? 'opacity-40' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <span className="w-5 h-5 rounded bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] border border-slate-700 inline-flex items-center justify-center text-white font-semibold text-[10px] shadow-sm">
                            {idx + 1}
                          </span>
                        </td>
                        <td
                          className="px-3 py-2 text-slate-900 max-w-[170px] truncate font-medium"
                          title={i.name}
                        >
                          {i.name || '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatNumberBR(i.quantity, 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatBRL(i.merchandiseValue)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatBRL(i.freightValue)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {formatNumberBR(i.icmsRate)}%
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {formatNumberBR(i.ipiRate)}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${CLASSE_STYLE[i.classe]}`}
                            title={`${formatNumberBR(i.abcPct)}% do valor total`}
                          >
                            {i.classe}
                          </span>
                        </td>
                        {/* Coluna NCM/SH */}
                        <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-800">
                          {i.ncm ? (
                            <span className="font-bold">{formatarMascaraNcm(i.ncm)}</span>
                          ) : (
                            <span className="text-slate-400 italic">Pendente</span>
                          )}
                        </td>
                        {/* Coluna Classificação com Badge */}
                        <td className="px-3 py-2 text-center">
                          {temReducao ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                              {i.ncmAnexo || 'Redução'} · {i.ncmPercentualReducao}%
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-medium">
                              Sem redutor — alíquota cheia
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900 font-bold">
                          {formatBRL(i.valorNota)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleItem(i.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded transition-all cursor-pointer shadow-sm font-medium"
                            title="Recolher classificação deste item"
                          >
                            <ChevronUp className="w-3 h-3 text-slate-500" />
                            <span>Recolher</span>
                          </button>
                        </td>
                      </tr>

                      {/* LINHA EXPANDIDA: PAINEL DE CLASSIFICAÇÃO COM CAMADAS INTERNAS RECUADAS */}
                      <tr className="border-t border-slate-200 bg-slate-50/40">
                        <td colSpan={12} className="p-0">
                          <ItemClassificacaoDrawer
                            item={i}
                            onAtualizarClassificacao={handleAtualizarClassificacao}
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white">
                  <td className="px-3 py-2 font-bold" colSpan={2}>
                    Origem ativa ({itensComValor.length})
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{formatNumberBR(totalQtd, 0)}</td>
                  <td className="px-3 py-2 text-right font-bold" colSpan={5}>
                    <span className="inline-flex items-center gap-1 text-slate-300 text-[11px]">
                      <BarChart3 className="w-3.5 h-3.5" /> a célula recalcula sozinha sobre estes
                      itens
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-slate-300 text-[11px]" colSpan={2}>
                    Classificação por item (Fase 3)
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-400">
                    {formatBRL(totalNota)}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-400 text-[11px] font-normal">
                    {itensOrigem.length} {itensOrigem.length === 1 ? 'item' : 'itens'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* NOTA DE RODAPÉ COLAPSÁVEL — RECOLHIDA POR PADRÃO (DETERMINAÇÃO DA ADRI) */}
      {itensComValor.length > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-100/60 overflow-hidden font-mono text-xs">
          <button
            type="button"
            onClick={() => setNotaRodapeAberta((v) => !v)}
            className="w-full flex items-center justify-between gap-2 p-3 text-left font-bold text-emerald-950 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>Vínculo automático ativo — Regra de rastreabilidade e auto-sync</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-normal">
              <span>{notaRodapeAberta ? 'Ocultar detalhes' : 'Ver nota explicativa'}</span>
              {notaRodapeAberta ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>
          {notaRodapeAberta && (
            <div className="p-3 pt-0 text-[11px] text-emerald-900 border-t border-emerald-200/60 leading-relaxed bg-emerald-50/50 space-y-1.5">
              <p>
                <strong>Vínculo automático:</strong> todos os resultados (memórias, matriz, réguas,
                espelho, notas) derivam destes itens. Zerar a Compras zera a célula — salvar o
                cenário preserva o vínculo. Edições entram no cenário ativo automaticamente
                (auto-sync): F5 reidrata o estado atual, nunca um snapshot antigo.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 pt-1 border-t border-emerald-200/50">
                <Info className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>
                  Classificação Fiscal (LC 214/2025): NCM e redutor apurados item a item repercutem
                  automaticamente na base do IBS/CBS e na memória de cálculo dos exercícios 2027+.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
