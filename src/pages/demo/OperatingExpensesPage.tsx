import React, { useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import {
  useTaxContext,
  OperatingExpenseItem,
  OperatingRevenueItem,
  OperatingExpenseCategory,
  OperatingRevenueCategory,
} from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Receipt,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Scale,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  ArrowLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHero } from '@/components/demo/PageHero'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function OperatingExpensesPage() {
  const navigate = useNavigate()
  const {
    operatingExpenses,
    operatingRevenues,
    addOperatingExpense,
    updateOperatingExpense,
    removeOperatingExpense,
    addOperatingRevenue,
    updateOperatingRevenue,
    removeOperatingRevenue,
    totalOperatingExpenses,
    totalOperatingRevenues,
    netOperatingResult,
    resetAll,
  } = useTaxContext()

  // Modal para detalhamento / discriminação por tipo (arquitetura em camadas e chips)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryModalType, setCategoryModalType] = useState<'expenses' | 'revenues'>('expenses')

  // Totais por categoria de Despesas
  const expensesByCategory = React.useMemo(() => {
    const cats: Record<OperatingExpenseCategory, number> = {
      vendas: 0,
      administrativas: 0,
      financeiras: 0,
      outras: 0,
    }
    operatingExpenses.forEach((item) => {
      const val = Number.isFinite(item.value) && item.value > 0 ? item.value : 0
      cats[item.category || 'administrativas'] += val
    })
    return cats
  }, [operatingExpenses])

  // Totais por categoria de Receitas
  const revenuesByCategory = React.useMemo(() => {
    const cats: Record<OperatingRevenueCategory, number> = {
      financeiras: 0,
      outras: 0,
    }
    operatingRevenues.forEach((item) => {
      const val = Number.isFinite(item.value) && item.value > 0 ? item.value : 0
      cats[item.category || 'outras'] += val
    })
    return cats
  }, [operatingRevenues])

  const openCategoryModal = (type: 'expenses' | 'revenues') => {
    setCategoryModalType(type)
    setIsCategoryModalOpen(true)
  }

  return (
    <DemoLayout currentTab="despesas-operacionais">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Hero Banner estilo do sistema */}
        <PageHero
          title="DESPESAS E RECEITAS OPERACIONAIS"
          subtitle="Tabela centralizada para lançamento de despesas e receitas que alimentam as DREs de todos os regimes após o Lucro Bruto."
          badge="DRE · RESULTADO OPERACIONAL & LAIR"
          icon={Receipt}
        />

        {/* Card Principal */}
        <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
          {/* Cabeçalho do Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-emerald-500/15">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Tabela Específica de Despesas e Receitas Operacionais
                </h2>
                <p className="text-xs text-slate-400">
                  Estrutura contábil após o Lucro Bruto: Lucro Bruto (−) Despesas Operacionais (+)
                  Receitas Operacionais (=) LAIR.
                </p>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="h-8 text-xs bg-slate-950/40 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Zerar campos
              </Button>
            </div>
          </div>

          {/* Destaque Informativo da Estrutura DRE */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Integração Direta com Todas as DREs (Presumido, Real, Simples) & Comparação
              </span>
              <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                As despesas operacionais cadastradas deduzem o Lucro Bruto e as receitas
                operacionais o acrescem, determinando o
                <strong className="text-emerald-300">
                  {' '}
                  Lucro antes do Imposto de Renda (LAIR)
                </strong>{' '}
                em todas as demonstrações.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openCategoryModal('expenses')}
                className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Discriminar por Tipo</span>
                <Badge className="bg-orange-500/30 text-orange-200 border-none text-[10px] px-1 py-0">
                  {operatingExpenses.length + operatingRevenues.length}
                </Badge>
              </button>
            </div>
          </div>

          {/* Painel de Resumo / Cards de Totais Operacionais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Despesas */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Total Despesas Operacionais
                </span>
                <span className="text-[11px] text-slate-500">{operatingExpenses.length} itens</span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
                  {formatBRL(totalOperatingExpenses)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Dedução do Lucro Bruto (−)</span>
                </div>
              </div>
            </div>

            {/* Total Receitas */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Total Receitas Operacionais
                </span>
                <span className="text-[11px] text-slate-500">{operatingRevenues.length} itens</span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {formatBRL(totalOperatingRevenues)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Acréscimo ao Lucro Bruto (+)</span>
                </div>
              </div>
            </div>

            {/* Resultado Operacional Líquido */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-orange-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-orange-400">
                  <Scale className="w-3.5 h-3.5" />
                  Resultado Operacional Líquido
                </span>
                <span className="text-[11px] text-slate-500">Receitas − Despesas</span>
              </div>
              <div className="mt-2">
                <div
                  className={`text-xl sm:text-2xl font-black font-mono ${
                    netOperatingResult >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(netOperatingResult)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Impacto líquido no LAIR</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA 1: DESPESAS OPERACIONAIS */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Despesas Operacionais ({operatingExpenses.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Despesas com Vendas, Administrativas, Financeiras e Outras
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    addOperatingExpense('Nova despesa operacional', 0, 'administrativas')
                  }
                  className="h-8 text-xs bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Despesa
                </Button>
              </div>
            </div>

            {/* Tabela de Despesas */}
            <div className="rounded-2xl border border-rose-500/25 bg-slate-950/70 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">Descrição da Despesa</th>
                      <th className="py-2.5 px-3 font-semibold w-48">Tipo / Categoria</th>
                      <th className="py-2.5 px-3 font-semibold text-right w-44">Valor (R$)</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-16">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {operatingExpenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-500 font-sans text-xs"
                        >
                          Nenhuma despesa operacional cadastrada. Clique em{' '}
                          <strong className="text-orange-400">+ Adicionar Despesa</strong> para
                          inserir.
                        </td>
                      </tr>
                    ) : (
                      operatingExpenses.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <Input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                updateOperatingExpense(item.id, 'description', e.target.value)
                              }
                              placeholder="Ex.: Aluguel escritório, Frete sobre vendas, Juros bancários..."
                              className="h-8 text-xs bg-slate-900/90 border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-100 placeholder:text-slate-600 font-sans"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category || 'administrativas'}
                              onChange={(e) =>
                                updateOperatingExpense(
                                  item.id,
                                  'category',
                                  e.target.value as OperatingExpenseCategory,
                                )
                              }
                              className="h-8 w-full text-xs bg-slate-900/90 border border-slate-700 rounded-md px-2 text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans cursor-pointer"
                            >
                              <option value="vendas">Despesas com Vendas</option>
                              <option value="administrativas">Despesas Administrativas</option>
                              <option value="financeiras">Despesas Financeiras</option>
                              <option value="outras">Outras Despesas Operacionais</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="relative inline-block w-full">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                                R$
                              </span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={item.value === 0 ? '' : formatNumberBR(item.value)}
                                onChange={(e) =>
                                  updateOperatingExpense(
                                    item.id,
                                    'value',
                                    parseBRNumber(e.target.value),
                                  )
                                }
                                placeholder="0,00"
                                className="h-8 text-xs pl-8 text-right bg-slate-900/90 border-orange-500/50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-orange-200 font-bold"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOperatingExpense(item.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Remover despesa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {operatingExpenses.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-800 bg-slate-900/95 font-mono text-xs">
                        <td colSpan={3} className="py-3 px-3 font-bold text-slate-300 text-right">
                          Total de Despesas Operacionais:
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-400 text-sm">
                          {formatBRL(totalOperatingExpenses)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* TABELA 2: RECEITAS OPERACIONAIS */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Receitas Operacionais ({operatingRevenues.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Receitas Financeiras, Rendimentos e Outras Receitas Operacionais
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addOperatingRevenue('Nova receita operacional', 0, 'outras')}
                  className="h-8 text-xs bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Receita
                </Button>
              </div>
            </div>

            {/* Tabela de Receitas */}
            <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/70 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">Descrição da Receita</th>
                      <th className="py-2.5 px-3 font-semibold w-48">Tipo / Categoria</th>
                      <th className="py-2.5 px-3 font-semibold text-right w-44">Valor (R$)</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-16">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {operatingRevenues.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-500 font-sans text-xs"
                        >
                          Nenhuma receita operacional cadastrada. Clique em{' '}
                          <strong className="text-orange-400">+ Adicionar Receita</strong> para
                          inserir.
                        </td>
                      </tr>
                    ) : (
                      operatingRevenues.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <Input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                updateOperatingRevenue(item.id, 'description', e.target.value)
                              }
                              placeholder="Ex.: Rendimento de aplicação financeira, Descontos obtidos..."
                              className="h-8 text-xs bg-slate-900/90 border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-100 placeholder:text-slate-600 font-sans"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category || 'outras'}
                              onChange={(e) =>
                                updateOperatingRevenue(
                                  item.id,
                                  'category',
                                  e.target.value as OperatingRevenueCategory,
                                )
                              }
                              className="h-8 w-full text-xs bg-slate-900/90 border border-slate-700 rounded-md px-2 text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans cursor-pointer"
                            >
                              <option value="financeiras">Receitas Financeiras</option>
                              <option value="outras">Outras Receitas Operacionais</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="relative inline-block w-full">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                                R$
                              </span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={item.value === 0 ? '' : formatNumberBR(item.value)}
                                onChange={(e) =>
                                  updateOperatingRevenue(
                                    item.id,
                                    'value',
                                    parseBRNumber(e.target.value),
                                  )
                                }
                                placeholder="0,00"
                                className="h-8 text-xs pl-8 text-right bg-slate-900/90 border-orange-500/50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-orange-200 font-bold"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOperatingRevenue(item.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Remover receita"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {operatingRevenues.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-800 bg-slate-900/95 font-mono text-xs">
                        <td colSpan={3} className="py-3 px-3 font-bold text-slate-300 text-right">
                          Total de Receitas Operacionais:
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">
                          {formatBRL(totalOperatingRevenues)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Botões de Navegação Inferiores */}
          <div className="pt-4 border-t border-emerald-500/15 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/demo/markup')}
              className="text-xs bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Voltar: Calculadora de Markup
            </Button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/demo/dre-presumido')}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <span>Avançar para DRE Lucro Presumido</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal em Camadas: Discriminação por Categoria / Tipo */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-2xl bg-[#091511] border border-emerald-500/30 text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-400" />
              Detalhamento por Categoria Operacional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Discriminação contábil estruturada para integração com as DREs e apuração do Lucro
              Real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Bloco de Despesas */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase font-bold text-rose-400 flex items-center justify-between">
                <span>Despesas Operacionais por Categoria</span>
                <span>{formatBRL(totalOperatingExpenses)}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Com Vendas</div>
                  <div className="font-bold text-rose-300 mt-0.5">
                    {formatBRL(expensesByCategory.vendas)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Administrativas</div>
                  <div className="font-bold text-rose-300 mt-0.5">
                    {formatBRL(expensesByCategory.administrativas)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Financeiras (Dedutíveis no Real)</div>
                  <div className="font-bold text-rose-300 mt-0.5">
                    {formatBRL(expensesByCategory.financeiras)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Outras Despesas</div>
                  <div className="font-bold text-rose-300 mt-0.5">
                    {formatBRL(expensesByCategory.outras)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco de Receitas */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase font-bold text-emerald-400 flex items-center justify-between">
                <span>Receitas Operacionais por Categoria</span>
                <span>{formatBRL(totalOperatingRevenues)}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Financeiras</div>
                  <div className="font-bold text-emerald-300 mt-0.5">
                    {formatBRL(revenuesByCategory.financeiras)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Outras Receitas</div>
                  <div className="font-bold text-emerald-300 mt-0.5">
                    {formatBRL(revenuesByCategory.outras)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-xs text-orange-200">
              💡 <strong>Regras Fiscais:</strong> No Lucro Real, as despesas operacionais
              necessárias e comprovadas reduzem o LAIR que serve de partida para o LALUR; receitas
              financeiras e operacionais acrescem a base tributável. No Lucro Presumido e Simples, o
              cálculo principal parte da receita bruta / faturamento, com o LAIR figurando na
              estrutura analítica da demonstração.
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                Fechar Detalhamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DemoLayout>
  )
}
