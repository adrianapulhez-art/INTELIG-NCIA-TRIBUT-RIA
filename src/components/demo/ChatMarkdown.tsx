import React, { useMemo } from 'react'

/**
 * Renderizador seguro, leve e resiliente a streaming de Markdown para as respostas dos assistentes IA.
 * Suporta:
 * - Parágrafos e quebras de linha normais
 * - **Negrito** (e __negrito__)
 * - *Itálico* (e _itálico_)
 * - `Código inline` e blocos de código ```código```
 * - Listas com marcadores (-, *, +)
 * - Listas numeradas (1., 2., etc.)
 * - Títulos (#, ##, ###)
 * - Citações / blockquotes (> texto)
 * - Resiliente a chunks de streaming que terminam com asteriscos parciais (não quebra nem engole texto)
 */

interface ChatMarkdownProps {
  content: string
  className?: string
}

// Token inline
type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'boldItalic'; value: string }
  | { type: 'code'; value: string }

/**
 * Faz o parse inline com suporte a texto parcial em streaming.
 * Se houver um par não fechado no final (ex: "**Alíquota" enquanto está gerando),
 * o texto inacabado é renderizado sem explodir, aguardando o próximo chunk.
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return []

  // Expressão regular com grupos para:
  // 1. Bloco de código inline: `...`
  // 2. Negrito com itálico: ***...*** ou ___...___
  // 3. Negrito: **...** ou __...__
  // 4. Itálico: *...* ou _..._
  const inlineRegex =
    /(`([^`]+)`|\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|(?<!\w)\*([^*\n]+)\*(?!\w)|(?<!\w)_([^_\n]+)_(?!\w))/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineRegex.exec(text)) !== null) {
    const matchIndex = match.index

    // Texto antes do match
    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex))
    }

    const [fullMatch, , codeVal, biVal1, biVal2, boldVal1, boldVal2, itVal1, itVal2] = match

    if (codeVal !== undefined) {
      nodes.push(
        <code
          key={`code-${matchIndex}`}
          className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]"
        >
          {codeVal}
        </code>,
      )
    } else if (biVal1 !== undefined || biVal2 !== undefined) {
      const val = biVal1 ?? biVal2 ?? ''
      nodes.push(
        <strong key={`bi-${matchIndex}`} className="font-semibold italic text-emerald-100">
          {val}
        </strong>,
      )
    } else if (boldVal1 !== undefined || boldVal2 !== undefined) {
      const val = boldVal1 ?? boldVal2 ?? ''
      nodes.push(
        <strong key={`b-${matchIndex}`} className="font-semibold text-emerald-200">
          {val}
        </strong>,
      )
    } else if (itVal1 !== undefined || itVal2 !== undefined) {
      const val = itVal1 ?? itVal2 ?? ''
      nodes.push(
        <em key={`i-${matchIndex}`} className="italic text-slate-200">
          {val}
        </em>,
      )
    } else {
      nodes.push(fullMatch)
    }

    lastIndex = matchIndex + fullMatch.length
  }

  // Restante do texto após o último match
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

interface BlockItem {
  type: 'p' | 'h' | 'ul' | 'ol' | 'blockquote' | 'codeblock'
  level?: number
  items?: string[]
  content?: string
  language?: string
}

function parseBlocks(markdown: string): BlockItem[] {
  const lines = markdown.split('\n')
  const blocks: BlockItem[] = []

  let inCodeBlock = false
  let codeBuffer: string[] = []
  let codeLang = ''

  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push({
        type: currentList.type,
        items: [...currentList.items],
      })
      currentList = null
    }
  }

  let paragraphBuffer: string[] = []
  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join('\n').trim()
      if (text) {
        blocks.push({ type: 'p', content: text })
      }
      paragraphBuffer = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Bloco de código com ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Fechamento
        blocks.push({
          type: 'codeblock',
          content: codeBuffer.join('\n'),
          language: codeLang,
        })
        codeBuffer = []
        codeLang = ''
        inCodeBlock = false
      } else {
        flushList()
        flushParagraph()
        inCodeBlock = true
        codeLang = trimmed.slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    // Linha vazia
    if (!trimmed) {
      flushList()
      flushParagraph()
      continue
    }

    // Títulos (# Titulo)
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headerMatch) {
      flushList()
      flushParagraph()
      blocks.push({
        type: 'h',
        level: headerMatch[1].length,
        content: headerMatch[2],
      })
      continue
    }

    // Citações (> citação)
    const quoteMatch = trimmed.match(/^>\s*(.+)$/)
    if (quoteMatch) {
      flushList()
      flushParagraph()
      blocks.push({
        type: 'blockquote',
        content: quoteMatch[1],
      })
      continue
    }

    // Lista com marcadores (- item, * item, + item)
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (bulletMatch) {
      flushParagraph()
      if (!currentList || currentList.type !== 'ul') {
        flushList()
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push(bulletMatch[1])
      continue
    }

    // Lista numerada (1. item, 2. item)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (!currentList || currentList.type !== 'ol') {
        flushList()
        currentList = { type: 'ol', items: [] }
      }
      currentList.items.push(orderedMatch[2])
      continue
    }

    // Linha de parágrafo contínuo
    if (currentList) {
      // Se estamos numa lista e a linha tem indentação ou continua o item anterior
      if (rawLine.startsWith('   ') || rawLine.startsWith('\t')) {
        const lastIdx = currentList.items.length - 1
        if (lastIdx >= 0) {
          currentList.items[lastIdx] += ' ' + trimmed
          continue
        }
      }
      flushList()
    }

    paragraphBuffer.push(rawLine)
  }

  // Se o stream parou dentro de um codeblock aberto
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      type: 'codeblock',
      content: codeBuffer.join('\n'),
      language: codeLang,
    })
  }

  flushList()
  flushParagraph()

  return blocks
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content, className = '' }) => {
  const blocks = useMemo(() => parseBlocks(content), [content])

  if (!content) return null

  return (
    <div className={`space-y-2 text-slate-200 leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h': {
            const level = block.level || 2
            if (level === 1) {
              return (
                <h2
                  key={idx}
                  className="text-sm font-bold text-white tracking-tight pt-1 pb-0.5 border-b border-emerald-500/20"
                >
                  {parseInline(block.content || '')}
                </h2>
              )
            }
            if (level === 2) {
              return (
                <h3
                  key={idx}
                  className="text-xs sm:text-sm font-bold text-emerald-300 tracking-tight pt-1"
                >
                  {parseInline(block.content || '')}
                </h3>
              )
            }
            return (
              <h4 key={idx} className="text-xs font-semibold text-emerald-400 pt-0.5">
                {parseInline(block.content || '')}
              </h4>
            )
          }

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="pl-3 py-1 my-1 border-l-2 border-emerald-400/60 bg-emerald-950/20 rounded-r text-xs text-slate-300 italic"
              >
                {parseInline(block.content || '')}
              </blockquote>
            )

          case 'ul':
            return (
              <ul key={idx} className="my-1.5 space-y-1 pl-1">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0 shadow-sm shadow-emerald-400/50" />
                    <span className="flex-1">{parseInline(item)}</span>
                  </li>
                ))}
              </ul>
            )

          case 'ol':
            return (
              <ol key={idx} className="my-1.5 space-y-1 pl-1">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5 shrink-0 min-w-[1.2rem]">
                      {itemIdx + 1}.
                    </span>
                    <span className="flex-1">{parseInline(item)}</span>
                  </li>
                ))}
              </ol>
            )

          case 'codeblock':
            return (
              <div
                key={idx}
                className="my-2 rounded-lg bg-[#020605] border border-emerald-500/25 p-2.5 overflow-x-auto text-[11px] font-mono text-emerald-300 shadow-inner"
              >
                {block.language && (
                  <div className="text-[9px] uppercase tracking-wider text-emerald-500/60 pb-1 mb-1 border-b border-emerald-500/15">
                    {block.language}
                  </div>
                )}
                <pre className="whitespace-pre">{block.content}</pre>
              </div>
            )

          case 'p':
          default:
            return (
              <p key={idx} className="text-xs sm:text-sm leading-relaxed">
                {parseInline(block.content || '')}
              </p>
            )
        }
      })}
    </div>
  )
}
