import React, { useState } from 'react'
import type {
  VereditoSimulador,
  SimuladorOpcaoInput,
  PassoMemoriaCalculo,
} from '@/lib/simuladorOpcaoCalculations'
import {
  calcularSimuladorOpcao,
  ALIQUOTAS_TESTE_REGIME_REGULAR,
} from '@/lib/simuladorOpcaoCalculations'
import { fmtSN, roundHalfUp } from '@/lib/art12SnCalculations'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  TrendingDown,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'

interface ResultadoSimuladorOpcaoProps {
  resultado: VereditoSimulador
  cenarioInput: SimuladorOpcaoInput
  onRecalcularCenario?: (anoNovo: number) => void
  onVoltarEdicao: () => void
}

export const ResultadoSimuladorOpcao: React.FC<ResultadoSimuladorOpcaoProps> = ({
  resultado,
  cenarioInput,
  onRecalcularCenario,
  onVoltarEdicao,
}) => {
  const [abrirMemoriaDas, setAbrirMemoriaDas] = useState(false)
  const [abrirMemoriaRegular, setAbrirMemoriaRegular] = useState(false)
  const [abrirNeutralidade, setAbrirNeutralidade] = useState(false)

  // Gráfico de evolução 2027 a 2036
  const anosEvolucao = [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036]
  const dadosEvolucao = anosEvolucao.map((ano) => {
    const simAno = calcularSimuladorOpcao({ ...cenarioInput, exercicio: ano })
    return {
      ano,
      custoDas: simAno.opcaoDas.custoLiquidoIbsCbs,
      custoRegular: simAno.opcaoRegular.custoLiquidoIbsCbs,
      vencedora: simAno.opcaoVencedora,
      statusLegal: ano >= 2029 ? 'PENDENTE_CONFIRMACAO' : 'OFICIAL',
    }
  })

  const maiorCusto = Math.max(
    ...dadosEvolucao.map((d) => Math.max(d.custoDas, d.custoRegular, 100)),
  )

  const isDasVencedor = resultado.opcaoVencedora === 'DAS'
  const isRegularVencedor = resultado.opcaoVencedora === 'REGULAR'

  return (
    <div className="space-y-6">
      {/* Banner de Destaque do Veredito da CEO */}
      <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#06140e] via-[#092017] to-[#040e0a] shadow-2xl shadow-black/50 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Trophy className="h-5 w-5 text-emerald-400" />
              </span>
              <Badge className="bg-emerald-500 text-slate-950 font-mono font-bold text-xs uppercase px-2.5 py-0.5 shadow-sm">
                {resultado.seloMelhorOpcao}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-[11px] font-mono text-emerald-300"
              >
                Exercício {cenarioInput.exercicio}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-tight pt-1">
              {resultado.opcaoVencedora === 'EMPATE'
                ? 'Opções com Custo Tributário Idêntico'
                : `Economia estimada: R$ ${fmtSN(resultado.economiaMensalizada)} / mês`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {resultado.motivoVeredito}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right p-3 rounded-xl bg-[#030907]/70 border border-emerald-500/20">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Diferença no Semestre
              </span>
              <span className="text-lg font-mono font-extrabold text-emerald-400">
                R$ {fmtSN(resultado.diferencaTotalSemestre)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVoltarEdicao}
              className="text-xs font-mono border-emerald-500/30 text-slate-300 hover:bg-emerald-500/10 h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Editar Parâmetros
            </Button>
          </div>
        </div>
      </div>

      {/* CARDS COMPARATIVOS SEMPRE LADO A LADO (PREMISSA INVIOLÁVEL DA CEO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* CARD 1: OPÇÃO POR DENTRO (PGDAS) */}
        <Card
          className={`flex flex-col justify-between rounded-2xl border transition-all duration-300 bg-[#06120e]/95 ${
            isDasVencedor
              ? 'border-emerald-400 shadow-xl shadow-emerald-500/15 ring-1 ring-emerald-400/50'
              : 'border-emerald-500/20 opacity-90'
          }`}
        >
          <CardHeader className="border-b border-emerald-500/15 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Opção A
                </span>
                <CardTitle className="text-base font-bold text-white font-mono">
                  Por Dentro (PGDAS)
                </CardTitle>
              </div>
              {isDasVencedor && (
                <Badge className="bg-emerald-500 text-slate-950 font-mono font-bold text-[10px] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> MELHOR OPÇÃO
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              IBS/CBS contido na guia única do Simples Nacional (recolhimento tradicional)
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4 flex-1">
            {/* Indicador Principal de Custo */}
            <div className="p-3.5 rounded-xl bg-[#040a08] border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Custo Líquido de IBS/CBS no Semestre
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-bold text-white">
                  R$ {fmtSN(resultado.opcaoDas.custoLiquidoIbsCbs)}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  R$ {fmtSN(roundHalfUp(resultado.opcaoDas.custoLiquidoIbsCbs / 6, 2))}/mês
                </span>
              </div>
            </div>

            {/* Linhas de Composição */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Alíquota Efetiva do DAS:</span>
                <span className="text-white font-semibold">
                  {fmtSN(resultado.aliquotaEfetivaDasPct, 4)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Guia DAS Total Estimada:</span>
                <span className="text-white font-semibold">
                  R$ {fmtSN(resultado.opcaoDas.dasTotalDevido || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">
                  Fração de CBS no DAS ({resultado.partilhaDas.cbsPct}%):
                </span>
                <span className="text-emerald-300 font-semibold">
                  R$ {fmtSN(resultado.opcaoDas.debitoCbs)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">
                  Fração de IBS no DAS ({resultado.partilhaDas.ibsPct}%):
                </span>
                <span className="text-teal-300 font-semibold">
                  R$ {fmtSN(resultado.opcaoDas.debitoIbs)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Créditos sobre Aquisições:</span>
                <span className="text-slate-500">R$ 0,00 (vedado no DAS)</span>
              </div>
            </div>

            {/* Botão de Memória de Cálculo Passo a Passo */}
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAbrirMemoriaDas(!abrirMemoriaDas)}
                className="w-full text-xs font-mono text-emerald-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/20 justify-between h-8"
              >
                <span>Memória de Cálculo Passo a Passo (DAS)</span>
                {abrirMemoriaDas ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {abrirMemoriaDas && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#030806] border border-emerald-500/15 space-y-2 text-[11px] font-mono">
                  {resultado.opcaoDas.memoriaPassos.map((passo) => (
                    <div
                      key={passo.ordem}
                      className="space-y-0.5 pb-1.5 border-b border-slate-800 last:border-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">
                          Passo {passo.ordem}: {passo.etiqueta}
                        </span>
                        {passo.pendenteConfirmacao && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-[9px] text-amber-300"
                          >
                            PENDENTE DE CONFIRMAÇÃO
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-[10px]">{passo.formula}</p>
                      <p className="text-white font-semibold">Resultado: {passo.resultadoTexto}</p>
                      {passo.detalhe && (
                        <p className="text-slate-500 text-[10px]">{passo.detalhe}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: OPÇÃO POR FORA (REGIME REGULAR) */}
        <Card
          className={`flex flex-col justify-between rounded-2xl border transition-all duration-300 bg-[#06120e]/95 ${
            isRegularVencedor
              ? 'border-emerald-400 shadow-xl shadow-emerald-500/15 ring-1 ring-emerald-400/50'
              : 'border-emerald-500/20 opacity-90'
          }`}
        >
          <CardHeader className="border-b border-emerald-500/15 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Opção B
                </span>
                <CardTitle className="text-base font-bold text-white font-mono">
                  Por Fora (Regime Regular)
                </CardTitle>
              </div>
              {isRegularVencedor && (
                <Badge className="bg-emerald-500 text-slate-950 font-mono font-bold text-[10px] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> MELHOR OPÇÃO
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              IBS/CBS destacado fora do DAS com apuração de débitos e créditos plenos
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4 flex-1">
            {/* Indicador Principal de Custo */}
            <div className="p-3.5 rounded-xl bg-[#040a08] border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Custo Líquido de IBS/CBS no Semestre
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-bold text-white">
                  R$ {fmtSN(resultado.opcaoRegular.custoLiquidoIbsCbs)}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  R$ {fmtSN(roundHalfUp(resultado.opcaoRegular.custoLiquidoIbsCbs / 6, 2))}/mês
                </span>
              </div>
            </div>

            {/* Linhas de Composição */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Alíquotas Regulares Aplicadas:</span>
                <span className="text-white font-semibold">
                  {fmtSN(resultado.aliquotasRegularAplicadas.totalPct, 2)}% (CBS{' '}
                  {fmtSN(resultado.aliquotasRegularAplicadas.cbsPct, 2)}% + IBS{' '}
                  {fmtSN(resultado.aliquotasRegularAplicadas.ibsPct, 2)}%)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Débito Bruto sobre Receita:</span>
                <span className="text-rose-300 font-semibold">
                  + R$ {fmtSN(resultado.opcaoRegular.debitoTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Créditos de Aquisições:</span>
                <span className="text-emerald-300 font-semibold">
                  − R$ {fmtSN(resultado.opcaoRegular.creditoTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Regime dos Fornecedores:</span>
                <span className="text-slate-300">
                  {cenarioInput.regimeFornecedores === 'REGULAR'
                    ? 'Regime Regular (Crédito Integral)'
                    : 'Simples Nacional (Crédito Art. 23)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-500/10">
                <span className="text-slate-400">Benefícios Fiscais Ativos:</span>
                <span
                  className={
                    resultado.possuiReducaoBeneficio
                      ? 'text-emerald-300 font-bold'
                      : 'text-slate-500'
                  }
                >
                  {resultado.possuiReducaoBeneficio
                    ? 'Sim (NCM cClassTrib)'
                    : 'Não (Alíquota Plena)'}
                </span>
              </div>
            </div>

            {/* Botão de Memória de Cálculo Passo a Passo */}
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAbrirMemoriaRegular(!abrirMemoriaRegular)}
                className="w-full text-xs font-mono text-emerald-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/20 justify-between h-8"
              >
                <span>Memória de Cálculo Passo a Passo (Regular)</span>
                {abrirMemoriaRegular ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {abrirMemoriaRegular && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#030806] border border-emerald-500/15 space-y-2 text-[11px] font-mono">
                  {resultado.opcaoRegular.memoriaPassos.map((passo) => (
                    <div
                      key={passo.ordem}
                      className="space-y-0.5 pb-1.5 border-b border-slate-800 last:border-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">
                          Passo {passo.ordem}: {passo.etiqueta}
                        </span>
                        {passo.pendenteConfirmacao && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-[9px] text-amber-300"
                          >
                            PENDENTE DE CONFIRMAÇÃO
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-[10px]">{passo.formula}</p>
                      <p className="text-white font-semibold">Resultado: {passo.resultadoTexto}</p>
                      {passo.detalhe && (
                        <p className="text-slate-500 text-[10px]">{passo.detalhe}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção Didática: Conta-Corrente da Neutralidade Tributária */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-[#06120e] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Conta-Corrente da Neutralidade (Coletado − Crédito − Recolhido = Efeito)
            </h4>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAbrirNeutralidade(!abrirNeutralidade)}
            className="text-[11px] font-mono text-slate-300 hover:text-white h-7"
          >
            {abrirNeutralidade ? 'Ocultar Explicação' : 'Exibir Detalhes Didáticos'}
          </Button>
        </div>

        {abrirNeutralidade && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#040a08] border border-emerald-500/15 space-y-1.5">
              <span className="text-emerald-400 font-bold">Na Opção DAS:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {resultado.opcaoDas.neutralidade.explicacao}
              </p>
              <div className="text-[11px] text-slate-300 pt-1">
                Efeito direto no resultado (dedução): R${' '}
                {fmtSN(resultado.opcaoDas.neutralidade.efeitoNoResultado)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#040a08] border border-emerald-500/15 space-y-1.5">
              <span className="text-emerald-400 font-bold">No Regime Regular ("Por Fora"):</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {resultado.opcaoRegular.neutralidade.explicacao}
              </p>
              <div className="text-[11px] text-slate-300 pt-1">
                Coletado da NF: R$ {fmtSN(resultado.opcaoRegular.neutralidade.coletadoDoCliente)} |
                Crédito: R$ {fmtSN(resultado.opcaoRegular.neutralidade.creditoEntrada)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de Evolução da Carga 2027 a 2036 */}
      <div className="p-5 rounded-2xl border border-emerald-500/25 bg-[#06120e] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-500/15 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Evolução da Carga Tributária Comparada (2027–2036)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhamento da transição gradual da EC 132/2023 ao longo dos 10 anos
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-500/40 text-[10px] text-amber-300 font-mono"
          >
            Pós-2028: PENDENTE DE CONFIRMAÇÃO
          </Badge>
        </div>

        {/* Barras de Confronto Anual */}
        <div className="space-y-2.5">
          {dadosEvolucao.map((d) => {
            const pctDas = (d.custoDas / maiorCusto) * 100
            const pctRegular = (d.custoRegular / maiorCusto) * 100
            const isAnoAtivo = d.ano === cenarioInput.exercicio
            return (
              <div
                key={d.ano}
                onClick={() => onRecalcularCenario && onRecalcularCenario(d.ano)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isAnoAtivo
                    ? 'bg-emerald-500/15 border border-emerald-400/50'
                    : 'bg-[#040a08] border border-transparent hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isAnoAtivo ? 'text-emerald-300' : 'text-white'}`}>
                      {d.ano}
                    </span>
                    {d.statusLegal === 'PENDENTE_CONFIRMACAO' && (
                      <span className="text-[9px] text-amber-400/80 px-1 py-0.2 rounded bg-amber-500/10">
                        estimativa
                      </span>
                    )}
                    {isAnoAtivo && (
                      <span className="text-[9px] text-emerald-300 font-bold px-1.5 py-0.2 rounded bg-emerald-500/20">
                        ano em análise
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-300">
                      DAS: <strong>R$ {fmtSN(d.custoDas)}</strong>
                    </span>
                    <span className="text-slate-300">
                      Regular: <strong>R$ {fmtSN(d.custoRegular)}</strong>
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono ${
                        d.vencedora === 'DAS'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : 'border-teal-500/40 text-teal-300'
                      }`}
                    >
                      {d.vencedora === 'DAS' ? 'Vence DAS' : 'Vence Regular'}
                    </Badge>
                  </div>
                </div>

                {/* Barras Duplas lado a lado */}
                <div className="grid grid-cols-2 gap-2 h-3.5 bg-slate-900/60 rounded-md p-0.5">
                  <div className="w-full flex justify-end">
                    <div
                      className="h-full bg-emerald-500 rounded-sm transition-all"
                      style={{ width: `${Math.max(2, pctDas)}%` }}
                      title={`DAS: R$ ${fmtSN(d.custoDas)}`}
                    />
                  </div>
                  <div className="w-full flex justify-start">
                    <div
                      className="h-full bg-teal-400 rounded-sm transition-all"
                      style={{ width: `${Math.max(2, pctRegular)}%` }}
                      title={`Regular: R$ ${fmtSN(d.custoRegular)}`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alertas Consultivos Didáticos (Sem Marcas) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="h-4 w-4 text-emerald-400" /> Recomendações e Alertas Consultivos
          Estratégicos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {resultado.alertasConsultivos.map((alerta, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                alerta.tipo === 'pendencia'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : alerta.tipo === 'aviso'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                    : 'bg-[#06120e] border-emerald-500/20 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold font-mono">
                {alerta.tipo === 'pendencia' && (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
                <span>{alerta.titulo}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">{alerta.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
