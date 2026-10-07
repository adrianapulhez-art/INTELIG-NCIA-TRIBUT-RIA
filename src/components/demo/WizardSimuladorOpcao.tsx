import React from 'react'
import {
  type SimuladorOpcaoInput,
  type PerfilCanal,
  type RegimeFornecedor,
  derivarRbt12PorFaixa,
} from '@/lib/simuladorOpcaoCalculations'
import { ANEXOS_BASE_LC123, fmtSN, roundHalfUp } from '@/lib/art12SnCalculations'
import { ParticaoReceitaNcm } from './ParticaoReceitaNcm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users2,
  Receipt,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react'

interface WizardSimuladorOpcaoProps {
  input: SimuladorOpcaoInput
  onChangeInput: (novosParametros: Partial<SimuladorOpcaoInput>) => void
  onConcluir: () => void
}

export const WizardSimuladorOpcao: React.FC<WizardSimuladorOpcaoProps> = ({
  input,
  onChangeInput,
  onConcluir,
}) => {
  const [passoAtivo, setPassoAtivo] = React.useState<1 | 2 | 3>(1)

  // Segmentos e mapeamento para Anexos
  const segmentos = [
    { id: 'comercio', label: 'Comércio / Varejo e Atacado', anexoId: 'anexo1' },
    { id: 'industria', label: 'Indústria / Transformação (com IPI)', anexoId: 'anexo2' },
    { id: 'servicos', label: 'Serviços em Geral / Locação', anexoId: 'anexo3' },
    { id: 'transporte', label: 'Transporte / Demais Serviços', anexoId: 'anexo1' },
  ] as const

  const anexoAtual = ANEXOS_BASE_LC123[input.anexoId] || ANEXOS_BASE_LC123.anexo1
  const faixaAtual = anexoAtual.faixas[input.faixaNumero - 1] || anexoAtual.faixas[0]

  // Mudança de posicionamento de faixa (piso / médio / teto)
  const handlePosicionamentoFaixa = (posicao: 'minimo' | 'medio' | 'maximo') => {
    const novoRbt12 = derivarRbt12PorFaixa(input.anexoId, input.faixaNumero, posicao)
    onChangeInput({
      posicionamentoFaixa: posicao,
      rbt12: novoRbt12,
    })
  }

  // Mudança de segmento
  const handleSelecionarSegmento = (segId: (typeof segmentos)[number]['id']) => {
    const seg = segmentos.find((s) => s.id === segId)
    if (seg) {
      const anexo = seg.anexoId
      const pos =
        input.posicionamentoFaixa === 'minimo' || input.posicionamentoFaixa === 'medio'
          ? input.posicionamentoFaixa
          : 'maximo'
      const rbt12 = derivarRbt12PorFaixa(anexo, input.faixaNumero, pos)
      onChangeInput({
        segmento: segId,
        anexoId: anexo,
        rbt12,
      })
    }
  }

  // Mudança de faixa (1 a 6)
  const handleSelecionarFaixa = (numero: number) => {
    const pos =
      input.posicionamentoFaixa === 'minimo' || input.posicionamentoFaixa === 'medio'
        ? input.posicionamentoFaixa
        : 'maximo'
    const rbt12 = derivarRbt12PorFaixa(input.anexoId, numero, pos)
    onChangeInput({
      faixaNumero: numero,
      rbt12,
    })
  }

  return (
    <div className="space-y-6">
      {/* Barra de Progresso do Wizard (3 Passos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Passo 1 */}
        <button
          type="button"
          onClick={() => setPassoAtivo(1)}
          className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
            passoAtivo === 1
              ? 'bg-[#0a2318] border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-[#06120e] border-emerald-500/20 hover:border-emerald-500/40 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] tracking-wider uppercase text-emerald-400 font-bold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Passo 1
            </span>
            {passoAtivo > 1 && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          </div>
          <p className="text-sm font-bold text-white leading-tight">Empresa & Regime</p>
          <p className="text-xs text-slate-400 mt-0.5">Segmento, Anexo, Faixa e RBT12</p>
        </button>

        {/* Passo 2 */}
        <button
          type="button"
          onClick={() => setPassoAtivo(2)}
          className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
            passoAtivo === 2
              ? 'bg-[#0a2318] border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-[#06120e] border-emerald-500/20 hover:border-emerald-500/40 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] tracking-wider uppercase text-emerald-400 font-bold flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Passo 2
            </span>
            {passoAtivo > 2 && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          </div>
          <p className="text-sm font-bold text-white leading-tight">Perfil de Negócio</p>
          <p className="text-xs text-slate-400 mt-0.5">Canal B2B/B2C, Compras e Fornecedores</p>
        </button>

        {/* Passo 3 */}
        <button
          type="button"
          onClick={() => setPassoAtivo(3)}
          className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
            passoAtivo === 3
              ? 'bg-[#0a2318] border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-[#06120e] border-emerald-500/20 hover:border-emerald-500/40 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] tracking-wider uppercase text-emerald-400 font-bold flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Passo 3
            </span>
          </div>
          <p className="text-sm font-bold text-white leading-tight">Faturamento & NCM</p>
          <p className="text-xs text-slate-400 mt-0.5">Receita semestral e benefícios cClassTrib</p>
        </button>
      </div>

      {/* Conteúdo do Passo 1: Empresa & Regime */}
      {passoAtivo === 1 && (
        <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/25 bg-[#06120e]/95 space-y-6 shadow-xl shadow-black/40">
          <div className="border-b border-emerald-500/15 pb-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Identificação do Cenário e Enquadramento no Simples Nacional
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Microtexto didático: O Simples Nacional calcula a alíquota com base na receita bruta
              acumulada dos últimos 12 meses (RBT12). Selecione o segmento e o exercício para
              definirmos o cronograma de transição da Reforma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Nome da Simulação */}
            <div className="sm:col-span-6 space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold">
                Nome do Cenário / Cliente
              </label>
              <Input
                placeholder="Ex: Auto Peças Modelo Ltda — Simulação 2027"
                value={input.nomeSimulacao || ''}
                onChange={(e) => onChangeInput({ nomeSimulacao: e.target.value })}
                className="h-9 bg-[#040a08] border-emerald-500/30 text-white font-sans text-xs"
              />
            </div>

            {/* Ano de Exercício */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1">
                Exercício da Transição
                <Badge
                  variant="outline"
                  className="border-amber-400/40 text-[9px] text-amber-300 font-mono"
                >
                  EC 132
                </Badge>
              </label>
              <select
                value={input.exercicio}
                onChange={(e) => onChangeInput({ exercicio: parseInt(e.target.value) || 2027 })}
                className="h-9 w-full rounded-md border border-emerald-500/30 bg-[#040a08] px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                {[2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036].map((ano) => (
                  <option key={ano} value={ano}>
                    {ano} {ano >= 2029 ? '(Transição subnacional)' : '(Fase experimental)'}
                  </option>
                ))}
              </select>
            </div>

            {/* UF */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold">
                UF de Localização
              </label>
              <select
                value={input.uf}
                onChange={(e) => onChangeInput({ uf: e.target.value })}
                className="h-9 w-full rounded-md border border-emerald-500/30 bg-[#040a08] px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                {[
                  'SP',
                  'RJ',
                  'MG',
                  'RS',
                  'PR',
                  'SC',
                  'BA',
                  'PE',
                  'CE',
                  'GO',
                  'DF',
                  'ES',
                  'MT',
                  'MS',
                  'PA',
                  'AM',
                  'RN',
                  'PB',
                  'AL',
                  'SE',
                  'PI',
                  'MA',
                  'TO',
                  'RO',
                  'AC',
                  'AP',
                  'RR',
                ].map((uf) => (
                  <option key={uf} value={uf}>
                    {uf} — Sublimite R$ 3,6M
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Segmento Econômico */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 font-semibold flex items-center justify-between">
              <span>Segmento Econômico de Atividade</span>
              <span className="text-[11px] text-emerald-400">Determina o Anexo da LC 123/2006</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {segmentos.map((seg) => {
                const isSelected = input.segmento === seg.id
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => handleSelecionarSegmento(seg.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 shadow-inner'
                        : 'bg-[#040a08] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">
                        {seg.label.split('/')[0]}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-[9px] font-mono text-emerald-300"
                      >
                        {seg.anexoId.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {seg.label.split('/')[1] || seg.label}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Faixa do Simples Nacional (1 a 6) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-300 font-semibold">
                Faixa de Faturamento RBT12 (6 Faixas Oficiais)
              </label>
              <span className="text-xs font-mono text-slate-400">
                Anexo selecionado: <strong className="text-emerald-300">{anexoAtual.nome}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {anexoAtual.faixas.map((fx) => {
                const isFaixa = input.faixaNumero === fx.numero
                return (
                  <button
                    key={fx.numero}
                    type="button"
                    onClick={() => handleSelecionarFaixa(fx.numero)}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      isFaixa
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                        : 'bg-[#040a08] border-emerald-500/20 text-slate-300 hover:border-emerald-500/40'
                    }`}
                  >
                    <span className="block text-xs font-mono">{fx.numero}ª Faixa</span>
                    <span className="block text-[10px] font-mono mt-0.5 opacity-80">
                      até R${' '}
                      {fx.limiteSuperior >= 1000000
                        ? `${fx.limiteSuperior / 1000000}M`
                        : `${fx.limiteSuperior / 1000}k`}
                    </span>
                    <span className="block text-[9px] font-mono opacity-70">
                      Nom: {fx.aliquotaNominal}%
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Posicionamento na Faixa e RBT12 Derivado */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-[#040c09] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-slate-300 font-semibold block">
                  Posicionamento na {input.faixaNumero}ª Faixa (Derivação Automática do RBT12)
                </span>
                <span className="text-[11px] text-slate-400">
                  Limites da faixa: R$ {fmtSN(faixaAtual.limiteInferior)} até R${' '}
                  {fmtSN(faixaAtual.limiteSuperior)}
                </span>
              </div>

              {/* Botões Mínimo / Médio / Máximo */}
              <div className="flex items-center gap-1.5 bg-[#06140f] p-1 rounded-lg border border-emerald-500/20">
                <Button
                  type="button"
                  size="sm"
                  variant={input.posicionamentoFaixa === 'minimo' ? 'default' : 'ghost'}
                  onClick={() => handlePosicionamentoFaixa('minimo')}
                  className={`h-7 px-2.5 text-xs font-mono ${
                    input.posicionamentoFaixa === 'minimo'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  Piso (Mín)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={input.posicionamentoFaixa === 'medio' ? 'default' : 'ghost'}
                  onClick={() => handlePosicionamentoFaixa('medio')}
                  className={`h-7 px-2.5 text-xs font-mono ${
                    input.posicionamentoFaixa === 'medio'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  Ponto Médio
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={input.posicionamentoFaixa === 'maximo' ? 'default' : 'ghost'}
                  onClick={() => handlePosicionamentoFaixa('maximo')}
                  className={`h-7 px-2.5 text-xs font-mono ${
                    input.posicionamentoFaixa === 'maximo'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  Teto (Máx)
                </Button>
              </div>
            </div>

            {/* Input Manual de RBT12 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-emerald-500/10">
              <span className="text-xs font-mono text-slate-400 shrink-0">
                RBT12 calculado / digitado:
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="font-mono text-xs text-slate-400">R$</span>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  max="4800000"
                  value={input.rbt12}
                  onChange={(e) =>
                    onChangeInput({
                      rbt12: parseFloat(e.target.value) || 0,
                      posicionamentoFaixa: 'manual',
                    })
                  }
                  className="h-8 w-44 font-mono text-xs bg-[#06100d] border-emerald-500/30 text-emerald-300 font-bold"
                />
                {input.posicionamentoFaixa === 'manual' && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-[10px] text-amber-300 font-mono"
                  >
                    Valor Manual
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Navegação */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => setPassoAtivo(2)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono h-9 px-4"
            >
              Avançar para Perfil de Negócio <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo do Passo 2: Perfil de Negócio */}
      {passoAtivo === 2 && (
        <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/25 bg-[#06120e]/95 space-y-6 shadow-xl shadow-black/40">
          <div className="border-b border-emerald-500/15 pb-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Users2 className="h-5 w-5 text-emerald-400" />
              Perfil de Canal Comercial e Cadeia de Fornecedores
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Microtexto didático: O benefício de destacar IBS/CBS por fora depende fundamentalmente
              de quem compra de você. Clientes PJ (B2B) aproveitam créditos integrais, enquanto
              consumidores finais (B2C) olham apenas o preço final de prateleira.
            </p>
          </div>

          {/* Cartas de Perfil de Canal: B2B / B2C / Misto */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-slate-300 font-semibold block">
              Canal de Vendas Predominante
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* B2B */}
              <button
                type="button"
                onClick={() => onChangeInput({ perfilCanal: 'B2B', percentualPj: 100 })}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  input.perfilCanal === 'B2B'
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md'
                    : 'bg-[#040a08] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">Vendas B2B (PJ)</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-[9px] text-emerald-300"
                  >
                    100% PJ
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Vendas para indústrias, revendedores e comércios que apuram IBS/CBS e aproveitam
                  créditos integralmente.
                </p>
              </button>

              {/* B2C */}
              <button
                type="button"
                onClick={() => onChangeInput({ perfilCanal: 'B2C', percentualPj: 0 })}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  input.perfilCanal === 'B2C'
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md'
                    : 'bg-[#040a08] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">Vendas B2C (PF)</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-[9px] text-teal-300"
                  >
                    Consumidor Final
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Varejo direto ao consumidor final físico. Não toma créditos tributários; preço de
                  prateleira é decisivo.
                </p>
              </button>

              {/* Misto */}
              <button
                type="button"
                onClick={() => onChangeInput({ perfilCanal: 'MISTO', percentualPj: 65 })}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  input.perfilCanal === 'MISTO'
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md'
                    : 'bg-[#040a08] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">Canal Misto</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-[9px] text-amber-300"
                  >
                    Customizável
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Atende tanto clientes corporativos (PJ) quanto varejo (PF). Permite calibrar a
                  fatia de cada público.
                </p>
              </button>
            </div>

            {/* Slider de % PJ quando Misto */}
            {input.perfilCanal === 'MISTO' && (
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-[#040c09] space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">
                    Fatia de vendas para Pessoas Jurídicas (B2B):
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {input.percentualPj}% PJ
                  </span>
                </div>
                <Slider
                  min={1}
                  max={99}
                  step={1}
                  value={[input.percentualPj]}
                  onValueChange={(val) => onChangeInput({ percentualPj: val[0] || 50 })}
                  className="py-1"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>1% PJ (Predominante B2C)</span>
                  <span>99% PJ (Predominante B2B)</span>
                </div>
              </div>
            )}
          </div>

          {/* Regime dos Fornecedores */}
          <div className="space-y-3 pt-2 border-t border-emerald-500/15">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-300 font-semibold block">
                Regime Tributário Predominante dos Fornecedores
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">
                Impacto direto nos créditos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fornecedor Regime Regular */}
              <button
                type="button"
                onClick={() => onChangeInput({ regimeFornecedores: 'REGULAR' })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  input.regimeFornecedores === 'REGULAR'
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md'
                    : 'bg-[#040a08] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white font-mono">
                    Regime Regular (Lucro Real / Presumido)
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-[9px] text-emerald-300"
                  >
                    Crédito Cheio (9,28%)
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fornecedores recolhem IBS/CBS pleno e transferem crédito integral de 9,28% (CBS
                  9,18% + IBS 0,10% em 2027).
                </p>
              </button>

              {/* Fornecedor Simples Nacional */}
              <button
                type="button"
                onClick={() => onChangeInput({ regimeFornecedores: 'SIMPLES_NACIONAL' })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  input.regimeFornecedores === 'SIMPLES_NACIONAL'
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md'
                    : 'bg-[#040a08] border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white font-mono">Simples Nacional</span>
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-[9px] text-amber-300"
                  >
                    Crédito Proporcional (Art. 23)
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  LC 123 art. 23 + LC 214 art. 47 §9º II: crédito restrito à fração de IBS/CBS
                  contida no DAS do fornecedor (~0,62%).
                </p>
              </button>
            </div>
          </div>

          {/* Slider de % de Compras sobre Faturamento */}
          <div className="space-y-2 pt-2 border-t border-emerald-500/15">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">
                Percentual de Compras / Insumos sobre a Receita:
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                {input.percentualComprasSobreFaturamento}% do Faturamento
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[input.percentualComprasSobreFaturamento]}
              onValueChange={(val) =>
                onChangeInput({ percentualComprasSobreFaturamento: val[0] || 0 })
              }
              className="py-1"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>0% (Serviços puros / sem insumos)</span>
              <span>50% (Média comercial)</span>
              <span>100% (Margem zero de aquisição)</span>
            </div>
          </div>

          {/* Navegação */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassoAtivo(1)}
              className="border-emerald-500/30 text-slate-300 hover:bg-emerald-500/10 text-xs font-mono h-9 px-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar ao Passo 1
            </Button>
            <Button
              type="button"
              onClick={() => setPassoAtivo(3)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono h-9 px-4"
            >
              Avançar para Faturamento & NCM <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo do Passo 3: Faturamento & NCM */}
      {passoAtivo === 3 && (
        <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/25 bg-[#06120e]/95 space-y-6 shadow-xl shadow-black/40">
          <div className="border-b border-emerald-500/15 pb-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Receita Semestral e Partição por NCM / Benefícios Fiscais
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Microtexto didático: O faturamento semestral serve de base tanto para o cálculo do DAS
              quanto para a apuração de IBS/CBS por fora. Se sua empresa comercializa itens da Cesta
              Básica ou com redução de alíquota, informe os NCMs para capturar os benefícios da
              Reforma.
            </p>
          </div>

          {/* Receita do Semestre */}
          <div className="p-4 rounded-xl border border-emerald-500/25 bg-[#040c09] space-y-2">
            <label className="text-xs font-mono text-slate-300 font-semibold block">
              Receita Bruta do Semestre (6 meses)
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-400">R$</span>
              <Input
                type="number"
                step="10000"
                min="0"
                value={input.receitaSemestre}
                onChange={(e) =>
                  onChangeInput({ receitaSemestre: parseFloat(e.target.value) || 0 })
                }
                className="h-10 text-base font-mono font-bold bg-[#06100d] border-emerald-500/35 text-emerald-300 max-w-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Equivale a uma média mensal de R$ {fmtSN(roundHalfUp(input.receitaSemestre / 6, 2))}
              /mês.
            </p>
          </div>

          {/* Pergunta: Deseja informar NCM? */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 font-semibold">
                Deseja informar a partição por NCM / códigos cClassTrib?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={input.desejaInformarNcm ? 'default' : 'outline'}
                  onClick={() => onChangeInput({ desejaInformarNcm: true })}
                  className={`h-7 px-3 text-xs font-mono ${
                    input.desejaInformarNcm
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'border-emerald-500/30 text-slate-300'
                  }`}
                >
                  Sim, informar NCMs
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!input.desejaInformarNcm ? 'default' : 'outline'}
                  onClick={() => onChangeInput({ desejaInformarNcm: false })}
                  className={`h-7 px-3 text-xs font-mono ${
                    !input.desejaInformarNcm
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'border-emerald-500/30 text-slate-300'
                  }`}
                >
                  Não, considerar 100% tributável
                </Button>
              </div>
            </div>

            {/* Alerta Amarelo quando Não informar NCM */}
            {!input.desejaInformarNcm ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-amber-200">
                    Simulação considerando 100% da receita como tributável
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Sem a segregação de NCMs, o motor adota a alíquota cheia do Regime Regular
                    (9,28%) sobre a totalidade do faturamento. Caso seus produtos contemplem itens
                    com alíquota zero (ex: Cesta Básica Nacional) ou reduções (60% para
                    medicamentos, agro, saúde e educação), ative a opção "Sim" para simular o
                    benefício.
                  </p>
                </div>
              </div>
            ) : (
              /* Componente de Partição da Fase 2 */
              <ParticaoReceitaNcm
                receitaTotal={input.receitaSemestre}
                itens={input.itensNcm || []}
                onChangeItens={(itens) => onChangeInput({ itensNcm: itens })}
              />
            )}
          </div>

          {/* Navegação e Botão de Conclusão */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-500/15">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassoAtivo(2)}
              className="border-emerald-500/30 text-slate-300 hover:bg-emerald-500/10 text-xs font-mono h-9 px-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar ao Passo 2
            </Button>
            <Button
              type="button"
              onClick={onConcluir}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono h-10 px-6 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Executar Simulação e Ver Resultado
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
