import React, { useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import {
  useTaxContext,
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
  ArrowLeft,
  ChevronRight,
  Building2,
  Building,
  Landmark,
  CheckCircle2,
  HelpCircle,
  Eye,
  Tag,
  DollarSign,
  Info,
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
import {
  CompanySize,
  COMPANY_SIZE_LABELS,
  EXPENSE_CATEGORY_LABELS,
  REVENUE_CATEGORY_LABELS,
  EXPENSE_PRESETS,
  REVENUE_PRESETS,
  ExpensePreset,
  RevenuePreset,
} from '@/data/operatingPresets'

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

  // Modal para detalhamento / discriminação geral por tipo (camada analítica existente)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  // Camada Oculta: Adicionar Despesa com Discriminação e Exemplos
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] =
    useState<OperatingExpenseCategory>('administrativas')
  const [expenseValueStr, setExpenseValueStr] = useState('')
  const [expenseCompanySize, setExpenseCompanySize] = useState<CompanySize>('small')
  const [expenseSuccessFeedback, setExpenseSuccessFeedback] = useState<string | null>(null)

  // Camada Oculta: Adicionar Receita com Discriminação e Exemplos
  const [isAddRevenueModalOpen, setIsAddRevenueModalOpen] = useState(false)
  const [revenueDescription, setRevenueDescription] = useState('')
  const [revenueCategory, setRevenueCategory] = useState<OperatingRevenueCategory>('outras')
  const [revenueValueStr, setRevenueValueStr] = useState('')
  const [revenueCompanySize, setRevenueCompanySize] = useState<CompanySize>('small')
  const [revenueSuccessFeedback, setRevenueSuccessFeedback] = useState<string | null>(null)

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

  // Abrir camada de adição de Despesa
  const handleOpenAddExpense = (initialSize: CompanySize = 'small') => {
    setExpenseDescription('')
    setExpenseCategory('administrativas')
    setExpenseValueStr('')
    setExpenseCompanySize(initialSize)
    setExpenseSuccessFeedback(null)
    setIsAddExpenseModalOpen(true)
  }

  // Salvar despesa manual na camada
  const handleSaveCustomExpense = () => {
    const desc = expenseDescription.trim() || 'Nova despesa operacional'
    const val = parseBRNumber(expenseValueStr)
    addOperatingExpense(desc, val, expenseCategory)
    setIsAddExpenseModalOpen(false)
    setExpenseDescription('')
    setExpenseValueStr('')
  }

  // Preencher campos da camada com um exemplo de despesa (com opção de adicionar direto ou pré-carregar)
  const handleSelectExpensePreset = (preset: ExpensePreset, addDirectly = false) => {
    if (addDirectly) {
      addOperatingExpense(preset.description, preset.suggestedValue, preset.category)
      setExpenseSuccessFeedback(
        `Adicionado: "${preset.label}" (${formatBRL(preset.suggestedValue)})`,
      )
      setTimeout(() => setExpenseSuccessFeedback(null), 2500)
    } else {
      setExpenseDescription(preset.description)
      setExpenseCategory(preset.category)
      setExpenseValueStr(preset.suggestedValue === 0 ? '' : formatNumberBR(preset.suggestedValue))
    }
  }

  // Abrir camada de adição de Receita
  const handleOpenAddRevenue = (initialSize: CompanySize = 'small') => {
    setRevenueDescription('')
    setRevenueCategory('outras')
    setRevenueValueStr('')
    setRevenueCompanySize(initialSize)
    setRevenueSuccessFeedback(null)
    setIsAddRevenueModalOpen(true)
  }

  // Salvar receita manual na camada
  const handleSaveCustomRevenue = () => {
    const desc = revenueDescription.trim() || 'Nova receita operacional'
    const val = parseBRNumber(revenueValueStr)
    addOperatingRevenue(desc, val, revenueCategory)
    setIsAddRevenueModalOpen(false)
    setRevenueDescription('')
    setRevenueValueStr('')
  }

  // Preencher campos da camada com um exemplo de receita
  const handleSelectRevenuePreset = (preset: RevenuePreset, addDirectly = false) => {
    if (addDirectly) {
      addOperatingRevenue(preset.description, preset.suggestedValue, preset.category)
      setRevenueSuccessFeedback(
        `Adicionado: "${preset.label}" (${formatBRL(preset.suggestedValue)})`,
      )
      setTimeout(() => setRevenueSuccessFeedback(null), 2500)
    } else {
      setRevenueDescription(preset.description)
      setRevenueCategory(preset.category)
      setRevenueValueStr(preset.suggestedValue === 0 ? '' : formatNumberBR(preset.suggestedValue))
    }
  }

  // Filtros de presets por porte selecionado
  const filteredExpensePresets = React.useMemo(
    () => EXPENSE_PRESETS.filter((p) => p.size === expenseCompanySize),
    [expenseCompanySize],
  )

  const filteredRevenuePresets = React.useMemo(
    () => REVENUE_PRESETS.filter((p) => p.size === revenueCompanySize),
    [revenueCompanySize],
  )

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

            {/* Ações Rápidas: Zerar campos */}
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

          {/* Destaque Informativo da Estrutura DRE + Chips de Camadas */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Integração Direta com Todas as DREs (Presumido, Real, Simples) & Comparação
              </span>
              <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                As despesas e receitas operacionais são lançadas por camadas com discriminação
                contábil (Vendas, Administrativas, Financeiras, Outras) e modelos prontos por porte
                (pequeno, médio e grande porte). O resultado apura diretamente o{' '}
                <strong className="text-emerald-300">Lucro antes do Imposto de Renda (LAIR)</strong>
                .
              </p>
            </div>

            {/* Chips em Camadas (padrão do sistema) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Chip 1: Discriminação por Categoria */}
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm bg-orange-500/[0.14] border-orange-400/80 text-orange-200 hover:bg-orange-500/25 hover:border-orange-300 shadow-orange-500/10 ring-1 ring-orange-500/20"
                title="Abrir camada com a discriminação analítica por categoria e regras fiscais"
              >
                <Layers className="w-3.5 h-3.5 text-orange-300" />
                <span className="font-semibold text-orange-100">Discriminar por Tipo</span>
                <Badge className="text-[10px] px-1.5 py-0 border-0 font-semibold bg-orange-500/35 text-orange-100">
                  {operatingExpenses.length + operatingRevenues.length} itens
                </Badge>
                <ChevronRight className="w-3 h-3 text-orange-300/70 ml-0.5" />
              </button>

              {/* Chip 2: Adicionar Despesa (Camada Oculta) */}
              <button
                type="button"
                onClick={() => handleOpenAddExpense('small')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm bg-rose-500/[0.14] border-rose-400/80 text-rose-200 hover:bg-rose-500/25 hover:border-rose-300 shadow-rose-500/10 ring-1 ring-rose-500/20"
                title="Abrir camada para adicionar despesa com discriminação e exemplos prontos"
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                <span className="font-semibold text-rose-100">+ Despesa</span>
                <Badge className="text-[10px] px-1.5 py-0 border-0 font-semibold bg-rose-500/35 text-rose-100">
                  {operatingExpenses.length}
                </Badge>
                <ChevronRight className="w-3 h-3 text-rose-300/70 ml-0.5" />
              </button>

              {/* Chip 3: Adicionar Receita (Camada Oculta) */}
              <button
                type="button"
                onClick={() => handleOpenAddRevenue('small')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm bg-emerald-500/[0.14] border-emerald-400/80 text-emerald-200 hover:bg-emerald-500/25 hover:border-emerald-300 shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                title="Abrir camada para adicionar receita com discriminação e exemplos prontos"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-semibold text-emerald-100">+ Receita</span>
                <Badge className="text-[10px] px-1.5 py-0 border-0 font-semibold bg-emerald-500/35 text-emerald-100">
                  {operatingRevenues.length}
                </Badge>
                <ChevronRight className="w-3 h-3 text-emerald-300/70 ml-0.5" />
              </button>
            </div>
          </div>

          {/* Painel de Resumo / Cards de Totais Operacionais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Despesas */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Total Despesas Operacionais
                </span>
                <span className="text-[11px] text-slate-500">{operatingExpenses.length} itens</span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
                  {formatBRL(totalOperatingExpenses)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Dedução do Lucro Bruto (−)</span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddExpense('small')}
                    className="text-[10px] text-rose-300 hover:text-rose-200 underline font-mono cursor-pointer"
                  >
                    + lançar
                  </button>
                </div>
              </div>
            </div>

            {/* Total Receitas */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Total Receitas Operacionais
                </span>
                <span className="text-[11px] text-slate-500">{operatingRevenues.length} itens</span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {formatBRL(totalOperatingRevenues)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Acréscimo ao Lucro Bruto (+)</span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddRevenue('small')}
                    className="text-[10px] text-emerald-300 hover:text-emerald-200 underline font-mono cursor-pointer"
                  >
                    + lançar
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado Operacional Líquido */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-orange-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-orange-400 font-semibold">
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
                  <span>Impacto líquido direto no LAIR</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA 1: DESPESAS OPERACIONAIS (Frontal Enxuta com Discriminação em Badge) */}
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
                    Discriminações contábeis definidas na camada oculta ao adicionar
                  </p>
                </div>
              </div>

              {/* Botão de Adicionar Despesa que abre a camada */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenAddExpense('small')}
                  className="h-8 text-xs bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Despesa
                </Button>
              </div>
            </div>

            {/* Tabela Frontal Enxuta de Despesas */}
            <div className="rounded-2xl border border-rose-500/25 bg-slate-950/70 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">Descrição da Despesa</th>
                      <th className="py-2.5 px-3 font-semibold w-52">Discriminação / Tipo</th>
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
                          <p className="mb-2">Nenhuma despesa operacional cadastrada.</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenAddExpense('small')}
                            className="h-7 text-xs bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 cursor-pointer font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Abrir Camada e Inserir Despesa
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      operatingExpenses.map((item, idx) => {
                        const catMeta = EXPENSE_CATEGORY_LABELS[item.category || 'administrativas']
                        return (
                          <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            {/* Descrição rápida editável na frente */}
                            <td className="py-2 px-3">
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  updateOperatingExpense(item.id, 'description', e.target.value)
                                }
                                placeholder="Descrição da despesa..."
                                className="h-8 text-xs bg-slate-900/90 border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-100 placeholder:text-slate-600 font-sans"
                              />
                            </td>
                            {/* Discriminação contábil exibida como chip informativo com badge */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={`text-[11px] font-mono font-medium px-2 py-0.5 border ${catMeta.badgeClass}`}
                                >
                                  {catMeta.label}
                                </Badge>
                              </div>
                            </td>
                            {/* Valor monetário com campo laranja interativo */}
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
                            {/* Ação de remover */}
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
                        )
                      })
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

          {/* TABELA 2: RECEITAS OPERACIONAIS (Frontal Enxuta com Discriminação em Badge) */}
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
                    Discriminações contábeis definidas na camada oculta ao adicionar
                  </p>
                </div>
              </div>

              {/* Botão de Adicionar Receita que abre a camada */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenAddRevenue('small')}
                  className="h-8 text-xs bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Receita
                </Button>
              </div>
            </div>

            {/* Tabela Frontal Enxuta de Receitas */}
            <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/70 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">Descrição da Receita</th>
                      <th className="py-2.5 px-3 font-semibold w-52">Discriminação / Tipo</th>
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
                          <p className="mb-2">Nenhuma receita operacional cadastrada.</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenAddRevenue('small')}
                            className="h-7 text-xs bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 cursor-pointer font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Abrir Camada e Inserir Receita
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      operatingRevenues.map((item, idx) => {
                        const catMeta = REVENUE_CATEGORY_LABELS[item.category || 'outras']
                        return (
                          <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            {/* Descrição rápida */}
                            <td className="py-2 px-3">
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  updateOperatingRevenue(item.id, 'description', e.target.value)
                                }
                                placeholder="Descrição da receita..."
                                className="h-8 text-xs bg-slate-900/90 border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-100 placeholder:text-slate-600 font-sans"
                              />
                            </td>
                            {/* Discriminação contábil em badge */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={`text-[11px] font-mono font-medium px-2 py-0.5 border ${catMeta.badgeClass}`}
                                >
                                  {catMeta.label}
                                </Badge>
                              </div>
                            </td>
                            {/* Valor monetário com campo laranja interativo */}
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
                            {/* Ação de remover */}
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
                        )
                      })
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

      {/* ===================================================================== */}
      {/* CAMADA OCULTA 1: ADICIONAR DESPESA COM DISCRIMINAÇÃO E EXEMPLOS PRONTOS */}
      {/* ===================================================================== */}
      <Dialog open={isAddExpenseModalOpen} onOpenChange={setIsAddExpenseModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#07130f] border border-rose-500/40 text-slate-100 shadow-2xl p-5 sm:p-7">
          <DialogHeader className="border-b border-rose-500/20 pb-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <span>Adicionar Despesa Operacional</span>
              </DialogTitle>
              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-mono">
                Dedução (−)
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Escolha a discriminação contábil da despesa ou insira com 1 clique a partir dos
              exemplos prontos para empresas de pequeno, médio ou grande porte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* Feedback de inserção rápida */}
            {expenseSuccessFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{expenseSuccessFeedback}</span>
              </div>
            )}

            {/* SEÇÃO A: MODELOS PRONTOS POR PORTE (1-CLIQUE) */}
            <div className="space-y-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    Exemplos Prontos do Dia a Dia Empresarial
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  Clique para preencher ou inserir diretamente
                </span>
              </div>

              {/* Seletor de Porte com Chips / Abas */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseCompanySize('small')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    expenseCompanySize === 'small'
                      ? 'bg-orange-500/20 border-orange-500/80 text-orange-100 shadow-sm shadow-orange-500/20 ring-1 ring-orange-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building2 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Pequeno Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">ME / EPP</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseCompanySize('medium')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    expenseCompanySize === 'medium'
                      ? 'bg-orange-500/20 border-orange-500/80 text-orange-100 shadow-sm shadow-orange-500/20 ring-1 ring-orange-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building className="w-3.5 h-3.5 text-orange-400" />
                    <span>Médio Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Média Empresa</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseCompanySize('large')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    expenseCompanySize === 'large'
                      ? 'bg-orange-500/20 border-orange-500/80 text-orange-100 shadow-sm shadow-orange-500/20 ring-1 ring-orange-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Landmark className="w-3.5 h-3.5 text-orange-400" />
                    <span>Grande Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Corporativo / S.A.
                  </div>
                </button>
              </div>

              {/* Descrição do Porte Ativo */}
              <p className="text-[11px] text-slate-400 font-mono">
                {COMPANY_SIZE_LABELS[expenseCompanySize].description}
              </p>

              {/* Grade de Chips de Exemplos Clicáveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto pr-1">
                {filteredExpensePresets.map((preset) => {
                  const cat = EXPENSE_CATEGORY_LABELS[preset.category]
                  return (
                    <div
                      key={preset.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/50 transition-all flex flex-col justify-between gap-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-orange-200">
                          {preset.label}
                        </span>
                        <Badge
                          className={`text-[9px] font-mono px-1.5 py-0 border ${cat.badgeClass} shrink-0`}
                        >
                          {cat.short}
                        </Badge>
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-1">{preset.hint}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-mono text-xs">
                        <span className="text-rose-400 font-bold">
                          {formatBRL(preset.suggestedValue)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectExpensePreset(preset, false)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Preencher campos abaixo para personalizar"
                          >
                            Preencher
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectExpensePreset(preset, true)}
                            className="text-[10px] px-2 py-0.5 rounded bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Inserir na tabela com 1 clique"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Inserir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SEÇÃO B: DISCRIMINAÇÃO E FORMULÁRIO MANUAL */}
            <div className="space-y-4 bg-slate-950/70 border border-rose-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Tag className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Discriminação Contábil e Valores
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo 1: Descrição */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1">
                    <span>Descrição da Despesa</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Ex.: Aluguel do ponto, Energia elétrica, Honorários contábeis..."
                    className="h-9 text-xs bg-slate-900 border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-100 placeholder:text-slate-600 font-sans"
                  />
                </div>

                {/* Campo 2: Discriminação / Categoria Contábil */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                    <span>Discriminação / Categoria</span>
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as OperatingExpenseCategory)}
                    className="h-9 w-full text-xs bg-slate-900 border border-slate-700 rounded-md px-3 text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans cursor-pointer"
                  >
                    <option value="vendas">
                      Despesas com Vendas (comissões, fretes, marketing)
                    </option>
                    <option value="administrativas">
                      Despesas Administrativas (aluguel, salários, software, contabilidade)
                    </option>
                    <option value="financeiras">
                      Despesas Financeiras (juros bancários, tarifas, IOF)
                    </option>
                    <option value="outras">Outras Despesas Operacionais</option>
                  </select>
                </div>

                {/* Campo 3: Valor (R$) com digitação em laranja */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                    <span>Valor da Despesa (R$)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={expenseValueStr}
                      onChange={(e) => setExpenseValueStr(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-xs pl-8 text-right bg-slate-900 border-orange-500/70 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-orange-200 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dica de dedutibilidade fiscal */}
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-[11px] font-mono text-orange-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tratamento Fiscal:</strong> Despesas operacionais necessárias e
                  comprovadas deduzem o LAIR contábil em todos os regimes e servem de base para a
                  apuração do Lucro Real e cálculo do LALUR.
                </span>
              </div>
            </div>

            {/* Ações da Camada */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs font-mono text-slate-400">
                Lançadas no momento:{' '}
                <strong className="text-white">{operatingExpenses.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustomExpense}
                  className="text-xs bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Salvar Despesa
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* CAMADA OCULTA 2: ADICIONAR RECEITA COM DISCRIMINAÇÃO E EXEMPLOS PRONTOS */}
      {/* ===================================================================== */}
      <Dialog open={isAddRevenueModalOpen} onOpenChange={setIsAddRevenueModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#07130f] border border-emerald-500/40 text-slate-100 shadow-2xl p-5 sm:p-7">
          <DialogHeader className="border-b border-emerald-500/20 pb-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Adicionar Receita Operacional</span>
              </DialogTitle>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                Acréscimo (+)
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Escolha a discriminação contábil da receita ou insira com 1 clique a partir dos
              exemplos prontos para empresas de pequeno, médio ou grande porte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* Feedback de inserção rápida */}
            {revenueSuccessFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{revenueSuccessFeedback}</span>
              </div>
            )}

            {/* SEÇÃO A: MODELOS PRONTOS POR PORTE (1-CLIQUE) */}
            <div className="space-y-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    Exemplos Prontos do Dia a Dia Empresarial
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans">
                  Clique para preencher ou inserir diretamente
                </span>
              </div>

              {/* Seletor de Porte com Chips / Abas */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRevenueCompanySize('small')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    revenueCompanySize === 'small'
                      ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-100 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pequeno Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">ME / EPP</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRevenueCompanySize('medium')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    revenueCompanySize === 'medium'
                      ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-100 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Médio Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Média Empresa</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRevenueCompanySize('large')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    revenueCompanySize === 'large'
                      ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-100 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Grande Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Corporativo / S.A.
                  </div>
                </button>
              </div>

              {/* Descrição do Porte Ativo */}
              <p className="text-[11px] text-slate-400 font-mono">
                {COMPANY_SIZE_LABELS[revenueCompanySize].description}
              </p>

              {/* Grade de Chips de Exemplos Clicáveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto pr-1">
                {filteredRevenuePresets.map((preset) => {
                  const cat = REVENUE_CATEGORY_LABELS[preset.category]
                  return (
                    <div
                      key={preset.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-200">
                          {preset.label}
                        </span>
                        <Badge
                          className={`text-[9px] font-mono px-1.5 py-0 border ${cat.badgeClass} shrink-0`}
                        >
                          {cat.short}
                        </Badge>
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-1">{preset.hint}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-mono text-xs">
                        <span className="text-emerald-400 font-bold">
                          {formatBRL(preset.suggestedValue)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectRevenuePreset(preset, false)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Preencher campos abaixo para personalizar"
                          >
                            Preencher
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectRevenuePreset(preset, true)}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Inserir na tabela com 1 clique"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Inserir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SEÇÃO B: DISCRIMINAÇÃO E FORMULÁRIO MANUAL */}
            <div className="space-y-4 bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Discriminação Contábil e Valores
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo 1: Descrição */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1">
                    <span>Descrição da Receita</span>
                    <span className="text-emerald-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={revenueDescription}
                    onChange={(e) => setRevenueDescription(e.target.value)}
                    placeholder="Ex.: Rendimento de aplicação financeira, Aluguel de espaço ocioso..."
                    className="h-9 text-xs bg-slate-900 border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-100 placeholder:text-slate-600 font-sans"
                  />
                </div>

                {/* Campo 2: Discriminação / Categoria Contábil */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Discriminação / Categoria</span>
                  </label>
                  <select
                    value={revenueCategory}
                    onChange={(e) => setRevenueCategory(e.target.value as OperatingRevenueCategory)}
                    className="h-9 w-full text-xs bg-slate-900 border border-slate-700 rounded-md px-3 text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans cursor-pointer"
                  >
                    <option value="financeiras">
                      Receitas Financeiras (aplicações em CDB/LCI, juros ativos, descontos obtidos)
                    </option>
                    <option value="outras">
                      Outras Receitas Operacionais (aluguéis, prestação de serviços eventuais,
                      royalties)
                    </option>
                  </select>
                </div>

                {/* Campo 3: Valor (R$) com digitação em laranja */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                    <span>Valor da Receita (R$)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={revenueValueStr}
                      onChange={(e) => setRevenueValueStr(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-xs pl-8 text-right bg-slate-900 border-orange-500/70 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-orange-200 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dica de tributabilidade fiscal */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tratamento Fiscal:</strong> Receitas operacionais e financeiras acrescem o
                  Lucro Bruto para cálculo do LAIR contábil. No Lucro Presumido, receitas
                  financeiras são somadas integralmente à base de IRPJ/CSLL (100%), e no Lucro Real
                  compõem o resultado líquido apurado.
                </span>
              </div>
            </div>

            {/* Ações da Camada */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs font-mono text-slate-400">
                Lançadas no momento:{' '}
                <strong className="text-white">{operatingRevenues.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddRevenueModalOpen(false)}
                  className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustomRevenue}
                  className="text-xs bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Salvar Receita
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* CAMADA OCULTA 3: DISCRIMINAÇÃO POR CATEGORIA E REGRAS FISCAIS */}
      {/* ===================================================================== */}
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
