import React, { useState, useEffect } from 'react'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  BookmarkCheck,
  Hash,
  Database,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  classificarNcmEmTempoReal,
  formatarMascaraNcm,
  limparNcm,
  type ClassificacaoNcmResult,
} from '@/services/ncmClassificationService'
import {
  buscarNcmPorTexto,
  selecionarNcmEEnquadrar,
  METADADOS_NCM_TABELA,
  type NcmBuscaItem,
} from '@/services/ncmTabelaService'
import { TABELA_OFICIAL_CCLASSTRIB } from '@/lib/tabelaOficialCClassTrib'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'

interface ItemClassificacaoDrawerProps {
  item: ItemIntegracaoArt12
  onAtualizarClassificacao: (
    id: string,
    dados: {
      ncm: string
      ncmPercentualReducao: number
      ncmAnexo?: string
      ncmArtigoOrigem?: string
      ncmDescricaoReducao?: string
      ncmFonte?: string
      ncmOpcaoId?: string
      cClassTribCodigo?: string
    },
  ) => void
}

export function ItemClassificacaoDrawer({
  item,
  onAtualizarClassificacao,
}: ItemClassificacaoDrawerProps) {
  const [ncmDigitado, setNcmDigitado] = useState<string>(
    item.ncm ? formatarMascaraNcm(String(item.ncm ?? '')) : '',
  )
  const [opcaoSelecionadaId, setOpcaoSelecionadaId] = useState<string | undefined>(item.ncmOpcaoId)
  const [cClassManual, setCClassManual] = useState<string | undefined>(item.cClassTribCodigo)
  const [resultado, setResultado] = useState<ClassificacaoNcmResult | null>(null)
  const [carregando, setCarregando] = useState<boolean>(false)

  // Busca textual no catálogo completo NCM/SH
  const [termoBuscaTexto, setTermoBuscaTexto] = useState<string>(item.name || '')
  const [sugestoesCatalogo, setSugestoesCatalogo] = useState<NcmBuscaItem[]>([])
  const [buscandoCatalogo, setBuscandoCatalogo] = useState<boolean>(false)
  const [painelBuscaAberto, setPainelBuscaAberto] = useState<boolean>(false)

  // Consulta em tempo real à coleção lc214_anexos_ncm
  useEffect(() => {
    let ativo = true
    setCarregando(true)

    classificarNcmEmTempoReal(ncmDigitado, opcaoSelecionadaId, cClassManual).then((res) => {
      if (!ativo) return
      setResultado(res)
      setCarregando(false)

      // Se enquadrou automaticamente ou se o usuário escolheu, atualiza o item
      if (res.status === 'enquadrado' && res.opcaoSelecionada) {
        onAtualizarClassificacao(item.id, {
          ncm: res.ncmLimpo,
          ncmPercentualReducao: res.percentualReducaoPct,
          ncmAnexo: res.anexo,
          ncmArtigoOrigem: res.artigoOrigem,
          ncmDescricaoReducao: res.opcaoSelecionada.descricao_reducao,
          ncmFonte: res.fonte,
          ncmOpcaoId: res.opcaoSelecionada.id,
          cClassTribCodigo: cClassManual || res.codigoCClassTribSugerido,
        })
      } else if (res.status === 'nao_encontrado') {
        onAtualizarClassificacao(item.id, {
          ncm: res.ncmLimpo,
          ncmPercentualReducao: 0,
          ncmAnexo: undefined,
          ncmArtigoOrigem: undefined,
          ncmDescricaoReducao: 'Sem redutor — alíquota cheia',
          ncmFonte: res.fonte,
          ncmOpcaoId: undefined,
          cClassTribCodigo: cClassManual || '000001',
        })
      }
    })

    return () => {
      ativo = false
    }
  }, [ncmDigitado, opcaoSelecionadaId, cClassManual, item.id])

  // Busca textual no catálogo NCM/SH oficial (ex: "cama", "celular", "edredom")
  useEffect(() => {
    let ativo = true
    const termo = termoBuscaTexto.trim()
    if (!termo || termo.length < 2) {
      setSugestoesCatalogo([])
      return
    }

    setBuscandoCatalogo(true)
    const timer = setTimeout(() => {
      buscarNcmPorTexto(termo, 25)
        .then((itens) => {
          if (!ativo) return
          setSugestoesCatalogo(itens)
          setBuscandoCatalogo(false)
        })
        .catch(() => {
          if (!ativo) return
          setBuscandoCatalogo(false)
        })
    }, 200)

    return () => {
      ativo = false
      clearTimeout(timer)
    }
  }, [termoBuscaTexto])

  const handleMudarNcm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarMascaraNcm(e.target.value)
    setNcmDigitado(formatado)
    setOpcaoSelecionadaId(undefined) // Reset de opção prévia em nova digitação
  }

  const handleSelecionarNcmDoCatalogo = async (ncmItem: NcmBuscaItem) => {
    setNcmDigitado(ncmItem.codigoFormatado)
    setOpcaoSelecionadaId(undefined)
    setPainelBuscaAberto(false)

    // Enquadra em tempo real e calcula sugestão de cClassTrib
    const { enquadramento } = await selecionarNcmEEnquadrar(ncmItem.codigoNcm)
    if (enquadramento.status === 'enquadrado' && enquadramento.opcaoSelecionada) {
      setCClassManual(enquadramento.codigoCClassTribSugerido)
      onAtualizarClassificacao(item.id, {
        ncm: enquadramento.ncmLimpo,
        ncmPercentualReducao: enquadramento.percentualReducaoPct,
        ncmAnexo: enquadramento.anexo,
        ncmArtigoOrigem: enquadramento.artigoOrigem,
        ncmDescricaoReducao: enquadramento.opcaoSelecionada.descricao_reducao,
        ncmFonte: enquadramento.fonte,
        ncmOpcaoId: enquadramento.opcaoSelecionada.id,
        cClassTribCodigo: enquadramento.codigoCClassTribSugerido || '000001',
      })
    } else {
      setCClassManual('000001')
      onAtualizarClassificacao(item.id, {
        ncm: enquadramento.ncmLimpo,
        ncmPercentualReducao: 0,
        ncmAnexo: undefined,
        ncmArtigoOrigem: undefined,
        ncmDescricaoReducao: 'Sem redutor — alíquota cheia',
        ncmFonte: enquadramento.fonte,
        ncmOpcaoId: undefined,
        cClassTribCodigo: '000001',
      })
    }
  }

  const handleEscolherOpcaoManual = (opcaoId: string) => {
    setOpcaoSelecionadaId(opcaoId)
  }

  const handleMudarCClass = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCClassManual(e.target.value)
  }

  return (
    <div className="mx-2 my-2.5 p-4 rounded-xl bg-slate-100/90 border border-slate-300/80 shadow-inner space-y-4 font-mono text-xs">
      {/* Cabeçalho da Camada Interna Recuada */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e5b742] ring-2 ring-amber-300/60" />
          <span className="font-bold text-[#261502] uppercase text-[11px] tracking-wide">
            ENQUADRAMENTO EM TEMPO REAL · LC 214/2025 · ITEM: {item.name || 'Sem nome'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-400 bg-amber-50 text-amber-900 font-mono text-[9px] flex items-center gap-1 font-bold"
          >
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            CATÁLOGO NCM: AGUARDANDO CHANCELA DA ADRI
          </Badge>
        </div>
      </div>

      {/* NOVO CAMPO: BUSCA DE NCM POR DESCRIÇÃO DO ITEM COM CATÁLOGO COMPLETO */}
      <div className="bg-white rounded-xl border border-amber-300 p-3 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[10px] uppercase font-bold text-[#261502] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#b87c14]" />
            <span>
              Busca Inteligente de NCM por Descrição do Item (Catálogo Oficial Siscomex / TIPI)
            </span>
          </label>
          <span className="text-[9px] text-slate-500">
            Digite o nome ou palavra-chave (ex.: &quot;cama&quot;, &quot;edredom&quot;,
            &quot;celular&quot;)
          </span>
        </div>

        <div className="relative">
          <Input
            type="text"
            placeholder="Pesquise por descrição (ex.: cama de madeira, cama de metal, arroz, celular)..."
            value={termoBuscaTexto}
            onChange={(e) => {
              setTermoBuscaTexto(e.target.value)
              setPainelBuscaAberto(true)
            }}
            onFocus={() => setPainelBuscaAberto(true)}
            className="h-8 text-xs font-mono bg-amber-50/40 text-slate-900 border-amber-300 focus-visible:ring-amber-500 pr-16"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {termoBuscaTexto && (
              <button
                type="button"
                onClick={() => {
                  setTermoBuscaTexto('')
                  setSugestoesCatalogo([])
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <Search className="w-3.5 h-3.5 text-[#b87c14] pointer-events-none" />
          </div>
        </div>

        {/* Dropdown com os códigos NCM/SH correspondentes */}
        {painelBuscaAberto && termoBuscaTexto.trim().length >= 2 && (
          <div className="rounded-lg border border-amber-300 bg-white max-h-56 overflow-y-auto divide-y divide-slate-100 shadow-md">
            <div className="p-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase">
              <span>Códigos NCM/SH encontrados ({sugestoesCatalogo.length})</span>
              <button
                type="button"
                onClick={() => setPainelBuscaAberto(false)}
                className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {buscandoCatalogo ? (
              <div className="p-3 text-center text-slate-500 text-[10px]">
                Buscando no catálogo oficial...
              </div>
            ) : sugestoesCatalogo.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[10px]">
                Nenhum código NCM encontrado para &quot;{termoBuscaTexto}&quot;. Você pode digitar o
                NCM diretamente no campo abaixo.
              </div>
            ) : (
              sugestoesCatalogo.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelecionarNcmDoCatalogo(cat)}
                  className="w-full text-left p-2 hover:bg-amber-50 transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#b87c14] font-mono text-[11px] group-hover:text-[#261502]">
                        {cat.codigoFormatado}
                      </span>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] px-1 py-0">
                        NCM 8 dígitos
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50/80 text-amber-800 text-[8px] px-1 py-0"
                      >
                        {cat.statusChancela === 'aguardando_chancela'
                          ? 'Aguardando Chancela Adri'
                          : 'Chancelado'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-800 font-medium truncate">
                      {cat.descricao}
                    </p>
                    {cat.descricaoCompleta && (
                      <p className="text-[9px] text-slate-500 line-clamp-1 italic">
                        {cat.descricaoCompleta}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 pt-1 text-[#b87c14] opacity-70 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold">
                    <span>Selecionar</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Campo NCM/SH de 8 dígitos com máscara */}
        <div className="md:col-span-4 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <label className="text-[10px] uppercase font-bold text-slate-600 block flex items-center justify-between">
            <span>Código NCM/SH (8 dígitos)</span>
            <span className="text-slate-400 font-normal">{limparNcm(ncmDigitado).length}/8</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0000.00.00"
              value={ncmDigitado}
              onChange={handleMudarNcm}
              maxLength={10}
              className="h-8 text-xs font-mono font-bold bg-white text-slate-900 border-slate-300 focus-visible:ring-amber-500 pr-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <p className="text-[9px] text-slate-500 leading-tight">
            Consulte a posição SH na LC 214/2025. Ex.: 1006.30.21 (Arroz), 9402.90.00 (Camas
            clínicas), 3401.11.90 (Sabões).
          </p>
        </div>

        {/* Sugestão de cClassTrib (Tabela Oficial 173 códigos) */}
        <div className="md:col-span-4 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <label className="text-[10px] uppercase font-bold text-slate-600 block flex items-center justify-between">
            <span>cClassTrib IBS/CBS (IT 2025.002)</span>
            <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[9px] px-1 py-0">
              v1.70
            </Badge>
          </label>
          <select
            value={cClassManual || resultado?.codigoCClassTribSugerido || '000001'}
            onChange={handleMudarCClass}
            className="w-full h-8 text-xs font-mono bg-white border border-slate-300 rounded-md px-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {TABELA_OFICIAL_CCLASSTRIB.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} · {c.descricao.slice(0, 48)}...
              </option>
            ))}
          </select>
          <p className="text-[9px] text-slate-500 leading-tight">
            Sugerido automaticamente a partir da tabela oficial conforme o benefício legal.
          </p>
        </div>

        {/* Status e Redução apurada */}
        <div className="md:col-span-4 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-600 block">
              Enquadramento Tributário
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              {carregando ? (
                <span className="text-[11px] text-slate-400">Consultando LC 214/2025...</span>
              ) : resultado?.status === 'enquadrado' ? (
                <Badge className="bg-amber-100 text-[#261502] border-amber-300 font-bold text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-[#b87c14]" />
                  Redução de {resultado.percentualReducaoPct}% ({resultado.anexo})
                </Badge>
              ) : resultado?.status === 'ambiguo' ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                  Ambiguidade ({resultado.opcoesEncontradas.length} opções)
                </Badge>
              ) : resultado?.status === 'nao_encontrado' ? (
                <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-bold text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-slate-500" />
                  Sem redutor — alíquota cheia
                </Badge>
              ) : (
                <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                  <HelpCircle className="w-3 h-3 mr-1 text-slate-400" />
                  Informe NCM para enquadrar
                </Badge>
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            {resultado?.percentualReducaoPct && resultado.percentualReducaoPct > 0 ? (
              <span className="text-[#b87c14] font-bold">
                Aplica redutor de {resultado.percentualReducaoPct}% sobre CBS/IBS 2027+
              </span>
            ) : (
              <span>Tributação plena de CBS/IBS (sem benefício de alíquota reduzida)</span>
            )}
          </div>
        </div>
      </div>

      {/* CASO DE AMBIGUIDADE — EXIGIR CHANCELA MANUAL DA USUÁRIA */}
      {resultado?.status === 'ambiguo' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              AMBIGUIDADE DETECTADA: O NCM casa com múltiplos itens nos Anexos da LC 214/2025.
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Regra permanente da Adri: nada de seleção automática. Escolha manualmente a qualificação
            legal do bem para determinar a redução legítima:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {resultado.opcoesEncontradas.map((op) => {
              const selecionada = opcaoSelecionadaId === op.id
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleEscolherOpcaoManual(op.id)}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selecionada
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 text-[#261502] font-bold shadow-xs'
                      : 'bg-white border-amber-200 text-slate-800 hover:bg-amber-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#261502]">
                      {op.anexo} · {op.artigo_origem}
                    </span>
                    <Badge className="bg-amber-100 text-[#261502] border-amber-300 text-[10px]">
                      Redução {op.percentual_reducao_pct}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-700 mt-1 line-clamp-2">{op.descricao}</p>
                  <div className="text-[9px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Termo SH: {op.ncm_sh_termo}</span>
                    {selecionada && (
                      <span className="text-[#b87c14] font-bold">✓ Chancelado manualmente</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* RASTREABILIDADE LEGAL COMPLETA (DOSSIÊ ROTULADO) */}
      {resultado?.status === 'enquadrado' && resultado.opcaoSelecionada && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[#261502] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#b87c14]" />
              {resultado.opcaoSelecionada.anexo} · {resultado.opcaoSelecionada.artigo_origem} · Item{' '}
              {resultado.opcaoSelecionada.item}
            </span>
            <span className="text-[#261502] font-bold">
              Redução devida: {resultado.opcaoSelecionada.percentual_reducao_pct}% no IBS e na CBS
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            <strong>Descrição legal:</strong> {resultado.opcaoSelecionada.descricao}
          </p>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Termo legal correspondente:</strong> {resultado.opcaoSelecionada.ncm_sh_termo}{' '}
              (NCM pesquisado: {resultado.ncmFormatado})
            </span>
            <span className="text-slate-600 italic">
              <strong>Fonte oficial:</strong> {resultado.opcaoSelecionada.fonte}
            </span>
          </div>
        </div>
      )}

      {/* SEM REDUTOR — RÓTULO AUDITÁVEL */}
      {resultado?.status === 'nao_encontrado' && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 text-[11px]">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>NCM {resultado.ncmFormatado} FORA DOS ANEXOS DA LC 214/2025</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Nenhum benefício de alíquota reduzida localizado na Lei Complementar 214/2025. O bem
            será tributado pela alíquota cheia (ad valorem integral) com cClassTrib 000001 no regime
            regular.
          </p>
          <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
            Fonte: Presidência da República / Diário Oficial da União (LC 214/2025 · sem benefício
            presumido).
          </div>
        </div>
      )}
    </div>
  )
}
