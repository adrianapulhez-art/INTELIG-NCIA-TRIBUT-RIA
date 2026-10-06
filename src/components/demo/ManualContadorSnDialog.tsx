import React, { useState } from 'react'
import {
  BookOpen,
  Info,
  Layers,
  ListOrdered,
  BadgeAlert,
  Calculator,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Percent,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrilhaChancelaBadge } from './TrilhaChancelaBadge'

interface ManualContadorSnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SecaoManual {
  id: string
  tituloCurto: string
  titulo: string
  icone: React.ElementType
  subtitulo: string
}

const SECOES: SecaoManual[] = [
  {
    id: 's1-proposito',
    tituloCurto: '1. Para que serve',
    titulo: 'SEÇÃO 1 — Para que serve esta ferramenta',
    icone: Info,
    subtitulo: 'Entenda o objetivo do módulo e por que o cálculo é sempre item a item',
  },
  {
    id: 's2-conceitos',
    tituloCurto: '2. Três conceitos',
    titulo: 'SEÇÃO 2 — Antes de começar: os 3 conceitos em 1 minuto',
    icone: Layers,
    subtitulo: 'Alíquota efetiva, repartição por frações e parcela creditável',
  },
  {
    id: 's3-passo-a-passo',
    tituloCurto: '3. Passo a passo',
    titulo: 'SEÇÃO 3 — Passo a passo operacional guiado',
    icone: ListOrdered,
    subtitulo: 'Dos itens na Calculadora de Compras até a decisão final',
  },
  {
    id: 's4-selos-badges',
    tituloCurto: '4. Selos e badges',
    titulo: 'SEÇÃO 4 — Como ler os selos e badges da ferramenta',
    icone: BadgeAlert,
    subtitulo: 'Identifique o status legal, consistência matemática e chancelas',
  },
  {
    id: 's5-exemplo-guiado',
    tituloCurto: '5. Caso canônico',
    titulo: 'SEÇÃO 5 — Exemplo completo guiado (caso canônico)',
    icone: Calculator,
    subtitulo: '30 un × R$ 1.400 + frete R$ 400 = R$ 42.400 (Exercícios 2026 e 2027)',
  },
  {
    id: 's6-faq',
    tituloCurto: '6. Perguntas frequentes',
    titulo: 'SEÇÃO 6 — Perguntas frequentes do contador iniciante',
    icone: HelpCircle,
    subtitulo: 'Respostas diretas e sem juridiquês para as principais dúvidas',
  },
  {
    id: 's7-honestidade',
    tituloCurto: '7. Avisos de honestidade',
    titulo: 'SEÇÃO 7 — Avisos de honestidade e limites legais',
    icone: ShieldAlert,
    subtitulo: 'Transparência fiscal e status de teses pendentes',
  },
]

export function ManualContadorSnDialog({ open, onOpenChange }: ManualContadorSnDialogProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<string>('s1-proposito')

  const idxAtual = SECOES.findIndex((s) => s.id === secaoAtiva)
  const anterior = idxAtual > 0 ? SECOES[idxAtual - 1] : null
  const proxima = idxAtual < SECOES.length - 1 ? SECOES[idxAtual + 1] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 bg-slate-950 border border-violet-500/40 text-slate-100 shadow-2xl overflow-hidden font-sans">
        {/* CABEÇALHO DO MANUAL */}
        <DialogHeader className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-400/40 flex items-center justify-center text-violet-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-mono font-black text-white flex items-center gap-2">
                  <span>Manual do Contador — Sessão SN na Reforma</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono border-violet-500/50 text-violet-300 bg-violet-500/10"
                  >
                    Guia Didático
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-mono">
                  Aprenda a apurar os créditos ao IBS, CBS e ICMS de fornecedores do Simples
                  Nacional na LC 214/2025.
                </DialogDescription>
              </div>
            </div>
            <TrilhaChancelaBadge
              label="CRITÉRIO IT v2 (chancela CEO)"
              descricao="Roteiro canônico chancelado pela Adri"
              compact
            />
          </div>
        </DialogHeader>

        {/* CORPO: SIDEBAR NAVEGÁVEL + CONTEÚDO PRINCIPAL */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* NAVEGAÇÃO LATERAL (MOBILE HORIZONTAL, DESKTOP VERTICAL) */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950/90 p-2.5 md:p-3 shrink-0 overflow-x-auto md:overflow-y-auto">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400 mb-2 px-2 hidden md:block tracking-wider">
              Sumário de Navegação
            </div>
            <div className="flex md:flex-col gap-1 min-w-max md:min-w-0">
              {SECOES.map((secao) => {
                const Icone = secao.icone
                const isAtiva = secao.id === secaoAtiva
                return (
                  <button
                    key={secao.id}
                    type="button"
                    onClick={() => setSecaoAtiva(secao.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer whitespace-nowrap md:whitespace-normal ${
                      isAtiva
                        ? 'bg-violet-500/20 text-violet-200 border border-violet-500/50 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <Icone
                      className={`w-4 h-4 shrink-0 ${
                        isAtiva ? 'text-violet-300' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{secao.tituloCurto}</span>
                    {isAtiva && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400 hidden md:block shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </aside>

          {/* ÁREA DE CONTEÚDO DA SEÇÃO SELECIONADA */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-200 text-sm leading-relaxed">
            {secaoAtiva === 's1-proposito' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <Info className="w-4 h-4 text-violet-400" />
                    <span>Visão Geral do Módulo</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 1 — Para que serve esta ferramenta
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    O que muda nas compras de empresas do Simples Nacional com a Reforma Tributária.
                  </p>
                </div>

                <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.06] p-4 space-y-2">
                  <div className="text-xs font-mono font-bold uppercase text-sky-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    A Pergunta de 1 Milhão de Reais do Contador:
                  </div>
                  <p className="text-sm font-sans text-slate-200">
                    <em>
                      &ldquo;Se o meu cliente (empresa no Lucro Presumido ou Lucro Real) comprar
                      mercadorias ou serviços de um fornecedor optante pelo Simples Nacional, ele
                      terá direito a crédito de IBS, CBS e ICMS? De quanto exatamente?&rdquo;
                    </em>
                  </p>
                </div>

                <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-300">
                  <p>
                    Esta ferramenta foi desenvolvida para responder a essa pergunta com precisão
                    cirúrgica, eliminando palpites e suposições da rotina do escritório contábil.
                  </p>
                  <p>
                    Com a Emenda Constitucional 132/2023 e a Lei Complementar 214/2025, o fornecedor
                    do Simples Nacional continua recolhendo seus tributos unificados via DAS
                    (Documento de Arrecadação do Simples Nacional), mas o adquirente (seu cliente){' '}
                    <strong>só poderá se creditar de uma fatia específica desse DAS</strong>.
                  </p>
                </div>

                {/* REGRA DE OURO: NUNCA MÉDIA */}
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs font-bold uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Regra de Ouro da Casa: Item a Item, Nunca Média
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    A ferramenta calcula a parcela creditável{' '}
                    <strong>individualmente para cada item</strong> lançado na Calculadora de
                    Compras. Produtos diferentes podem ter preços, quantitativos, regimes e fretes
                    distintos. Na contabilidade profissional chancelada pela IT,{' '}
                    <strong>jamais fazemos média entre itens</strong>: cada operação tem seu custo
                    líquido, sua parcela creditável e seu impacto unitário calculado isoladamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-violet-300 uppercase block">
                      O que a ferramenta entrega:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      <li>Decomposição transparente do DAS em 4 blocos</li>
                      <li>
                        Isolamento imediato da{' '}
                        <span className="font-mono text-emerald-300">parcela creditável</span>
                      </li>
                      <li>Custo líquido final da compra (nota menos créditos reais)</li>
                      <li>Comparação lado a lado: fornecedor SN puro vs. SN híbrido</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-300 uppercase block">
                      O erro que você nunca mais vai cometer:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      <li>Achar que o DAS inteiro vira crédito para o cliente</li>
                      <li>Usar alíquota cheia (ex.: 18% ICMS) em nota de optante SN</li>
                      <li>Misturar produtos de alíquotas diferentes em uma média rasa</li>
                      <li>Ignorar as frações legais do exercício analisado</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {secaoAtiva === 's2-conceitos' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Fundamentos Essenciais</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 2 — Antes de começar: os 3 conceitos em 1 minuto
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Se você entender estes três conceitos, entenderá 100% da ferramenta e da lei.
                  </p>
                </div>

                {/* CONCEITO A */}
                <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-violet-200 uppercase">
                      Conceito (a) · Alíquota Efetiva do DAS
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono border-violet-500/40 text-violet-300"
                    >
                      LC 123/2006 art. 18
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    É o percentual total que o fornecedor do Simples Nacional recolhe sobre sua
                    receita. Não é um número fixo: ele depende do{' '}
                    <strong>Anexo da atividade</strong> (comércio, indústria ou serviços) e da
                    <strong> Receita Bruta dos últimos 12 meses (RBT12)</strong> do fornecedor.
                  </p>
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5 text-[11px] font-mono text-slate-300">
                    <span className="text-slate-400">Fórmula legal do PGDAS: </span>
                    <span className="text-violet-300 font-bold">
                      Alíquota Efetiva = [(RBT12 × Alíquota Nominal) − Parcela a Deduzir] ÷ RBT12
                    </span>
                  </div>
                </div>

                {/* CONCEITO B */}
                <div className="rounded-xl border border-sky-500/40 bg-sky-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-sky-200 uppercase">
                      Conceito (b) · Fração / Repartição de Tributos
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono border-sky-500/40 text-sky-300"
                    >
                      Tabelas dos Anexos I a V
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    O DAS não é um tributo único — ele é uma{' '}
                    <em>guia única que reúne até 8 tributos federais, estaduais e municipais</em>.
                    Dentro da alíquota efetiva, a lei estipula qual fatia percentual pertence a cada
                    imposto/contribuição.
                  </p>
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5 text-[11px] font-mono text-slate-300 space-y-1">
                    <div className="text-sky-300 font-bold">
                      Exemplo Oficial: Anexo I (Comércio), 1ª Faixa (RBT12 até R$ 180.000),
                      Exercício 2027:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">ICMS:</span>
                        <span className="text-white font-bold">34,00%</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">CBS:</span>
                        <span className="text-white font-bold">15,33%</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">IBS:</span>
                        <span className="text-white font-bold">0,17%</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">IRPJ/CSLL/CPP:</span>
                        <span className="text-rose-300 font-bold">50,50%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONCEITO C */}
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-emerald-200 uppercase">
                      Conceito (c) · Parcela Creditável do Adquirente
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono border-emerald-500/40 text-emerald-300"
                    >
                      LC 123 art. 23 + LC 214 art. 47
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    Aqui está a chave mestra de toda a auditoria tributária:{' '}
                    <strong>SÓ ICMS, CBS e IBS geram crédito para o cliente comprador</strong>. As
                    parcelas de IRPJ, CSLL e CPP (Previdência Patronal) pagas no DAS são tributos
                    diretos e encargos da empresa optante —
                    <strong> elas NUNCA geram crédito para o adquirente</strong>.
                  </p>
                  <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-2.5 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                    <span>
                      Parcela Creditável Total (Anexo I, 1ª faixa 2027) = 34,00% + 15,33% + 0,17% =
                      49,50% do DAS
                    </span>
                    <span className="font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                      1,9800% da Nota
                    </span>
                  </div>
                </div>
              </div>
            )}

            {secaoAtiva === 's3-passo-a-passo' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <ListOrdered className="w-4 h-4 text-violet-400" />
                    <span>Guia Operacional</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 3 — Passo a passo operacional
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Como operar a Sessão SN da esquerda para a direita, do Card 1 ao relatório
                    final.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* PASSO 1 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        1
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 1 — Lance os itens na Calculadora de Compras
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans pl-7">
                      A Sessão SN herda os dados da <em>Calculadora de Compras</em> (quantidade,
                      valor unitário, frete e IPI). Como a IT opera sob a máxima{' '}
                      <strong>&ldquo;por item da compra, nunca média&rdquo;</strong>, você precisa
                      ter ao menos um item lançado. Se não houver itens, a sessão exibirá aviso
                      amigável solicitando o lançamento.
                    </p>
                  </div>

                  {/* PASSO 2 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        2
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 2 — No Card 1, escolha a ORIGEM da alíquota
                      </span>
                    </div>
                    <div className="pl-7 space-y-2 text-xs text-slate-300 font-sans">
                      <p>Você tem dois botões para definir a fonte dos percentuais:</p>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                        <li>
                          <strong className="text-emerald-300 font-mono">
                            Tabela Oficial Completa (Anexos I a V · 6 Faixas) [Default]
                          </strong>
                          : utilize quando estiver fazendo um <em>planejamento ou simulação</em> e
                          ainda não tiver a nota fiscal em mãos. A ferramenta aplica a fórmula exata
                          da Lei Complementar 123/2006.
                        </li>
                        <li>
                          <strong className="text-emerald-300 font-mono">
                            Preencher pelo percentual da NOTA (art. 23, §2º)
                          </strong>
                          : utilize quando estiver com o <em>documento fiscal real emitido</em> pelo
                          fornecedor. Você preenche os campos destacados em campo próprio da nota
                          fiscal (% ICMS, % CBS e % IBS).
                        </li>
                      </ul>
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800">
                        🏷️ Observe o selo superior direito: ele exibirá com destaque{' '}
                        <span className="text-emerald-300 font-bold uppercase">
                          &ldquo;Origem ativa: estimativa da tabela&rdquo;
                        </span>{' '}
                        ou{' '}
                        <span className="text-emerald-300 font-bold uppercase">
                          &ldquo;Origem ativa: da nota&rdquo;
                        </span>
                        .
                      </div>
                    </div>
                  </div>

                  {/* PASSO 3 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        3
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 3 — Se usar a tabela, configure Anexo, Faixa e RBT12
                      </span>
                    </div>
                    <div className="pl-7 space-y-2 text-xs text-slate-300 font-sans">
                      <p>A ferramenta permite configurar o perfil completo do fornecedor:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                          <strong className="text-sky-300 block mb-1">Qual Anexo escolher?</strong>
                          <span className="text-slate-300">
                            • <strong>Anexo I:</strong> Comércio e bens
                            <br />• <strong>Anexo II:</strong> Indústria (com parcela IPI)
                            <br />• <strong>Anexo III:</strong> Serviços em geral ou com Fator R ≥
                            28%
                            <br />• <strong>Anexo IV:</strong> Serviços sem CPP no DAS (previdência
                            recolhida em GPS própria)
                            <br />• <strong>Anexo V:</strong> Serviços intelectuais com Fator R &lt;
                            28%
                          </span>
                        </div>
                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                          <strong className="text-sky-300 block mb-1">
                            Faixa de RBT12 e Receita
                          </strong>
                          <span className="text-slate-300">
                            Selecione a faixa (1ª a 6ª) e digite o valor estimado da{' '}
                            <strong>RBT12 do fornecedor em R$</strong>. A ferramenta recalcula
                            instantaneamente a alíquota efetiva deduzida pelo PGDAS.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PASSO 4 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        4
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 4 — Leia os resultados do Card 1
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans pl-7">
                      Veja nos 4 blocos de saída: <strong>Alíquota Efetiva Total</strong> (ex.
                      4,00%),
                      <strong> ICMS/ISS</strong> (ex. 1,3600%), <strong>CBS</strong> (ex. 0,6132%) e{' '}
                      <strong>IBS</strong> (ex. 0,0068%). Abaixo deles, veja o badge indicando a{' '}
                      <strong>Parcela creditável derivada</strong> (ex. 1,9800%).
                    </p>
                  </div>

                  {/* PASSO 5 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        5
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 5 — No Card 2, confirme fornecedor (SN puro × híbrido) e adquirente
                      </span>
                    </div>
                    <div className="pl-7 space-y-2 text-xs text-slate-300 font-sans">
                      <p>Selecione quem é o fornecedor:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>
                          <strong className="text-violet-300 font-mono">
                            SN puro (DAS por dentro):
                          </strong>{' '}
                          a nota fiscal permanece no preço acordado (congelada), e o adquirente se
                          credita apenas da parcela legal do art. 23.
                        </li>
                        <li>
                          <strong className="text-violet-300 font-mono">
                            SN híbrido (regime regular IBS/CBS):
                          </strong>{' '}
                          o fornecedor optou por recolher IBS/CBS fora do DAS (conforme art. 41 da
                          LC 214/2025), destacando os tributos integralmente na nota e gerando
                          crédito total para o adquirente.
                        </li>
                      </ul>
                      <p className="text-slate-400">
                        Em seguida, escolha o regime do adquirente (LP = Lucro Presumido, LR = Lucro
                        Real, SN = Simples Nacional ou SN híbrido).
                      </p>
                    </div>
                  </div>

                  {/* PASSO 6 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        6
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 6 — Entenda a BASE DO DAS: &ldquo;Bruta [Default]&rdquo; vs.
                        &ldquo;Líquida do ICMS&rdquo;
                      </span>
                    </div>
                    <div className="pl-7 space-y-1.5 text-xs text-slate-300 font-sans">
                      <p>A ferramenta disponibiliza dois modos de base de cálculo para o DAS:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono mt-1">
                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                          <span className="text-emerald-300 font-bold block mb-1">
                            Bruta (LC 123 art. 3º §12º) [Default]
                          </span>
                          Aplica a alíquota sobre o valor total cobrado na nota (R$ 42.400). É o
                          entendimento conservador e padrão da casa.
                        </div>
                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                          <span className="text-emerald-300 font-bold block mb-1">
                            Líquida do ICMS da nota (art. 25 §1º II)
                          </span>
                          Abate o ICMS cobrado da base do DAS antes de calcular. Esta tese decorre
                          da discussão da Res. CGSN 190/2026 e está rotulada como pendente de
                          regulamentação.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PASSO 7 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-xs font-black flex items-center justify-center">
                        7
                      </span>
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Passo 7 — Use o Comparador de Fornecedores e o Espelho de Repasse
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans pl-7">
                      Clique no botão <strong>&ldquo;⇄ Comparar Fornecedores SN&rdquo;</strong> para
                      abrir a janela comparativa que coloca lado a lado o SN puro vs. SN híbrido
                      para a sua compra, detalhando o custo unitário líquido, impacto no estoque da
                      empresa compradora e o gap de negociação em relação a um fornecedor no Lucro
                      Presumido/Real.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {secaoAtiva === 's4-selos-badges' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <BadgeAlert className="w-4 h-4 text-violet-400" />
                    <span>Dicionário Visual</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 4 — Como ler os selos e badges
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    O significado de cada badge de status legal, chancela e consistência matemática.
                  </p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* BADGE 1: FONTE OFICIAL CHANCELADA */}
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                        FONTE OFICIAL CHANCELADA
                      </span>
                      <span className="text-[10px] text-slate-400">Cravado em Lei</span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      Significa que o percentual, a faixa ou o critério utilizado possui{' '}
                      <strong>respaldo explícito e literal</strong> no texto da LC 123/2006 ou da LC
                      214/2025. Não depende de regulamentação posterior. Exemplo: Anexo I (Comércio)
                      faixas 1 a 5 para 2027.
                    </p>
                  </div>

                  {/* BADGE 2: PENDENTE DE CONFIRMAÇÃO */}
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/40 bg-amber-500/20 text-amber-300">
                        PENDENTE DE CONFIRMAÇÃO
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Aguarda Regulamentação CGSN
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      Aparece em situações onde a lei básica existe, mas há{' '}
                      <em>regulamentação infralegal pendente</em> por resolução do Comitê Gestor do
                      Simples Nacional (CGSN), ou em faixas de sublimite estadual acima de R$ 3,6
                      milhões onde o ICMS/ISS é recolhido por fora. A ferramenta avisa você para não
                      tomar o número como definitivo sem ressalva ao cliente.
                    </p>
                  </div>

                  {/* BADGE 3: SELO VERDE DE CONSISTÊNCIA */}
                  <div className="rounded-xl border border-emerald-500/40 bg-slate-900/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Soma DAS: 100% OK
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fechamento Matemático Half-Up
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      Localizado no Card 2º do detalhamento. Comprova que a soma dos 4 blocos de
                      tributos (ICMS + CBS + IBS + IRPJ/CSLL/CPP) fecha com exatidão no centavo com
                      o valor total do DAS apurado, obedecendo ao critério de arredondamento half-up
                      chancelado pela casa.
                    </p>
                  </div>

                  {/* BADGE 4: NÃO GERA CRÉDITO */}
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/40 bg-rose-500/20 text-rose-300">
                        NÃO GERA CRÉDITO
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Tributos Diretos / Encargos
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      Exibido no 4º bloco da decomposição do DAS (IRPJ / CSLL / CPP). Lembra você e
                      seu cliente de que mais da metade do DAS pago pelo fornecedor corresponde à
                      renda e folha de pagamento dele, não podendo ser apropriado como crédito da
                      cadeia de consumo.
                    </p>
                  </div>

                  {/* BADGE 5: CRITÉRIO IT v2 */}
                  <div className="rounded-xl border border-violet-500/40 bg-violet-950/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <TrilhaChancelaBadge
                        label="CRITÉRIO IT v2 (chancela CEO 2026)"
                        descricao="Critério adotado pela casa"
                        compact
                      />
                      <span className="text-[10px] text-slate-400">Governança Tributária</span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      Identifica premissas contábeis estruturais definidas pela liderança técnica da
                      IT (CEO Adri). Garante que qualquer decisão da ferramenta segue a governança
                      do escritório, auditabilidade em 6 decimais e a regra permanente: nunca
                      inventar dados e alertar quando houver tese aberta.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {secaoAtiva === 's5-exemplo-guiado' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <Calculator className="w-4 h-4 text-violet-400" />
                    <span>Estudo de Caso Canônico</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 5 — Exemplo completo guiado (caso canônico)
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Acompanhe cada número da operação oficial auditada pela casa.
                  </p>
                </div>

                {/* DADOS DA OPERAÇÃO */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 font-mono text-xs">
                  <span className="text-violet-300 font-bold uppercase block text-[11px]">
                    Dados da Operação Analisada:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">MERCADORIAS:</span>
                      <span className="font-bold text-white">30 un × R$ 1.400 = R$ 42.000</span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">FRETE COBRADO:</span>
                      <span className="font-bold text-white">R$ 400,00</span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">TOTAL DA NOTA:</span>
                      <span className="font-bold text-emerald-300">R$ 42.400,00</span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">PERFIL FORNECEDOR:</span>
                      <span className="font-bold text-white">
                        Anexo I · 1ª Faixa (RBT12 R$ 120.000)
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONTRASTE 2026 VS 2027 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  {/* EXERCÍCIO 2026 */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-amber-300 font-bold uppercase text-[11px]">
                        Exercício 2026 (HOJE / Transição Inicial)
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-500/40 text-amber-300"
                      >
                        Só ICMS
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-slate-300 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alíquota efetiva DAS:</span>
                        <span className="font-bold text-white">4,00%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fração ICMS (34,00% de 4%):</span>
                        <span className="font-bold text-white">1,3600%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">CBS / IBS (teste 2026):</span>
                        <span className="text-slate-500">Sem apropriação SN</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1">
                        <span className="text-emerald-400 font-bold">
                          Crédito do Adquirente LP:
                        </span>
                        <span className="font-bold text-emerald-300">R$ 576,64</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Compras Líquidas (42.400 − 576,64):</span>
                        <span className="font-bold text-white">R$ 41.823,36</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1">
                        <span className="text-amber-300 font-bold">Custo Unitário Líquido:</span>
                        <span className="font-bold text-amber-200">R$ 1.394,11/un</span>
                      </div>
                    </div>
                  </div>

                  {/* EXERCÍCIO 2027 */}
                  <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/20 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                      <span className="text-emerald-300 font-bold uppercase text-[11px]">
                        Exercício 2027 (Plena Vigência Art. 23)
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-emerald-500/40 text-emerald-300"
                      >
                        ICMS + CBS + IBS
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-slate-300 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alíquota efetiva DAS:</span>
                        <span className="font-bold text-white">4,00% (DAS R$ 1.696,00)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Parcela ICMS (34,00%):</span>
                        <span className="font-bold text-white">R$ 576,64</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Parcela CBS (15,33%):</span>
                        <span className="font-bold text-white">R$ 259,9968</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Parcela IBS (0,17%):</span>
                        <span className="font-bold text-white">R$ 2,8832</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>IRPJ/CSLL/CPP (50,50% — retido no DAS):</span>
                        <span>R$ 856,48 (não credita)</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-500/30 pt-1">
                        <span className="text-emerald-400 font-bold">
                          Crédito LP 2027 (1,9800%):
                        </span>
                        <span className="font-bold text-emerald-300">R$ 839,52</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Custo Líquido (42.400 − 839,52):</span>
                        <span className="font-bold text-white">R$ 41.560,48</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-500/30 pt-1">
                        <span className="text-emerald-300 font-bold">Custo Unitário Líquido:</span>
                        <span className="font-bold text-emerald-200">R$ 1.385,35/un</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-xs font-mono text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-400 font-bold">Veredito da Transição:</span> Em
                    2027, o crédito do adquirente salta de R$ 576,64 para R$ 839,52 (+R$ 262,88 de
                    crédito proporcionado pela CBS+IBS).
                  </div>
                  <span className="text-emerald-300 font-bold shrink-0">
                    Redução no custo unitário: -R$ 8,76/un (-0,63%)
                  </span>
                </div>
              </div>
            )}

            {secaoAtiva === 's6-faq' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-violet-400" />
                    <span>Dúvidas do Dia a Dia</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 6 — Perguntas frequentes do contador iniciante
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Respostas claras e seguras para as dúvidas mais comuns da prática tributária.
                  </p>
                </div>

                <div className="space-y-3 font-sans text-xs sm:text-sm">
                  {/* FAQ 1 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      P1: Por que o crédito do meu cliente é menor que o valor do DAS pago pelo
                      fornecedor?
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      Porque o DAS engloba tanto tributos sobre o consumo (ICMS, CBS, IBS) quanto
                      tributos diretos sobre a renda da empresa (IRPJ, CSLL) e contribuição patronal
                      (CPP). A Lei Complementar nº 214/2025 e o art. 23 da LC 123/2006 são
                      categóricos: o adquirente
                      <strong>
                        {' '}
                        só se credita da parcela correspondente aos tributos sobre o consumo
                      </strong>
                      . A parcela de IRPJ/CSLL/CPP (que ultrapassa 50% do DAS no Anexo I) é custo do
                      fornecedor e não gera crédito para ninguém.
                    </p>
                  </div>

                  {/* FAQ 2 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      P2: Por que não posso simplesmente creditar a alíquota de ICMS padrão do
                      estado (ex.: 18% ou 12%)?
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      Porque a nota fiscal de fornecedor optante pelo Simples Nacional{' '}
                      <em>não recolheu 18% de ICMS</em>. Pelo princípio da não-cumulatividade e pelo
                      art. 23 da LC 123/2006, o comprador só pode creditar aquilo que foi
                      <strong> efetivamente recolhido no regime unificado</strong> (a fração da
                      alíquota efetiva destacada em campo próprio, que na 1ª faixa do Anexo I é de
                      apenas 1,36%). Tomar 18% de crédito em nota de Simples Nacional é glosa certa
                      pelo fisco estadual.
                    </p>
                  </div>

                  {/* FAQ 3 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      P3: O que é RBT12 e por que ela altera o crédito do meu cliente?
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      RBT12 é a <strong>Receita Bruta Acumulada dos últimos 12 meses</strong> do
                      fornecedor. No Simples Nacional, quanto mais a empresa vendeu nos últimos 12
                      meses, mais ela sobe de faixa na tabela e maior fica sua alíquota efetiva.
                      Como a parcela creditável é uma fração dessa alíquota efetiva, se o fornecedor
                      faturar mais, a alíquota dele sobe e o crédito do seu cliente também aumenta
                      ligeiramente.
                    </p>
                  </div>

                  {/* FAQ 4 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      P4: Onde encontro a RBT12 do meu fornecedor se ele não me avisou?
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      Resposta honesta da IT: a RBT12 é um dado interno do fornecedor. Se você
                      estiver conferindo uma nota fiscal já emitida,
                      <strong> você não precisa da RBT12</strong>! O fornecedor é obrigado por lei
                      (art. 23, §2º da LC 123) a informar o percentual exato de crédito no campo
                      próprio ou nos dados adicionais da nota fiscal. Basta clicar na opção{' '}
                      <span className="font-mono text-emerald-300">
                        &ldquo;Preencher pelo percentual da NOTA (art. 23, §2º)&rdquo;
                      </span>{' '}
                      e digitar os percentuais que vieram impressos no documento.
                    </p>
                  </div>

                  {/* FAQ 5 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      P5: Posso digitar percentuais diferentes por item da nota fiscal?
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      Sim! A ferramenta possui arquitetura item a item. Embora o fornecedor
                      normalmente aplique a mesma alíquota para mercadorias do mesmo anexo, se a
                      nota contiver itens de anexos diferentes (exemplo: venda de produto pelo Anexo
                      I e serviço de montagem/transporte pelo Anexo III), você pode alternar e
                      configurar cada item separadamente.
                    </p>
                  </div>

                  {/* FAQ 6 */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      P6: O que significa &ldquo;SN Puro&rdquo; e &ldquo;SN Híbrido&rdquo;?
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      O <strong>SN puro</strong> recolhe tudo pelo DAS (IBS/CBS embutidos no regime
                      único). A nota vem sem destaque de IBS/CBS por fora e o comprador tem crédito
                      limitado ao art. 23. O <strong>SN híbrido</strong> é a empresa optante que fez
                      a opção pelo regime regular de IBS/CBS (art. 41 da LC 214/2025). Ela destaca
                      IBS/CBS cheios na nota por fora, garantindo crédito integral ao comprador,
                      exatamente como se fosse uma grande empresa do Lucro Real.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {secaoAtiva === 's7-honestidade' && (
              <div className="space-y-4">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-violet-400" />
                    <span>Postura Profissional</span>
                  </div>
                  <h3 className="text-lg font-mono font-black text-white">
                    SEÇÃO 7 — Avisos de honestidade e limites legais
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    A regra inegociável da casa: nunca inventar números e alertar sobre teses
                    abertas.
                  </p>
                </div>

                <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-300">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold uppercase">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      A Ferramenta é um Simulador de Apoio Decisório, Não um Parecer Automático
                    </div>
                    <p className="leading-relaxed">
                      Os cálculos e comparativos aqui gerados visam apoiar o contador, o diretor
                      tributário e a equipe de compras na tomada de decisão sobre preços, margens e
                      negociação com fornecedores. A ferramenta{' '}
                      <strong>
                        não substitui a consulta direta à legislação em vigor na data da emissão do
                        documento fiscal
                      </strong>{' '}
                      e as peculiaridades cadastrais de cada contribuinte.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <span className="text-xs font-mono font-bold text-violet-300 uppercase block">
                      Teses Pendentes e Badges de Alerta:
                    </span>
                    <ul className="space-y-2 list-disc list-inside text-slate-300">
                      <li>
                        <strong>Resolução CGSN 190/2026:</strong> A discussão sobre se a base de
                        cálculo do DAS deve ser estritamente a
                        <span className="font-mono text-emerald-300"> Receita Bruta</span> ou a{' '}
                        <span className="font-mono text-emerald-300">
                          Líquida do ICMS destacado
                        </span>{' '}
                        está rotulada de forma transparente como tese em aberto. A ferramenta exibe
                        ambas as leituras para que o contador decida com o cliente.
                      </li>
                      <li>
                        <strong>Valores em Âmbar (Pendente de Confirmação):</strong> Quando um
                        número depender de regulamentação do CGSN ou de portaria estadual (ex.:
                        sublimites de R$ 3,6M a R$ 4,8M), ele será exibido com badge âmbar. Nunca
                        entregue ao seu cliente um valor em âmbar como se fosse uma certeza
                        imutável.
                      </li>
                      <li>
                        <strong>Arredondamentos e Precisão:</strong> O motor de cálculo interno
                        preserva 6 casas decimais em todas as etapas intermediárias (sem perda de
                        centavos por arredondamento prematuro), exibindo 2 a 4 decimais na interface
                        para facilidade de leitura.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-3.5 flex items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-violet-200">
                        Compromisso de Governança IT: transparência máxima, honestidade técnica e
                        precisão matemática.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* RODAPÉ DO DIALOG COM NAVEGAÇÃO RÁPIDA (ANTERIOR / PRÓXIMO) */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] font-mono text-slate-400">
            Seção <span className="text-violet-300 font-bold">{idxAtual + 1}</span> de{' '}
            <span className="text-slate-200 font-bold">{SECOES.length}</span> ·{' '}
            {SECOES[idxAtual].tituloCurto}
          </div>

          <div className="flex items-center gap-2">
            {anterior && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecaoAtiva(anterior.id)}
                className="h-8 text-xs font-mono border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                ← {anterior.tituloCurto}
              </Button>
            )}
            {proxima ? (
              <Button
                size="sm"
                onClick={() => setSecaoAtiva(proxima.id)}
                className="h-8 text-xs font-mono bg-violet-600 hover:bg-violet-500 text-white font-bold cursor-pointer"
              >
                {proxima.tituloCurto} →
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer"
              >
                Concluir Leitura ✓
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
