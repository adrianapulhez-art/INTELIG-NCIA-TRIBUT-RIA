import React, { useMemo, useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { ChatMarkdown } from '@/components/demo/ChatMarkdown'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Lightbulb,
  Search,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react'

// Capítulos do Manual — base de conhecimento única (Markdown por capítulo).
// A especialização por contexto de rota do Assistente IT consome estes mesmos arquivos.
const chapterModules = import.meta.glob('/src/content/manual/cap-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

interface ManualChapter {
  id: string
  num: number
  title: string
  content: string
}

const CHAPTERS: ManualChapter[] = Object.entries(chapterModules)
  .map(([path, content]) => {
    const fileName = path.split('/').pop() || ''
    const num = parseInt(fileName.replace('cap-', '').replace('.md', ''), 10)
    const titleMatch = (content as string).match(/^#\s+(.+)$/m)
    return {
      id: fileName.replace('.md', ''),
      num,
      title: titleMatch ? titleMatch[1] : `Capítulo ${num}`,
      content: content as string,
    }
  })
  .sort((a, b) => a.num - b.num)

// Blocos de destaque do formato fixo — extraídos do Markdown para callouts visuais
const GOLD_TIP_LABEL = 'Dica de ouro'
const COMMON_ERROR_LABEL = 'Erro comum e como evitar'

function splitFixedSections(markdown: string): {
  body: string
  goldTip: string | null
  commonError: string | null
} {
  const goldIdx = markdown.indexOf(`## ${GOLD_TIP_LABEL}`)
  const errIdx = markdown.indexOf(`## ${COMMON_ERROR_LABEL}`)
  const body = markdown.slice(0, goldIdx >= 0 ? goldIdx : errIdx >= 0 ? errIdx : markdown.length)
  const goldTip =
    goldIdx >= 0
      ? markdown
          .slice(goldIdx + `## ${GOLD_TIP_LABEL}`.length, errIdx >= 0 ? errIdx : undefined)
          .trim()
      : null
  const commonError =
    errIdx >= 0 ? markdown.slice(errIdx + `## ${COMMON_ERROR_LABEL}`.length).trim() : null
  return { body, goldTip, commonError }
}

export default function ManualPage() {
  const [activeId, setActiveId] = useState<string>(CHAPTERS[0]?.id || '')
  const [query, setQuery] = useState('')

  // Seções colapsáveis RECOLHIDAS por padrão (chancela da Adri)
  const [goldTipOpen, setGoldTipOpen] = useState(false)
  const [commonErrorOpen, setCommonErrorOpen] = useState(false)
  const [footerNotesOpen, setFooterNotesOpen] = useState(false)

  const activeChapter = CHAPTERS.find((c) => c.id === activeId) || CHAPTERS[0]

  const { body, goldTip, commonError } = useMemo(
    () => splitFixedSections(activeChapter?.content || ''),
    [activeChapter],
  )

  // Ao trocar de capítulo, manter seções colapsáveis recolhidas por padrão
  const handleSelectChapter = (id: string) => {
    setActiveId(id)
    setGoldTipOpen(false)
    setCommonErrorOpen(false)
  }

  // Busca de texto: título + conteúdo de todos os capítulos (recurso do manual)
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return null
    return CHAPTERS.map((c) => {
      const idx = c.content.toLowerCase().indexOf(q)
      const excerpt =
        idx >= 0
          ? c.content
              .slice(Math.max(0, idx - 60), idx + 90)
              .replace(/\s+/g, ' ')
              .trim()
          : null
      return { chapter: c, excerpt }
    }).filter((r) => r.excerpt !== null || r.chapter.content.toLowerCase().includes(q))
  }, [query])

  const activeIndex = CHAPTERS.findIndex((c) => c.id === activeId)
  const prevChapter = activeIndex > 0 ? CHAPTERS[activeIndex - 1] : null
  const nextChapter = activeIndex < CHAPTERS.length - 1 ? CHAPTERS[activeIndex + 1] : null

  if (!activeChapter) return null

  return (
    <DemoLayout currentTab="manual">
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHero
          title="MANUAL DE USO — CALCULADORA MARKUP"
          subtitle="Do primeiro cadastro ao preço ao centavo: cada capítulo ensina uma etapa do fluxo custo → modo → regime → preço → DRE, com o Caso Adriana como exemplo real. Este manual também é a base de conhecimento do Assistente IT."
          badge="MANUAL / AJUDA"
          icon={BookOpen}
        />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sumário lateral — Cartão branco com cantos arredondados, borda slate-200 e sombra suave */}
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no manual…"
                className="pl-9 bg-slate-50 border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 rounded-xl"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchResults ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-1">
                  {searchResults.length} resultado{searchResults.length === 1 ? '' : 's'} para "
                  {query}"
                </p>
                {searchResults.map(({ chapter, excerpt }) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => {
                      handleSelectChapter(chapter.id)
                      setQuery('')
                    }}
                    className="w-full text-left rounded-xl px-2.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-900 block">
                      {chapter.title}
                    </span>
                    {excerpt && (
                      <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                        …{excerpt}…
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <nav className="rounded-2xl border border-slate-200 bg-slate-50/70 p-1.5 space-y-0.5">
                {CHAPTERS.map((c) => {
                  const isActive = c.id === activeId
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectChapter(c.id)}
                      className={`w-full text-left rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/90'
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] mt-0.5 shrink-0 font-bold ${
                          isActive ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {String(c.num).padStart(2, '0')}
                      </span>
                      <span className="leading-snug">
                        {c.title.replace(/^Capítulo \d+ — /, '')}
                      </span>
                    </button>
                  )
                })}
              </nav>
            )}
          </aside>

          {/* Conteúdo do capítulo — Cartão branco chancelado com cantos arredondados rounded-3xl */}
          <article className="flex-1 min-w-0 bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
            {/* Cabeçalho do capítulo com badge claro */}
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-mono text-[10px] font-semibold tracking-wider uppercase">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                Capítulo {String(activeChapter.num).padStart(2, '0')} de {CHAPTERS.length}
              </span>
            </div>

            {/* Corpo do capítulo em Markdown limpo */}
            <div className="text-slate-800 leading-relaxed">
              <ChatMarkdown content={body} className="manual-chapter-body" />
            </div>

            {/* SEÇÕES DIDÁTICAS COLAPSÁVEIS (RECOLHIDAS POR PADRÃO) COM TARJAS EM DEGRADÊ ARDÓSIA */}
            {goldTip && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {/* Tarja / Banner em degradê cinza-ardósia com texto branco font-mono uppercase */}
                <button
                  type="button"
                  onClick={() => setGoldTipOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white transition-all cursor-pointer border-b border-slate-600 shadow-xs"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {goldTipOpen ? (
                      <ChevronDown className="w-4 h-4 text-emerald-300 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-emerald-300 shrink-0" />
                    )}
                    <span className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white truncate text-left">
                      {GOLD_TIP_LABEL}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-200 bg-emerald-950/80 border border-emerald-500/40 rounded-full px-2.5 py-0.5 shrink-0">
                    {goldTipOpen ? 'Recolher' : 'Expandir nota'}
                  </span>
                </button>

                {/* Camada interna recuada e aninhada no padrão chancelado */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    goldTipOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="mx-2 sm:mx-3 my-3 p-3 sm:p-4 rounded-xl bg-slate-100/90 border border-slate-200 shadow-inner">
                      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-slate-800">
                        <ChatMarkdown content={goldTip} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {commonError && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {/* Tarja / Banner em degradê cinza-ardósia com texto branco font-mono uppercase */}
                <button
                  type="button"
                  onClick={() => setCommonErrorOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white transition-all cursor-pointer border-b border-slate-600 shadow-xs"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {commonErrorOpen ? (
                      <ChevronDown className="w-4 h-4 text-rose-300 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-rose-300 shrink-0" />
                    )}
                    <span className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white truncate text-left">
                      {COMMON_ERROR_LABEL}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-200 bg-rose-950/80 border border-rose-500/40 rounded-full px-2.5 py-0.5 shrink-0">
                    {commonErrorOpen ? 'Recolher' : 'Expandir nota'}
                  </span>
                </button>

                {/* Camada interna recuada e aninhada no padrão chancelado */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    commonErrorOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="mx-2 sm:mx-3 my-3 p-3 sm:p-4 rounded-xl bg-slate-100/90 border border-slate-200 shadow-inner">
                      <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-slate-800">
                        <ChatMarkdown content={commonError} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navegação anterior / próximo */}
            <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between gap-3">
              {prevChapter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectChapter(prevChapter.id)}
                  className="text-xs bg-white border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer shadow-xs gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  <span>{prevChapter.title.replace(/^Capítulo \d+ — /, '')}</span>
                </Button>
              ) : (
                <span />
              )}
              {nextChapter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectChapter(nextChapter.id)}
                  className="text-xs bg-white border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer shadow-xs gap-1"
                >
                  <span>{nextChapter.title.replace(/^Capítulo \d+ — /, '')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <span />
              )}
            </div>
          </article>
        </div>

        {/* NOTAS DIDÁTICAS E RODAPÉ DE BASE — SEÇÃO COLAPSÁVEL RECOLHIDA POR PADRÃO */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setFooterNotesOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white transition-all cursor-pointer border-b border-slate-600 shadow-xs"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              {footerNotesOpen ? (
                <ChevronDown className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-emerald-300 shrink-0" />
              )}
              <span className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <Info className="w-3.5 h-3.5 text-emerald-300" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white truncate text-left">
                Notas Didáticas e Fundamentos de Base
              </span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-200 bg-emerald-950/80 border border-emerald-500/40 rounded-full px-2.5 py-0.5 shrink-0">
              {footerNotesOpen ? 'Recolher' : 'Ver fundamentos'}
            </span>
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              footerNotesOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mx-2 sm:mx-3 my-3 p-3 sm:p-4 rounded-xl bg-slate-100/90 border border-slate-200 shadow-inner">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-mono leading-relaxed space-y-1">
                  <p>
                    Manual de Uso da Calculadora Markup · Caso Adriana como exemplo canônico
                    (valores canônicos do motor, teste Card ↔ Memória ↔ DRE) · Base de conhecimento
                    do Assistente IT · Precisão, confiabilidade e fidedignidade.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Validação em conformidade com as Leis Complementares 123/2006 e 214/2025.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoLayout>
  )
}
