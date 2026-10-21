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
  Save,
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
  Tag,
  DollarSign,
  Info,
  Users,
} from 'lucide-react'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { calculatePayroll } from '@/lib/payrollCalculations'
import { PayrollSection } from '@/components/demo/PayrollSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/demo/MoneyInput'
import { PageHero } from '@/components/demo/PageHero'
import { SaveScenarioModal } from '@/components/demo/SaveScenarioModal'
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
    payrollSalaries,
    setPayrollSalaries,
    payrollProLabore,
    setPayrollProLabore,
    payrollInssRate,
    setPayrollInssRate,
    payrollRatRate,
    setPayrollRatRate,
    payrollTerceirosRate,
    setPayrollTerceirosRate,
  } = useTaxContext()

  // Modal de Gravar Cenário por Cliente (Escritório Contábil)
  const [isSaveScenarioModalOpen, setIsSaveScenarioModalOpen] = useState(false)

  // Subcamada Modal: Folha e Pró-labore
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)

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

  // Cálculo de Folha e Encargos Patronais
  const payrollResult = calculatePayroll({
    payrollSalaries,
    proLabore: payrollProLabore,
    inssPatronalRate: payrollInssRate,
    ratRate: payrollRatRate,
    terceirosRate: payrollTerceirosRate,
  })
  const hasPayrollValues = (payrollSalaries || 0) > 0 || (payrollProLabore || 0) > 0

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
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          {/* Cabeçalho do Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] shrink-0 shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#261502] tracking-tight">
                  Tabela Específica de Despesas e Receitas Operacionais
                </h2>
                <p className="text-xs text-[#5c3e06]">
                  Estrutura contábil após o Lucro Bruto: Lucro Bruto (−) Despesas Operacionais (+)
                  Receitas Operacionais (=) LAIR.
                </p>
              </div>
            </div>

            {/* Ações Rápidas: Gravar Cenário e Zerar campos */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSaveScenarioModalOpen(true)}
                className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] text-xs font-black uppercase tracking-wide shadow-xs hover:shadow-md hover:shadow-amber-500/30 cursor-pointer transition-all duration-300"
                title="Gravar cenário de despesas e receitas por cliente do escritório"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                  }}
                />
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />
                <Save className="relative z-10 w-3.5 h-3.5 text-[#3b2405]" />
                <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                  Gravar Cenário
                </span>
              </button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="h-8 text-xs bg-white border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 cursor-pointer"
                title="Limpar todos os campos desta página"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Zerar campos
              </Button>
            </div>
          </div>

          {/* Painel de Resumo / Cards de Totais Operacionais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Despesas */}
            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1 text-rose-700 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Total Despesas Operacionais
                </span>
                <span className="text-[11px] text-slate-500">{operatingExpenses.length} itens</span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black font-mono text-rose-700">
                  {formatBRL(totalOperatingExpenses)}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                  <span>Dedução do Lucro Bruto (−)</span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddExpense('small')}
                    className="text-[10px] text-rose-700 hover:text-rose-900 underline font-mono cursor-pointer font-semibold"
                  >
                    + lançar
                  </button>
                </div>
              </div>
            </div>

            {/* Total Receitas */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-300 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1 text-[#3b2405] font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-[#b87c14]" />
                  Total Receitas Operacionais
                </span>
                <span className="text-[11px] text-slate-500">{operatingRevenues.length} itens</span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black font-mono text-[#261502]">
                  {formatBRL(totalOperatingRevenues)}
                </div>
                <div className="text-[11px] text-[#5c3e06] mt-1 flex items-center justify-between">
                  <span>Acréscimo ao Lucro Bruto (+)</span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddRevenue('small')}
                    className="text-[10px] text-[#3b2405] hover:text-[#0f0700] underline font-mono cursor-pointer font-semibold"
                  >
                    + lançar
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado Operacional Líquido */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1 text-slate-800 font-semibold">
                  <Scale className="w-3.5 h-3.5 text-slate-600" />
                  Resultado Operacional Líquido
                </span>
                <span className="text-[11px] text-slate-500">Receitas − Despesas</span>
              </div>
              <div className="mt-2">
                <div
                  className={`text-xl sm:text-2xl font-black font-mono ${
                    netOperatingResult >= 0 ? 'text-[#261502]' : 'text-rose-700'
                  }`}
                >
                  {formatBRL(netOperatingResult)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Impacto líquido direto no LAIR</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA 1: DESPESAS OPERACIONAIS (Frontal Enxuta com Discriminação em Badge) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 border-l-4 border-amber-500 pl-2.5">
                <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#261502]">
                    Despesas Operacionais ({operatingExpenses.length})
                  </h3>
                  <p className="text-[11px] text-[#5c3e06] font-mono">
                    Discriminações contábeis definidas na camada oculta ao adicionar
                  </p>
                </div>
              </div>

              {/* Botões do Cabeçalho: Folha & Pró-labore + Adicionar Despesa */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Botão Folha & Pró-labore com badge do total */}
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(true)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-xs ${
                    hasPayrollValues
                      ? 'bg-amber-50 border-amber-300 text-[#261502] hover:bg-amber-100 hover:border-amber-400'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50/40 hover:border-amber-300'
                  }`}
                  title="Abrir camada compacta de edição de Folha de Salários, Pró-labore e Encargos Patronais"
                >
                  <Users className="w-4 h-4 text-[#b87c14]" />
                  <span className="font-semibold text-[#261502]">Folha & Pró-labore</span>
                  <Badge
                    className={`text-[10px] px-1.5 py-0 border font-semibold ${
                      hasPayrollValues
                        ? 'bg-amber-100 text-[#3b2405] border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {hasPayrollValues
                      ? formatBRL(payrollResult.totalLaborExpense)
                      : 'Não preenchido'}
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Botão + Adicionar Despesa (Destaque em Vermelho/Rosa suave com contraste claro) */}
                <button
                  type="button"
                  onClick={() => handleOpenAddExpense('small')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 hover:border-rose-300 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                  title="Adicionar despesa operacional"
                >
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>+ Despesa</span>
                  <Badge className="text-[10px] px-2 py-0.5 border border-rose-200 font-bold bg-white text-rose-800 rounded-full">
                    {operatingExpenses.length}
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            </div>

            {/* Tabela Frontal Enxuta de Despesas */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-900/40 bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] text-xs font-semibold text-amber-100">
                      <th className="py-3 px-3 font-semibold w-12 text-center rounded-tl-xl">#</th>
                      <th className="py-3 px-3 font-semibold">Descrição da Despesa</th>
                      <th className="py-3 px-3 font-semibold w-56">Discriminação / Tipo</th>
                      <th className="py-3 px-3 font-semibold text-right w-48">Valor (R$)</th>
                      <th className="py-3 px-3 font-semibold text-center w-16 rounded-tr-xl">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
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
                            className="h-7 text-xs bg-amber-50 text-[#3b2405] border border-amber-300 hover:bg-amber-100 cursor-pointer font-bold"
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
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center">
                              <span className="w-5 h-5 rounded bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] border border-amber-500/40 inline-flex items-center justify-center text-amber-200 font-semibold text-[10px] shadow-xs">
                                {idx + 1}
                              </span>
                            </td>
                            {/* Descrição rápida editável na frente */}
                            <td className="py-2 px-3">
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  updateOperatingExpense(item.id, 'description', e.target.value)
                                }
                                placeholder="Descrição da despesa..."
                                className="h-8 text-xs bg-white border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 text-slate-900 placeholder:text-slate-400 font-sans"
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
                            {/* Valor monetário com campo interativo */}
                            <td className="py-2 px-3 text-right">
                              <div className="relative inline-block w-full">
                                <MoneyInput
                                  value={item.value}
                                  onChange={(val) => updateOperatingExpense(item.id, 'value', val)}
                                  placeholder="0,00"
                                  prefix="R$"
                                  className="h-8 text-xs text-right bg-white border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 text-slate-900 font-bold"
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
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
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
                    <tfoot className="border-t-2 border-amber-900/40 bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] text-xs font-mono font-bold text-amber-100">
                      <tr>
                        <td
                          colSpan={3}
                          className="py-3 px-4 font-bold text-white text-left uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span>Total de Despesas Operacionais (Σ)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-300 text-sm">
                          {formatBRL(totalOperatingExpenses)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 text-[11px] font-normal">
                          {operatingExpenses.length}{' '}
                          {operatingExpenses.length === 1 ? 'item' : 'itens'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* TABELA 2: RECEITAS OPERACIONAIS (Frontal Enxuta com Discriminação em Badge) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 border-l-4 border-amber-500 pl-2.5">
                <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-300 flex items-center justify-center text-[#3b2405]">
                  <TrendingUp className="w-4 h-4 text-[#b87c14]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#261502]">
                    Receitas Operacionais ({operatingRevenues.length})
                  </h3>
                  <p className="text-[11px] text-[#5c3e06] font-mono">
                    Discriminações contábeis definidas na camada oculta ao adicionar
                  </p>
                </div>
              </div>

              {/* Botão + Adicionar Receita (Destaque em Ouro nobre com contraste claro) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddRevenue('small')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-[#3b2405] hover:border-amber-400 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                  title="Adicionar receita operacional"
                >
                  <TrendingUp className="w-4 h-4 text-[#b87c14]" />
                  <span>+ Receita</span>
                  <Badge className="text-[10px] px-2 py-0.5 border border-amber-300 font-bold bg-white text-[#3b2405] rounded-full">
                    {operatingRevenues.length}
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                </button>
              </div>
            </div>

            {/* Tabela Frontal Enxuta de Receitas */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-xs font-semibold text-white">
                      <th className="py-3 px-3 font-semibold w-12 text-center rounded-tl-xl">#</th>
                      <th className="py-3 px-3 font-semibold">Descrição da Receita</th>
                      <th className="py-3 px-3 font-semibold w-56">Discriminação / Tipo</th>
                      <th className="py-3 px-3 font-semibold text-right w-48">Valor (R$)</th>
                      <th className="py-3 px-3 font-semibold text-center w-16 rounded-tr-xl">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
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
                            className="h-7 text-xs bg-amber-50 text-[#3b2405] border border-amber-300 hover:bg-amber-100 cursor-pointer font-bold"
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
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center">
                              <span className="w-5 h-5 rounded bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] border border-slate-700 inline-flex items-center justify-center text-white font-semibold text-[10px] shadow-xs">
                                {idx + 1}
                              </span>
                            </td>
                            {/* Descrição rápida */}
                            <td className="py-2 px-3">
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  updateOperatingRevenue(item.id, 'description', e.target.value)
                                }
                                placeholder="Descrição da receita..."
                                className="h-8 text-xs bg-white border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400 font-sans"
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
                            {/* Valor monetário com campo interativo */}
                            <td className="py-2 px-3 text-right">
                              <div className="relative inline-block w-full">
                                <MoneyInput
                                  value={item.value}
                                  onChange={(val) => updateOperatingRevenue(item.id, 'value', val)}
                                  placeholder="0,00"
                                  prefix="R$"
                                  className="h-8 text-xs text-right bg-white border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-slate-900 font-bold"
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
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
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
                    <tfoot className="border-t-2 border-slate-800 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-xs font-mono font-bold text-white">
                      <tr>
                        <td
                          colSpan={3}
                          className="py-3 px-4 font-bold text-white text-left uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>Total de Receitas Operacionais (Σ)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-amber-300 text-sm">
                          {formatBRL(totalOperatingRevenues)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 text-[11px] font-normal">
                          {operatingRevenues.length}{' '}
                          {operatingRevenues.length === 1 ? 'item' : 'itens'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Botões de Navegação Inferiores */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/demo/markup')}
              className="text-xs bg-[#261502] hover:bg-[#3b2405] border border-amber-500/50 hover:border-amber-300 text-[#fff5cc] hover:text-white cursor-pointer w-full sm:w-auto font-medium shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Voltar: Calculadora de Markup
            </Button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/demo/dre-presumido')}
                className="text-xs bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] font-bold shadow-xs cursor-pointer"
              >
                <span>Avançar para DRE Lucro Presumido</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* ===================================================================== */}
      {/* MODAL PRINCIPAL: GRAVAR CENÁRIO POR CLIENTE (ESCRITÓRIO CONTÁBIL) */}
      {/* ===================================================================== */}
      <SaveScenarioModal
        isOpen={isSaveScenarioModalOpen}
        onClose={() => setIsSaveScenarioModalOpen(false)}
        scope="despesas-operacionais"
      />
      {/* ===================================================================== */}
      {/* CAMADA OCULTA 1: ADICIONAR DESPESA COM DISCRIMINAÇÃO E EXEMPLOS PRONTOS */}
      {/* ===================================================================== */}
      <Dialog open={isAddExpenseModalOpen} onOpenChange={setIsAddExpenseModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 shadow-xl p-5 sm:p-7">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <span>Adicionar Despesa Operacional</span>
              </DialogTitle>
              <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono">
                Dedução (−)
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Escolha a discriminação contábil da despesa ou insira com 1 clique a partir dos
              exemplos prontos para empresas de pequeno, médio ou grande porte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* Feedback de inserção rápida */}
            {expenseSuccessFeedback && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[#3b2405] text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-[#b87c14] shrink-0" />
                <span>{expenseSuccessFeedback}</span>
              </div>
            )}

            {/* SEÇÃO A: MODELOS PRONTOS POR PORTE (1-CLIQUE) */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#b87c14]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Exemplos Prontos do Dia a Dia Empresarial
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-sans">
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
                      ? 'bg-amber-50 border-amber-300 text-[#261502] shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#b87c14]" /> <span>Pequeno Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">ME / EPP</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseCompanySize('medium')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    expenseCompanySize === 'medium'
                      ? 'bg-amber-50 border-amber-300 text-[#261502] shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#b87c14]" /> <span>Médio Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Média Empresa</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseCompanySize('large')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    expenseCompanySize === 'large'
                      ? 'bg-amber-50 border-amber-300 text-[#261502] shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-[#b87c14]" /> <span>Grande Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Corporativo / S.A.
                  </div>
                </button>
              </div>

              {/* Descrição do Porte Ativo */}
              <p className="text-[11px] text-slate-500 font-mono">
                {COMPANY_SIZE_LABELS[expenseCompanySize].description}
              </p>

              {/* Grade de Chips de Exemplos Clicáveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto pr-1">
                {filteredExpensePresets.map((preset) => {
                  const cat = EXPENSE_CATEGORY_LABELS[preset.category]
                  return (
                    <div
                      key={preset.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between gap-1.5 group shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-[#261502]">
                          {preset.label}
                        </span>
                        <Badge
                          className={`text-[9px] font-mono px-1.5 py-0 border ${cat.badgeClass} shrink-0`}
                        >
                          {cat.short}
                        </Badge>
                      </div>

                      <p className="text-[10px] text-slate-500 line-clamp-1">{preset.hint}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-xs">
                        <span className="text-rose-700 font-bold">
                          {formatBRL(preset.suggestedValue)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectExpensePreset(preset, false)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
                            title="Preencher campos abaixo para personalizar"
                          >
                            Preencher
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectExpensePreset(preset, true)}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#3b2405] hover:bg-[#261502] text-amber-200 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
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
            <div className="space-y-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Tag className="w-4 h-4 text-[#b87c14]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                  Discriminação Contábil e Valores
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo 1: Descrição */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <span>Descrição da Despesa</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    type="text"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Ex.: Aluguel do ponto, Energia elétrica, Honorários contábeis..."
                    className="h-9 text-xs bg-white border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400 font-sans"
                  />
                </div>

                {/* Campo 2: Discriminação / Categoria Contábil */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Discriminação / Categoria</span>
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as OperatingExpenseCategory)}
                    className="h-9 w-full text-xs bg-white border border-slate-300 rounded-md px-3 text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans cursor-pointer"
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

                {/* Campo 3: Valor (R$) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Valor da Despesa (R$)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={expenseValueStr}
                      onChange={(e) => setExpenseValueStr(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-xs pl-8 text-right bg-white border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-slate-900 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dica de dedutibilidade fiscal */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#b87c14] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900">Tratamento Fiscal:</strong> Despesas
                  operacionais necessárias e comprovadas deduzem o LAIR contábil em todos os regimes
                  e servem de base para a apuração do Lucro Real e cálculo do LALUR.
                </span>
              </div>

              {/* Ação principal de adicionar logo após o formulário curto */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs font-mono text-slate-600">
                  Lançadas no momento:{' '}
                  <strong className="text-slate-900">{operatingExpenses.length}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddExpenseModalOpen(false)}
                    className="text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveCustomExpense}
                    className="text-xs bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] hover:brightness-105 text-[#261502] font-black shadow-xs cursor-pointer px-4 border border-amber-200/90"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Despesa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ===================================================================== */}
      {/* CAMADA OCULTA 2: ADICIONAR RECEITA COM DISCRIMINAÇÃO E EXEMPLOS PRONTOS */}
      {/* ===================================================================== */}
      <Dialog open={isAddRevenueModalOpen} onOpenChange={setIsAddRevenueModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 shadow-xl p-5 sm:p-7">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#b87c14]" />
                </div>
                <span>Adicionar Receita Operacional</span>
              </DialogTitle>
              <Badge className="bg-amber-50 text-[#3b2405] border border-amber-300 text-[11px] font-mono">
                Acréscimo (+)
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Escolha a discriminação contábil da receita ou insira com 1 clique a partir dos
              exemplos prontos para empresas de pequeno, médio ou grande porte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* Feedback de inserção rápida */}
            {revenueSuccessFeedback && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[#3b2405] text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-[#b87c14] shrink-0" />
                <span>Preset de despesas carregado com sucesso.</span>
              </div>
            )}

            {/* SEÇÃO A: MODELOS PRONTOS POR PORTE (1-CLIQUE) */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#b87c14]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Exemplos Prontos do Dia a Dia Empresarial
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-sans">
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
                      ? 'bg-amber-50 border-amber-300 text-[#261502] shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building2 className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Pequeno Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">ME / EPP</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRevenueCompanySize('medium')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    revenueCompanySize === 'medium'
                      ? 'bg-amber-50 border-amber-300 text-[#261502] shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Building className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Médio Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Média Empresa</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRevenueCompanySize('large')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    revenueCompanySize === 'large'
                      ? 'bg-amber-50 border-amber-300 text-[#261502] shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Landmark className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Grande Porte</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Corporativo / S.A.
                  </div>
                </button>
              </div>

              {/* Descrição do Porte Ativo */}
              <p className="text-[11px] text-slate-500 font-mono">
                {COMPANY_SIZE_LABELS[revenueCompanySize].description}
              </p>

              {/* Grade de Chips de Exemplos Clicáveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto pr-1">
                {filteredRevenuePresets.map((preset) => {
                  const cat = REVENUE_CATEGORY_LABELS[preset.category]
                  return (
                    <div
                      key={preset.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between gap-1.5 group shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-[#261502]">
                          {preset.label}
                        </span>
                        <Badge
                          className={`text-[9px] font-mono px-1.5 py-0 border ${cat.badgeClass} shrink-0`}
                        >
                          {cat.short}
                        </Badge>
                      </div>

                      <p className="text-[10px] text-slate-500 line-clamp-1">{preset.hint}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-xs">
                        <span className="text-[#b87c14] font-bold">
                          {formatBRL(preset.suggestedValue)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectRevenuePreset(preset, false)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
                            title="Preencher campos abaixo para personalizar"
                          >
                            Preencher
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectRevenuePreset(preset, true)}
                            className="text-[10px] px-2 py-0.5 rounded bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] hover:brightness-105 text-[#261502] font-black transition-colors cursor-pointer flex items-center gap-0.5 border border-amber-200/90"
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
            <div className="space-y-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Tag className="w-4 h-4 text-[#b87c14]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                  Discriminação Contábil e Valores
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo 1: Descrição */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <span>Descrição da Receita</span>
                    <span className="text-[#b87c14]">*</span>
                  </label>
                  <Input
                    type="text"
                    value={revenueDescription}
                    onChange={(e) => setRevenueDescription(e.target.value)}
                    placeholder="Ex.: Rendimento de aplicação financeira, Aluguel de espaço ocioso..."
                    className="h-9 text-xs bg-white border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400 font-sans"
                  />
                </div>

                {/* Campo 2: Discriminação / Categoria Contábil */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Discriminação / Categoria</span>
                  </label>
                  <select
                    value={revenueCategory}
                    onChange={(e) => setRevenueCategory(e.target.value as OperatingRevenueCategory)}
                    className="h-9 w-full text-xs bg-white border border-slate-300 rounded-md px-3 text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans cursor-pointer"
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

                {/* Campo 3: Valor (R$) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Valor da Receita (R$)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                      R$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={revenueValueStr}
                      onChange={(e) => setRevenueValueStr(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-xs pl-8 text-right bg-white border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-slate-900 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dica de tributabilidade fiscal */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#b87c14] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900">Tratamento Fiscal:</strong> Receitas
                  operacionais e financeiras acrescem o Lucro Bruto para cálculo do LAIR contábil.
                  No Lucro Presumido, receitas financeiras são somadas integralmente à base de
                  IRPJ/CSLL (100%), e no Lucro Real compõem o resultado líquido apurado.
                </span>
              </div>

              {/* Ação principal de adicionar logo após o formulário curto */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs font-mono text-slate-600">
                  Lançadas no momento:{' '}
                  <strong className="text-slate-900">{operatingRevenues.length}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddRevenueModalOpen(false)}
                    className="text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveCustomRevenue}
                    className="text-xs bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] hover:brightness-105 text-[#261502] font-black shadow-xs cursor-pointer px-4 border border-amber-200/90"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Receita
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ===================================================================== */}
      {/* SUBCAMADA MODAL: FOLHA DE SALÁRIOS, PRÓ-LABORE E ENCARGOS PATRONAIS */}
      {/* ===================================================================== */}
      <Dialog open={isPayrollModalOpen} onOpenChange={setIsPayrollModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 shadow-xl p-5 sm:p-7">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-[#b87c14] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span>Folha de Pagamento, Pró-labore e Encargos Patronais</span>
              </DialogTitle>
              <Badge
                className={`text-[11px] font-mono ${
                  hasPayrollValues
                    ? 'bg-amber-50 text-[#3b2405] border border-amber-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {hasPayrollValues ? 'Valores Ativos' : 'Não preenchido'}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Ajuste aqui a folha de salários mensal, o pró-labore dos sócios e as alíquotas de
              encargos patronais (INSS 20%, RAT e Terceiros). Os dados alimentam diretamente os
              encargos nas DREs e o Fator R do Simples Nacional.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            <PayrollSection
              payrollSalaries={payrollSalaries}
              setPayrollSalaries={setPayrollSalaries}
              payrollProLabore={payrollProLabore}
              setPayrollProLabore={setPayrollProLabore}
              payrollInssRate={payrollInssRate}
              setPayrollInssRate={setPayrollInssRate}
              payrollRatRate={payrollRatRate}
              setPayrollRatRate={setPayrollRatRate}
              payrollTerceirosRate={payrollTerceirosRate}
              setPayrollTerceirosRate={setPayrollTerceirosRate}
              calculation={payrollResult}
              regimeLabel="Despesas Operacionais"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-xs font-mono text-slate-600">
              Total Pessoal + Encargos:{' '}
              <strong className="text-[#3b2405] font-bold">
                {formatBRL(payrollResult.totalLaborExpense)}
              </strong>
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsPayrollModalOpen(false)}
              className="text-xs bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] hover:brightness-105 text-[#261502] font-black shadow-xs cursor-pointer border border-amber-200/90"
            >
              Concluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>{' '}
    </DemoLayout>
  )
}
