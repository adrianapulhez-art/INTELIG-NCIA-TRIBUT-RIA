import React, { useState, useEffect } from 'react'
import {
  type SimuladorOpcaoInput,
  type VereditoSimulador,
  calcularSimuladorOpcao,
  derivarRbt12PorFaixa,
} from '@/lib/simuladorOpcaoCalculations'
import { METADADOS_TABELA_CCLASSTRIB } from '@/lib/tabelaOficialCClassTrib'
import {
  salvarSimulacaoOpcao,
  listarSimulacoesOpcao,
  excluirSimulacaoOpcao,
  type SimulacaoOpcaoRecord,
} from '@/services/simuladorOpcaoService'
import { exportarSimulacaoOpcaoParaPdf } from '@/lib/exportarSimulacaoPdf'
import { WizardSimuladorOpcao } from '@/components/demo/WizardSimuladorOpcao'
import { ResultadoSimuladorOpcao } from '@/components/demo/ResultadoSimuladorOpcao'
import { PerspectivaClienteAdquirente } from '@/components/demo/PerspectivaClienteAdquirente'
import { DossieRastreabilidadeOuroSection } from '@/components/demo/DossieRastreabilidadeOuroSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Sparkles,
  BookmarkPlus,
  History,
  FileDown,
  Trash2,
  Columns,
  Search,
  Filter,
  Layers,
  ShieldCheck,
  Calculator,
} from 'lucide-react'
import { fmtSN } from '@/lib/art12SnCalculations'

export const SimuladorOpcaoModule: React.FC = () => {
  // Estado do Cenário Ativo
  const [cenarioInput, setCenarioInput] = useState<SimuladorOpcaoInput>({
    nomeSimulacao: 'Simulação Estratégica 2027',
    exercicio: 2027,
    segmento: 'comercio',
    anexoId: 'anexo1',
    uf: 'SP',
    faixaNumero: 1,
    posicionamentoFaixa: 'maximo',
    rbt12: 180000,
    perfilCanal: 'MISTO',
    percentualPj: 65,
    regimeFornecedores: 'REGULAR',
    percentualComprasSobreFaturamento: 60,
    receitaSemestre: 900000,
    desejaInformarNcm: false,
    itensNcm: [],
    versaoTabelaBeneficios: METADADOS_TABELA_CCLASSTRIB.versao,
  })

  // Resultado do Cálculo
  const [resultado, setResultado] = useState<VereditoSimulador | null>(null)
  const [abaSecao, setAbaSecao] = useState<'simulador' | 'historico' | 'dossie'>('simulador')
  const [modoExibicao, setModoExibicao] = useState<'wizard' | 'resultado'>('resultado')

  // Histórico de Simulações
  const [historico, setHistorico] = useState<SimulacaoOpcaoRecord[]>([])
  const [buscaHistorico, setBuscaHistorico] = useState('')
  const [filtroCanal, setFiltroCanal] = useState<string>('TODOS')
  const [simulacaoComparada1, setSimulacaoComparada1] = useState<SimulacaoOpcaoRecord | null>(null)
  const [simulacaoComparada2, setSimulacaoComparada2] = useState<SimulacaoOpcaoRecord | null>(null)
  const [modalComparacaoAberta, setModalComparacaoAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Executa o cálculo inicial ou quando o cenário muda
  useEffect(() => {
    const res = calcularSimuladorOpcao(cenarioInput)
    setResultado(res)
  }, [cenarioInput])

  // Carrega histórico
  const carregarHistorico = async () => {
    const list = await listarSimulacoesOpcao()
    setHistorico(list)
  }

  useEffect(() => {
    carregarHistorico()
  }, [])

  // Atualização parcial de parâmetros
  const handleAtualizarParametros = (novos: Partial<SimuladorOpcaoInput>) => {
    setCenarioInput((prev) => ({ ...prev, ...novos }))
  }

  // Salvar Simulação
  const handleSalvarSimulacao = async () => {
    if (!resultado) return
    setSalvando(true)
    try {
      const salva = await salvarSimulacaoOpcao(
        cenarioInput.nomeSimulacao || `Simulação ${cenarioInput.exercicio}`,
        cenarioInput,
        resultado,
      )
      toast.success('Simulação salva com sucesso!', {
        description: `Cenário "${salva.nome}" registrado no histórico.`,
      })
      await carregarHistorico()
    } catch (e) {
      toast.error('Erro ao salvar simulação.')
    } finally {
      setSalvando(false)
    }
  }

  // Excluir simulação
  const handleExcluirSimulacao = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await excluirSimulacaoOpcao(id)
    toast.success('Simulação removida.')
    await carregarHistorico()
  }

  // Carregar do histórico para o simulador ativo
  const handleCarregarCenario = (s: SimulacaoOpcaoRecord) => {
    setCenarioInput(s.cenario_json)
    setAbaSecao('simulador')
    setModoExibicao('resultado')
    toast.info(`Cenário "${s.nome}" carregado para a tela.`)
  }

  // Abrir comparação de duas simulações
  const handleAbrirComparacao = (s1: SimulacaoOpcaoRecord, s2: SimulacaoOpcaoRecord) => {
    setSimulacaoComparada1(s1)
    setSimulacaoComparada2(s2)
    setModalComparacaoAberta(true)
  }

  const historicoFiltrado = historico.filter((s) => {
    const bateBusca =
      s.nome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
      s.exercicio.toString().includes(buscaHistorico)
    const bateCanal = filtroCanal === 'TODOS' || s.categoria_canal === filtroCanal
    return bateBusca && bateCanal
  })

  return (
    <div className="space-y-6">
      {/* Top Header do Módulo Simulador de Opção */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Calculator className="h-5 w-5 text-emerald-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
              Simulador de Opção: PGDAS × Regime Regular
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-[10px] text-emerald-300 font-mono"
            >
              Fase Experimental LC 214/2025
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Planejamento Tributário Estratégico • Opção "Por Dentro" no DAS versus "Por Fora" no
            Regime Regular (IBS/CBS)
          </p>
        </div>

        {/* Abas Secundárias do Módulo */}
        <div className="flex items-center gap-1.5 bg-[#071711] p-1 rounded-xl border border-emerald-500/25">
          <Button
            type="button"
            size="sm"
            variant={abaSecao === 'simulador' ? 'default' : 'ghost'}
            onClick={() => setAbaSecao('simulador')}
            className={`h-8 px-3 text-xs font-mono cursor-pointer ${
              abaSecao === 'simulador'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Simulador Ativo
          </Button>

          <Button
            type="button"
            size="sm"
            variant={abaSecao === 'historico' ? 'default' : 'ghost'}
            onClick={() => {
              setAbaSecao('historico')
              carregarHistorico()
            }}
            className={`h-8 px-3 text-xs font-mono cursor-pointer ${
              abaSecao === 'historico'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5 mr-1.5" /> Histórico ({historico.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={abaSecao === 'dossie' ? 'default' : 'ghost'}
            onClick={() => setAbaSecao('dossie')}
            className={`h-8 px-3 text-xs font-mono cursor-pointer ${
              abaSecao === 'dossie'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Dossiê do Ouro
          </Button>
        </div>
      </div>

      {/* ABA 1: SIMULADOR ATIVO */}
      {abaSecao === 'simulador' && (
        <div className="space-y-6">
          {/* Barra de Ações Rápidas do Cenário */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#06140e] border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={modoExibicao === 'wizard' ? 'default' : 'outline'}
                onClick={() => setModoExibicao('wizard')}
                className={`h-7 px-3 text-xs font-mono ${
                  modoExibicao === 'wizard'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'border-emerald-500/30 text-slate-300'
                }`}
              >
                1. Configurar Parâmetros (Wizard)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={modoExibicao === 'resultado' ? 'default' : 'outline'}
                onClick={() => setModoExibicao('resultado')}
                className={`h-7 px-3 text-xs font-mono ${
                  modoExibicao === 'resultado'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'border-emerald-500/30 text-slate-300'
                }`}
              >
                2. Visualizar Resultado & Memória
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSalvarSimulacao}
                disabled={salvando || !resultado}
                className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 h-7 text-xs font-mono"
              >
                <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                {salvando ? 'Salvando...' : 'Salvar Cenário'}
              </Button>

              {resultado && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    exportarSimulacaoOpcaoParaPdf({
                      id: 'temp',
                      owner: 'user',
                      nome: cenarioInput.nomeSimulacao || 'Simulacao',
                      categoria_canal: cenarioInput.perfilCanal,
                      veredito: resultado.opcaoVencedora,
                      exercicio: cenarioInput.exercicio,
                      economia_mensal: resultado.economiaMensalizada,
                      diferenca_semestre: resultado.diferencaTotalSemestre,
                      versao_cclasstrib: METADADOS_TABELA_CCLASSTRIB.versao,
                      cenario_json: cenarioInput,
                      resultado_json: resultado,
                      created: new Date().toISOString(),
                      updated: new Date().toISOString(),
                    })
                  }
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 h-7 text-xs font-mono"
                >
                  <FileDown className="h-3.5 w-3.5 mr-1" /> Exportar PDF
                </Button>
              )}
            </div>
          </div>

          {/* Renderização do Modo Ativo */}
          {modoExibicao === 'wizard' ? (
            <WizardSimuladorOpcao
              input={cenarioInput}
              onChangeInput={handleAtualizarParametros}
              onConcluir={() => setModoExibicao('resultado')}
            />
          ) : (
            resultado && (
              <div className="space-y-6">
                {/* Tela Principal de Resultados (Fase 4) */}
                <ResultadoSimuladorOpcao
                  resultado={resultado}
                  cenarioInput={cenarioInput}
                  onRecalcularCenario={(ano) => handleAtualizarParametros({ exercicio: ano })}
                  onVoltarEdicao={() => setModoExibicao('wizard')}
                />

                {/* Perspectiva do Cliente Adquirente (Fase 5) */}
                <PerspectivaClienteAdquirente
                  receitaBaseSemestre={cenarioInput.receitaSemestre}
                  aliquotaRegularPct={resultado.aliquotasRegularAplicadas.totalPct}
                  aliquotaDasPct={resultado.partilhaDas.cbsPct + resultado.partilhaDas.ibsPct}
                  aliquotaEfetivaDasTotalPct={resultado.aliquotaEfetivaDasPct}
                  percentualPj={cenarioInput.percentualPj}
                />
              </div>
            )
          )}
        </div>
      )}

      {/* ABA 2: HISTÓRICO DE SIMULAÇÕES E COMPARAÇÃO LADO A LADO */}
      {abaSecao === 'historico' && (
        <div className="space-y-5 rounded-2xl border border-emerald-500/25 bg-[#06120e] p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-400" />
                Histórico de Simulações Salvas
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Consulte cenários anteriores, exporte relatórios técnicos em PDF e compare dois
                cenários lado a lado.
              </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#040a08] px-2 py-1 rounded-lg border border-emerald-500/20">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou ano..."
                  value={buscaHistorico}
                  onChange={(e) => setBuscaHistorico(e.target.value)}
                  className="h-7 w-40 text-xs bg-transparent border-none text-white focus-visible:ring-0"
                />
              </div>

              <select
                value={filtroCanal}
                onChange={(e) => setFiltroCanal(e.target.value)}
                className="h-9 rounded-lg border border-emerald-500/20 bg-[#040a08] px-2.5 text-xs font-mono text-white"
              >
                <option value="TODOS">Todos os Canais</option>
                <option value="B2B">Somente B2B</option>
                <option value="B2C">Somente B2C</option>
                <option value="MISTO">Somente Misto</option>
              </select>
            </div>
          </div>

          {/* Lista de Registros */}
          {historicoFiltrado.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-mono text-xs">
              Nenhuma simulação encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-3">
              {historicoFiltrado.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => handleCarregarCenario(s)}
                  className="p-4 rounded-xl border border-emerald-500/20 bg-[#040c09] hover:border-emerald-500/40 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{s.nome}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          s.veredito === 'DAS'
                            ? 'border-emerald-500/40 text-emerald-300'
                            : 'border-teal-500/40 text-teal-300'
                        }`}
                      >
                        {s.veredito === 'DAS' ? 'Vencedor: DAS' : 'Vencedor: Regular'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-[10px] font-mono text-slate-400"
                      >
                        {s.exercicio}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-[10px] font-mono text-slate-400"
                      >
                        {s.categoria_canal}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Economia estimada:{' '}
                      <strong className="text-emerald-300">
                        R$ {fmtSN(s.economia_mensal)}/mês
                      </strong>{' '}
                      (R$ {fmtSN(s.diferenca_semestre)} no semestre) • Tabela:{' '}
                      {s.versao_cclasstrib || 'IT 2025.002'}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Botão Comparar com próximo */}
                    {idx < historicoFiltrado.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAbrirComparacao(s, historicoFiltrado[idx + 1])
                        }}
                        className="h-7 text-xs font-mono text-slate-300 hover:text-white"
                        title="Comparar com o cenário seguinte"
                      >
                        <Columns className="h-3.5 w-3.5 mr-1" /> Comparar
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        exportarSimulacaoOpcaoParaPdf(s)
                      }}
                      className="h-7 text-xs font-mono text-emerald-400 hover:text-emerald-300"
                      title="Exportar em PDF"
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleExcluirSimulacao(s.id, e)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                      title="Excluir do histórico"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: DOSSIÊ DE RASTREABILIDADE DO OURO */}
      {abaSecao === 'dossie' && <DossieRastreabilidadeOuroSection />}

      {/* MODAL DE COMPARAÇÃO DE DUAS SIMULAÇÕES LADO A LADO */}
      {modalComparacaoAberta && simulacaoComparada1 && simulacaoComparada2 && (
        <Dialog open={modalComparacaoAberta} onOpenChange={setModalComparacaoAberta}>
          <DialogContent className="max-w-4xl bg-slate-950 border border-emerald-500/30 text-white p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Columns className="h-5 w-5 text-emerald-400" />
                Comparação de Simulações Lado a Lado
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 font-mono text-xs">
              {/* Lado 1 */}
              <div className="p-4 rounded-xl border border-emerald-500/25 bg-[#06120e] space-y-2">
                <div className="flex justify-between items-center border-b border-emerald-500/15 pb-2">
                  <span className="font-bold text-emerald-300 text-sm">
                    {simulacaoComparada1.nome}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 text-[10px]"
                  >
                    Exercício {simulacaoComparada1.exercicio}
                  </Badge>
                </div>
                <p className="text-slate-400">Canal: {simulacaoComparada1.categoria_canal}</p>
                <p className="text-slate-400">
                  Veredito: <strong className="text-white">{simulacaoComparada1.veredito}</strong>
                </p>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-slate-300">
                    Custo DAS: R${' '}
                    {fmtSN(simulacaoComparada1.resultado_json.opcaoDas.custoLiquidoIbsCbs)}
                  </p>
                  <p className="text-slate-300">
                    Custo Regular: R${' '}
                    {fmtSN(simulacaoComparada1.resultado_json.opcaoRegular.custoLiquidoIbsCbs)}
                  </p>
                  <p className="text-emerald-400 font-bold">
                    Economia: R$ {fmtSN(simulacaoComparada1.economia_mensal)}/mês
                  </p>
                </div>
              </div>

              {/* Lado 2 */}
              <div className="p-4 rounded-xl border border-emerald-500/25 bg-[#06120e] space-y-2">
                <div className="flex justify-between items-center border-b border-emerald-500/15 pb-2">
                  <span className="font-bold text-emerald-300 text-sm">
                    {simulacaoComparada2.nome}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 text-[10px]"
                  >
                    Exercício {simulacaoComparada2.exercicio}
                  </Badge>
                </div>
                <p className="text-slate-400">Canal: {simulacaoComparada2.categoria_canal}</p>
                <p className="text-slate-400">
                  Veredito: <strong className="text-white">{simulacaoComparada2.veredito}</strong>
                </p>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-slate-300">
                    Custo DAS: R${' '}
                    {fmtSN(simulacaoComparada2.resultado_json.opcaoDas.custoLiquidoIbsCbs)}
                  </p>
                  <p className="text-slate-300">
                    Custo Regular: R${' '}
                    {fmtSN(simulacaoComparada2.resultado_json.opcaoRegular.custoLiquidoIbsCbs)}
                  </p>
                  <p className="text-emerald-400 font-bold">
                    Economia: R$ {fmtSN(simulacaoComparada2.economia_mensal)}/mês
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalComparacaoAberta(false)}
                className="text-xs font-mono border-slate-700 text-slate-300"
              >
                Fechar Comparação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
