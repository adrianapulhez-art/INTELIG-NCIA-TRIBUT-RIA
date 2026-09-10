import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Send,
  Trash2,
  Sparkles,
  Bot,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  Maximize2,
  Minimize2,
  Lightbulb,
  Paperclip,
  ImageIcon,
  Eye,
  ScanEye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AssistantAvatar } from './AssistantAvatar'
import { ChatMarkdown } from './ChatMarkdown'
import {
  TABLE_ASSISTANTS,
  getAssistantForTab,
  type TableAssistantConfig,
} from '@/services/tableAssistantsConfig'
import {
  sendTaxAssistantMessage,
  type TaxChatMessage,
  type TaxChatImageAttachment,
} from '@/services/taxAssistantService'
import { useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import { processChatImageFile, formatFileSize, type ProcessedImage } from '@/lib/imageUtils'

interface AssistantChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentTab: string
}

const STORAGE_KEY_PREFIX = 'it_tax_assistant_chat_'

export const AssistantChatDrawer: React.FC<AssistantChatDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
}) => {
  const assistantConfig: TableAssistantConfig = useMemo(
    () => getAssistantForTab(currentTab),
    [currentTab],
  )

  const taxContext = useTaxContext()

  // Constrói resumo dinâmico dos números atuais da tela para contexto rico do agente
  const liveNumbersContext = useMemo(() => {
    try {
      const parts: string[] = []
      parts.push(`Página: ${assistantConfig.pageName}`)
      parts.push(`Regime selecionado no contexto: ${taxContext.regime}`)

      if (currentTab === 'markup') {
        parts.push(`Modo de markup: ${taxContext.markupMode}`)
        parts.push(`Receita líquida desejada: ${formatBRL(taxContext.desiredNetRevenue)}`)
        parts.push(`Margem adicional: ${formatPercentBR(taxContext.additionalMargin)}`)
        parts.push(`ICMS Markup: ${formatPercentBR(taxContext.icmsRateMarkup)}`)
        parts.push(`Preço simulado consolidado: ${formatBRL(taxContext.simulatedSalePrice)}`)
        parts.push(`Fator completo: ${taxContext.simulatedCompleteFactor.toFixed(4)}`)
        parts.push(`Faturamento simulado: ${formatBRL(taxContext.totalConsolidatedRevenue)}`)
      } else if (currentTab === 'compras') {
        parts.push(`Total de itens comprados: ${taxContext.purchasesItems?.length || 0}`)
        parts.push(`Quantidade total comprada: ${taxContext.totalPurchasesQuantity || 0} un.`)
        parts.push(`Mercadorias totais: ${formatBRL(taxContext.totalPurchasesMerchandise || 0)}`)
        parts.push(`Estoque inicial: ${formatBRL(taxContext.initialInventory)}`)
        parts.push(`Estoque final: ${formatBRL(taxContext.finalInventory)}`)
        parts.push(`CMV Simples: ${formatBRL(taxContext.calculatedPurchases.cmvSimples)}`)
        parts.push(`CMV Presumido: ${formatBRL(taxContext.calculatedPurchases.cmvPresumido)}`)
        parts.push(`CMV Real: ${formatBRL(taxContext.calculatedPurchases.cmvReal)}`)
        parts.push(
          `Deduções CMV: ICMS recuperável (${formatBRL(taxContext.calculatedPurchases.icmsResult)}), ICMS frete (${formatBRL(taxContext.calculatedPurchases.icmsFreightResult)}), PIS Real (${formatBRL(taxContext.calculatedPurchases.pisResult)}), COFINS Real (${formatBRL(taxContext.calculatedPurchases.cofinsResult)}). No Simples os tributos integram o CMV.`,
        )
        if (taxContext.autoInventoryDeduction) {
          parts.push(
            `Baixa automática ativa: ${taxContext.calculatedPurchases.totalSoldUnitsEffective} un. vendidas. Unitário Presumido: ${formatBRL(taxContext.calculatedPurchases.unitCostPresumidoEffective)}, Unitário Real: ${formatBRL(taxContext.calculatedPurchases.unitCostRealEffective)}, Unitário Simples: ${formatBRL(taxContext.calculatedPurchases.unitCostSimplesEffective)}.`,
          )
        }
      } else if (currentTab === 'simples') {
        parts.push(`Anexo Simples: ${taxContext.simplesAnexo}`)
        parts.push(`RBT12 efetiva: ${formatBRL(taxContext.effectiveSimplesRbt12)}`)
        parts.push(`Folha 12m (Fator R): ${formatBRL(taxContext.simplesPayroll12m)}`)
        parts.push(`Qtd vendida: ${taxContext.simplesQuantitySold}`)
      } else if (currentTab === 'dre-presumido') {
        parts.push(`Atividade Presumido: ${taxContext.presumidoActivity}`)
        parts.push(`ISS Presumido: ${formatPercentBR(taxContext.presumidoIssRate)}`)
        parts.push(`Qtd vendida Presumido: ${taxContext.presumidoQuantitySold}`)
      } else if (currentTab === 'dre-real') {
        parts.push(`Atividade Lucro Real: ${taxContext.realActivity}`)
        parts.push(`ISS Lucro Real: ${formatPercentBR(taxContext.realIssRate)}`)
        parts.push(`Total Adições Mini-LALUR: ${formatBRL(taxContext.realAdditions)}`)
        parts.push(`Total Exclusões Mini-LALUR: ${formatBRL(taxContext.realExclusions)}`)
        if (Array.isArray(taxContext.realLalurEntries) && taxContext.realLalurEntries.length > 0) {
          const entriesSummary = taxContext.realLalurEntries
            .map(
              (e) =>
                `[${e.type === 'addition' ? '+' : '-'}] ${e.description}: ${formatBRL(e.value)}`,
            )
            .join('; ')
          parts.push(
            `Lançamentos Mini-LALUR (${taxContext.realLalurEntries.length}): ${entriesSummary}`,
          )
        }
      } else if (currentTab === 'comparacao') {
        parts.push(`Folha salários: ${formatBRL(taxContext.payrollSalaries)}`)
        parts.push(`Pró-labore: ${formatBRL(taxContext.payrollProLabore)}`)
      } else if (currentTab === 'reforma') {
        parts.push(`Ano selecionado da Reforma: ${taxContext.reformaState.selectedYear}`)
        parts.push(
          `Imposto Seletivo ativo: ${taxContext.reformaState.enableImpostoSeletivo ? 'Sim' : 'Não'}`,
        )
        parts.push(`CBS Ref: ${taxContext.reformaState.referenceCbsRate}%`)
        parts.push(`IBS Ref: ${taxContext.reformaState.referenceIbsRate}%`)
        parts.push(`Faturamento Base: ${formatBRL(taxContext.totalConsolidatedRevenue)}`)
      }
      return parts.join(' | ')
    } catch {
      return assistantConfig.contextSummary
    }
  }, [assistantConfig, taxContext, currentTab])

  // Histórico de mensagens por aba
  const storageKey = `${STORAGE_KEY_PREFIX}${assistantConfig.slug}`

  const [messages, setMessages] = useState<TaxChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Ignora erro de parse
    }
    return [
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Olá! Sou o **${assistantConfig.name}**. Estou aqui para tirar qualquer dúvida sobre o uso da tabela de **${assistantConfig.pageName}** e ajudar você a obter o melhor resultado fiscal e financeiro nas suas análises.\n\nVocê pode me fazer perguntas sobre os campos da tela, fórmulas, créditos de impostos ou escolher uma das sugestões rápidas abaixo. Como posso orientar você agora?`,
        created: new Date().toISOString(),
        agentSlug: assistantConfig.slug,
        tabKey: currentTab,
      },
    ]
  })

  // Salva no localStorage quando o histórico muda
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {
      // Quota de localStorage
    }
  }, [messages, storageKey])

  // Ao trocar de aba, se não houver histórico para o assistente atual, inicializa a mensagem de boas-vindas
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch {
      // continua para o default
    }
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Olá! Sou o **${assistantConfig.name}**. Estou pronto para auxiliar você no uso e nas melhores análises da tabela **${assistantConfig.pageName}**.\n\nQual dúvida você gostaria de tirar sobre este módulo?`,
        created: new Date().toISOString(),
        agentSlug: assistantConfig.slug,
        tabKey: currentTab,
      },
    ])
  }, [storageKey, assistantConfig.name, assistantConfig.pageName, assistantConfig.slug, currentTab])

  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`it_tax_conv_${assistantConfig.slug}`) || null
    } catch {
      return null
    }
  })
  const [expanded, setExpanded] = useState(false)

  // Estado de imagem anexada no composer
  const [attachedImage, setAttachedImage] = useState<ProcessedImage | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Modal para visualização ampliada de imagem do histórico
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      // Foca no input após abrir a drawer
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, messages.length])

  // Manipulação de seleção de imagem
  const handleSelectImageFile = async (file: File) => {
    setImageError(null)
    setIsProcessingImage(true)
    try {
      const processed = await processChatImageFile(file)
      setAttachedImage(processed)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar arquivo de imagem.'
      setImageError(msg)
    } finally {
      setIsProcessingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleSelectImageFile(file)
    }
  }

  const handleRemoveAttachedImage = () => {
    setAttachedImage(null)
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Suporte a colar imagem (Ctrl+V / Cmd+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleSelectImageFile(file)
          break
        }
      }
    }
  }

  // Suporte a drag and drop de arquivos de imagem na área do chat
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDraggingOver) setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        handleSelectImageFile(file)
      } else {
        setImageError('Por favor solte um arquivo de imagem (PNG, JPG ou WebP).')
      }
    }
  }

  // Envio de mensagem
  const handleSendMessage = async (userPrompt?: string) => {
    const textToSend = (userPrompt ?? inputValue).trim()
    const currentAttachedImage = attachedImage

    // Permite envio se houver texto ou se houver imagem com prompt padrão
    if ((!textToSend && !currentAttachedImage) || isLoading || isProcessingImage) return

    const effectiveText =
      textToSend ||
      (currentAttachedImage
        ? 'Por favor analise os dados fiscais/contábeis desta imagem e me oriente sobre o preenchimento no sistema.'
        : '')

    setInputValue('')
    setAttachedImage(null)
    setImageError(null)

    const userAttachment: TaxChatImageAttachment | undefined = currentAttachedImage
      ? {
          data_url: currentAttachedImage.data_url,
          name: currentAttachedImage.name,
          size: currentAttachedImage.size,
          type: currentAttachedImage.type,
        }
      : undefined

    const userMsg: TaxChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: effectiveText,
      created: new Date().toISOString(),
      agentSlug: assistantConfig.slug,
      tabKey: currentTab,
      image: userAttachment,
    }

    const tempAssistantId = 'assistant-stream-' + Date.now()
    const tempAssistantMsg: TaxChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      created: new Date().toISOString(),
      agentSlug: assistantConfig.slug,
      tabKey: currentTab,
    }

    setMessages((prev) => [...prev, userMsg, tempAssistantMsg])
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const result = await sendTaxAssistantMessage({
        agentSlug: assistantConfig.slug,
        message: effectiveText,
        context: liveNumbersContext,
        image: userAttachment,
        conversationId,
        tabKey: currentTab,
        signal: controller.signal,
        onChunk: (_delta, full) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === tempAssistantId ? { ...msg, content: full } : msg)),
          )
        },
      })

      if (result.conversationId) {
        setConversationId(result.conversationId)
        try {
          localStorage.setItem(`it_tax_conv_${assistantConfig.slug}`, result.conversationId)
        } catch {
          // ignora
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                content: result.content || msg.content || 'Resposta finalizada.',
                citations: result.citations,
              }
            : msg,
        ),
      )
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Falha ao obter resposta do assistente.'

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                content:
                  msg.content.trim().length > 0
                    ? msg.content
                    : `⚠️ Não foi possível obter resposta no momento (${errorMessage}). Por favor verifique sua conexão ou tente novamente.`,
              }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleClearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de conversa com este assistente?')) {
      const freshMessage: TaxChatMessage = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Histórico limpo. Como posso ajudar você a usar e analisar a tabela **${assistantConfig.pageName}**?`,
        created: new Date().toISOString(),
        agentSlug: assistantConfig.slug,
        tabKey: currentTab,
      }
      setMessages([freshMessage])
      setConversationId(null)
      try {
        localStorage.removeItem(storageKey)
        localStorage.removeItem(`it_tax_conv_${assistantConfig.slug}`)
      } catch {
        // ignora
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-[#040907]/95 border-l border-emerald-500/30 backdrop-blur-xl shadow-2xl shadow-black/80 transition-all duration-300 ${
        expanded ? 'w-full sm:w-[620px] md:w-[760px]' : 'w-full sm:w-[460px] md:w-[520px]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Luz radial futurista no topo do painel inspirada na estética de cérebro digital da imagem */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/10 blur-[90px] pointer-events-none" />

      {/* Overlay de Drag-and-Drop */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#04120b]/90 border-2 border-dashed border-emerald-400 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
          <div className="p-4 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 mb-3 animate-bounce">
            <ScanEye className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Solte a imagem aqui</h4>
          <p className="text-xs text-emerald-300/80 max-w-xs">
            O assistente fará a leitura visual para orientar você no preenchimento dos campos.
          </p>
        </div>
      )}

      {/* QUADRANTE SUPERIOR: Header futurista com imagem do robô com cérebro luminoso (inspirado no anexo) */}
      <div className="relative p-4 sm:p-5 border-b border-emerald-500/20 bg-gradient-to-b from-[#071712] via-[#05110d] to-[#040a08]">
        {/* Controles de Janela (Fechar, Expandir, Limpar) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/15">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">
              Assistente Nativo IT • Skip Cloud AI
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              title="Limpar histórico deste assistente"
              onClick={handleClearHistory}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              title={expanded ? 'Reduzir painel' : 'Expandir painel'}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              title="Fechar chat"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Informações do Assistente da Tabela + Avatar da Imagem Anexa */}
        <div className="flex items-start gap-4">
          <AssistantAvatar size="md" glow />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                {assistantConfig.title}
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono py-0 px-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              >
                Online
              </Badge>
            </div>

            <p className="text-xs text-emerald-300/90 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Auxiliando: {assistantConfig.pageName}</span>
            </p>

            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {assistantConfig.description}
            </p>
          </div>
        </div>

        {/* Seletor rápido de assistente / indicador de módulos disponíveis */}
        <div className="mt-3.5 pt-2.5 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-mono text-emerald-400/90">
            <Bot className="w-3 h-3" />
            Tabela conectada:
          </span>
          <span className="text-white font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 truncate max-w-[240px]">
            {assistantConfig.pageName}
          </span>
        </div>
      </div>

      {/* ÁREA DE MENSAGENS COM SCROLL */}
      <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
        <div className="space-y-4">
          {/* Caixa de Sugestões / Perguntas Frequentes da Tabela Atual */}
          <div className="p-3 rounded-xl bg-[#06140f]/80 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Dúvidas frequentes sobre esta tabela:</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {assistantConfig.quickQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(question)}
                  disabled={isLoading}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-200 border border-emerald-500/15 hover:border-emerald-400/40 text-[11px] transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span className="truncate pr-2">{question}</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400/60 group-hover:text-emerald-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Lista de mensagens */}
          {messages.map((message) => {
            const isUser = message.role === 'user'

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="shrink-0 mt-0.5">
                    <AssistantAvatar size="sm" glow={false} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-medium rounded-tr-sm shadow-emerald-950/40'
                      : 'bg-[#061510] text-slate-200 border border-emerald-500/20 rounded-tl-sm shadow-black/50'
                  }`}
                >
                  {/* Cabeçalho da mensagem */}
                  <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-75 font-mono">
                    <span className="font-semibold">{isUser ? 'Você' : assistantConfig.name}</span>
                    <span>
                      {new Date(message.created).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Thumbnail de imagem enviada pelo usuário */}
                  {isUser && message.image?.data_url && (
                    <div className="mb-2 relative group inline-block">
                      <div className="relative rounded-lg overflow-hidden border border-emerald-950/40 shadow-md bg-black/40">
                        <img
                          src={message.image.data_url}
                          alt={message.image.name || 'Imagem enviada'}
                          className="max-h-48 max-w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewModalUrl(message.image?.data_url || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(message.image?.data_url || null)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-emerald-300" />
                          <span>Ampliar</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-900/80">
                        <ScanEye className="w-3 h-3 text-emerald-900" />
                        <span className="truncate max-w-[180px]">
                          {message.image.name || 'Documento lido'}
                        </span>
                        {message.image.size && (
                          <span className="opacity-75">({formatFileSize(message.image.size)})</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Conteúdo textual */}
                  <div className="break-words max-w-none">
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-xs sm:text-sm font-medium leading-relaxed">
                        {message.content}
                      </p>
                    ) : message.content ? (
                      <ChatMarkdown content={message.content} />
                    ) : isLoading ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 animate-pulse font-mono text-xs">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Analisando dados e documento...
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* QUADRANTE INFERIOR: Composer de Envio com Anexo de Imagem */}
      <div className="p-3 sm:p-4 border-t border-emerald-500/20 bg-[#06120e]/95 backdrop-blur-md">
        {/* Input file invisível para anexo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Alerta de erro de imagem se houver */}
        {imageError && (
          <div className="mb-2 p-2 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-200 text-[11px] flex items-center justify-between animate-in fade-in duration-150">
            <span className="truncate pr-2">{imageError}</span>
            <button
              type="button"
              onClick={() => setImageError(null)}
              className="text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Preview da imagem anexada antes de enviar */}
        {attachedImage && (
          <div className="mb-2.5 p-2 rounded-xl bg-[#040e0a] border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-500/30 bg-black shrink-0 cursor-pointer group"
                onClick={() => setPreviewModalUrl(attachedImage.data_url)}
                title="Clique para ampliar"
              >
                <img
                  src={attachedImage.data_url}
                  alt={attachedImage.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono py-0 px-1.5 border-emerald-500/50 bg-emerald-500/20 text-emerald-300 flex items-center gap-1"
                  >
                    <ScanEye className="w-3 h-3 text-emerald-400" />
                    Leitura Visual Ativa
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatFileSize(attachedImage.size)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium truncate mt-0.5">
                  {attachedImage.name}
                </p>
                <p className="text-[10px] text-emerald-400/80 truncate">
                  O assistente examinará a imagem junto à sua pergunta
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveAttachedImage}
              className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
              title="Remover imagem"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="relative"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              attachedImage
                ? `Faça uma pergunta sobre a imagem anexa (ex: 'onde lanço o ICMS-ST deste item?')...`
                : `Pergunte algo sobre a tabela de ${assistantConfig.pageName} (ou anexe imagem da NF/tabela)...`
            }
            disabled={isLoading || isProcessingImage}
            className="w-full resize-none rounded-xl bg-[#030907] border border-emerald-500/30 text-slate-100 placeholder:text-slate-500 pl-11 pr-24 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 transition-all shadow-inner"
          />

          {/* Botão de anexo de imagem à esquerda */}
          <div className="absolute left-2 bottom-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isProcessingImage}
              className={`h-7 w-7 rounded-lg transition-all cursor-pointer ${
                attachedImage
                  ? 'text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
              title="Anexar imagem (NF, documento, tabela ou print - PNG/JPG até 4MB)"
            >
              {isProcessingImage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : attachedImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="absolute right-2 bottom-3 flex items-center gap-1.5">
            {isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => abortControllerRef.current?.abort()}
                className="h-7 px-2 text-[10px] font-mono text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                Parar
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={(!inputValue.trim() && !attachedImage) || isLoading || isProcessingImage}
              className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline text-xs">Enviar</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-emerald-500/60" />
            Cole (Ctrl+V) ou arraste imagens
          </span>
          <span className="flex items-center gap-1 text-emerald-400/80">
            <ScanEye className="w-3 h-3" />
            Visão Multimodal Ativa
          </span>
        </div>
      </div>

      {/* Modal simples de ampliação de imagem */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#05110d] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-emerald-500/20 mb-2">
              <span className="text-xs font-mono text-emerald-300 font-semibold flex items-center gap-1.5">
                <ScanEye className="w-4 h-4 text-emerald-400" />
                Documento / Imagem de Referência
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewModalUrl(null)}
                className="h-7 w-7 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center p-1 bg-black/50 rounded-xl">
              <img
                src={previewModalUrl}
                alt="Documento ampliado"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
