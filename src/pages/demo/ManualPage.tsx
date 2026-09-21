import React, { useMemo, useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { ChatMarkdown } from '@/components/demo/ChatMarkdown'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  Lightbulb,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'

// Capítulos do Manual — base de conhecimento única (Markdown por capítulo).
// A especialização por contexto de rota do Assistente IT (Fase 4) consome estes mesmos arquivos.
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

  const activeChapter = CHAPTERS.find((c) => c.id === activeId) || CHAPTERS[0]

  const { body, goldTip, commonError } = useMemo(
    () => splitFixedSections(activeChapter?.content || ''),
    [activeChapter],
  )

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
          {/* Sumário lateral */}
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no manual…"
                className="pl-9 bg-[#091511]/90 border-emerald-500/25 text-sm text-slate-200 placeholder:text-slate-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchResults ? (
              <div className="rounded-2xl border border-emerald-500/25 bg-[#091511]/90 p-3 space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 px-1">
                  {searchResults.length} resultado{searchResults.length === 1 ? '' : 's'} para "
                  {query}"
                </p>
                {searchResults.map(({ chapter, excerpt }) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => {
                      setActiveId(chapter.id)
                      setQuery('')
                    }}
                    className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-emerald-200">{chapter.title}</span>
                    {excerpt && (
                      <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">
                        …{excerpt}…
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <nav className="rounded-2xl border border-emerald-500/25 bg-[#091511]/90 p-2 space-y-0.5">
                {CHAPTERS.map((c) => {
                  const isActive = c.id === activeId
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer flex items-start gap-2 ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-emerald-500/10 border border-transparent'
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] mt-0.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                      >
                        {String(c.num).padStart(2, '0')}
                      </span>
                      <span>{c.title.replace(/^Capítulo \d+ — /, '')}</span>
                    </button>
                  )
                })}
              </nav>
            )}
          </aside>

          {/* Conteúdo do capítulo */}
          <article className="flex-1 min-w-0 rounded-2xl border border-emerald-500/25 bg-[#091511]/90 p-5 sm:p-7 shadow-lg shadow-emerald-950/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 font-mono text-[10px] font-semibold tracking-widest uppercase">
                <FileText className="w-3 h-3" />
                Capítulo {String(activeChapter.num).padStart(2, '0')} de {CHAPTERS.length}
              </span>
            </div>

            <ChatMarkdown content={body} className="manual-chapter-body" />

            {/* Callouts do formato fixo */}
            {goldTip && (
              <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    {GOLD_TIP_LABEL}
                  </span>
                </div>
                <ChatMarkdown content={goldTip} />
              </div>
            )}

            {commonError && (
              <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/[0.07] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-300" />
                  <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                    {COMMON_ERROR_LABEL}
                  </span>
                </div>
                <ChatMarkdown content={commonError} />
              </div>
            )}

            {/* Navegação anterior / próximo */}
            <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between gap-3">
              {prevChapter ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveId(prevChapter.id)}
                  className="text-xs text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  {prevChapter.title.replace(/^Capítulo \d+ — /, '')}
                </Button>
              ) : (
                <span />
              )}
              {nextChapter ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveId(nextChapter.id)}
                  className="text-xs text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                >
                  {nextChapter.title.replace(/^Capítulo \d+ — /, '')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <span />
              )}
            </div>
          </article>
        </div>

        {/* Rodapé de base */}
        <div className="text-[10px] text-slate-500 font-mono leading-relaxed border-t border-slate-800 pt-3">
          Manual de Uso da Calculadora Markup · Caso Adriana como exemplo canônico (valores
          canônicos do motor, teste Card ↔ Memória ↔ DRE) · Base de conhecimento do Assistente IT ·
          Precisão, confiabilidade e fidedignidade.
        </div>
      </div>
    </DemoLayout>
  )
}
