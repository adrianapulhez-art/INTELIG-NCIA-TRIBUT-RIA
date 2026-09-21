import React, { useMemo, useState } from 'react'
import { useTaxContext } from '@/contexts/TaxContext'
import {
  PonteAcquisitionKind,
  PonteAcquisitionItem,
  Ponte2027State,
  calculatePonte2027,
  createAcquisitionItem,
  buildPonteStateFromTaxContext,
  CBS_2027_RATE,
  IBS_2027_RATE,
  compareRegimes2027,
  computeB2BCredit,
} from '@/lib/ponte2027Calculations'
import { formatBRL, formatPercentBR, parseBRNumber, formatNumberBR } from '@/lib/taxCalculations'
import { Ponte2027Phase2Section } from '@/components/demo/Ponte2027Phase2Section'
import { Ponte2027Phase3Section } from '@/components/demo/Ponte2027Phase3Section'
import { marginSensitivity } from '@/lib/ponte2027Calculations'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Coins,
  Handshake,
  Landmark,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react'

const KIND_LABELS: Record<PonteAcquisitionKind, string> = {
  mercadoria: 'Mercadoria / Insumo',
  energia: 'Energia Elétrica',
  frete: 'Frete / Logística',
  servico: 'Serviço de Terceiros',
  aluguel: 'Aluguel / Locação',
  ativo: 'Equipamento / Ativo',
  outros: 'Outros',
}

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> =
  {
    integral: {
      label: 'Integral',
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: CheckCircle2,
    },
    parcial: {
      label: 'Parcial',
      className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: AlertTriangle,
    },
    vedado: {
      label: 'Vedado',
      className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      icon: XCircle,
    },
  }

export default function Ponte2027Page() {
  const taxContext = useTaxContext()
  const {
    regime,
    totalConsolidatedRevenue,
    markupProducts,
    purchasesItems,
    presumidoExpenses,
    realExpenses,
    simplesExpenses,
  } = taxContext

  // Fonte de verdade dos itens: edição local (quando o usuário altera) ou lista derivada do motor
  const [localAcquisitions, setLocalAcquisitions] = useState<PonteAcquisitionItem[] | null>(null)

  // Parâmetros de ICMS/ISS — parametrizáveis (padrão: 18% / 5%), valem para todas as fases
  const [icmsRate, setIcmsRate] = useState(18)
  const [issRate, setIssRate] = useState(5)

  const derivedAcquisitions = useMemo(() => {
    const purchases = (purchasesItems || []).map((p) => ({
      name: p.name,
      merchandiseValue: p.merchandiseValue,
    }))
    const expenseList =
      regime === 'presumido'
        ? presumidoExpenses
        : regime === 'real'
          ? realExpenses
          : simplesExpenses
    return buildPonteStateFromTaxContext({
      regime,
      revenue: totalConsolidatedRevenue,
      icmsRate,
      issRate,
      purchases,
      operatingExpenses: (expenseList || []).map((e) => ({
        description: e.description,
        value: e.value,
      })),
    }).acquisitions
  }, [
    regime,
    totalConsolidatedRevenue,
    purchasesItems,
    presumidoExpenses,
    realExpenses,
    simplesExpenses,
  ])

  const acquisitions: PonteAcquisitionItem[] = localAcquisitions ?? derivedAcquisitions
  const revenue2027 =
    totalConsolidatedRevenue || markupProducts.reduce((a, p) => a + (p.totalRevenue || 0), 0)

  const ponteState: Ponte2027State = {
    regime,
    revenue2027,
    icmsRate,
    issRate,
    acquisitions,
  }

  const result = useMemo(() => calculatePonte2027(ponteState), [ponteState])

  // Handlers de edição (marcam que o usuário assumiu a lista)
  const setAcquisitions = (items: PonteAcquisitionItem[]) => setLocalAcquisitions(items)

  const handleAdd = () => {
    setAcquisitions([...acquisitions, createAcquisitionItem('', 'servico', 0)])
  }

  const handleRemove = (id: string) => {
    setAcquisitions(acquisitions.filter((a) => a.id !== id))
  }

  const handleUpdate = (id: string, field: keyof PonteAcquisitionItem, value: unknown) => {
    setAcquisitions(acquisitions.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleRestore = () => {
    setLocalAcquisitions(null) // volta para a lista derivada do motor IT
  }

  return (
    <DemoLayout currentTab="ponte-2027">
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHero
          title="PONTE 2027 — SIMULADOR DE TRANSIÇÃO PARA A CBS"
          subtitle={`Crédito financeiro item a item, custo líquido do adquirente e a janela 2027–2028. Base: EC 132/23 e LC 214/25 — CBS ${formatPercentBR(CBS_2027_RATE)} por fora, IBS ${formatPercentBR(IBS_2027_RATE)} em teste.`}
          badge="FASE 1 · CRÉDITO FINANCEIRO ITEM A ITEM"
          icon={Landmark}
        />
        {/* Barra de parâmetros — ICMS/ISS parametrizáveis (valem para todas as fases) */}
        <div className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-700/60 bg-[#0b1512]/90 p-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Parâmetros
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">ICMS:</span>
            <Input
              type="text"
              value={formatPercentBR(icmsRate)}
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace('%', '').replace(',', '.'))
                if (Number.isFinite(v)) setIcmsRate(Math.min(100, Math.max(0, v)))
              }}
              className="h-7 w-20 text-[11px] bg-slate-900/70 border-slate-800 text-slate-100"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">ISS:</span>
            <Input
              type="text"
              value={formatPercentBR(issRate)}
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace('%', '').replace(',', '.'))
                if (Number.isFinite(v)) setIssRate(Math.min(100, Math.max(0, v)))
              }}
              className="h-7 w-20 text-[11px] bg-slate-900/70 border-slate-800 text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setIcmsRate(18)
              setIssRate(5)
            }}
            className="px-2 py-1 rounded border text-[10px] font-mono bg-slate-900/80 border-slate-700 text-slate-400 hover:border-emerald-500/40 cursor-pointer"
          >
            Restaurar 18% / 5%
          </button>
          <span className="text-[10px] font-mono text-slate-500">
            valem para todas as fases — confronto, comparativo, B2B, margem e Carteira 2027
          </span>
        </div>
        {/* Alerta da janela 2027–2028 */}
        {result.windowAlert.active && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-300">{result.windowAlert.title}</p>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                {result.windowAlert.message}
              </p>
            </div>
          </div>
        )}
        {/* Aviso quando não há dados no motor */}
        {revenue2027 <= 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
            <Building2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-cyan-300">Sem dados suficientes no motor</p>
              <p className="text-xs text-cyan-200/80 mt-1 leading-relaxed">
                Preencha a Calculadora de Markup (ou Compras + Despesas Operacionais) para alimentar
                a ponte automaticamente — ou lance aquisições manualmente abaixo.
              </p>
            </div>
          </div>
        )}
        {/* ===================== CONFRONTO PRINCIPAL ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card: Sistema atual */}
          <div className="rounded-2xl border border-slate-700/60 bg-[#0b1512]/90 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Sistema atual — {result.regimeName}
              </span>
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {formatBRL(result.currentSalesTaxes)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ICMS {formatPercentBR(18)} + ISS {formatPercentBR(5)} + PIS/COFINS sobre receita de{' '}
              {formatBRL(revenue2027)}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Carga efetiva</span>
              <span className="font-mono font-bold text-slate-300">
                {formatPercentBR(result.currentEffectiveRate)}
              </span>
            </div>
          </div>

          {/* Card: 2027 */}
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#0c2c22]/90 to-[#071712]/95 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Sistema novo — 2027
              </span>
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {formatBRL(result.total2027Burden)}
            </p>
            <p className="text-xs text-emerald-200/70 mt-1">
              CBS líquida {formatBRL(result.netCbsToPay)} + IBS-teste {formatBRL(result.ibsOnSales)}{' '}
              + ICMS/ISS integrais {formatBRL(result.transitionalIcms + result.transitionalIss)}
            </p>
            <div className="mt-3 pt-3 border-t border-emerald-900/60 flex justify-between text-xs">
              <span className="text-emerald-500/70">Carga efetiva</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatPercentBR(result.total2027EffectiveRate)}
              </span>
            </div>
          </div>

          {/* Card: Veredito */}
          <div
            className={`rounded-2xl border p-5 ${result.is2027Better ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Handshake
                className={`w-4 h-4 ${result.is2027Better ? 'text-emerald-400' : 'text-rose-400'}`}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                Veredito da ponte
              </span>
            </div>
            <p
              className={`text-2xl font-black font-mono ${result.is2027Better ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {result.is2027Better ? 'ECONOMIA' : 'MAIOR CARGA'}
            </p>
            <p
              className={`text-sm font-mono font-bold mt-1 ${result.is2027Better ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {result.burdenDifference >= 0 ? '+' : ''}
              {formatBRL(result.burdenDifference)} / ano
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {result.is2027Better
                ? 'Com o crédito item a item apropriado, 2027 fecha melhor que o sistema atual.'
                : 'Na janela 2027–2028 a carga pode subir: reaja com precificação e revisão de contratos B2B.'}
            </p>
          </div>
        </div>
        {/* ===================== CRÉDITO B2B ===================== */}
        <div className="rounded-2xl border border-teal-500/30 bg-[#07201c]/80 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Handshake className="w-5 h-5 text-teal-400" />
              <div>
                <p className="text-sm font-bold text-white">
                  Crédito que sua empresa entrega ao cliente PJ
                </p>
                <p className="text-xs text-teal-200/70">
                  Em 2027 a CBS destacada na sua nota vira crédito integral para o cliente B2B —
                  ativo fiscal que hoje não existe no {result.regimeName}.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-teal-300 font-mono">
                {formatBRL(result.creditDeliveredToB2B)}
              </p>
              <p className="text-[10px] text-teal-400/70 font-mono">
                CBS destacada nas vendas / ano
              </p>
            </div>
          </div>
        </div>
        {/* ===================== TABELA DE AQUISIÇÕES ===================== */}
        <div className="rounded-2xl border border-slate-700/60 bg-[#0b1512]/90 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                Crédito financeiro item a item (2027)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada aquisição com CBS destacada gera crédito — salvo vedações legais (fornecedor do
                Simples, uso pessoal, sem destaque).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestore}
                title="Descartar edições e voltar à lista derivada do motor IT"
                className="text-xs border-slate-700 text-slate-300 hover:text-emerald-300"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Restaurar do motor
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                className="text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar aquisição
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Descrição</TableHead>
                  <TableHead className="text-slate-400 text-xs w-[150px]">Natureza</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right w-[120px]">
                    Valor (R$)
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-center w-[90px]">
                    CBS ok?
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-center w-[110px]">
                    Forn. Simples?
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-center w-[90px]">
                    Uso pessoal?
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-right w-[110px]">
                    Crédito CBS
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-right w-[110px]">
                    Custo líq. 2027
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-center w-[100px]">
                    Status
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.itemResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-xs text-slate-500 py-8">
                      Nenhuma aquisição. Adicione manualmente ou alimente o motor em Compras /
                      Despesas Operacionais.
                    </TableCell>
                  </TableRow>
                )}
                {result.itemResults.map((r) => {
                  const badge = STATUS_BADGE[r.status]
                  const StatusIcon = badge.icon
                  return (
                    <TableRow key={r.item.id} className="border-slate-800/60">
                      <TableCell>
                        <Input
                          type="text"
                          value={r.item.description}
                          onChange={(e) => handleUpdate(r.item.id, 'description', e.target.value)}
                          placeholder="Descrição da aquisição"
                          className="text-xs h-8 field-input-interactive"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">{r.statusReason}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.item.kind}
                          onValueChange={(v) =>
                            handleUpdate(r.item.id, 'kind', v as PonteAcquisitionKind)
                          }
                        >
                          <SelectTrigger className="text-xs h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(KIND_LABELS) as PonteAcquisitionKind[]).map((k) => (
                              <SelectItem key={k} value={k}>
                                {KIND_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={formatNumberBR(r.item.value, 2)}
                          onChange={(e) =>
                            handleUpdate(r.item.id, 'value', parseBRNumber(e.target.value))
                          }
                          onBlur={(e) => {
                            e.target.value = formatNumberBR(parseBRNumber(e.target.value), 2)
                          }}
                          className="text-xs h-8 text-right font-mono field-input-interactive"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={r.item.cbsHighlighted}
                          onCheckedChange={(c) => handleUpdate(r.item.id, 'cbsHighlighted', c)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={r.item.supplierSimples}
                          onCheckedChange={(c) => handleUpdate(r.item.id, 'supplierSimples', c)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={r.item.personalUse}
                          onCheckedChange={(c) => handleUpdate(r.item.id, 'personalUse', c)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-300">
                        {formatBRL(r.creditCbs)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white">
                        {formatBRL(r.netCost2027)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(r.item.id)}
                          className="text-slate-500 hover:text-rose-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totais do creditamento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-t border-slate-800 bg-[#091310]/80">
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Aquisições brutas</p>
              <p className="text-sm font-bold text-white font-mono">
                {formatBRL(result.totals.grossAcquisitions)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">CBS destacada (8,8%)</p>
              <p className="text-sm font-bold text-amber-300 font-mono">
                {formatBRL(result.totals.cbsOnPurchases)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Crédito apropriado</p>
              <p className="text-sm font-bold text-emerald-300 font-mono">
                {formatBRL(result.totals.totalCredit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Custo líquido 2027</p>
              <p className="text-sm font-bold text-cyan-300 font-mono">
                {formatBRL(result.totals.netCost2027)}
              </p>
            </div>
          </div>
        </div>
        {/* ===================== PRECIFICAÇÃO ===================== */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#0c2c22]/80 to-[#071712]/90 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Precificação: por dentro (atual) × por fora (2027)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-slate-800">
              <p className="text-[10px] text-slate-500 font-mono uppercase">Carga embutida hoje</p>
              <p className="text-lg font-black text-slate-200 font-mono">
                {formatPercentBR(result.pricing.currentEmbeddedRate)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                ICMS + ISS + PIS/COFINS dentro do preço
              </p>
            </div>
            <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-slate-800">
              <p className="text-[10px] text-slate-500 font-mono uppercase">
                Alíquota por fora 2027
              </p>
              <p className="text-lg font-black text-emerald-300 font-mono">
                {formatPercentBR(result.pricing.newOnTopRate)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                CBS 8,8% + IBS 0,1% somados ao preço
              </p>
            </div>
            <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-emerald-800">
              <p className="text-[10px] text-slate-500 font-mono uppercase">Preço sugerido 2027</p>
              <p className="text-lg font-black text-emerald-300 font-mono">
                {formatBRL(result.pricing.suggestedPrice2027)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {result.pricing.priceDifference >= 0 ? '+' : ''}
                {formatBRL(result.pricing.priceDifference)} (
                {formatPercentBR(result.pricing.priceDifferencePercent)}) vs receita atual
              </p>
            </div>
          </div>
        </div>
        {/* ===================== FASE 2: COMPARATIVO · B2B · MARGEM ===================== */}
        <Ponte2027Phase2Section
          revenue2027={revenue2027}
          regime={regime}
          icmsRate={icmsRate}
          issRate={issRate}
          ponteState={ponteState}
        />
        {/* ===================== FASE 3: SPLIT PAYMENT · FLUXO DE CAIXA · CARTEIRA 2027 ===================== */}
        <Ponte2027Phase3Section
          revenue2027={revenue2027}
          regimeName={result.regimeName}
          ponteState={ponteState}
          result={result}
          comparativo={compareRegimes2027(ponteState)}
          b2b={computeB2BCredit(revenue2027, regime, icmsRate)}
          margens={marginSensitivity(revenue2027, regime, icmsRate, issRate).map((m) => ({
            marginPct: m.marginPct,
            price2027: m.price2027,
            netIncome: m.netIncome,
            netIncomeNoReprice: m.netIncomeNoReprice,
          }))}
        />
        {/* Rodapé de base legal */}
        <div className="text-[10px] text-slate-500 font-mono leading-relaxed border-t border-slate-800 pt-3">
          Base legal: EC 132/2023 (ADCT arts. 125–133) · LC 214/2025, arts. 47–48 (creditamento e
          destaque do imposto), art. 31 (split payment — Fase 3) e art. 168, I (vedação — aquisições
          de optante do Simples Nacional). CBS de referência estimada em{' '}
          {formatPercentBR(CBS_2027_RATE)} (LC 214/25, art. 349). Alíquotas de ICMS/ISS estimadas em{' '}
          {formatPercentBR(icmsRate)} e {formatPercentBR(issRate)} — parametrizáveis na barra acima.
        </div>{' '}
      </div>
    </DemoLayout>
  )
}
