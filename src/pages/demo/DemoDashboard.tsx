import React from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoLayout } from '@/components/demo/DemoLayout'
import {
  Calculator,
  ShoppingCart,
  Receipt,
  Scale,
  Users,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  Layers,
} from 'lucide-react'

interface ToolCard {
  id: string
  tag: string
  title: string
  subtitle: string
  description: string
  path: string
  gradient: string
  borderAccent: string
  accentColor: string
  icon: React.ElementType
}

export default function DemoDashboard() {
  const navigate = useNavigate()

  const tools: ToolCard[] = [
    {
      id: 'compras',
      tag: 'GESTÃO DE ESTOQUE & CMV',
      title: 'Calculadora de Compras',
      subtitle: 'Estoque Inicial, Final & Créditos',
      description:
        'Acréscimos, deduções e tributos recuperáveis para composição exata do CMV em todos os regimes tributários.',
      path: '/demo/compras',
      gradient: 'from-[#0b2b28]/90 via-[#09201f]/80 to-[#051414]/95',
      borderAccent: 'border-teal-500/30 hover:border-teal-400/60',
      accentColor: 'text-teal-400',
      icon: ShoppingCart,
    },
    {
      id: 'markup',
      tag: 'CALCULADORA DE VENDA',
      title: 'Calculadora de Markup',
      subtitle: 'Formação de Preço & Múltiplos Produtos',
      description:
        'Precificação inteligente por dentro e por fora, alíquotas personalizadas e múltiplos produtos em simultâneo.',
      path: '/demo/markup',
      gradient: 'from-[#143329]/90 via-[#0d261e]/80 to-[#071612]/95',
      borderAccent: 'border-emerald-500/30 hover:border-emerald-400/60',
      accentColor: 'text-emerald-400',
      icon: Calculator,
    },
    {
      id: 'despesas-operacionais',
      tag: 'ESTRUTURA DRE · APÓS LUCRO BRUTO',
      title: 'Despesas e Receitas Operacionais',
      subtitle: 'Alimentação Integrada para DREs',
      description:
        'Tabela específica de despesas com vendas, administrativas, financeiras e receitas operacionais para apuração exata do LAIR em todos os regimes.',
      path: '/demo/despesas-operacionais',
      gradient: 'from-[#2c1d0c]/90 via-[#1f1508]/80 to-[#120c04]/95',
      borderAccent: 'border-orange-500/30 hover:border-orange-400/60',
      accentColor: 'text-orange-400',
      icon: Receipt,
    },
    {
      id: 'dre-presumido',
      tag: 'LEI 9.249/95 & TESE DO SÉCULO',
      title: 'DRE — Lucro Presumido',
      subtitle: 'Presunção IRPJ/CSLL & PIS/COFINS',
      description:
        'Margens de presunção por atividade, adicional de 10%, folha patronal e exclusão do ICMS na base PIS/COFINS.',
      path: '/demo/dre-presumido',
      gradient: 'from-[#0e2c2c]/90 via-[#0a2123]/80 to-[#061417]/95',
      borderAccent: 'border-cyan-500/30 hover:border-cyan-400/60',
      accentColor: 'text-cyan-400',
      icon: Receipt,
    },
    {
      id: 'dre-real',
      tag: 'REGIME NÃO CUMULATIVO',
      title: 'DRE — Lucro Real',
      subtitle: 'Ajustes LALUR & Créditos Amplos',
      description:
        'Apuração com deduções integrais de insumos, créditos de PIS 1,65% / COFINS 7,6% e tributação sobre lucro contábil.',
      path: '/demo/dre-real',
      gradient: 'from-[#132a23]/90 via-[#0e1f1a]/80 to-[#061210]/95',
      borderAccent: 'border-emerald-500/30 hover:border-emerald-400/60',
      accentColor: 'text-emerald-400',
      icon: FileSpreadsheet,
    },
    {
      id: 'simples',
      tag: 'LEI COMPLEMENTAR 123/2006',
      title: 'DRE — Simples Nacional',
      subtitle: 'PGDAS Completo & Fator R',
      description:
        'Alíquota efetiva oficial por faixa, 5 anexos, segregação de tributos e Fator R automático para serviços.',
      path: '/demo/simples',
      gradient: 'from-[#123326]/90 via-[#0d261e]/80 to-[#071612]/95',
      borderAccent: 'border-emerald-500/30 hover:border-emerald-400/60',
      accentColor: 'text-emerald-300',
      icon: PieChart,
    },
    {
      id: 'comparacao',
      tag: 'PLANEJAMENTO TRIBUTÁRIO',
      title: 'Comparação de Regimes',
      subtitle: 'Simples × Presumido × Real',
      description:
        'Diagnóstico comparativo lado a lado, identificação da melhor opção tributária, economia estimada e análise de sensibilidade.',
      path: '/demo/comparacao',
      gradient: 'from-[#10382e]/90 via-[#0a2922]/80 to-[#061814]/95',
      borderAccent: 'border-emerald-400/35 hover:border-emerald-300/70',
      accentColor: 'text-emerald-300',
      icon: Scale,
    },
    {
      id: 'reforma',
      tag: 'NOVA LEGISLAÇÃO · EC 132/23',
      title: 'Reforma Tributária (IBS/CBS)',
      subtitle: 'Transição 2026–2033 & Plano de Voo',
      description:
        'Simulação da transição completa (LC 214/2025), alíquotas vigentes por ano, ponto de virada, precificação por fora e créditos amplos.',
      path: '/demo/reforma',
      gradient: 'from-[#0b2f28]/90 via-[#07241e]/85 to-[#041511]/95',
      borderAccent: 'border-emerald-400/40 hover:border-emerald-300/80',
      accentColor: 'text-emerald-300',
      icon: Layers,
    },
    {
      id: 'clientes',
      tag: 'GESTÃO DE CENÁRIOS',
      title: 'Painel de Clientes',
      subtitle: 'Diagnósticos & Cenários Salvos',
      description:
        'Banco de simulações em nuvem, histórico de diagnósticos de clientes e restauração instantânea de cenários.',
      path: '/demo/clientes',
      gradient: 'from-[#12282c]/90 via-[#0c1f23]/80 to-[#061317]/95',
      borderAccent: 'border-teal-500/30 hover:border-teal-400/60',
      accentColor: 'text-teal-300',
      icon: Users,
    },
  ]

  return (
    <DemoLayout currentTab="home">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Banner Hero Central estilo ADAPTA ONE */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#0c2c22]/95 via-[#091f18]/90 to-[#05110d]/95 p-8 sm:p-12 text-center shadow-2xl shadow-emerald-950/50 backdrop-blur-md">
          {/* Brumas radiais verdes esfumadas de fundo */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(16,185,129,0.28),transparent_70%)]" />
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[34rem] h-60 bg-emerald-500/15 blur-3xl rounded-full" />
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-25" />

          {/* Conteúdo do Banner */}
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            {/* Tag / Badge central */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 text-emerald-300 font-mono text-xs font-semibold tracking-widest uppercase shadow-sm mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>SISTEMA DE INTELIGÊNCIA TRIBUTÁRIA</span>
            </div>

            {/* Título Principal estilo ADAPTA ONE (Caixa alta, destaque marcante) */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-tight">
              PRECIFICAÇÃO &{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                PLANEJAMENTO TRIBUTÁRIO
              </span>
            </h1>

            {/* Subtítulo descritivo */}
            <p className="mt-3.5 text-sm sm:text-base text-emerald-100/75 max-w-2xl font-sans leading-relaxed">
              Ambiente profissional de simulação com cálculos oficiais, regime cumulativo e não
              cumulativo, PGDAS completo e comparativo estratégico em tempo real.
            </p>

            {/* CTA Pill central no banner hero */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/demo/compras')}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-slate-950 font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-emerald-400 hover:text-slate-950 transition-all duration-200 shadow-lg shadow-emerald-500/20 cursor-pointer group"
              >
                <span>INICIAR COM COMPRAS</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/demo/comparacao')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold text-xs sm:text-sm tracking-wide hover:bg-emerald-900/60 hover:text-white transition-all duration-200 cursor-pointer"
              >
                <Scale className="w-4 h-4" />
                <span>Comparar Regimes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Título da Seção dos Cards */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Módulos Disponíveis para Demonstração
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {tools.length} calculadoras integradas
          </span>
        </div>

        {/* Grid de GRANDES CARDS estilo ADAPTA (cantos arredondados ~24px, tom sobre tom verde fumê, botão Acessar no topo direito) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <div
                key={tool.id}
                onClick={() => navigate(tool.path)}
                className={`group relative overflow-hidden rounded-[24px] border ${tool.borderAccent} bg-gradient-to-b ${tool.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/60 cursor-pointer flex flex-col justify-between min-h-[220px] backdrop-blur-sm`}
              >
                {/* Glow sutil tom sobre tom no hover */}
                <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all duration-300" />
                <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-10 group-hover:opacity-20 transition-opacity" />

                {/* Topo do Card: Marca/Tag à esquerda + Botão 'Acessar' pill no canto superior direito (estilo Adapta) */}
                <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-emerald-400/80">
                      IT • {tool.tag}
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {tool.subtitle}
                    </span>
                  </div>

                  {/* Botão Pill Acessar no canto superior direito (como no card Adapta) */}
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-950/70 border border-emerald-500/30 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-emerald-400 transition-all duration-200 text-xs font-bold font-sans shadow-sm shrink-0">
                    <span>Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                {/* Corpo do Card: Título grande em caixa alta + Descrição funcional */}
                <div className="relative z-10 space-y-2 my-auto">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                      {tool.title}
                    </h3>
                  </div>

                  <p className="text-xs text-emerald-100/70 leading-relaxed font-sans line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                {/* Rodapé do Card: Linha discreta de navegação */}
                <div className="relative z-10 pt-3 mt-3 border-t border-emerald-500/15 flex items-center justify-between text-[11px] font-mono text-emerald-400/80">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Módulo integrado
                  </span>
                  <span className="group-hover:text-emerald-300 transition-colors">
                    Abrir tela &rarr;
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DemoLayout>
  )
}
