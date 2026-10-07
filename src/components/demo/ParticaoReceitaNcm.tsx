import React, { useState } from 'react'
import {
  TABELA_OFICIAL_CCLASSTRIB,
  METADADOS_TABELA_CCLASSTRIB,
  SUGESTOES_NCM_COMUNS,
  buscarCClassTrib,
} from '@/lib/tabelaOficialCClassTrib'
import type { ItemParticaoReceita } from '@/lib/simuladorOpcaoCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Percent,
  DollarSign,
  Layers,
} from 'lucide-react'
import { fmtSN, roundHalfUp } from '@/lib/art12SnCalculations'

interface ParticaoReceitaNcmProps {
  receitaTotal: number
  itens: ItemParticaoReceita[]
  onChangeItens: (novosItens: ItemParticaoReceita[]) => void
}

export const ParticaoReceitaNcm: React.FC<ParticaoReceitaNcmProps> = ({
  receitaTotal,
  itens,
  onChangeItens,
}) => {
  const [modoEdicao, setModoEdicao] = useState<'percentual' | 'valor'>('percentual')
  const [buscaSugestao, setBuscaSugestao] = useState('')

  // Calcula totais alocados
  const totalPercentualAlocado = itens.reduce((acc, it) => acc + (it.percentualReceita || 0), 0)
  const totalValorAlocado = itens.reduce((acc, it) => acc + (it.valorReceita || 0), 0)

  const ultrapassou =
    modoEdicao === 'percentual'
      ? totalPercentualAlocado > 100.001
      : totalValorAlocado > receitaTotal + 0.01

  const restantePercentual = Math.max(0, 100 - totalPercentualAlocado)
  const restanteValor = Math.max(0, receitaTotal - totalValorAlocado)

  // Adicionar nova linha
  const handleAdicionarLinha = (sugestao?: (typeof SUGESTOES_NCM_COMUNS)[0]) => {
    if (itens.length >= 10) return

    const cClass = sugestao
      ? buscarCClassTrib(sugestao.cClassTribPadrao)
      : TABELA_OFICIAL_CCLASSTRIB[0]
    const pctRestante = Math.max(0, roundHalfUp(restantePercentual, 2))
    const vlrRestante = Math.max(0, roundHalfUp((receitaTotal * pctRestante) / 100, 2))

    const novoItem: ItemParticaoReceita = {
      id: `ncm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ncm: sugestao?.ncm || '',
      descricao: sugestao?.descricao || 'Produto / Mercadoria',
      cClassTrib: cClass?.codigo || '000001',
      percentualReceita: pctRestante,
      valorReceita: vlrRestante,
      reducaoCbsPct: cClass?.reducaoCbsPct || 0,
      reducaoIbsPct: cClass?.reducaoIbsPct || 0,
      baseLegal: cClass?.baseLegal || 'Regra geral',
      anexoLc214: cClass?.anexoLc214,
      rbSnIncompativel: cClass?.rbSnIncompativel,
    }

    onChangeItens([...itens, novoItem])
  }

  // Remover linha
  const handleRemoverLinha = (id: string) => {
    onChangeItens(itens.filter((it) => it.id !== id))
  }

  // Alterar campo de um item
  const handleAtualizarItem = (id: string, updates: Partial<ItemParticaoReceita>) => {
    const novosItens = itens.map((it) => {
      if (it.id !== id) return it
      const atualizado = { ...it, ...updates }

      // Se mudou cClassTrib, atualiza os benefícios automaticamente da tabela oficial
      if (updates.cClassTrib && updates.cClassTrib !== it.cClassTrib) {
        const cClass = buscarCClassTrib(updates.cClassTrib)
        if (cClass) {
          atualizado.reducaoCbsPct = cClass.reducaoCbsPct
          atualizado.reducaoIbsPct = cClass.reducaoIbsPct
          atualizado.baseLegal = cClass.baseLegal
          atualizado.anexoLc214 = cClass.anexoLc214
          atualizado.rbSnIncompativel = cClass.rbSnIncompativel
        }
      }

      // Se mudou percentual, recalcula valor
      if (updates.percentualReceita !== undefined && modoEdicao === 'percentual') {
        atualizado.valorReceita = roundHalfUp((receitaTotal * updates.percentualReceita) / 100, 2)
      }

      // Se mudou valor, recalcula percentual
      if (updates.valorReceita !== undefined && modoEdicao === 'valor' && receitaTotal > 0) {
        atualizado.percentualReceita = roundHalfUp((updates.valorReceita / receitaTotal) * 100, 2)
      }

      return atualizado
    })

    onChangeItens(novosItens)
  }

  // Redistribuir igualmente
  const handleRedistribuirIgualmente = () => {
    if (itens.length === 0) return
    const pctIndividual = roundHalfUp(100 / itens.length, 2)
    const novosItens = itens.map((it, idx) => {
      // Ajusta o último para fechar em exatamente 100%
      const pct =
        idx === itens.length - 1
          ? roundHalfUp(100 - pctIndividual * (itens.length - 1), 2)
          : pctIndividual
      const vlr = roundHalfUp((receitaTotal * pct) / 100, 2)
      return {
        ...it,
        percentualReceita: pct,
        valorReceita: vlr,
      }
    })
    onChangeItens(novosItens)
  }

  const sugestoesFiltradas = SUGESTOES_NCM_COMUNS.filter(
    (s) =>
      s.ncm.includes(buscaSugestao) ||
      s.descricao.toLowerCase().includes(buscaSugestao.toLowerCase()),
  )

  return (
    <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#07130e]/80 p-4">
      {/* Cabeçalho da Camada NCM/NBS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white font-mono">
              Partição de Receita por NCM/NBS & Benefícios cClassTrib
            </h4>
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-[10px] text-emerald-300 font-mono"
            >
              {METADADOS_TABELA_CCLASSTRIB.versao}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Snapshot oficial IT 2025.002 ({METADADOS_TABELA_CCLASSTRIB.dataPublicacao}) • Alíquotas
            e reduções por tributo
          </p>
        </div>

        {/* Alternador R$ x % */}
        <div className="flex items-center gap-1.5 bg-[#0a1b14] p-1 rounded-lg border border-emerald-500/20">
          <span className="text-[11px] font-mono text-slate-400 px-1">Editar por:</span>
          <Button
            type="button"
            size="sm"
            variant={modoEdicao === 'percentual' ? 'default' : 'ghost'}
            onClick={() => setModoEdicao('percentual')}
            className={`h-7 px-2.5 text-xs font-mono ${
              modoEdicao === 'percentual'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300'
            }`}
          >
            <Percent className="h-3 w-3 mr-1" /> %
          </Button>
          <Button
            type="button"
            size="sm"
            variant={modoEdicao === 'valor' ? 'default' : 'ghost'}
            onClick={() => setModoEdicao('valor')}
            className={`h-7 px-2.5 text-xs font-mono ${
              modoEdicao === 'valor' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <DollarSign className="h-3 w-3 mr-1" /> R$
          </Button>
        </div>
      </div>

      {/* Barra de Validação de Soma */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300">
            Alocação da Receita:{' '}
            <strong className="text-emerald-300">{fmtSN(totalPercentualAlocado, 2)}%</strong> (R${' '}
            {fmtSN(totalValorAlocado)})
          </span>
          <span className="text-slate-400">
            Receita Total: <strong>R$ {fmtSN(receitaTotal)}</strong>
          </span>
        </div>

        {/* Barra de Progresso visual */}
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              ultrapassou
                ? 'bg-rose-500'
                : totalPercentualAlocado >= 99.99
                  ? 'bg-emerald-400'
                  : 'bg-teal-500'
            }`}
            style={{ width: `${Math.min(100, totalPercentualAlocado)}%` }}
          />
        </div>

        {/* Alerta de Ultrapassagem ou Pendência de fechamento */}
        {ultrapassou ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>
              <strong>Ultrapassou:</strong> A soma excede 100% da receita em{' '}
              {fmtSN(totalPercentualAlocado - 100, 2)}% (R${' '}
              {fmtSN(totalValorAlocado - receitaTotal)} a mais). Ajuste as linhas.
            </span>
          </div>
        ) : totalPercentualAlocado < 99.99 ? (
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                Receita restante sem alocar: {fmtSN(restantePercentual, 2)}% (R${' '}
                {fmtSN(restanteValor)})
              </span>
            </div>
            {itens.length > 0 && (
              <button
                type="button"
                onClick={handleRedistribuirIgualmente}
                className="text-amber-200 underline hover:text-white cursor-pointer ml-2"
              >
                Distribuir igualmente
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>100% da receita semestral alocada perfeitamente entre os itens.</span>
          </div>
        )}
      </div>

      {/* Linhas de Itens (Até 10 NCMs) */}
      <div className="space-y-3">
        {itens.map((item, idx) => (
          <div
            key={item.id}
            className="p-3 rounded-lg border border-emerald-500/20 bg-[#091a13] space-y-2.5 transition-colors hover:border-emerald-500/35"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25">
                  #{idx + 1}
                </span>
                <Input
                  placeholder="NCM (ex: 1006.30.21)"
                  value={item.ncm}
                  onChange={(e) => handleAtualizarItem(item.id, { ncm: e.target.value })}
                  className="h-8 w-36 font-mono text-xs bg-[#06100d] border-emerald-500/25 text-white"
                />
                <Input
                  placeholder="Descrição do item"
                  value={item.descricao}
                  onChange={(e) => handleAtualizarItem(item.id, { descricao: e.target.value })}
                  className="h-8 w-48 sm:w-64 font-sans text-xs bg-[#06100d] border-emerald-500/25 text-white"
                />
              </div>

              {/* Botão Remover */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoverLinha(item.id)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                title="Remover linha"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Linha de Valores e cClassTrib */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 text-xs">
              {/* Valor / Percentual */}
              <div className="sm:col-span-4 flex items-center gap-2">
                {modoEdicao === 'percentual' ? (
                  <div className="flex items-center gap-1 w-full">
                    <span className="font-mono text-slate-400 text-[11px]">% da receita:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.percentualReceita}
                      onChange={(e) =>
                        handleAtualizarItem(item.id, {
                          percentualReceita: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8 font-mono text-xs bg-[#06100d] border-emerald-500/25 text-emerald-300 w-24 text-right"
                    />
                    <span className="font-mono text-[11px] text-slate-400">
                      = R$ {fmtSN(item.valorReceita)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 w-full">
                    <span className="font-mono text-slate-400 text-[11px]">R$ da receita:</span>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      value={item.valorReceita}
                      onChange={(e) =>
                        handleAtualizarItem(item.id, {
                          valorReceita: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8 font-mono text-xs bg-[#06100d] border-emerald-500/25 text-emerald-300 w-28 text-right"
                    />
                    <span className="font-mono text-[11px] text-slate-400">
                      ({fmtSN(item.percentualReceita, 2)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Seletor de cClassTrib */}
              <div className="sm:col-span-8 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="font-mono text-slate-400 text-[11px] shrink-0">cClassTrib:</span>
                <select
                  value={item.cClassTrib}
                  onChange={(e) => handleAtualizarItem(item.id, { cClassTrib: e.target.value })}
                  aria-label="Classificação tributária cClassTrib"
                  className="h-8 w-full rounded-md border border-emerald-500/25 bg-[#06100d] px-2 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {TABELA_OFICIAL_CCLASSTRIB.map((c) => (
                    <option key={c.codigo} value={c.codigo} className="bg-slate-900 text-white">
                      {c.codigo} — {c.descricao.substring(0, 48)}
                      {c.reducaoCbsPct > 0 ? ` (Redução ${c.reducaoCbsPct}%)` : ''}
                    </option>
                  ))}
                </select>

                {/* Badge de Benefício */}
                <div className="shrink-0 flex items-center gap-1 font-mono text-[10px]">
                  {item.reducaoCbsPct > 0 || item.reducaoIbsPct > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Redução CBS: {item.reducaoCbsPct}% | IBS: {item.reducaoIbsPct}%
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Alíquota Plena (0% Redução)
                    </span>
                  )}
                  {item.rbSnIncompativel && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                      RB SN Incompatível
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Base Legal */}
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 border-t border-emerald-500/10 pt-1.5">
              <span className="text-emerald-400 font-semibold">Fundamento legal:</span>
              <span className="truncate">{item.baseLegal}</span>
              {item.anexoLc214 && <span className="text-teal-300">({item.anexoLc214})</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Botões de Ação e Sugestões Rápidas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleAdicionarLinha()}
          disabled={itens.length >= 10}
          className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 h-8 text-xs font-mono"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar NCM ({itens.length}/10)
        </Button>

        {/* Busca e inserção de NCM pré-configurado */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <Input
            placeholder="Buscar sugestão rápida (ex: arroz, leite, café)..."
            value={buscaSugestao}
            onChange={(e) => setBuscaSugestao(e.target.value)}
            className="h-8 text-xs bg-[#06100d] border-emerald-500/20 text-white w-full sm:w-60"
          />
        </div>
      </div>

      {/* Chips de Sugestão de NCMs comuns */}
      {buscaSugestao && sugestoesFiltradas.length > 0 && (
        <div className="p-2.5 rounded-lg bg-[#081510] border border-emerald-500/20 space-y-1.5">
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            Sugestões com classificação cClassTrib vinculada (clique para adicionar):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sugestoesFiltradas.slice(0, 4).map((s) => (
              <button
                key={s.ncm}
                type="button"
                onClick={() => {
                  handleAdicionarLinha(s)
                  setBuscaSugestao('')
                }}
                className="text-[11px] font-mono px-2 py-1 rounded bg-[#0b2017] hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-emerald-500/30 cursor-pointer transition-colors"
              >
                + {s.ncm} • {s.descricao}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
