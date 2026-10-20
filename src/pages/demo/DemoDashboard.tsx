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
  Landmark,
  BookOpen,
} from 'lucide-react'

interface ToolCard {
  id: string
  tag: string
  title: string
  subtitle: string
  description: string
  path: string
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
      icon: PieChart,
    },
    {
      id: 'dashboard',
      tag: 'PLANEJAMENTO TRIBUTÁRIO',
      title: 'Dashboard Interativo de Inteligência Tributária',
      subtitle: 'Visão Integrada & Confronto Triplo',
      description:
        'Diagnóstico comparativo consolidado em tempo real, KPIs executivos, composição de CMV e análise de viabilidade dos regimes.',
      path: '/demo/dashboard',
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
      icon: Users,
    },
    {
      id: 'manual',
      tag: 'MANUAL / AJUDA',
      title: 'Manual de Uso — Calculadora Markup',
      subtitle: 'Aprenda o fluxo completo, do custo à DRE',
      description:
        '10 capítulos com o Caso Adriana ao centavo: cadastro, modos, regimes, Memória de Cálculo, comparativos e integração com Compras. Base de conhecimento do Assistente IT.',
      path: '/demo/manual',
      icon: BookOpen,
    },
  ]

  return (
    <DemoLayout currentTab="home">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Banner Hero Central — Quadrante do Título com Tratamento Dourado Metálico Escovado */}
        <div className="group relative overflow-hidden rounded-3xl border border-amber-300/80 p-8 sm:p-12 text-center shadow-2xl shadow-amber-950/20 bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14]">
          {/* 1. Camada de reflexo metálico escovado horizontal com faixas de brilho lateral especular */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
            style={{
              background:
                'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.85) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.9) 72%, rgba(150,95,10,0.5) 100%)',
            }}
          />

          {/* 2. Camada de textura/grão folheado a ouro suave e brilho escovado */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, rgba(255,230,120,0.7), transparent 75%)',
            }}
          />

          {/* 3. Brilho chanfrado superior (beveled edge highlight) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90" />

          {/* 4. Brilho / sheen diagonal suave animado no hover */}
          <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent -rotate-45 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-1000 ease-in-out" />

          {/* Conteúdo do Banner */}
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            {/* Tag / Badge central */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-900/25 bg-[#3b2405]/15 text-[#3a2304] font-mono text-xs font-bold tracking-widest uppercase shadow-sm mb-4 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#5c3e06]" />
              <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                SISTEMA DE INTELIGÊNCIA TRIBUTÁRIA
              </span>
            </div>

            {/* Título Principal (Caixa alta, destaque marcante em marrom profundo com leve relevo) */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#261502] uppercase leading-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
              PRECIFICAÇÃO &{' '}
              <span className="text-[#1a0d01] drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                PLANEJAMENTO TRIBUTÁRIO
              </span>
            </h1>

            {/* Subtítulo descritivo em tom de marrom-dourado escuro de alta legibilidade */}
            <p className="mt-3.5 text-sm sm:text-base text-[#3f2a05] max-w-2xl font-sans font-medium leading-relaxed drop-shadow-[0_1px_0_rgba(255,255,255,0.3)]">
              Ambiente profissional de simulação com cálculos oficiais, regime cumulativo e não
              cumulativo, PGDAS completo e comparativo estratégico em tempo real.
            </p>

            {/* CTA Pill central no banner hero — Tratamento Dourado Metálico com Brilho Intensificado no Hover */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
              {/* Botão Primário: INICIAR COM COMPRAS */}
              <button
                type="button"
                onClick={() => navigate('/demo/compras')}
                className="group/btn relative overflow-hidden inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 hover:border-amber-100 font-bold text-xs sm:text-sm uppercase tracking-wider text-[#261502] hover:text-[#0f0700] shadow-lg shadow-amber-950/30 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-300"
              >
                {/* 1. Camada de reflexo metálico escovado horizontal com faixas especulares */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-45 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                  }}
                />

                {/* 2. Camada de microtextura folheada a ouro suave */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-25 group-hover/btn:opacity-40 mix-blend-soft-light transition-opacity duration-300"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, rgba(255,240,150,0.8), transparent 70%)',
                  }}
                />

                {/* 3. Chanfro / linha superior luminosa (beveled edge) */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90 group-hover/btn:opacity-100 transition-opacity duration-300" />

                {/* 4. Iluminação radial extra no hover para intensificar a luz geral sobre o botão */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.45),transparent_70%)] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />

                {/* 5. Sheen diagonal ultraluminoso que cruza o botão e as palavras no hover */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />

                {/* Rótulo e ícone em alto contraste com relevo dourado refinado */}
                <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] group-hover/btn:drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] transition-all">
                  INICIAR COM COMPRAS
                </span>
                <ArrowRight className="relative z-10 w-4 h-4 text-[#3b2405] group-hover/btn:text-[#1a0d01] group-hover/btn:translate-x-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] transition-all duration-200" />
              </button>

              {/* Botão Secundário: Ver Dashboard */}
              <button
                type="button"
                onClick={() => navigate('/demo/dashboard')}
                className="group/btn relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/80 hover:border-amber-100 font-semibold text-xs sm:text-sm tracking-wide text-[#261502] hover:text-[#0f0700] shadow-md shadow-amber-950/25 hover:shadow-2xl hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-300"
              >
                {/* 1. Camada de reflexo metálico escovado horizontal com faixas especulares */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-45 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                  }}
                />

                {/* 2. Camada de microtextura folheada a ouro suave */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-25 group-hover/btn:opacity-40 mix-blend-soft-light transition-opacity duration-300"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, rgba(255,240,150,0.8), transparent 70%)',
                  }}
                />

                {/* 3. Chanfro / linha superior luminosa (beveled edge) */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90 group-hover/btn:opacity-100 transition-opacity duration-300" />

                {/* 4. Iluminação radial extra no hover para intensificar a luz geral sobre o botão */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.45),transparent_70%)] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />

                {/* 5. Sheen diagonal ultraluminoso que cruza o botão e as palavras no hover */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />

                {/* Rótulo e ícone em alto contraste com relevo dourado refinado */}
                <Scale className="relative z-10 w-4 h-4 text-[#3b2405] group-hover/btn:text-[#1a0d01] group-hover/btn:rotate-6 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] transition-all duration-200" />
                <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] group-hover/btn:drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] transition-all">
                  Ver Dashboard
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Título da Seção dos Cards */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#e5b742] shadow-[0_0_10px_#e5b742]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#5c3e06] font-bold">
              Módulos Disponíveis para Demonstração
            </h2>
          </div>
          <span className="text-[11px] font-mono text-amber-900/60 font-medium">
            {tools.length} calculadoras integradas
          </span>
        </div>

        {/* Grid de GRANDES CARDS — Tratamento DOURADO Metálico chancelado para teste visual da Adri */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <div
                key={tool.id}
                onClick={() => navigate(tool.path)}
                className="group relative overflow-hidden rounded-[24px] border border-amber-300/80 hover:border-amber-200 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/30 cursor-pointer flex flex-col justify-between min-h-[220px] shadow-lg shadow-amber-950/15 bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14]"
              >
                {/* 1. Camada de reflexo metálico escovado horizontal com faixas de brilho lateral (inspiração Ref 1) */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.85) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.9) 72%, rgba(150,95,10,0.5) 100%)',
                  }}
                />

                {/* 2. Camada de textura/grão folheado a ouro suave (gold foil / brush lines, inspiração Ref 3) */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 50%, rgba(255,230,120,0.6), transparent 80%)',
                  }}
                />

                {/* 3. Brilho chanfrado superior (beveled edge highlight) */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-80" />

                {/* 4. Sheen dinâmico ao passar o mouse (brilho diagonal fluido de ouro polido) */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent -rotate-45 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-1000 ease-in-out" />

                {/* Topo do Card: Marca/Tag à esquerda + Botão 'Acessar' pill no canto superior direito */}
                <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono tracking-widest uppercase font-extrabold text-[#5c3e06] drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                      IT • {tool.tag}
                    </span>
                    <span className="text-[11px] text-[#4a3307] font-semibold font-sans mt-0.5">
                      {tool.subtitle}
                    </span>
                  </div>

                  {/* Botão Pill Acessar no canto superior direito — contraste elegante escuro/dourado */}
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#3b2405]/90 border border-amber-300/50 text-[#fff5cc] group-hover:bg-[#1a0f02] group-hover:text-amber-200 group-hover:border-amber-200 transition-all duration-200 text-xs font-bold font-sans shadow-md shrink-0">
                    <span>Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-amber-300" />
                  </span>
                </div>

                {/* Corpo do Card: Título grande em caixa alta + Descrição com contraste nítido */}
                <div className="relative z-10 space-y-2 my-auto">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#3b2405]/85 border border-amber-300/60 flex items-center justify-center text-amber-300 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-[#261502] tracking-tight group-hover:text-[#0f0800] transition-colors drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                      {tool.title}
                    </h3>
                  </div>

                  <p className="text-xs text-[#3f2a05] font-medium leading-relaxed font-sans line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                {/* Rodapé do Card: Linha discreta de navegação com alto contraste e legibilidade */}
                <div className="relative z-10 pt-3 mt-3 border-t border-[#8f5d0b]/30 flex items-center justify-between text-[11px] font-mono text-[#4a3307] font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3b2405] shadow-[0_0_6px_rgba(255,255,255,0.8)] animate-pulse" />
                    Módulo integrado
                  </span>
                  <span className="text-[#331d03] group-hover:text-black group-hover:translate-x-0.5 transition-all">
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
